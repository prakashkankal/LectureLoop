

import path from 'path';
import multer from 'multer';

const MAX_AUDIO_SIZE = 25 * 1024 * 1024;
const ALLOWED_AUDIO_TYPES = new Map([
  ['.flac', ['audio/flac', 'audio/x-flac']],
  ['.m4a', ['audio/mp4', 'audio/x-m4a']],
  ['.mp3', ['audio/mpeg', 'audio/mp3', 'audio/mpeg3', 'audio/x-mpeg-3']],
  ['.mp4', ['audio/mp4', 'video/mp4']],
  ['.mpeg', ['audio/mpeg', 'audio/mp4', 'video/mpeg']],
  ['.mpga', ['audio/mpeg', 'audio/mp4']],
  ['.ogg', ['audio/ogg', 'application/ogg']],
  ['.wav', ['audio/wav', 'audio/x-wav', 'audio/wave']],
  ['.webm', ['audio/webm', 'video/webm']],
]);

class AudioUploadError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_SIZE, files: 1 },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const acceptedMimeTypes = ALLOWED_AUDIO_TYPES.get(extension);
    if (!acceptedMimeTypes || !acceptedMimeTypes.includes(file.mimetype.toLowerCase())) {
      callback(new AudioUploadError(
        'Upload an audio file in MP3, MP4, MPEG, M4A, WAV, WEBM, FLAC, or OGG format.',
        400,
      ));
      return;
    }

    callback(null, true);
  },
});

export const handleAudioUpload = (req, res, next) => {
  upload.single('audio')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ success: false, error: 'Audio file must be 25 MB or smaller.' });
      return;
    }

    if (error instanceof multer.MulterError) {
      res.status(400).json({ success: false, error: 'Upload one audio file using the "audio" field.' });
      return;
    }

    if (error instanceof AudioUploadError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
      return;
    }

    next(error);
  });
};
