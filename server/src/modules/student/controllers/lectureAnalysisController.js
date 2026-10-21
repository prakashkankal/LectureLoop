import { analyzeLectureAudio } from '../services/lectureAnalysisService.js';

export const analyzeAudio = async (req, res) => {
  if (!req.file || req.file.size === 0) {
    return res.status(400).json({ success: false, error: 'Choose a non-empty audio file to analyze.' });
  }

  try {
    const analysis = await analyzeLectureAudio(req.file);
    return res.json({ success: true, data: analysis });
  } catch (error) {
    if (error.statusCode === 503 || error.statusCode === 422) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }

    console.error(`[lecture-analysis] ${error.stage || 'analysis'} failed:`, {
      status: error.status,
      code: error.code,
      message: error.message,
    });

    let publicError = 'Gemini could not analyze this audio. Please try again.';
    const errorCode = String(error.code || '').toLowerCase();
    const errorMessage = String(error.message || '').toLowerCase();

    if (
      error.status === 401
      || error.status === 403
      || errorCode.includes('api_key')
      || errorMessage.includes('api key not valid')
    ) {
      publicError = 'Gemini rejected the API key. Check GEMINI_API_KEY in server/.env and restart the server.';
    } else if (error.status === 429) {
      publicError = 'Gemini rate or free-tier quota limit reached. Wait and try again, or check your Gemini API usage limits.';
    } else if (error.status === 400 && error.stage === 'upload') {
      publicError = 'Gemini could not accept this audio file. Check its format and try a supported MP3, MP4, MPEG, M4A, WAV, WEBM, FLAC, or OGG file.';
    } else if (
      errorMessage.includes('token')
      || errorMessage.includes('context length')
      || errorMessage.includes('maximum context')
      || errorMessage.includes('too long')
    ) {
      publicError = 'This recording is too long for Gemini to analyze in one request. Try a shorter recording.';
    }

    return res.status(502).json({
      success: false,
      error: publicError,
    });
  }
};
