import express from 'express';
import multer from 'multer';
import { protectStudent } from '../modules/student/middleware/authMiddleware.js';
import {
  createQuestions,
  deleteAttempt,
  evaluateAndSave,
  getAttempts,
  getMaterials,
  languageAssist,
  transcribe,
} from '../controllers/oralPracticeController.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    const supported = ['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a']
      .some((mime) => file.mimetype === mime || file.mimetype.startsWith(`${mime};`));
    callback(supported ? null : new Error('Use a WebM, Ogg, WAV, MP3, or M4A recording.'), supported);
  },
});
const handleAudioUpload = (request, response, next) => {
  upload.single('audio')(request, response, (error) => {
    if (!error) return next();
    const status = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return response.status(status).json({ success: false, error: error.message });
  });
};

router.use(protectStudent);
router.get('/materials', getMaterials);
router.get('/attempts', getAttempts);
router.delete('/attempts/:id', deleteAttempt);
router.post('/questions', createQuestions);
router.post('/evaluate', evaluateAndSave);
router.post('/language-assist', languageAssist);
router.post('/transcribe', handleAudioUpload, transcribe);

export default router;
