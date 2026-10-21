import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import Audio from './audio.model.js';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
export const AUDIO_STORAGE_DIR = path.resolve(MODULE_DIR, '../../../uploads/audios');
export const ATTENDANCE_STORAGE_DIR = path.resolve(MODULE_DIR, '../../../uploads/attendance');
export const IOT_STAGING_DIR = path.resolve(MODULE_DIR, '../../../uploads/iot-staging');

const hashFile = (filePath) => new Promise((resolve, reject) => {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath);
  stream.on('data', (chunk) => hash.update(chunk));
  stream.on('error', reject);
  stream.on('end', () => resolve(hash.digest('hex')));
});

const parseDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    ? parsed
    : null;
};

const safeName = (value) => value
  .normalize('NFKD')
  .replace(/[^a-zA-Z0-9_-]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .slice(0, 60);

const sendError = (res, status, error) => res.status(status).json({ success: false, error });

export const uploadAudio = async (req, res) => {
  if (!req.file) return sendError(res, 400, 'Upload an MP3 file using the "audio" field.');
  const subject = String(req.body.subject || '').trim();
  const deviceId = String(req.body.device_id || '').trim();
  const audioDate = parseDate(req.body.date);
  const duration = Number(req.body.duration);
  if (!subject || !safeName(subject)) {
    await rm(req.file.path, { force: true });
    return sendError(res, 400, 'Provide a valid subject.');
  }
  if (!deviceId || !safeName(deviceId)) {
    await rm(req.file.path, { force: true });
    return sendError(res, 400, 'Provide a valid device_id.');
  }
  if (!audioDate) {
    await rm(req.file.path, { force: true });
    return sendError(res, 400, 'Provide date in YYYY-MM-DD format.');
  }
  if (!Number.isFinite(duration) || duration <= 0) {
    await rm(req.file.path, { force: true });
    return sendError(res, 400, 'Provide a positive audio duration in seconds.');
  }
  if (mongoose.connection.readyState !== 1) {
    await rm(req.file.path, { force: true });
    return sendError(res, 503, 'Audio storage is unavailable until the database is connected.');
  }

  const baseName = safeName(path.parse(req.file.originalname).name) || 'audio';
  const filename = `${safeName(subject)}_${audioDate.toISOString().slice(0, 10)}_${safeName(deviceId)}_${baseName}_${randomUUID()}.mp3`;
  const destination = path.join(AUDIO_STORAGE_DIR, filename);

  try {
    await mkdir(AUDIO_STORAGE_DIR, { recursive: true });
    await rename(req.file.path, destination);
    const audio = await Audio.create({
      subject,
      date: audioDate,
      file_path: path.relative(path.resolve(MODULE_DIR, '../../../'), destination),
      device_id: deviceId,
      duration,
    });
    return res.status(201).json({ success: true, data: audio });
  } catch (error) {
    await rm(req.file.path, { force: true });
    await rm(destination, { force: true });
    console.error('[audio] upload failed:', error);
    return sendError(res, 500, 'Failed to save the uploaded audio.');
  }
};

export const uploadDeviceBatch = async (req, res) => {
  const attendanceFile = req.files?.attendance?.[0];
  const audioFiles = req.files?.audios || [];
  const deviceId = String(req.body.device_id || '').trim();
  const audioDate = parseDate(req.body.date);
  const uploadedPaths = [];

  const discardStagedFiles = async () => {
    await Promise.all(
      [attendanceFile, ...audioFiles]
        .filter(Boolean)
        .map((file) => rm(file.path, { force: true })),
    );
  };

  if (!attendanceFile) {
    await discardStagedFiles();
    return sendError(res, 400, 'Upload an attendance CSV using the "attendance" field.');
  }
  if (!deviceId || !safeName(deviceId)) {
    await discardStagedFiles();
    return sendError(res, 400, 'Provide a valid device_id.');
  }
  if (!audioDate) {
    await discardStagedFiles();
    return sendError(res, 400, 'Provide date in YYYY-MM-DD format.');
  }

  let attendanceContent;
  let audioMetadata;
  try {
    if (path.extname(attendanceFile.originalname).toLowerCase() !== '.csv') {
      throw new Error('Attendance upload must be a CSV file.');
    }
    attendanceContent = await readFile(attendanceFile.path);
    const header = attendanceContent.toString('utf8').split(/\r?\n/, 1)[0]
      .split(',')
      .map((column) => column.trim().replace(/^"|"$/g, '').toLowerCase());
    const requiredColumns = ['date', 'time', 'student', 'subject', 'class_name', 'room', 'device_id', 'status'];
    if (!requiredColumns.every((column) => header.includes(column))) {
      throw new Error('Attendance CSV is missing one or more required columns.');
    }
    audioMetadata = JSON.parse(req.body.audio_metadata || '{}');
    if (!audioMetadata || typeof audioMetadata !== 'object' || Array.isArray(audioMetadata)) {
      throw new Error('Audio metadata must be a JSON object.');
    }
    for (const file of audioFiles) {
      const metadata = audioMetadata[file.originalname];
      if (
        !metadata
        || typeof metadata.subject !== 'string'
        || !safeName(metadata.subject)
        || !Number.isFinite(Number(metadata.duration))
        || Number(metadata.duration) <= 0
        || metadata.date !== req.body.date
        || metadata.device_id !== deviceId
      ) {
        throw new Error(`Invalid audio metadata for ${file.originalname}.`);
      }
    }
    if (Object.keys(audioMetadata).length !== audioFiles.length) {
      throw new Error('Audio metadata does not match the uploaded MP3 files.');
    }
  } catch (error) {
    await discardStagedFiles();
    return sendError(res, 400, error.message || 'Invalid upload metadata.');
  }

  if (audioFiles.length && mongoose.connection.readyState !== 1) {
    await discardStagedFiles();
    return sendError(res, 503, 'Audio metadata storage is unavailable until the database is connected.');
  }

  try {
    await mkdir(ATTENDANCE_STORAGE_DIR, { recursive: true });
    await mkdir(AUDIO_STORAGE_DIR, { recursive: true });
    const attendanceHash = createHash('sha256').update(attendanceContent).digest('hex');
    const attendanceName = `${req.body.date}_${safeName(deviceId)}_${attendanceHash.slice(0, 16)}.csv`;
    const attendanceDestination = path.join(ATTENDANCE_STORAGE_DIR, attendanceName);
    try {
      await rename(attendanceFile.path, attendanceDestination);
      uploadedPaths.push(attendanceDestination);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      await rm(attendanceFile.path, { force: true });
    }

    const audioRecords = [];
    for (const file of audioFiles) {
      const digest = await hashFile(file.path);
      const filename = `${req.body.date}_${safeName(deviceId)}_${digest}${path.extname(file.originalname).toLowerCase()}`;
      const destination = path.join(AUDIO_STORAGE_DIR, filename);
      try {
        await rename(file.path, destination);
        uploadedPaths.push(destination);
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        await rm(file.path, { force: true });
      }

      const metadata = audioMetadata[file.originalname];
      const filePath = path.relative(path.resolve(MODULE_DIR, '../../../'), destination);
      audioRecords.push({
        updateOne: {
          filter: { file_path: filePath },
          update: {
            $setOnInsert: {
              lecture_id: new mongoose.Types.ObjectId().toString(),
              subject: metadata.subject.trim(),
              date: audioDate,
              file_path: filePath,
              device_id: deviceId,
              duration: Number(metadata.duration),
            },
          },
          upsert: true,
        },
      });
    }

    if (audioRecords.length) await Audio.bulkWrite(audioRecords, { ordered: true });
    return res.status(201).json({
      success: true,
      data: {
        attendance_file: path.relative(path.resolve(MODULE_DIR, '../../../'), attendanceDestination),
        audio_count: audioFiles.length,
      },
    });
  } catch (error) {
    await discardStagedFiles();
    await Promise.all(uploadedPaths.map((uploadedPath) => rm(uploadedPath, { force: true })));
    console.error('[audio] IoT batch upload failed:', error);
    return sendError(res, 500, 'Failed to store the IoT attendance and audio batch.');
  }
};

export const getLectures = async (req, res) => {
  const filter = {};
  if (req.query.date !== undefined) {
    const date = parseDate(req.query.date);
    if (!date) return sendError(res, 400, 'date must use YYYY-MM-DD format.');
    filter.date = { $gte: date, $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000) };
  }
  if (req.query.subject !== undefined) {
    const subject = String(req.query.subject).trim();
    if (!subject) return sendError(res, 400, 'subject cannot be empty.');
    filter.subject = subject;
  }

  try {
    const lectures = await Audio.find(filter).sort({ date: -1, createdAt: -1 }).limit(100).lean();
    return res.json({ success: true, data: lectures });
  } catch (error) {
    console.error('[audio] lecture lookup failed:', error);
    return sendError(res, 500, 'Failed to fetch audio lectures.');
  }
};
