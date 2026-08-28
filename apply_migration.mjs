import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the database URL from .env (we'll parse it manually since we don't have Vite here)
const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
const dbUrlMatch = envFile.match(/^DATABASE_URL=(.*)$/m);

if (!dbUrlMatch) {
  console.error("Could not find DATABASE_URL in .env");
  process.exit(1);
}

const databaseUrl = dbUrlMatch[1].trim();

const sql = postgres(databaseUrl, { ssl: 'require' });

async function run() {
  try {
    console.log("Adding google_id and picture columns to user_accounts...");
    await sql`
      ALTER TABLE user_accounts
      ADD COLUMN IF NOT EXISTS google_id TEXT,
      ADD COLUMN IF NOT EXISTS picture TEXT;
    `;
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await sql.end();
  }
}

run();
