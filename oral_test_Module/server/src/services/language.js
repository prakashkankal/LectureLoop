import { requestJSON } from './ai.js';

export async function assistLanguage(text) {
  const result = await requestJSON(
    'Translate the supplied Hindi-English mixed response into natural English while preserving its meaning and technical terms. Return JSON {translation, usefulPhrases:[{phrase,meaning}], practiceAnswer}. Do not add facts.',
    JSON.stringify({ text }),
  );
  if (result && typeof result.translation === 'string' && typeof result.practiceAnswer === 'string') {
    return { ...result, assistanceMode: 'AI translation; not an independent assessment.' };
  }
  return {
    translation: text,
    usefulPhrases: [
      { phrase: 'The key idea is...', meaning: 'Introduce the central concept.' },
      { phrase: 'This leads to...', meaning: 'Explain a result or consequence.' },
      { phrase: 'For example...', meaning: 'Introduce a relevant example.' },
    ],
    practiceAnswer: text,
    assistanceMode: 'Translation unavailable without an AI provider. Original text shown unchanged.',
  };
}