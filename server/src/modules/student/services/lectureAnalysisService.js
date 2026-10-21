const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_UPLOAD_BASE = 'https://generativelanguage.googleapis.com/upload/v1beta';
const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

const getGeminiApiKey = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const error = new Error('Audio analysis is not configured. Add GEMINI_API_KEY to server/.env.');
    error.statusCode = 503;
    throw error;
  }

  return apiKey;
};

const createGeminiError = (payload, status, stage) => {
  const details = payload?.error || {};
  const error = new Error(details.message || 'Gemini could not analyze this audio.');
  error.status = status;
  error.code = details.status || details.code;
  error.stage = stage;
  return error;
};

const requestJson = async (url, options, stage, fetchImpl) => {
  const response = await fetchImpl(url, options);
  let payload;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw createGeminiError(payload, response.status, stage);
  }

  return payload;
};

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

export const validateGeneratedAnalysis = (analysis) => {
  if (
    !analysis
    || !isNonEmptyString(analysis.transcript)
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
    throw new Error('Gemini returned an incomplete lecture analysis. Please try again.');
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
      throw new Error('Gemini returned invalid multiple-choice questions. Please try again.');
    }

    return question;
  });

  return {
    transcript: analysis.transcript.trim(),
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

const buildAnalysisPrompt = () => `Listen to the attached lecture recording. First transcribe all spoken words faithfully in the original language. Then analyze only information supported by the recording.

Return a JSON object with exactly these fields and no markdown:
{
  "transcript": "Full transcription of the recording",
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

Include exactly 5 questions. Each question must have four distinct options labelled A through D, one correctAnswer label, and a brief explanation. If no speech is audible, return an empty transcript and empty arrays for keyPoints, mindMap.branches, and questions.`;

const uploadAudio = async (audio, apiKey, fetchImpl) => {
  const safeFilename = audio.originalname.replace(/[^\w.-]/g, '_');
  const uploadStart = await fetchImpl(`${GEMINI_UPLOAD_BASE}/files`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(audio.size),
      'X-Goog-Upload-Header-Content-Type': audio.mimetype,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: safeFilename } }),
  });

  if (!uploadStart.ok) {
    let payload;
    try { payload = await uploadStart.json(); } catch { payload = null; }
    throw createGeminiError(payload, uploadStart.status, 'upload');
  }

  const uploadUrl = uploadStart.headers.get('x-goog-upload-url');
  if (!uploadUrl) {
    throw new Error('Gemini did not provide an upload URL for the audio file.');
  }

  const uploaded = await requestJson(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': String(audio.size),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
      'Content-Type': audio.mimetype,
    },
    body: audio.buffer,
  }, 'upload', fetchImpl);

  if (!uploaded.file?.uri || !uploaded.file?.name) {
    throw new Error('Gemini did not finish processing the audio upload.');
  }

  return uploaded.file;
};

const deleteUploadedFile = async (file, apiKey, fetchImpl) => {
  if (!file?.name) return;

  try {
    await fetchImpl(`${GEMINI_API_BASE}/${file.name}`, {
      method: 'DELETE',
      headers: { 'x-goog-api-key': apiKey },
    });
  } catch (error) {
    console.warn('[lecture-analysis] Gemini temporary file cleanup failed:', error.message);
  }
};

export const analyzeLectureAudio = async (audio, fetchImpl = fetch) => {
  const apiKey = getGeminiApiKey();
  let uploadedFile;

  try {
    uploadedFile = await uploadAudio(audio, apiKey, fetchImpl);
    const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
    const response = await requestJson(
      `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: buildAnalysisPrompt() },
              { file_data: { mime_type: uploadedFile.mimeType || audio.mimetype, file_uri: uploadedFile.uri } },
            ],
          }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      },
      'analysis',
      fetchImpl,
    );

    const content = response.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim();

    if (!content) {
      const reason = response.promptFeedback?.blockReason;
      const error = new Error(reason
        ? `Gemini blocked this audio request (${reason}).`
        : 'Gemini did not return lecture analysis.');
      error.stage = 'analysis';
      throw error;
    }

    let generatedAnalysis;
    try {
      generatedAnalysis = JSON.parse(content);
    } catch {
      throw new Error('Gemini returned invalid lecture analysis. Please try again.');
    }

    if (!isNonEmptyString(generatedAnalysis.transcript)) {
      const error = new Error('No speech was detected in this audio file.');
      error.statusCode = 422;
      throw error;
    }

    return validateGeneratedAnalysis(generatedAnalysis);
  } catch (error) {
    if (error.statusCode) throw error;
    if (!error.stage) error.stage = uploadedFile ? 'analysis' : 'upload';
    throw error;
  } finally {
    await deleteUploadedFile(uploadedFile, apiKey, fetchImpl);
  }
};
