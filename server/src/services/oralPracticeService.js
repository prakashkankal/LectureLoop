import OpenAI from 'openai';
import { randomUUID } from 'node:crypto';

const defaultFillers = ['um', 'uh', 'actually', 'basically', 'you know', 'like'];
const words = (text) => text.toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/g) || [];
const getApiKeys = () => [...new Set(
  [process.env.OPENAI_API_KEYS, process.env.OPENAI_API_KEY]
    .flatMap((keys) => (keys || '').split(','))
    .map((key) => key.trim())
    .filter(Boolean)
)];

export function analyzeFillers(text) {
  const configured = process.env.FILLER_EXPRESSIONS
    ? process.env.FILLER_EXPRESSIONS.split(',').map((phrase) => phrase.trim().toLowerCase()).filter(Boolean)
    : defaultFillers;
  return configured.flatMap((phrase) => {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const count = [...text.matchAll(new RegExp(`\\b${escaped}\\b`, 'gi'))].length;
    return count ? [{ phrase, count }] : [];
  });
}

async function requestJSON(system, prompt) {
  const keys = getApiKeys();
  if (!keys.length) return null;

  const errors = [];
  for (const apiKey of keys) {
    try {
      const client = new OpenAI({ apiKey, timeout: 30_000, maxRetries: 0 });
      const response = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
      });
      const text = response.choices[0]?.message?.content;
      if (!text) throw new Error('AI returned an empty response');
      return JSON.parse(text);
    } catch (error) {
      errors.push(error.message);
      console.warn(`[Oral Practice] OpenAI request failed (${error.message}); trying the next configured key.`);
    }
  }
  throw new Error(`All configured OpenAI keys failed: ${errors.join('; ')}`);
}

function localQuestions(material, difficulty, count) {
  const sentences = material.notes.match(/[^.!?]+[.!?]*/g)
    ?.map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 25) || [];
  if (!sentences.length && material.notes.trim()) sentences.push(material.notes.trim());
  return sentences.slice(0, count).map((sentence, index) => ({
    id: randomUUID(),
    question: index === 0
      ? `Explain the central idea in ${material.topic}.`
      : `Explain this idea in your own words: ${sentence.replace(/[.!?]+$/, '')}`,
    focus: sentence,
    modelAnswer: sentence,
    keyTerms: material.keyTerms.filter((term) => sentence.toLowerCase().includes(term.toLowerCase())),
    difficulty,
  }));
}

export async function generateQuestions(material, difficulty, count) {
  const generated = await requestJSON(
    'Create oral-practice questions grounded only in the supplied notes. Return JSON with a questions array; each item must include question, focus, modelAnswer, and keyTerms. Do not add unsupported facts.',
    JSON.stringify({ notes: material.notes, topic: material.topic, difficulty, count })
  );
  if (!generated) return { questions: localQuestions(material, difficulty, count), provider: 'local' };
  if (!Array.isArray(generated.questions) || generated.questions.length === 0) {
    throw new Error('Question service returned no valid questions.');
  }
  const questions = generated.questions.slice(0, count).map((item) => {
    if (![item.question, item.focus, item.modelAnswer].every((value) => typeof value === 'string' && value.trim())) {
      throw new Error('Question service returned an incomplete question.');
    }
    return {
      id: randomUUID(),
      question: item.question.trim(),
      focus: item.focus.trim(),
      modelAnswer: item.modelAnswer.trim(),
      keyTerms: Array.isArray(item.keyTerms) ? item.keyTerms.filter((term) => typeof term === 'string') : [],
      difficulty,
    };
  });
  return { questions, provider: 'openai' };
}

function localEvaluation({ answer, question, material, durationSeconds }) {
  const answerWords = words(answer);
  const evidenceWords = new Set(words(`${question.focus} ${question.modelAnswer} ${material.keyTerms.join(' ')}`));
  const matched = [...new Set(answerWords.filter((word) => word.length > 3 && evidenceWords.has(word)))];
  const coverage = Math.min(1, matched.length / Math.max(5, Math.min(15, evidenceWords.size * 0.45)));
  const contentScore = Math.round(coverage * 100) / 10;
  const sentenceCount = (answer.match(/[.!?](?:\s|$)/g) || []).length;
  const languageScore = Math.max(1, Math.min(10, 5 + Math.min(3, sentenceCount) + (answerWords.length >= 12 ? 1 : 0) - (answerWords.length < 4 ? 3 : 0)));
  const correctTerms = material.keyTerms.filter((term) => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(answer));
  const missingTerms = material.keyTerms.filter((term) => !correctTerms.includes(term));
  const seconds = Number(durationSeconds) || 0;
  return {
    contentScore,
    languageScore,
    scoreReasons: {
      content: 'Local estimate based on overlap with the supplied notes; it is not a complete semantic assessment.',
      language: 'Local estimate based on response length and sentence punctuation, not a full grammar assessment.',
    },
    correctedEnglish: answer,
    modelAnswer: question.modelAnswer,
    differences: matched.length
      ? [`Concepts recognized from the notes: ${matched.slice(0, 8).join(', ')}.`]
      : ['The response did not clearly match key ideas in the supplied notes.'],
    grammarCorrections: [],
    claritySuggestions: answerWords.length < 12
      ? ['Add a complete sentence explaining how or why the concept works.']
      : ['Organize the explanation as a definition, mechanism, and example.'],
    vocabulary: {
      correct: correctTerms.map((term) => ({ term, explanation: `This term appears in the source notes: ${term}.` })),
      missing: missingTerms.map((term) => ({ term, explanation: `Review the source notes for ${term}.` })),
      incorrect: [],
      coverage: material.keyTerms.length ? Math.round((correctTerms.length / material.keyTerms.length) * 100) : 0,
    },
    fillers: analyzeFillers(answer),
    paceWpm: seconds ? Math.round((answerWords.length / seconds) * 60) : 0,
    paceLabel: seconds ? 'Approximate pace based on total answer duration; pauses are included.' : 'Not measured for typed answers.',
    speakingSuggestion: 'Pause briefly between key ideas and explain each one in your own words.',
    evaluationMode: 'local heuristic',
  };
}

export async function evaluateAnswer(input) {
  const result = await requestJSON(
    'Assess an oral answer only against the supplied notes and question. Return JSON with numeric contentScore and languageScore from 0 to 10, scoreReasons {content, language}, correctedEnglish, modelAnswer, differences array, grammarCorrections array of {original, corrected, reason}, claritySuggestions, vocabulary {correct, missing, incorrect arrays of {term, explanation}, coverage from 0 to 100}, fillers array of {phrase,count}, paceWpm, paceLabel, speakingSuggestion. Do not invent facts.',
    JSON.stringify(input)
  );
  if (!result) return { ...localEvaluation(input), evaluationMode: 'local heuristic' };
  if (
    !Number.isFinite(result.contentScore)
    || !Number.isFinite(result.languageScore)
    || result.contentScore < 0 || result.contentScore > 10
    || result.languageScore < 0 || result.languageScore > 10
  ) {
    throw new Error('Evaluation service returned invalid scores.');
  }
  return {
    ...localEvaluation(input),
    ...result,
    contentScore: result.contentScore,
    languageScore: result.languageScore,
    evaluationMode: 'openai',
  };
}

export async function assistLanguage(text) {
  const result = await requestJSON(
    'Translate the supplied Hindi-English mixed response into natural English while preserving its meaning and technical terms. Return JSON {translation, usefulPhrases:[{phrase,meaning}], practiceAnswer}. Do not add facts.',
    JSON.stringify({ text })
  );
  if (result && typeof result.translation === 'string' && typeof result.practiceAnswer === 'string') {
    return { ...result, assistanceMode: 'AI language practice support; not an independent assessment.' };
  }
  return {
    translation: text,
    usefulPhrases: [
      { phrase: 'The key idea is...', meaning: 'Introduce the central concept.' },
      { phrase: 'This leads to...', meaning: 'Explain a result or consequence.' },
      { phrase: 'For example...', meaning: 'Introduce a relevant example.' },
    ],
    practiceAnswer: text,
    assistanceMode: 'Translation unavailable without an AI provider. Original text is shown unchanged.',
  };
}

export async function transcribeAudio(buffer, mimetype, language) {
  const keys = getApiKeys();
  if (!keys.length) throw new Error('Audio transcription requires OPENAI_API_KEY; use browser speech recognition or type your answer instead.');
  const errors = [];
  for (const apiKey of keys) {
    try {
      const form = new FormData();
      form.append('file', new Blob([buffer], { type: mimetype }), 'answer-audio');
      form.append('model', process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1');
      if (language) form.append('language', language);
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}` },
        body: form,
        signal: AbortSignal.timeout(120_000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || `OpenAI transcription failed with HTTP ${response.status}`);
      if (typeof data.text !== 'string' || !data.text.trim()) throw new Error('Transcription returned an empty response.');
      return data.text.trim();
    } catch (error) {
      errors.push(error.message);
      console.warn(`[Oral Practice] Audio transcription failed (${error.message}); trying the next configured key.`);
    }
  }
  throw new Error(`All configured transcription keys failed: ${errors.join('; ')}`);
}
