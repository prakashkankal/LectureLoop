import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

function timeToSeconds(timeStr) {
  if (typeof timeStr !== 'string') return Number.NaN;
  const parts = timeStr.split(':').map(Number);
  if (parts.some((part) => !Number.isInteger(part) || part < 0)) return Number.NaN;
  if (parts.length === 2 && parts[1] < 60) return parts[0] * 60 + parts[1];
  if (parts.length === 3 && parts[1] < 60 && parts[2] < 60) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return Number.NaN;
}

const topicSchema = {
  type: 'object',
  properties: {
    topics: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          title: { type: 'string' },
          startTime: { type: 'string' },
          endTime: { type: 'string' },
          summary: { type: 'string' },
          keyTerms: { type: 'array', items: { type: 'string' } },
        },
        required: ['index', 'title', 'startTime', 'endTime', 'summary', 'keyTerms'],
        additionalProperties: false,
      },
    },
  },
  required: ['topics'],
  additionalProperties: false,
};

const quizSchema = {
  type: 'object',
  properties: {
    quizzes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topicIndex: { type: 'integer' },
          quizIndex: { type: 'integer' },
          question: { type: 'string' },
          options: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
                text: { type: 'string' },
              },
              required: ['id', 'text'],
              additionalProperties: false,
            },
          },
          correctId: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
          explanation: { type: 'string' },
        },
        required: ['topicIndex', 'quizIndex', 'question', 'options', 'correctId', 'explanation'],
        additionalProperties: false,
      },
    },
  },
  required: ['quizzes'],
  additionalProperties: false,
};

function toGeminiSchema(schema) {
  const converted = {};
  if (schema.type) converted.type = schema.type.toUpperCase();
  if (schema.description) converted.description = schema.description;
  if (schema.enum) converted.enum = schema.enum;
  if (schema.required) converted.required = schema.required;
  if (schema.properties) {
    converted.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, value]) => [key, toGeminiSchema(value)])
    );
  }
  if (schema.items) converted.items = toGeminiSchema(schema.items);
  return converted;
}

async function generateOpenAI(client, model, name, schema, instructions, input) {
  const response = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      { role: 'system', content: instructions },
      { role: 'user', content: input },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name, strict: true, schema },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error(`OpenAI returned an empty ${name} response`);
  return JSON.parse(content);
}

async function generateGroq(apiKey, model, name, schema, instructions, input) {
  const groq = new OpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
    timeout: 120_000,
  });

  const response = await groq.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: `${instructions}\n\nYou must reply ONLY with a valid JSON object strictly matching this schema: ${JSON.stringify(schema)}. Do not output markdown code blocks or any explanation outside the JSON.`,
      },
      { role: 'user', content: input },
    ],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error(`Groq returned an empty ${name} response`);
  return JSON.parse(content);
}

async function generateOpenAICompatible(apiKey, baseURL, model, providerName, name, schema, instructions, input) {
  const client = new OpenAI({ apiKey, baseURL, timeout: 120_000 });
  const response = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: `${instructions}\n\nReply only with valid JSON matching this schema: ${JSON.stringify(schema)}.`,
      },
      { role: 'user', content: input },
    ],
    response_format: { type: 'json_object' },
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error(`${providerName} returned an empty ${name} response`);
  return JSON.parse(content);
}

async function generateAnthropic(apiKey, model, name, schema, instructions, input) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: AbortSignal.timeout(120_000),
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system: instructions,
      messages: [{ role: 'user', content: input }],
      output_config: {
        format: {
          type: 'json_schema',
          schema,
        },
      },
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `Anthropic returned HTTP ${response.status}`);
  }
  const content = data.content?.find((item) => item.type === 'text')?.text;
  if (!content) throw new Error(`Anthropic returned an empty ${name} response`);
  return JSON.parse(content);
}

async function generateGemini(client, modelName, schema, instructions, input) {
  const model = client.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: toGeminiSchema(schema),
    },
  });
  const result = await model.generateContent(`${instructions}\n\n${input}`);
  const content = result.response.text();
  if (!content) throw new Error(`Gemini returned an empty response`);
  return JSON.parse(content);
}

const introductoryIdeaPattern = /\b(intro(?:duction)?|welcome|agenda|learning objectives?|course overview)\b/i;

export function buildTranscriptTopics(sectionGroups) {
  if (!Array.isArray(sectionGroups) || sectionGroups.length === 0) {
    throw new Error('The model returned no topic sections');
  }

  let groups = sectionGroups.map((group) => ({ ...group }));
  let previousEnd = -1;
  for (let index = 0; index < groups.length; index++) {
    const group = groups[index];
    const startSec = timeToSeconds(group.startTime);
    const endSec = timeToSeconds(group.endTime);
    if (!Number.isFinite(startSec) || !Number.isFinite(endSec) || endSec <= startSec) {
      throw new Error(`The model returned an invalid time range for topic ${index + 1}`);
    }
    if (startSec < previousEnd) {
      throw new Error(`The model returned overlapping timestamps for topic ${index + 1}`);
    }
    previousEnd = endSec;
  }

  if (
    groups.length > 1
    && introductoryIdeaPattern.test(`${groups[0].title} ${groups[0].summary}`)
  ) {
    const [introSection, firstTopic] = groups;
    groups = [{
      ...introSection,
      title: firstTopic.title,
      endTime: firstTopic.endTime,
      summary: [introSection.summary, firstTopic.summary].filter(Boolean).join(' '),
      keyTerms: [...new Set([...(introSection.keyTerms || []), ...(firstTopic.keyTerms || [])])],
    }, ...groups.slice(2)];
  }

  return groups.map((group, index) => {
    const startSec = timeToSeconds(group.startTime);
    const endSec = timeToSeconds(group.endTime);
    if (!Number.isFinite(startSec) || !Number.isFinite(endSec) || endSec <= startSec) {
      throw new Error(`Topic "${group.title || index + 1}" has no valid duration`);
    }
    return {
      index: Number.isInteger(group.index) ? group.index : index + 1,
      title: (group.title || `Topic ${index + 1}`).trim(),
      startTime: group.startTime,
      endTime: group.endTime,
      startSec,
      endSec,
      summary: (group.summary || '').trim() || `Overview and discussion of ${group.title || `Topic ${index + 1}`}.`,
      keyTerms: Array.isArray(group.keyTerms) && group.keyTerms.length ? group.keyTerms : [group.title || `Topic ${index + 1}`],
      completed: false,
    };
  });
}

export function getGroqModelFallbacks(configuredModel = process.env.GROQ_CHAT_MODEL) {
  return [...new Set([
    configuredModel?.trim(),
    'openai/gpt-oss-120b',
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-20b',
  ].filter(Boolean))];
}

export function getApiKeyFallbacks(...configuredKeys) {
  return [...new Set(configuredKeys
    .flatMap((keys) => (keys || '').split(','))
    .map((key) => key.trim())
    .filter(Boolean))];
}

export function getAnalysisProviderOrder(name) {
  if (name === 'lecture_quizzes') {
    return ['anthropic', 'openai', 'meta', 'gemini', 'groq'];
  }
  return ['meta', 'openai', 'gemini', 'groq', 'anthropic'];
}

async function generateStructured(name, schema, instructions, input) {
  const errors = [];
  const openAIKeys = getApiKeyFallbacks(
    process.env.OPENAI_API_KEYS,
    process.env.OPENAI_API_KEY,
    process.env.OPEN_AI_API,
    process.env['OPEN-AI-API']
  );
  const groqKeys = getApiKeyFallbacks(
    process.env.GROQ_API_KEYS,
    process.env.GROQ_API_KEY,
    process.env.WISPER_API_KEY
  );
  const metaKeys = getApiKeyFallbacks(process.env.META_API_KEYS, process.env.META_API_KEY, process.env.MODEL_API_KEY);
  const anthropicKeys = getApiKeyFallbacks(process.env.ANTHROPIC_API_KEYS, process.env.ANTHROPIC_API_KEY);
  const geminiKeys = getApiKeyFallbacks(process.env.GEMINI_API_KEYS, process.env.GEMINI_API_KEY);

  for (const provider of getAnalysisProviderOrder(name)) {
    if (provider === 'anthropic') {
      for (const apiKey of anthropicKeys) {
        try {
          return await generateAnthropic(
            apiKey,
            process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
            name,
            schema,
            instructions,
            input
          );
        } catch (err) {
          console.warn(`[AI Service] Anthropic ${name} failed (${err.message}); trying next provider.`);
          errors.push(`Anthropic: ${err.message}`);
        }
      }
    } else if (provider === 'openai') {
      for (const apiKey of openAIKeys) {
        try {
          const openAI = new OpenAI({ apiKey, timeout: 120_000 });
          return await generateOpenAI(
            openAI,
            process.env.OPENAI_MODEL || 'gpt-4o-mini',
            name,
            schema,
            instructions,
            input
          );
        } catch (err) {
          console.warn(`[AI Service] OpenAI ${name} failed (${err.message}); trying next provider.`);
          errors.push(`OpenAI: ${err.message}`);
        }
      }
    } else if (provider === 'meta') {
      for (const apiKey of metaKeys) {
        try {
          return await generateOpenAICompatible(
            apiKey,
            'https://api.meta.ai/v1',
            process.env.META_MODEL || 'muse-spark-1.3',
            'Meta Model API',
            name,
            schema,
            instructions,
            input
          );
        } catch (err) {
          console.warn(`[AI Service] Meta ${name} failed (${err.message}); trying next provider.`);
          errors.push(`Meta: ${err.message}`);
        }
      }
    } else if (provider === 'gemini') {
      for (const apiKey of geminiKeys) {
        try {
          return await generateGemini(
            new GoogleGenerativeAI(apiKey),
            process.env.GEMINI_MODEL || 'gemini-2.5-flash',
            schema,
            instructions,
            input
          );
        } catch (err) {
          console.warn(`[AI Service] Gemini ${name} failed (${err.message}); trying next provider.`);
          errors.push(`Gemini: ${err.message}`);
        }
      }
    } else if (provider === 'groq') {
      for (const apiKey of groqKeys) {
        for (const model of getGroqModelFallbacks()) {
          try {
            return await generateGroq(apiKey, model, name, schema, instructions, input);
          } catch (err) {
            console.warn(`[AI Service] Groq (${model}) ${name} failed (${err.message}); trying next option.`);
            errors.push(`Groq (${model}): ${err.message}`);
          }
        }
      }
    }
  }

  throw new Error(
    errors.length
      ? errors.join('; ')
      : 'Set an API key for Anthropic, OpenAI, Meta, Gemini, or Groq in the server environment'
  );
}

/**
 * Analyze the complete timestamped transcript and generate topic segments and five quizzes per topic.
 *
 * @returns {{ topics: Array, quizzes: Array }}
 */
export async function analyzeTranscript(fullText, lectureTitle = 'Lecture') {
  if (typeof fullText !== 'string' || !fullText.trim()) {
    throw new Error('Transcript is empty');
  }

  let topics;
  try {
    const result = await generateStructured(
      'lecture_topics',
      topicSchema,
      'You are an expert educational content analyzer. Analyze the complete timestamped transcript below and segment it into video sections at real semantic topic transitions. Do not create a summary first, and do not divide by elapsed time, fixed-length windows, caption boundaries, or a target number of sections. Each section must represent one coherent topic; keep related consecutive discussion together. Start and end times must be taken from timestamps in the transcript, be chronological and non-overlapping, and cover the relevant discussion. If the opening is only an introduction, include it in the first substantive topic section instead of creating a separate intro section. Return concise titles (8 words maximum), a clear two-sentence description of each section, and 3-5 key terms.',
      `Lecture title: "${lectureTitle}"\nComplete timestamped transcript:\n${fullText}`
    );

    topics = buildTranscriptTopics(result.topics);
  } catch (err) {
    throw new Error(`Topic analysis failed: ${err.message}`);
  }

  const validLetters = ['A', 'B', 'C', 'D'];
  const quizBatches = [];
  for (let i = 0; i < topics.length; i += 3) {
    quizBatches.push(topics.slice(i, i + 3));
  }

  const quizzes = [];
  let nextBatch = 0;
  const workerCount = Math.min(2, quizBatches.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (nextBatch < quizBatches.length) {
      const batch = quizBatches[nextBatch];
      nextBatch += 1;
      const batchLabel = batch.map((topic) => topic.index).join(', ');
      try {
        const result = await generateStructured(
          'lecture_quizzes',
          quizSchema,
          'Create up to five distinct, clear multiple-choice questions for each supplied topic, testing different important ideas. Return each question with the exact topicIndex from its topic. Each question must have four distinct answer options (A, B, C, D), one correct answer id, and a concise explanation. Do not mix content between topics.',
          `Topics:\n${JSON.stringify(batch.map(({ index, title, summary, keyTerms }) => ({
            topicIndex: index,
            title,
            summary,
            keyTerms,
          })))}`
        );

        if (!Array.isArray(result.quizzes)) {
          throw new Error('The model returned no quiz list');
        }

        for (const topic of batch) {
          const topicQuizzes = result.quizzes
            .filter((quiz) => quiz.topicIndex === topic.index)
            .slice(0, 5);

          for (const [index, quiz] of topicQuizzes.entries()) {
            let options = Array.isArray(quiz.options) ? quiz.options : [];
            options = options.slice(0, 4).map((option, optionIndex) => ({
              id: validLetters[optionIndex],
              text: typeof option === 'string' ? option : (option?.text || `Option ${validLetters[optionIndex]}`),
            }));
            while (options.length < 4) {
              const nextLetter = validLetters[options.length];
              options.push({ id: nextLetter, text: `Option ${nextLetter}` });
            }
            const correctId = quiz.correctId && validLetters.includes(quiz.correctId.toUpperCase())
              ? quiz.correctId.toUpperCase()
              : 'A';
            quizzes.push({
              topicIndex: topic.index,
              quizIndex: index + 1,
              question: quiz.question || `What is a key concept in ${topic.title}?`,
              options,
              correctId,
              explanation: quiz.explanation || `Correct answer is ${correctId}.`,
            });
          }
        }
      } catch (err) {
        console.warn(`[AI Service] Quiz generation for topics ${batchLabel} failed: ${err.message}`);
      }
    }
  });
  await Promise.all(workers);

  if (quizzes.length === 0) {
    throw new Error('Checkpoint quiz generation failed: no valid quizzes were generated.');
  }

  return { topics, quizzes };
}
