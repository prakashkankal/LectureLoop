import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    instructor: { type: String, default: 'Staff Instructor', trim: true },
    term: { type: String, default: 'Fall 2024', trim: true },
    icon: { type: String, default: 'menu_book' },
    color: { type: String, default: 'primary' },
    coverage: { type: Number, default: 0 },
    lectureCount: { type: Number, default: 0 },
    totalHours: { type: String, default: '0.0 Hours' },
    statusNote: { type: String, default: 'Vector indexing up to date' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Subject', subjectSchema);
