import mongoose from 'mongoose';

const lectureSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    topic: { type: String, default: '', trim: true },
    subject: { type: String, required: true, trim: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null, index: true },
    youtubeUrl: { type: String, default: '' },
    youtubeVideoId: { type: String, default: '' },
    sourceType: { type: String, enum: ['youtube', 'audio'], default: 'youtube' },
    duration: { type: String, default: '' },
    filename: { type: String, default: '' },
    description: { type: String, default: '' },

    // Overall lecture status (for the library)
    status: {
      type: String,
      enum: ['processing', 'ready', 'revision-due', 'archived'],
      default: 'processing',
    },

    // AI pipeline status (used for polling during analysis)
    analysisStatus: {
      type: String,
      enum: ['pending', 'processing', 'complete', 'failed'],
      default: 'pending',
    },
    analysisError: { type: String, default: '' },

    // Raw transcript stored for reference
    transcript: { type: String, default: '' },
    audioAnalysis: {
      summary: { type: String, default: '' },
      keyPoints: { type: [String], default: [] },
      mindMap: {
        centralTopic: { type: String, default: '' },
        branches: [{ title: { type: String, default: '' }, points: { type: [String], default: [] } }],
      },
      questions: [{
        question: { type: String, default: '' },
        options: [{ label: String, text: String }],
        correctAnswer: { type: String, default: '' },
        explanation: { type: String, default: '' },
      }],
    },

    // AI-generated topic segments
    topics: [
      {
        index: Number,
        title: String,
        startTime: String,   // "MM:SS"
        endTime: String,     // "MM:SS"
        startSec: Number,    // seconds (for YT player)
        endSec: Number,      // seconds (for YT player)
        summary: String,
        keyTerms: [String],
        completed: { type: Boolean, default: false },
        needsReview: { type: Boolean, default: false },
      },
    ],

    // AI-generated quizzes — five per topic
    quizzes: [
      {
        topicIndex: Number,
        quizIndex: { type: Number, default: 1 },
        question: String,
        options: [
          {
            id: String,   // "A" | "B" | "C" | "D"
            text: String,
          },
        ],
        correctId: String,
        explanation: String,
      },
    ],

    // Per-learner state lives on the owned lecture record.
    session: {
      positionSec: { type: Number, default: 0 },
      topicIndex: { type: Number, default: 1 },
      topicPositions: [
        {
          topicIndex: { type: Number, required: true },
          positionSec: { type: Number, default: 0 },
          updatedAt: { type: Date, default: Date.now },
        },
      ],
      updatedAt: { type: Date, default: Date.now },
    },
    notes: [
      {
        topicIndex: { type: Number, required: true },
        timestampSec: { type: Number, default: null },
        content: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    bookmarks: [
      {
        topicIndex: { type: Number, required: true },
        timestampSec: { type: Number, required: true },
        label: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    quizAttempts: [
      {
        submissionId: { type: String, default: '' },
        topicIndex: { type: Number, required: true },
        quizIndex: { type: Number, default: 1 },
        attemptNumber: { type: Number, required: true },
        selectedAnswer: { type: String, required: true },
        correct: { type: Boolean, required: true },
        score: { type: Number, required: true },
        completed: { type: Boolean, default: false },
        attemptedAt: { type: Date, default: Date.now },
      },
    ],

    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Lecture', lectureSchema);
