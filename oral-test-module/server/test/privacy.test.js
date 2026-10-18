import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('attempt history and deletion are scoped to the authenticated account', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'oral-practice-'));
  process.env.DATA_DIR = directory;
  process.env.JWT_SECRET = 'test-secret-for-isolation';
  const { initializeDatabase } = await import('../src/db/sqlite.js');
  const { createApp } = await import('../src/app.js');
  await initializeDatabase();
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const post = async (endpoint, body, token) => fetch(`${base}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });

  try {
    const accountAResponse = await post('/auth/register', { name: 'Learner A', email: 'learner-a@example.test', password: 'long-test-password' });
    const accountBResponse = await post('/auth/register', { name: 'Learner B', email: 'learner-b@example.test', password: 'long-test-password' });
    const accountA = await accountAResponse.json();
    const accountB = await accountBResponse.json();
    assert.equal(accountAResponse.status, 201);
    assert.equal(accountBResponse.status, 201);
    assert.equal((await fetch(`${base}/attempts`, { headers: { Authorization: `Bearer ${accountA.token}` } })).status, 200);

    const material = { subject: 'DBMS', lecture: 'Keys', topic: 'Candidate keys', notes: 'A candidate key is a minimal set of attributes that uniquely identifies every row in a relation.', keyTerms: ['candidate key', 'attributes', 'relation'] };
    const question = { question: 'Explain a candidate key.', focus: material.notes, modelAnswer: material.notes, keyTerms: material.keyTerms };
    const evaluationResponse = await post('/evaluate', { material, question, answer: 'A candidate key is a minimal set of attributes that identifies every row.', durationSeconds: 20 }, accountA.token);
    assert.equal(evaluationResponse.status, 200);
    const attempt = (await evaluationResponse.json()).attempt;
    const accountAAttempts = await fetch(`${base}/attempts`, { headers: { Authorization: `Bearer ${accountA.token}` } }).then((response) => response.json());
    const accountBAttempts = await fetch(`${base}/attempts`, { headers: { Authorization: `Bearer ${accountB.token}` } }).then((response) => response.json());
    assert.equal(accountAAttempts.attempts.length, 1);
    assert.equal(accountAAttempts.attempts[0].material.notes, material.notes);
    assert.equal(accountBAttempts.attempts.length, 0);

    const foreignDelete = await fetch(`${base}/attempts/${attempt.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accountB.token}` } });
    assert.equal(foreignDelete.status, 404);
    const ownerDelete = await fetch(`${base}/attempts/${attempt.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accountA.token}` } });
    assert.equal(ownerDelete.status, 204);
    const guestA = randomUUID();
    const guestB = randomUUID();
    const guestHeaders = (id) => ({ 'X-Practice-Guest': id });
    assert.equal((await fetch(`${base}/materials`, { headers: guestHeaders(guestA) })).status, 200);
    assert.equal((await fetch(`${base}/attempts`)).status, 401);
    const guestEvaluation = await fetch(`${base}/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...guestHeaders(guestA) },
      body: JSON.stringify({ material, question, answer: 'A candidate key is a minimal set of attributes that identifies every row.', durationSeconds: 20 }),
    });
    assert.equal(guestEvaluation.status, 200);
    const guestAAttempts = await fetch(`${base}/attempts`, { headers: guestHeaders(guestA) }).then((response) => response.json());
    const guestBAttempts = await fetch(`${base}/attempts`, { headers: guestHeaders(guestB) }).then((response) => response.json());
    assert.equal(guestAAttempts.attempts.length, 1);
    assert.equal(guestBAttempts.attempts.length, 0);
  } finally {
    server.close();
    await once(server, 'close');
    fs.rmSync(directory, { recursive: true, force: true });
  }
});