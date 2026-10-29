import { readFile } from 'node:fs/promises';
import session from 'express-session';
import { newDb } from 'pg-mem';
import { createApp } from '../server/app.js';

export async function testContext() {
  const memoryDb = newDb({ autoCreateForeignKeyIndices: true });
  memoryDb.public.registerFunction({ name: 'now', returns: 'timestamptz', implementation: () => new Date() });
  memoryDb.public.registerFunction({ name: 'char_length', args: ['text'], returns: 'integer', implementation: (value) => value.length });
  const adapter = memoryDb.adapters.createPg();
  const pool = new adapter.Pool();
  const schema = await readFile(new URL('../server/schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);
  const app = createApp({ pool, store: new session.MemoryStore(), sessionSecret: 'test-session-secret' });
  return { app, pool };
}

export async function signup(agent, email) {
  const response = await agent.post('/api/auth/signup').send({ email, password: 'correct-horse' });
  if (response.status !== 201) throw new Error(`Signup failed: ${JSON.stringify(response.body)}`);
  return response.body.user;
}
