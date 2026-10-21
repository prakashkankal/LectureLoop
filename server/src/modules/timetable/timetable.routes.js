import express from 'express';
import multer from 'multer';
import { getDeviceTimetable, uploadTimetable } from './timetable.controller.js';
import { protect } from '../student/middleware/authMiddleware.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
      callback(new Error('Upload an .xlsx file.'));
      return;
    }
    callback(null, true);
  },
});

const requireTeacher = (req, res, next) => {
  if (req.user?.role !== 'teacher') {
    return res.status(403).json({ success: false, error: 'Only teachers can upload a timetable.' });
  }
  return next();
};

const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (!error) return next();
    const status = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ success: false, error: error.message });
  });
};

router.post('/teacher/upload-timetable', protect, requireTeacher, handleUpload, uploadTimetable);
router.get('/device/timetable', getDeviceTimetable);

export default router;
