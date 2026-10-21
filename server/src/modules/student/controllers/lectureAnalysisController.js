import { analyzeLectureAudio } from '../services/lectureAnalysisService.js';
import mongoose from 'mongoose';
import Lecture from '../models/Lecture.js';
import Subject from '../../../models/Subject.js';

export const getAudioLectures = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, error: 'Saved audio lectures are unavailable while the database is disconnected.' });
    }
    const lectures = await Lecture.find({ userId: req.user?._id, sourceType: 'audio' })
      .sort({ createdAt: -1 })
      .select('title topic subject subjectId description filename transcript audioAnalysis analysisStatus status createdAt')
      .lean();
    return res.json({ success: true, data: lectures });
  } catch (error) {
    console.error('Fetch audio lectures error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch saved audio lectures.' });
  }
};

export const analyzeAudio = async (req, res) => {
  if (!req.file || req.file.size === 0) {
    return res.status(400).json({ success: false, error: 'Choose a non-empty audio file to analyze.' });
  }

  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const topic = typeof req.body.topic === 'string' ? req.body.topic.trim() : '';
    const description = typeof req.body.description === 'string' ? req.body.description.trim().slice(0, 2000) : '';
    const subjectId = typeof req.body.subjectId === 'string' ? req.body.subjectId.trim() : '';
    let subject = null;
    if (title || topic || subjectId) {
      if (!title || !topic || !subjectId) {
        return res.status(400).json({ success: false, error: 'Lecture title, topic, and subject are required to save this analysis.' });
      }
      if (title.length > 160) return res.status(400).json({ success: false, error: 'Lecture title must be 160 characters or fewer.' });
      if (topic.length > 160) return res.status(400).json({ success: false, error: 'Topic must be 160 characters or fewer.' });
      if (!mongoose.isValidObjectId(subjectId)) return res.status(400).json({ success: false, error: 'Select a valid subject.' });
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ success: false, error: 'Saving an analyzed lecture requires an active database connection.' });
      }
      subject = await Subject.findOne({ _id: subjectId, userId: req.user?._id });
      if (!subject) return res.status(404).json({ success: false, error: 'Subject not found.' });
    }

    const analysis = await analyzeLectureAudio(req.file);
    let lecture = null;
    if (subject) {
      lecture = await Lecture.create({
        title,
        topic,
        subject: subject.title,
        subjectId: subject._id,
        description,
        filename: req.file.originalname,
        sourceType: 'audio',
        transcript: analysis.transcript.slice(0, 50000),
        audioAnalysis: {
          summary: analysis.summary,
          keyPoints: analysis.keyPoints,
          mindMap: analysis.mindMap,
          questions: analysis.questions,
        },
        analysisStatus: 'complete',
        status: 'ready',
        userId: req.user?._id,
      });
    }
    return res.json({
      success: true,
      data: analysis,
      ...(lecture ? { lecture: {
        _id: lecture._id,
        title: lecture.title,
        topic: lecture.topic,
        subject: lecture.subject,
        subjectId: lecture.subjectId,
        description: lecture.description,
        filename: lecture.filename,
        sourceType: lecture.sourceType,
        analysisStatus: lecture.analysisStatus,
        status: lecture.status,
        createdAt: lecture.createdAt,
        transcript: lecture.transcript,
        audioAnalysis: lecture.audioAnalysis,
      } } : {}),
    });
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
