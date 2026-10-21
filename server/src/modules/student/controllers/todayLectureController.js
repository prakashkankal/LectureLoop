import { createReadStream } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { ATTENDANCE_STORAGE_DIR, AUDIO_STORAGE_DIR } from '../../audio/audio.controller.js';

const parseCsv = (content) => {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (character === '"') {
      if (quoted && content[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(value);
      value = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && content[index + 1] === '\n') index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }

  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.replace(/^\uFEFF/, '').trim().toLowerCase());
  return rows.slice(1).map((cells) => {
    const record = Object.fromEntries(headers.map((header, index) => [header, (cells[index] || '').trim()]));
    return {
      roll: record.roll || '',
      name: record.name || record.student || '',
      status: record.status || '',
      subject: record.subject || '',
      date: record.date || '',
      timestamp: record.timestamp || record.time || '',
      device_id: record.device_id || '',
      room: record.room || record.room_no || record.class_name || '',
    };
  });
};

const listFiles = async (directory, extension) => {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === extension)
      .map((entry) => path.join(directory, entry.name));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
};

const newestFile = async (files, requestedDate) => {
  const candidates = requestedDate
    ? files.filter((file) => path.basename(file).startsWith(`${requestedDate}_`))
    : files;
  const details = await Promise.all(candidates.map(async (file) => ({
    file,
    modified: (await stat(file)).mtimeMs,
  })));
  return details.sort((left, right) => right.modified - left.modified)[0] || null;
};

const validDate = (date) => /^\d{4}-\d{2}-\d{2}$/.test(date)
  && !Number.isNaN(Date.parse(`${date}T00:00:00Z`))
  && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;

export const getTodayLecture = async (req, res, next) => {
  try {
    const requestedDate = req.query.date ? String(req.query.date) : null;
    if (requestedDate && !validDate(requestedDate)) {
      return res.status(400).json({ success: false, error: 'date must use YYYY-MM-DD format.' });
    }

    const [attendanceFiles, audioFiles] = await Promise.all([
      listFiles(ATTENDANCE_STORAGE_DIR, '.csv'),
      listFiles(AUDIO_STORAGE_DIR, '.mp3'),
    ]);
    const [attendanceFile, audioFile] = await Promise.all([
      newestFile(attendanceFiles, requestedDate),
      newestFile(audioFiles, requestedDate),
    ]);

    if (!attendanceFile && !audioFile) {
      return res.status(404).json({
        success: false,
        error: requestedDate ? 'No IoT lecture upload was found for this date.' : 'No IoT lecture has been uploaded yet.',
      });
    }

    const allAttendance = attendanceFile
      ? parseCsv(await readFile(attendanceFile.file, 'utf8'))
      : [];
    const role = String(req.user?.role || 'student').toLowerCase();
    const isStaff = role === 'teacher' || role === 'admin';
    const studentRoll = String(req.user?.roll || '').trim().toLowerCase();
    const attendance = isStaff
      ? allAttendance
      : allAttendance.filter((row) => studentRoll && row.roll.trim().toLowerCase() === studentRoll);

    const allDates = [...new Set(attendanceFiles
      .map((file) => path.basename(file).match(/^(\d{4}-\d{2}-\d{2})_/))
      .filter(Boolean)
      .map((match) => match[1]))].sort((left, right) => right.localeCompare(left));
    const lastUploadTime = Math.max(attendanceFile?.modified || 0, audioFile?.modified || 0);
    const firstAttendance = allAttendance[0];
    const fileDate = (file) => path.basename(file || '').match(/^(\d{4}-\d{2}-\d{2})_/)?.[1] || null;

    if (req.query.stream === 'audio') {
      if (!audioFile) return res.status(404).json({ success: false, error: 'No lecture audio is available for this date.' });
      res.type('audio/mpeg');
      const stream = createReadStream(audioFile.file);
      stream.on('error', next);
      return stream.pipe(res);
    }

    return res.json({
      success: true,
      date: requestedDate || firstAttendance?.date || fileDate(attendanceFile?.file) || fileDate(audioFile?.file),
      device_id: firstAttendance?.device_id || null,
      room: firstAttendance?.room || null,
      lectureUrl: audioFile ? '/api/lectures/today?stream=audio' : null,
      transcript: audioFile ? 'Transcript is not available yet.' : '',
      notes: audioFile ? 'Auto notes from transcript are not available yet.' : '',
      quiz: audioFile ? [{ q: 'What was the main topic of this lecture?', options: ['Review the lecture recording', 'Not available yet'] }] : [],
      mindmap: { nodes: [] },
      attendance,
      lastUploadTime: lastUploadTime ? new Date(lastUploadTime).toISOString() : null,
      attendanceDates: isStaff ? allDates : [],
      role,
    });
  } catch (error) {
    return next(error);
  }
};
