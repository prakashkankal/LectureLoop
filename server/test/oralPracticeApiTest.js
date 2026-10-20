import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import oralPracticeRoutes from '../src/routes/oralPracticeRoutes.js';

const secret = process.env.JWT_SECRET || 'lectureloop_dev_secret_key_2026';
const userId = 'mem_oral_practice_test';
const token = jwt.sign({ id: userId, role: 'student' }, secret, { expiresIn: '1h' });

async function run() {
  const app = express();
  app.use(express.json());
  app.use('/api/oral-practice', oralPracticeRoutes);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/oral-practice`;

  try {
    const unauthorized = await fetch(`${baseUrl}/materials`);
    assert.equal(unauthorized.status, 401, 'Oral practice endpoints must require authentication');

    const headers = {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    };
    const materials = await fetch(`${baseUrl}/materials`, { headers });
    assert.equal(materials.status, 200);
    assert.deepEqual((await materials.json()).data, []);

    const questionsResponse = await fetch(`${baseUrl}/questions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        material: {
          subject: 'Databases',
          lecture: 'Normalization',
          topic: 'Functional dependencies',
          notes: 'A functional dependency means one set of attributes determines another set of attributes.',
          keyTerms: ['functional dependency'],
        },
        difficulty: 'intermediate',
        count: 5,
      }),
    });
    assert.equal(questionsResponse.status, 200);
    const questionsPayload = await questionsResponse.json();
    assert.equal(questionsPayload.data.provider, 'local');
    assert(questionsPayload.data.questions.length > 0);

    const history = await fetch(`${baseUrl}/attempts`, { headers });
    assert.equal(history.status, 503, 'History should clearly report that persistence is unavailable offline');
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }

  console.log('✓ Oral practice authenticated API tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
