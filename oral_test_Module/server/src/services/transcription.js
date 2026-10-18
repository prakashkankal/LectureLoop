import { toFile } from 'openai/uploads';
import { getAIClient } from './ai.js';

export async function transcribe(buffer, filename, language) {
  const ai = getAIClient();
  if (!ai) throw new Error('Speech-to-text is not configured. Use browser recognition or type your answer.');
  const file = await toFile(buffer, filename, { type: 'audio/webm' });
  const response = await ai.audio.transcriptions.create({
    file,
    model: process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe',
    ...(language ? { language } : {}),
  });
  return response.text?.trim() || '';
}