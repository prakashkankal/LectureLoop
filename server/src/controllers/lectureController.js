import Lecture from '../models/Lecture.js';
import mongoose from 'mongoose';
import { fetchTranscript, fetchYouTubeVideoTitle, extractVideoId } from '../services/transcriptService.js';
import { analyzeTranscript } from '../services/aiService.js';
import Subject from '../models/Subject.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── POST /api/lectures/analyze ───────────────────────────────────────────────
/**
 * 1. Validate YT URL
 * 2. Create Lecture doc with analysisStatus='processing'
 * 3. Return 202 with lectureId immediately
 * 4. Run async pipeline: transcript → AI → update lecture
 */
export const analyzeLecture = async (req, res) => {
  const { youtubeUrl, title, subject, subjectId } = req.body;

  if (!youtubeUrl) {
    return res.status(400).json({ success: false, error: 'youtubeUrl is required' });
  }

  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) {
    return res.status(400).json({ success: false, error: 'Invalid YouTube URL' });
  }

  const requestedTitle = typeof title === 'string' ? title.trim() : '';
  let lectureTitle = requestedTitle || 'Untitled Lecture';
  if (!lectureTitle || /^(lecture|untitled lecture)$/i.test(lectureTitle)) {
    try {
      lectureTitle = await fetchYouTubeVideoTitle(youtubeUrl);
    } catch (err) {
      console.warn(`[AI Pipeline] Could not fetch YouTube title for ${videoId}: ${err.message}`);
      lectureTitle = requestedTitle || 'Untitled Lecture';
    }
  }
  const lectureSubject = subject || 'General';

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ success: false, error: 'Lecture analysis requires an active database connection' });
  }
  // Avoid duplicate records when a client retries a submission.
  const existing = await Lecture.findOne({ userId: req.user?._id, youtubeVideoId: videoId });
  if (existing) return res.status(200).json({ success: true, data: { _id: existing._id, analysisStatus: existing.analysisStatus }, duplicate: true });
  let associatedSubject = null;
  if (subjectId) {
    if (!mongoose.isValidObjectId(subjectId)) return res.status(400).json({ success: false, error: 'Invalid subject ID' });
    associatedSubject = await Subject.findOne({ _id: subjectId, userId: req.user?._id });
    if (!associatedSubject) return res.status(404).json({ success: false, error: 'Subject not found' });
  }
  const lecture = await Lecture.create({
    title: lectureTitle,
    subject: associatedSubject ? associatedSubject.title : lectureSubject,
    subjectId: associatedSubject?._id || null,
    youtubeUrl,
    youtubeVideoId: videoId,
    analysisStatus: 'processing',
    status: 'processing',
    userId: req.user?._id,
  });

  // Return 202 immediately with the lectureId for polling
  res.status(202).json({ success: true, data: { _id: lecture._id, analysisStatus: 'processing' } });

  // ── Run AI pipeline asynchronously (after response is sent) ─────────────────
  let transcriptText = '';
  (async () => {
    try {
      // Step 1: Fetch transcript
      const { fullText } = await fetchTranscript(youtubeUrl);
      transcriptText = fullText;

      // Step 2: AI segmentation + quiz generation
      const { topics, quizzes } = await analyzeTranscript(fullText, lectureTitle);

      // Step 3: Update DB record
      {
        await Lecture.findOneAndUpdate({ _id: lecture._id, userId: req.user?._id }, {
          topics,
          quizzes,
          transcript: fullText.substring(0, 50000), // cap at 50k chars
          analysisStatus: 'complete',
          status: 'ready',
        });
      }

      console.log(`[AI Pipeline] Lecture ${lecture._id} analysis complete. ${topics.length} topics, ${quizzes.length} quizzes.`);
    } catch (err) {
      console.error(`[AI Pipeline] Error for lecture ${lecture._id}:`, err.message);
      {
        await Lecture.findOneAndUpdate({ _id: lecture._id, userId: req.user?._id }, {
          transcript: transcriptText.substring(0, 50000),
          analysisStatus: 'failed',
          analysisError: err.message || 'Lecture analysis failed',
          topics: [],
          quizzes: [],
          status: 'processing',
        });
      }
    }
  })();
};

// ─── GET /api/lectures/:id/status ─────────────────────────────────────────────
/**
 * Polling endpoint — frontend polls every 2s until analysisStatus === 'complete'
 */
export const getLectureStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, error: 'Invalid lecture ID' });
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ success: false, error: 'Lecture analysis status is unavailable while the database is offline' });
    const lecture = await Lecture.findOne({ _id: id, userId: req.user?._id }).select('analysisStatus topics quizzes analysisError title subject youtubeVideoId');
    if (!lecture) {
      return res.status(404).json({ success: false, error: 'Lecture not found' });
    }

    res.json({ success: true, data: lecture });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch lecture status' });
  }
};

// ─── GET /api/lectures/:id ────────────────────────────────────────────────────
/**
 * Fetch full lecture data (used by LearningSessionPage)
 */
export const getLectureById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, error: 'Invalid lecture ID' });
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ success: false, error: 'Lecture data is unavailable while the database is offline' });
    const lecture = await Lecture.findOne({ _id: id, userId: req.user?._id });
    if (!lecture) {
      return res.status(404).json({ success: false, error: 'Lecture not found' });
    }

    res.json({ success: true, data: lecture });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch lecture' });
  }
};

// ─── POST /api/lectures ───────────────────────────────────────────────────────
/**
 * Simple lecture creation (kept for compatibility with SubjectsPage modal)
 */
export const createLecture = async (req, res) => {
  try {
    const { title, subject, youtubeUrl, duration, description } = req.body;

    if (!title || !subject) {
      return res.status(400).json({ success: false, error: 'title and subject are required' });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, error: 'Lecture creation requires an active database connection' });
    }
    const lecture = await Lecture.create({
      title, subject,
      youtubeUrl: youtubeUrl || '',
      youtubeVideoId: youtubeUrl ? extractVideoId(youtubeUrl) || '' : '',
      duration: duration || '',
      description: description || '',
      topics: [],
      quizzes: [],
      status: 'processing',
      userId: req.user?._id,
    });
    return res.status(201).json({ success: true, data: lecture });

  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create lecture' });
  }
};

// ─── GET /api/lectures ────────────────────────────────────────────────────────
export const getLectures = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const lectures = await Lecture.find({ userId: req.user?._id, youtubeVideoId: { $ne: '' } })
        .sort({ createdAt: -1 })
        .select('title subject subjectId duration filename description status analysisStatus analysisError topics createdAt updatedAt youtubeVideoId')
        .lean();
      return res.json({ success: true, data: lectures });
    }
    return res.json({ success: true, data: [], _offline: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch lectures' });
  }
};

/** GET /api/lectures/search?q=... — search only the signed-in user's learning data. */
export const searchLearningMaterials = async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();
    if (query.length < 2) return res.json({ success: true, data: [] });
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ success: false, error: 'Search is unavailable while the database is offline' });
    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matcher = new RegExp(safeQuery, 'i');
    const lectures = await Lecture.find({
      userId: req.user?._id,
      $or: [{ title: matcher }, { subject: matcher }, { 'topics.title': matcher }, { 'topics.summary': matcher }, { 'topics.keyTerms': matcher }, { 'notes.content': matcher }],
    }).select('title subject youtubeVideoId topics.index topics.title topics.startSec topics.summary topics.keyTerms notes.topicIndex notes.timestampSec notes.content').limit(20).lean();
    return res.json({ success: true, data: lectures });
  } catch (err) {
    console.error('Search learning materials error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to search learning materials' });
  }
};

/**
 * PATCH /api/lectures/:id/topics/:topicIndex/complete
 * Persist a checkpoint completed during an interactive session.
 */
export const completeLectureTopic = async (req, res) => {
  try {
    const { id, topicIndex } = req.params;
    const index = Number(topicIndex);
    if (!mongoose.isValidObjectId(id) || !Number.isInteger(index)) {
      return res.status(400).json({ success: false, error: 'Invalid lecture or topic ID' });
    }

    const lecture = await Lecture.findOne({ _id: id, userId: req.user?._id });
    if (!lecture) {
      return res.status(404).json({ success: false, error: 'Lecture not found' });
    }

    const topic = lecture.topics.find((entry) => entry.index === index);
    if (!topic) {
      return res.status(404).json({ success: false, error: 'Topic not found' });
    }

    topic.completed = true;
    await lecture.save();
    return res.json({ success: true, data: { _id: lecture._id, topics: lecture.topics } });
  } catch (err) {
    console.error('Complete lecture topic error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to save topic progress' });
  }
};

/** PATCH /api/lectures/:id/topics/:topicIndex/review */
export const flagLectureTopicForReview = async (req, res) => {
  try {
    const { id, topicIndex } = req.params;
    const index = Number(topicIndex);
    if (!mongoose.isValidObjectId(id) || !Number.isInteger(index)) {
      return res.status(400).json({ success: false, error: 'Invalid lecture or topic ID' });
    }

    const lecture = await Lecture.findOne({ _id: id, userId: req.user?._id });
    if (!lecture) {
      return res.status(404).json({ success: false, error: 'Lecture not found' });
    }

    const topic = lecture.topics.find((entry) => entry.index === index);
    if (!topic) {
      return res.status(404).json({ success: false, error: 'Topic not found' });
    }

    topic.needsReview = true;
    await lecture.save();
    return res.json({ success: true, data: { _id: lecture._id, topics: lecture.topics } });
  } catch (err) {
    console.error('Flag lecture topic error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to save review flag' });
  }
};

const getOwnedSessionLecture = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, error: 'Invalid lecture ID' });
    return null;
  }
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ success: false, error: 'Session data is unavailable while the database is offline' });
    return null;
  }
  const lecture = await Lecture.findOne({ _id: req.params.id, userId: req.user?._id });
  if (!lecture) res.status(404).json({ success: false, error: 'Lecture not found' });
  return lecture;
};

/** GET /api/lectures/:id/session */
export const getLectureSession = async (req, res) => {
  try {
    const lecture = await getOwnedSessionLecture(req, res);
    if (!lecture) return;
    return res.json({ success: true, data: {
      session: lecture.session,
      notes: lecture.notes,
      bookmarks: lecture.bookmarks,
      quizAttempts: lecture.quizAttempts,
      topics: lecture.topics,
    } });
  } catch (err) {
    console.error('Get lecture session error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load learning session data' });
  }
};

/** PATCH /api/lectures/:id/session */
export const saveLectureSession = async (req, res) => {
  try {
    const lecture = await getOwnedSessionLecture(req, res);
    if (!lecture) return;
    const positionSec = Number(req.body.positionSec);
    const topicIndex = Number(req.body.topicIndex);
    if (!Number.isFinite(positionSec) || positionSec < 0 || !Number.isInteger(topicIndex)) {
      return res.status(400).json({ success: false, error: 'A valid playback position and topic index are required' });
    }
    if (!lecture.topics.some((topic) => topic.index === topicIndex)) {
      return res.status(404).json({ success: false, error: 'Topic not found' });
    }
    const updatedAt = new Date();
    if (!lecture.session) lecture.session = {};
    if (!lecture.session.topicPositions) lecture.session.topicPositions = [];
    const topicPosition = lecture.session.topicPositions.find((entry) => entry.topicIndex === topicIndex);
    if (topicPosition) {
      topicPosition.positionSec = positionSec;
      topicPosition.updatedAt = updatedAt;
    } else {
      lecture.session.topicPositions.push({ topicIndex, positionSec, updatedAt });
    }
    lecture.session.positionSec = positionSec;
    lecture.session.topicIndex = topicIndex;
    lecture.session.updatedAt = updatedAt;
    await lecture.save();
    return res.json({ success: true, data: lecture.session });
  } catch (err) {
    console.error('Save lecture session error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to save playback progress' });
  }
};

/** PUT /api/lectures/:id/notes */
export const saveLectureNote = async (req, res) => {
  try {
    const lecture = await getOwnedSessionLecture(req, res);
    if (!lecture) return;
    const { noteId, content } = req.body;
    const topicIndex = Number(req.body.topicIndex);
    const timestampSec = req.body.timestampSec == null ? null : Number(req.body.timestampSec);
    if (!Number.isInteger(topicIndex) || typeof content !== 'string' || content.length > 20000 ||
      (timestampSec != null && (!Number.isFinite(timestampSec) || timestampSec < 0))) {
      return res.status(400).json({ success: false, error: 'Valid topic, note content, and timestamp are required' });
    }
    if (!lecture.topics.some((topic) => topic.index === topicIndex)) {
      return res.status(404).json({ success: false, error: 'Topic not found' });
    }
    let note = noteId ? lecture.notes.id(noteId) : null;
    if (noteId && !note) return res.status(404).json({ success: false, error: 'Note not found' });
    if (note && note.topicIndex !== topicIndex) return res.status(400).json({ success: false, error: 'Note topic cannot be changed' });
    if (!note) {
      note = lecture.notes.create({ topicIndex, timestampSec, content, createdAt: new Date(), updatedAt: new Date() });
      lecture.notes.push(note);
      note = lecture.notes[lecture.notes.length - 1];
    } else {
      note.content = content;
      note.timestampSec = timestampSec;
      note.updatedAt = new Date();
    }
    await lecture.save();
    return res.json({ success: true, data: note });
  } catch (err) {
    console.error('Save lecture note error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to save note' });
  }
};

/** POST /api/lectures/:id/bookmarks */
export const createLectureBookmark = async (req, res) => {
  try {
    const lecture = await getOwnedSessionLecture(req, res);
    if (!lecture) return;
    const topicIndex = Number(req.body.topicIndex);
    const timestampSec = Number(req.body.timestampSec);
    const label = typeof req.body.label === 'string' ? req.body.label.trim().slice(0, 160) : '';
    if (!Number.isInteger(topicIndex) || !Number.isFinite(timestampSec) || timestampSec < 0) {
      return res.status(400).json({ success: false, error: 'Valid topic and playback timestamp are required' });
    }
    if (!lecture.topics.some((topic) => topic.index === topicIndex)) {
      return res.status(404).json({ success: false, error: 'Topic not found' });
    }
    const existing = lecture.bookmarks.find((item) => item.topicIndex === topicIndex && item.timestampSec === timestampSec);
    if (existing) return res.json({ success: true, data: existing, duplicate: true });
    lecture.bookmarks.push({ topicIndex, timestampSec, label, createdAt: new Date() });
    await lecture.save();
    return res.status(201).json({ success: true, data: lecture.bookmarks[lecture.bookmarks.length - 1] });
  } catch (err) {
    console.error('Create lecture bookmark error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to save bookmark' });
  }
};

/** POST /api/lectures/:id/quiz-attempts */
export const submitLectureQuizAttempt = async (req, res) => {
  try {
    const lecture = await getOwnedSessionLecture(req, res);
    if (!lecture) return;
    const topicIndex = Number(req.body.topicIndex);
    const quizIndex = Number(req.body.quizIndex) || 1;
    const selectedAnswer = typeof req.body.selectedAnswer === 'string' ? req.body.selectedAnswer.trim() : '';
    const submissionId = typeof req.body.submissionId === 'string' ? req.body.submissionId.slice(0, 100) : '';
    if (!Number.isInteger(topicIndex) || !Number.isInteger(quizIndex) || quizIndex < 1 || !selectedAnswer || !submissionId) {
      return res.status(400).json({ success: false, error: 'Topic, quiz, selected answer, and submission ID are required' });
    }
    const duplicate = lecture.quizAttempts.find((attempt) => attempt.submissionId === submissionId);
    if (duplicate) {
      const priorQuiz = lecture.quizzes.find((item) =>
        item.topicIndex === duplicate.topicIndex && (item.quizIndex || 1) === (duplicate.quizIndex || 1)
      );
      return res.json({ success: true, data: { attempt: duplicate, explanation: priorQuiz?.explanation || '', quiz: priorQuiz }, duplicate: true });
    }
    const quiz = lecture.quizzes.find((item) =>
      item.topicIndex === topicIndex && (item.quizIndex || 1) === quizIndex
    );
    if (!quiz || !quiz.options.some((option) => option.id === selectedAnswer)) {
      return res.status(404).json({ success: false, error: 'A valid quiz is not available for this topic' });
    }
    const correct = selectedAnswer === quiz.correctId;
    const attemptNumber = lecture.quizAttempts.filter((attempt) =>
      attempt.topicIndex === topicIndex && (attempt.quizIndex || 1) === quizIndex
    ).length + 1;
    const attempt = {
      submissionId,
      topicIndex,
      quizIndex,
      attemptNumber,
      selectedAnswer,
      correct,
      score: correct ? 1 : 0,
      completed: correct,
      attemptedAt: new Date(),
    };
    lecture.quizAttempts.push(attempt);
    const completedQuizIndexes = new Set(lecture.quizAttempts
      .filter((item) => item.topicIndex === topicIndex && item.correct)
      .map((item) => item.quizIndex || 1));
    const topicQuizzes = lecture.quizzes.filter((item) => item.topicIndex === topicIndex);
    const topicCompleted = correct && topicQuizzes.length > 0 &&
      topicQuizzes.every((item) => completedQuizIndexes.has(item.quizIndex || 1));
    if (topicCompleted) {
      const topic = lecture.topics.find((item) => item.index === topicIndex);
      if (topic) topic.completed = true;
    }
    await lecture.save();
    const savedAttempt = lecture.quizAttempts[lecture.quizAttempts.length - 1];
    return res.status(201).json({ success: true, data: { attempt: savedAttempt, explanation: quiz.explanation || '', quiz, topicCompleted } });
  } catch (err) {
    console.error('Submit lecture quiz attempt error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to record quiz attempt' });
  }
};

/** DELETE /api/lectures/:id */
export const deleteLecture = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: 'Invalid lecture ID' });
    }

    const lecture = await Lecture.findOneAndDelete({ _id: id, userId: req.user?._id });
    if (!lecture) {
      return res.status(404).json({ success: false, error: 'Lecture not found' });
    }

    return res.json({ success: true, data: { _id: lecture._id } });
  } catch (err) {
    console.error('Delete lecture error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to delete lecture' });
  }
};
