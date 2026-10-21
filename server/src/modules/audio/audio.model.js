import mongoose from 'mongoose';

const audioSchema = new mongoose.Schema(
  {
    lecture_id: {
      type: String,
      required: true,
      unique: true,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    subject: { type: String, required: true, trim: true, index: true },
    date: { type: Date, required: true, index: true },
    file_path: { type: String, required: true, unique: true },
    device_id: { type: String, required: true, trim: true, index: true },
    duration: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

audioSchema.index({ date: 1, subject: 1 });

export default mongoose.model('Audio', audioSchema);
