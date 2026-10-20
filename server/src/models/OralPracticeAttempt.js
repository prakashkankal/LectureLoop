import mongoose from 'mongoose';

const oralPracticeAttemptSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    material: {
      subject: { type: String, required: true },
      lecture: { type: String, required: true },
      topic: { type: String, required: true },
      notes: { type: String, required: true },
      keyTerms: { type: [String], default: [] },
    },
    difficulty: { type: String, enum: ['basic', 'intermediate', 'advanced'], required: true },
    mode: { type: String, enum: ['english-assessment', 'practice'], required: true },
    question: { type: String, required: true },
    questionData: { type: mongoose.Schema.Types.Mixed, required: true },
    originalTranscript: { type: String, default: '' },
    answer: { type: String, required: true },
    evaluation: { type: mongoose.Schema.Types.Mixed, required: true },
    durationSeconds: { type: Number, default: 0 },
  },
  { timestamps: true }
);

oralPracticeAttemptSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('OralPracticeAttempt', oralPracticeAttemptSchema);
