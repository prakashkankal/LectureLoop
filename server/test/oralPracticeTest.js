import assert from 'node:assert/strict';
import {
  analyzeFillers,
  assistLanguage,
  evaluateAnswer,
  generateQuestions,
} from '../src/services/oralPracticeService.js';

delete process.env.OPENAI_API_KEY;
delete process.env.OPENAI_API_KEYS;

const material = {
  subject: 'Databases',
  lecture: 'Normalization',
  topic: 'Functional dependencies',
  notes: 'A functional dependency means one set of attributes determines another set of attributes. Candidate keys uniquely identify each row.',
  keyTerms: ['functional dependency', 'candidate keys'],
};

const generated = await generateQuestions(material, 'intermediate', 5);
assert.equal(generated.provider, 'local');
assert(generated.questions.length > 0);
assert(generated.questions.every((question) => question.modelAnswer.length > 0));

const evaluation = await evaluateAnswer({
  answer: 'A functional dependency means one set of attributes determines another set.',
  question: generated.questions[0],
  material,
  durationSeconds: 30,
  mode: 'english-assessment',
});
assert.equal(evaluation.evaluationMode, 'local heuristic');
assert(evaluation.contentScore >= 0 && evaluation.contentScore <= 10);
assert(evaluation.languageScore >= 0 && evaluation.languageScore <= 10);
assert.equal(evaluation.paceWpm, 22);

assert.deepEqual(analyzeFillers('Um, the answer is basically normalization.'), [
  { phrase: 'um', count: 1 },
  { phrase: 'basically', count: 1 },
]);

const languageResult = await assistLanguage('Normalization reduces repeated data.');
assert.equal(languageResult.translation, 'Normalization reduces repeated data.');
assert.match(languageResult.assistanceMode, /unavailable/);

console.log('✓ Oral practice local fallback tests passed');
