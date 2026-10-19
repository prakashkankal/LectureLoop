import OpenAI, { toFile } from 'openai';

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error('Audio analysis is not configured. Add OPENAI_API_KEY to the server environment.');
    error.statusCode = 503;
    throw error;
  }

  return new OpenAI({ apiKey });
};

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

export const validateGeneratedAnalysis = (analysis) => {
  if (
    !analysis
    || !isNonEmptyString(analysis.summary)
    || !Array.isArray(analysis.keyPoints)
    || analysis.keyPoints.length === 0
    || !analysis.keyPoints.every(isNonEmptyString)
    || !analysis.mindMap
    || !isNonEmptyString(analysis.mindMap.centralTopic)
    || !Array.isArray(analysis.mindMap.branches)
    || analysis.mindMap.branches.length === 0
    || !analysis.mindMap.branches.every((branch) => (
      isNonEmptyString(branch.title)
      && Array.isArray(branch.points)
      && branch.points.length > 0
      && branch.points.every(isNonEmptyString)
    ))
    || !Array.isArray(analysis.questions)
    || analysis.questions.length !== 5
  ) {
    throw new Error('The AI returned an incomplete lecture analysis. Please try again.');
  }

  const questions = analysis.questions.map((question) => {
    const validOptions = Array.isArray(question.options)
      && question.options.length === 4
      && question.options.every((option, index) => (
        option.label === String.fromCharCode(65 + index) && isNonEmptyString(option.text)
      ));

    if (
      !isNonEmptyString(question.question)
      || !validOptions
      || !['A', 'B', 'C', 'D'].includes(question.correctAnswer)
      || !isNonEmptyString(question.explanation)
    ) {
      throw new Error('The AI returned invalid multiple-choice questions. Please try again.');
    }

    return question;
  });

  return {
    summary: analysis.summary.trim(),
    keyPoints: analysis.keyPoints.map((point) => point.trim()),
    mindMap: {
      centralTopic: analysis.mindMap.centralTopic.trim(),
      branches: analysis.mindMap.branches.map((branch) => ({
        title: branch.title.trim(),
        points: branch.points.map((point) => point.trim()),
      })),
    },
    questions,
  };
};

const buildAnalysisPrompt = (transcript) => `Analyze the following lecture transcript and return a concise, accurate study guide.

Return only a JSON object with this exact shape:
{
  "summary": "A concise summary in 2-4 sentences",
  "keyPoints": ["Important point"],
  "mindMap": {
    "centralTopic": "The lecture's central topic",
    "branches": [{ "title": "Concept group", "points": ["Related concept"] }]
  },
  "questions": [
    {
      "question": "Question text",
      "options": [
        { "label": "A", "text": "Answer option" },
        { "label": "B", "text": "Answer option" },
        { "label": "C", "text": "Answer option" },
        { "label": "D", "text": "Answer option" }
      ],
      "correctAnswer": "A",
      "explanation": "Why this answer is correct"
    }
  ]
}

Include 5 questions exactly. Each must have four distinct options labelled A through D, one correctAnswer label, and a brief explanation. Use only information supported by the transcript. Do not include markdown or text outside the JSON object.

Lecture transcript:
${transcript}`;

export const analyzeLectureAudio = async (audio, client = getOpenAIClient()) => {
  const safeFilename = audio.originalname.replace(/[^\w.-]/g, '_');
  let transcription;

  try {
    const audioFile = await toFile(audio.buffer, safeFilename, { type: audio.mimetype });
    transcription = await client.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    });
  } catch (error) {
    if (error.statusCode === 503) throw error;
    error.stage = 'transcription';
    throw error;
  }

  if (!isNonEmptyString(transcription.text)) {
    const error = new Error('No speech was detected in this audio file.');
    error.statusCode = 422;
    throw error;
  }

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You create accurate, structured study materials from lecture transcripts.',
        },
        { role: 'user', content: buildAnalysisPrompt(transcription.text) },
      ],
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('The AI did not return lecture analysis.');
    }

    let generatedAnalysis;
    try {
      generatedAnalysis = JSON.parse(content);
    } catch {
      throw new Error('The AI returned invalid lecture analysis. Please try again.');
    }

    return {
      transcript: transcription.text,
      ...validateGeneratedAnalysis(generatedAnalysis),
    };
  } catch (error) {
    if (error.statusCode) throw error;
    error.stage = 'generation';
    throw error;
  }
};
