import OpenAI from 'openai';

let client;

export function getAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  client ||= new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 30000, maxRetries: 1 });
  return client;
}

export async function requestJSON(system, prompt) {
  const ai = getAIClient();
  if (!ai) return null;
  const response = await ai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
  });
  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error('AI returned an empty response.');
  return JSON.parse(text);
}