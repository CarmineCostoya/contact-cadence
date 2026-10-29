import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { signup, testContext } from './helpers.js';

function localDate(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

describe('dashboard summary', () => {
  let app;
  let pool;
  beforeEach(async () => ({ app, pool } = await testContext()));
  afterEach(async () => pool?.end());

  it('counts only interactions in the current month', async () => {
    const agent = request.agent(app);
    await signup(agent, 'dashboard@example.com');
    const contact = await agent.post('/api/contacts').send({ name: 'Dashboard Contact' });
    const id = contact.body.contact.id;
    const now = new Date();
    const thisMonthA = localDate(now.getFullYear(), now.getMonth(), 1);
    const thisMonthB = localDate(now.getFullYear(), now.getMonth(), Math.min(2, now.getDate()));
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    const previousMonth = localDate(previous.getFullYear(), previous.getMonth(), previous.getDate());

    for (const occurredOn of [thisMonthA, thisMonthB, previousMonth]) {
      const response = await agent.post(`/api/contacts/${id}/interactions`).send({ interactionType: 'Meeting', occurredOn });
      expect(response.status).toBe(201);
    }

    const dashboard = await agent.get('/api/dashboard');
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.interactionsThisMonth).toBe(2);
  });
});
