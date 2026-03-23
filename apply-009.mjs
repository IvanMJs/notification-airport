import pg from 'pg';
import { readFileSync } from 'fs';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

await client.connect();
const sql = readFileSync('.planning/migrations/009-premium-and-prefs.sql', 'utf8');
await client.query(sql);
await client.end();
console.log('Migration 009 applied successfully');
