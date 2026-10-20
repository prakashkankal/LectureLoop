import assert from 'node:assert/strict';
import {
  getApiKeyFallbacks,
  getAnalysisProviderOrder,
  getGroqModelFallbacks,
  buildTranscriptTopics,
} from '../src/services/aiService.js';

const defaults = getGroqModelFallbacks('');
assert.deepEqual(defaults, [
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b',
]);

const configured = getGroqModelFallbacks('custom/model');
assert.equal(configured[0], 'custom/model');
assert.deepEqual(configured.slice(1), defaults);
assert.deepEqual(
  getGroqModelFallbacks(' openai/gpt-oss-120b '),
  ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b']
);
assert(!defaults.some((model) => ['llama-3.3-70b-versatile', 'llama3-8b-8192', 'gemma2-9b-it'].includes(model)));

assert.deepEqual(
  getApiKeyFallbacks('first-key, second-key', 'second-key', '', 'third-key'),
  ['first-key', 'second-key', 'third-key']
);
assert.deepEqual(getApiKeyFallbacks(undefined, 'single-key'), ['single-key']);
assert.deepEqual(getAnalysisProviderOrder('lecture_topics'), ['meta', 'openai', 'gemini', 'groq', 'anthropic']);
assert.deepEqual(getAnalysisProviderOrder('lecture_quizzes'), ['anthropic', 'openai', 'meta', 'gemini', 'groq']);

const topics = buildTranscriptTopics([
  {
    index: 1,
    title: 'Introduction',
    startTime: '00:00',
    endTime: '00:30',
    summary: 'Welcome and course goals.',
    keyTerms: ['Goals'],
  },
  {
    index: 2,
    title: 'Variables',
    startTime: '00:30',
    endTime: '03:40',
    summary: 'How variables store values.',
    keyTerms: ['Variables'],
  },
  {
    index: 3,
    title: 'Loops',
    startTime: '03:40',
    endTime: '08:22',
    summary: 'Repeating operations with loops.',
    keyTerms: ['Loops'],
  },
  {
    index: 4,
    title: 'Conditionals',
    startTime: '08:22',
    endTime: '14:10',
    summary: 'Branching with conditional logic.',
    keyTerms: ['Conditionals'],
  },
]);
assert.equal(topics.length, 3, 'Introduction should merge into the first substantive topic');
assert.equal(topics[0].title, 'Variables');
assert.equal(topics[0].startTime, '00:00');
assert.equal(topics[0].endTime, '03:40');
assert.deepEqual(
  topics.map((topic) => topic.endSec - topic.startSec),
  [220, 282, 348],
  'Topic durations should follow transcript topic boundaries rather than fixed intervals'
);
assert.throws(
  () => buildTranscriptTopics([
    {
      title: 'First',
      startTime: '00:00',
      endTime: '02:00',
      summary: 'First topic',
      keyTerms: [],
    },
    {
      title: 'Overlapping',
      startTime: '01:00',
      endTime: '03:00',
      summary: 'Overlapping topic',
      keyTerms: [],
    },
  ]),
  /overlapping timestamps/,
  'Overlapping segment timestamps should be rejected'
);

console.log('✓ AI service provider order and direct transcript topic tests passed');
