import 'dotenv/config';
import express from 'express';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createApp } from './app.js';
import { createPool } from './db.js';

const pool = createPool();
const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
await pool.query(schema);
console.log('Database schema is up to date.');
const app = createApp({ pool });
const dist = resolve('dist');

if (process.env.NODE_ENV === 'production' && existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*splat', (_req, res) => res.sendFile(resolve(dist, 'index.html')));
}

const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Contact Cadence server listening on port ${port}`);
});

async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
