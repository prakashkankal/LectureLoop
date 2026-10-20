import mongoose from 'mongoose';

const topicNoteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    lectureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lecture',
      required: true,
      index: true,
    },
    topicId: {
      type: String,
      default: '',
    },
    topicIndex: {
      type: Number,
      required: true,
    },
    topicTitle: {
      type: String,
      required: true,
      trim: true,
    },
    transcriptVersion: {
      type: String,
      default: '',
    },
    contentSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    imageUrl: {
      type: String,
      default: '',
    },
    imageStorageKey: {
      type: String,
      default: '',
    },
    imageFormat: {
      type: String,
      default: 'png',
    },
    imageWidth: {
      type: Number,
      default: 1024,
    },
    imageHeight: {
      type: Number,
      default: 1792,
    },
    generationStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    generationModel: {
      type: String,
      default: 'dall-e-3',
    },
    generationVersion: {
      type: Number,
      default: 1,
    },
    errorMessage: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Prevent duplicate note records for the same lecture topic
topicNoteSchema.index({ lectureId: 1, topicIndex: 1 }, { unique: true });

export default mongoose.model('TopicNote', topicNoteSchema);
