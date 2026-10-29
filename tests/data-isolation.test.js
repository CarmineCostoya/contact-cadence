import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { signup, testContext } from './helpers.js';

describe('data isolation', () => {
  let app;
  let pool;
  beforeEach(async () => ({ app, pool } = await testContext()));
  afterEach(async () => pool?.end());

  it('does not expose User A contacts to User B', async () => {
    const userA = request.agent(app);
    const userB = request.agent(app);
    await signup(userA, 'a@example.com');
    await signup(userB, 'b@example.com');

    const created = await userA.post('/api/contacts').send({ name: 'Private Contact', organization: 'Haas' });
    expect(created.status).toBe(201);

    const list = await userB.get('/api/contacts');
    expect(list.status).toBe(200);
    expect(list.body.contacts).toEqual([]);

    const detail = await userB.get(`/api/contacts/${created.body.contact.id}`);
    expect(detail.status).toBe(404);
  });
});
