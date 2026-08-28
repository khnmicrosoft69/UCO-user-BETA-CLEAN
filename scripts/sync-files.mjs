// Downloads the actual file bytes (photos, PDFs, etc.) referenced by
// submissions from Supabase Storage into the local uploads/ folder, so
// there's a real, tangible copy on disk - not just a URL in the database.
//
// Run with: npm run sync-files
//
// Safe to re-run anytime: it skips any file that's already present locally,
// so repeated runs only download what's new.

import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', prepare: false });
const UPLOADS_DIR = path.join(ROOT, 'uploads');

const FILE_COLUMNS = ['image', 'video', 'audio', 'ppTemplate'];
const STORAGE_MARKER = '/object/public/uploads/';

function extractUrls(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.startsWith('http'));
}

// Turns a Supabase Storage URL into the relative path we'll mirror it under
// locally, e.g.
//   https://xxx.supabase.co/storage/v1/object/public/uploads/office_.../photo.jpg
//   -> office_.../photo.jpg
function urlToRelativePath(url) {
  const idx = url.indexOf(STORAGE_MARKER);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + STORAGE_MARKER.length));
}

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buf);
  return buf.length;
}

async function main() {
  console.log('Fetching submission file references from Supabase...');
  const rows = await sql`SELECT id, image, video, audio, "ppTemplate" FROM submissions`;

  const urls = new Set();
  for (const row of rows) {
    for (const col of FILE_COLUMNS) {
      for (const url of extractUrls(row[col])) urls.add(url);
    }
  }

  console.log(`Found ${urls.size} unique file URL(s) across ${rows.length} submission(s).\n`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  let totalBytes = 0;

  for (const url of urls) {
    const relative = urlToRelativePath(url);
    if (!relative) {
      console.warn(`  skip (unrecognized URL shape): ${url}`);
      failed++;
      continue;
    }

    const destPath = path.join(UPLOADS_DIR, relative);
    if (fs.existsSync(destPath)) {
      skipped++;
      continue;
    }

    try {
      const size = await downloadFile(url, destPath);
      totalBytes += size;
      downloaded++;
      console.log(`  downloaded ${relative} (${(size / 1024).toFixed(1)} KB)`);
    } catch (err) {
      failed++;
      console.error(`  FAILED ${relative}: ${err.message}`);
    }
  }

  console.log(
    `\nDone. Downloaded ${downloaded} new file(s) (${(totalBytes / 1024 / 1024).toFixed(2)} MB), ` +
      `${skipped} already present, ${failed} failed.`,
  );

  await sql.end();
}

main().catch((err) => {
  console.error('sync-files failed:', err);
  process.exit(1);
});
