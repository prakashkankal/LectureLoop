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

    console.error(`[lecture-analysis] ${error.stage || 'analysis'} failed:`, error.message);
    return res.status(502).json({
      success: false,
      error: error.stage === 'transcription'
        ? 'Audio transcription failed. Check the audio file and OpenAI configuration, then try again.'
        : 'Lecture analysis failed. Please try again.',
    });
  }
};
