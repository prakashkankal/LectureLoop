import mongoose from 'mongoose';

const timetableSchema = new mongoose.Schema(
  {
    timetable_id: {
      type: String,
      required: true,
      unique: true,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    teacher_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    class_name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    day: {
      type: String,
      required: true,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    },
    start_time: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    end_time: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    room_no: { type: String, required: true, trim: true },
    device_id: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

timetableSchema.index({ device_id: 1, day: 1, start_time: 1 });

export default mongoose.model('Timetable', timetableSchema);
