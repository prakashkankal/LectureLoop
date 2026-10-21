import { randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import express from 'express';
import multer from 'multer';
import {
  AUDIO_STORAGE_DIR,
  getLectures,
  IOT_STAGING_DIR,
  uploadAudio,
  uploadDeviceBatch,
} from './audio.controller.js';
import { protect } from '../student/middleware/authMiddleware.js';

const router = express.Router();
const audioStorage = (directory) => multer.diskStorage({
  destination: (req, file, callback) => mkdir(directory, { recursive: true })
    .then(() => callback(null, directory), callback),
  filename: (req, file, callback) => callback(null, `${Date.now()}-${randomUUID()}.upload`),
});

const upload = multer({
  storage: audioStorage(AUDIO_STORAGE_DIR),
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    const validExtension = file.originalname.toLowerCase().endsWith('.mp3');
    const validMime = ['audio/mpeg', 'audio/mp3', 'audio/mpeg3'].includes(file.mimetype.toLowerCase());
    if (!validExtension || !validMime) {
      callback(new Error('Upload an MP3 audio file.'));
      return;
    }
    callback(null, true);
  },
});
const batchUpload = multer({
  storage: audioStorage(IOT_STAGING_DIR),
  limits: { fileSize: 100 * 1024 * 1024, files: 51 },
  fileFilter: (req, file, callback) => {
    const filename = file.originalname.toLowerCase();
    const validFile = file.fieldname === 'attendance'
      ? filename.endsWith('.csv') && file.mimetype.toLowerCase() === 'text/csv'
      : file.fieldname === 'audios'
        && filename.endsWith('.mp3')
        && ['audio/mpeg', 'audio/mp3', 'audio/mpeg3'].includes(file.mimetype.toLowerCase());
    if (!validFile) {
      callback(new Error('Upload one attendance CSV and MP3 files only.'));
      return;
    }
    callback(null, true);
  },
});

const authenticateDevice = (req, res, next) => {
  const expectedToken = process.env.IOT_UPLOAD_TOKEN;
  const providedToken = req.get('x-device-token') || '';
  if (!expectedToken) {
    return res.status(503).json({ success: false, error: 'IoT uploads are not configured on this server.' });
  }

  const expected = Buffer.from(expectedToken);
  const provided = Buffer.from(providedToken);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return res.status(401).json({ success: false, error: 'Invalid IoT device token.' });
  }
  return next();
};

const handleAudioUpload = (req, res, next) => {
  upload.single('audio')(req, res, (error) => {
    if (!error) return next();
    const status = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ success: false, error: error.message });
  });
};

const handleBatchUpload = (req, res, next) => {
  batchUpload.fields([
    { name: 'attendance', maxCount: 1 },
    { name: 'audios', maxCount: 50 },
  ])(req, res, async (error) => {
    if (!error) return next();
    const stagedFiles = Object.values(req.files || {}).flat();
    await Promise.all(stagedFiles.map((file) => rm(file.path, { force: true })));
    const status = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ success: false, error: error.message });
  });
};

router.post('/iot/upload', authenticateDevice, handleBatchUpload, uploadDeviceBatch);
router.post('/iot/upload-audio', authenticateDevice, handleAudioUpload, uploadAudio);
router.get('/lectures', (req, res, next) => {
  if (req.query.date === undefined && req.query.subject === undefined) return next();
  return protect(req, res, () => getLectures(req, res, next));
});

export default router;
