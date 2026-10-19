import mongoose from 'mongoose';

const lectureSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    youtubeUrl: { type: String, default: '' },
    duration: { type: String, default: '' },
    filename: { type: String, default: '' },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['processing', 'ready', 'revision-due', 'archived'],
      default: 'processing',
    },
    topics: [
      {
        index: Number,
        title: String,
        startTime: String,
        endTime: String,
        completed: { type: Boolean, default: false },
      },
    ],
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Lecture', lectureSchema);
