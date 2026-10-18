import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeFillers, evaluateAnswer } from '../src/services/assessment.js';

const material = {
  subject: 'Database Systems',
  lecture: 'Relational normalization',
  topic: 'Candidate keys',
  notes: 'A candidate key is a minimal set of attributes that uniquely identifies every row in a relation. A superkey can contain extra attributes.',
  keyTerms: ['candidate key', 'attributes', 'superkey', 'relation'],
};
const question = {
  question: 'What distinguishes a candidate key from a superkey?',
  focus: 'A candidate key is minimal; a superkey may have extra attributes.',
  modelAnswer: 'A candidate key is a minimal set of attributes that uniquely identifies each row. A superkey may include unnecessary attributes.',
  keyTerms: ['candidate key', 'superkey'],
};

test('filler analysis counts configured expressions and avoids meaningful like', () => {
  delete process.env.FILLER_EXPRESSIONS;
  assert.deepEqual(analyzeFillers('Um, you know, it is basically a key.'), [
    { phrase: 'um', count: 1 },
    { phrase: 'you know', count: 1 },
    { phrase: 'basically', count: 1 },
  ]);
  assert.deepEqual(analyzeFillers('I like relational databases.'), []);
  assert.deepEqual(analyzeFillers('Like, a candidate key is minimal.'), [{ phrase: 'like (possible filler)', count: 1 }]);
});

test('local evaluation favors a source-grounded answer over an unrelated response', async () => {
  delete process.env.OPENAI_API_KEY;
  const correct = await evaluateAnswer({ answer: 'A candidate key is a minimal set of attributes that identifies every row. A superkey may have extra attributes.', question, material, durationSeconds: 24 });
  const unrelated = await evaluateAnswer({ answer: 'I enjoy sunny weather and walking after college.', question, material, durationSeconds: 12 });
  assert.ok(correct.contentScore > unrelated.contentScore);
  assert.equal(correct.evaluationMode, 'local heuristic');
  assert.equal(correct.modelAnswer, question.modelAnswer);
  assert.equal(correct.paceLabel.includes('Approximate'), true);
  assert.equal(correct.overallScore, Math.round(((correct.contentScore + correct.languageScore) / 2) * 10) / 10);
});

test('score values remain within the configured 0–10 rubric', async () => {
  delete process.env.OPENAI_API_KEY;
  const evaluation = await evaluateAnswer({ answer: 'A candidate key uniquely identifies each row.', question, material, durationSeconds: 10 });
  assert.ok(evaluation.contentScore >= 0 && evaluation.contentScore <= 10);
  assert.ok(evaluation.languageScore >= 0 && evaluation.languageScore <= 10);
});