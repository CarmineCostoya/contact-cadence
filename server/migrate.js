import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { createPool } from './db.js';

const pool = createPool();
const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');

try {
  await pool.query(schema);
  console.log('Database schema is up to date.');
} finally {
  await pool.end();
}
