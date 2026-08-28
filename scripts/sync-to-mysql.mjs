// Copies data from the live Supabase (Postgres) database into the local
// MySQL/MariaDB database, so MariaDB stays a synced copy during beta.
// Supabase remains the system of record until handoff.
//
// Run manually with: npm run sync-db

import postgres from 'postgres';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pg = postgres(process.env.DATABASE_URL, { ssl: 'require', prepare: false });

const mysqlPool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  timezone: 'Z', // keep timestamps in UTC on both sides
});

// Order matters: user_accounts must sync before submissions (FK).
// `json` columns need JSON.stringify before insert.
const TABLES = [
  {
    name: 'user_accounts',
    columns: ['id', 'email', 'password', 'full_name', 'office', 'created_at', 'google_id', 'picture'],
  },
  {
    name: 'admin_accounts',
    columns: ['id', 'email', 'password_hash', 'role', 'created_at', 'name', 'picture'],
  },
  {
    name: 'super_admin_accounts',
    columns: ['id', 'email', 'password_hash', 'created_at', 'name', 'picture'],
  },
  {
    name: 'member_accounts',
    columns: ['id', 'email', 'password_hash', 'created_at', 'name', 'picture'],
  },
  {
    name: 'login_attempts',
    columns: ['id', 'ip_address', 'email', 'success', 'created_at'],
  },
  {
    name: 'submissions',
    columns: [
      'id', 'email', 'request_type', 'mName', 'nNo', 'aName', 'aNo', 'socMed', 'service',
      'ppTemplate', 'image', 'video', 'created_at', 'eventDetails', 'office_name', 'audio',
      'status', 'user_id', 'assigned_to', 'is_read', 'web_date_submitted', 'web_date_required',
      'web_event_name', 'web_where_to_post', 'web_where_to_post_other', 'web_form_of_post',
      'social_service', 'social_service_other', 'print_date_requested', 'print_date_needed',
      'print_event_info', 'print_sizes', 'print_sizes_other', 'print_num_sheets',
      'pv_point_person', 'pv_event_date', 'pv_event_time', 'pv_event_location', 'pv_event_name',
      'pv_event_info', 'fb_point_person', 'fb_event_title', 'fb_event_date', 'fb_event_time',
      'fb_duration', 'fb_coordinator', 'other_service_detail',
    ],
    // These hold Supabase Storage URLs in Postgres. MySQL's copy gets them
    // rewritten to point at this app's own /api/files/ route instead, which
    // serves the local copies scripts/sync-files.mjs downloads into
    // uploads/ - so the UI has something real to show when running on the
    // MySQL fallback, instead of a broken link to Supabase Storage.
    fileColumns: ['image', 'video', 'audio', 'ppTemplate'],
  },
  {
    name: 'submission_notifications',
    columns: [
      'id', 'submission_id', 'requestor_name', 'request_type', 'old_status', 'new_status',
      'is_read', 'created_at', 'event_type', 'recipient_role', 'recipient_id', 'assigned_to_name',
    ],
  },
  {
    name: 'team_calendar_events',
    columns: ['id', 'title', 'description', 'date', 'time', 'end_time', 'type', 'status', 'color', 'created_at', 'updated_at'],
  },
  {
    name: 'transaction_logs',
    columns: [
      'id', 'actor_id', 'actor_role', 'actor_email', 'actor_name', 'event_type', 'description',
      'submission_id', 'target_id', 'target_email', 'target_role', 'old_value', 'new_value',
      'metadata', 'ip_address', 'user_agent', 'created_at', 'is_read',
    ],
    jsonColumns: ['metadata'],
  },
];

function quoteIdent(name) {
  return `\`${name}\``;
}

// Must match the relative-path convention scripts/sync-files.mjs uses when
// it downloads a Supabase Storage URL to disk under uploads/, so the
// rewritten URL actually resolves to the file that ends up there.
const STORAGE_MARKER = '/object/public/uploads/';

function rewriteFileUrl(url) {
  if (!url || !url.startsWith('http')) return url;
  const idx = url.indexOf(STORAGE_MARKER);
  if (idx === -1) return url; // not a recognized Supabase Storage URL - leave as-is
  // Decode first - must match the decoded path sync-files.mjs actually
  // saves the file under on disk (its urlToRelativePath does the same).
  const relative = decodeURIComponent(url.slice(idx + STORAGE_MARKER.length));
  return `/api/files/${relative}`;
}

function rewriteFileColumnValue(value) {
  if (!value) return value;
  // Some rows store multiple comma-separated URLs in one column.
  return value
    .split(',')
    .map((part) => rewriteFileUrl(part.trim()))
    .join(',');
}

async function syncTable(table) {
  const { name, columns, jsonColumns = [], fileColumns = [] } = table;

  const rows = await pg.unsafe(`SELECT ${columns.map((c) => `"${c}"`).join(', ')} FROM ${name}`);

  if (rows.length === 0) {
    console.log(`  ${name}: 0 rows (nothing to sync)`);
    return { table: name, count: 0 };
  }

  const colList = columns.map(quoteIdent).join(', ');
  const placeholders = columns.map(() => '?').join(', ');
  const updateClause = columns
    .filter((c) => c !== 'id')
    .map((c) => `${quoteIdent(c)} = VALUES(${quoteIdent(c)})`)
    .join(', ');

  const insertSql = `INSERT INTO ${quoteIdent(name)} (${colList}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClause}`;

  let count = 0;
  for (const row of rows) {
    const values = columns.map((c) => {
      const v = row[c];
      if (jsonColumns.includes(c)) return JSON.stringify(v ?? {});
      if (fileColumns.includes(c)) return rewriteFileColumnValue(v);
      return v === undefined ? null : v;
    });
    await mysqlPool.execute(insertSql, values);
    count++;
  }

  console.log(`  ${name}: ${count} rows synced`);
  return { table: name, count };
}

async function main() {
  console.log('Syncing Supabase (Postgres) -> MySQL/MariaDB...\n');
  const results = [];
  for (const table of TABLES) {
    results.push(await syncTable(table));
  }

  const total = results.reduce((sum, r) => sum + r.count, 0);
  console.log(`\nDone. ${total} rows synced across ${TABLES.length} tables.`);

  await pg.end();
  await mysqlPool.end();
}

main().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
