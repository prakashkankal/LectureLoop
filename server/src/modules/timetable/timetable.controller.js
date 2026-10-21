import XLSX from 'xlsx';
import Timetable from './timetable.model.js';

const REQUIRED_COLUMNS = ['day', 'start', 'end', 'subject', 'class', 'room', 'device'];
const DAYS = new Map([
  ['monday', 'Monday'],
  ['tuesday', 'Tuesday'],
  ['wednesday', 'Wednesday'],
  ['thursday', 'Thursday'],
  ['friday', 'Friday'],
  ['saturday', 'Saturday'],
  ['sunday', 'Sunday'],
]);

const normalizeHeader = (header) => String(header).trim().toLowerCase();

const formatTime = (value) => {
  if (value instanceof Date) {
    return `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}`;
  }

  if (typeof value === 'number' && value >= 0 && value < 1) {
    const totalMinutes = Math.round(value * 24 * 60) % (24 * 60);
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
  }

  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (minutes > 59 || hours > (meridiem ? 12 : 23) || (meridiem && hours === 0)) return null;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  if (meridiem === 'PM' && hours !== 12) hours += 12;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export const parseExcel = (file) => {
  if (!file?.buffer?.length) {
    throw new Error('Upload a non-empty Excel file.');
  }

  let workbook;
  try {
    workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
  } catch {
    throw new Error('The uploaded file could not be read as an Excel workbook.');
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('The Excel workbook does not contain a worksheet.');

  const sheet = workbook.Sheets[sheetName];
  const [headers = [], ...rows] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: true,
    blankrows: false,
  });
  const columnIndexes = new Map(headers.map((header, index) => [normalizeHeader(header), index]));
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !columnIndexes.has(column));
  if (missingColumns.length) {
    throw new Error(`Missing required Excel columns: ${missingColumns.join(', ')}.`);
  }

  const parsedRows = rows.map((row, index) => {
    const rowNumber = index + 2;
    const get = (column) => row[columnIndexes.get(column)] ?? '';
    const values = REQUIRED_COLUMNS.map(get);
    if (values.every((value) => String(value).trim() === '')) return null;

    const day = DAYS.get(String(get('day')).trim().toLowerCase());
    const startTime = formatTime(get('start'));
    const endTime = formatTime(get('end'));
    const subject = String(get('subject')).trim();
    const className = String(get('class')).trim();
    const roomNo = String(get('room')).trim();
    const deviceId = String(get('device')).trim();

    const invalid = [];
    if (!day) invalid.push('Day must be a weekday name');
    if (!startTime) invalid.push('Start must be a valid time');
    if (!endTime) invalid.push('End must be a valid time');
    if (startTime && endTime && endTime <= startTime) invalid.push('End must be after Start');
    if (!subject) invalid.push('Subject is required');
    if (!className) invalid.push('Class is required');
    if (!roomNo) invalid.push('Room is required');
    if (!deviceId) invalid.push('Device is required');
    if (invalid.length) throw new Error(`Excel row ${rowNumber}: ${invalid.join('; ')}.`);

    return {
      day,
      start_time: startTime,
      end_time: endTime,
      subject,
      class_name: className,
      room_no: roomNo,
      device_id: deviceId,
    };
  }).filter(Boolean);

  if (parsedRows.length === 0) {
    throw new Error('The Excel worksheet does not contain any timetable rows.');
  }

  return parsedRows;
};

export const uploadTimetable = async (req, res) => {
  let rows;
  try {
    rows = parseExcel(req.file);
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  try {
    const timetable = await Timetable.insertMany(
      rows.map((row) => ({ ...row, teacher_id: req.user._id })),
    );

    return res.status(201).json({
      success: true,
      message: `Uploaded ${timetable.length} timetable entries.`,
      data: timetable,
    });
  } catch (error) {
    console.error('[timetable] upload failed:', error);
    return res.status(500).json({ success: false, error: 'Failed to save timetable entries.' });
  }
};

export const getDeviceTimetable = async (req, res) => {
  const { device_id: deviceId, day: requestedDay } = req.query;
  const day = DAYS.get(String(requestedDay || '').trim().toLowerCase());

  if (!deviceId || !day) {
    return res.status(400).json({
      success: false,
      error: 'Provide a device_id and a valid day.',
    });
  }

  try {
    const timetable = await Timetable.find({ device_id: String(deviceId).trim(), day })
      .sort({ start_time: 1 })
      .lean();
    return res.json({ success: true, data: timetable });
  } catch (error) {
    console.error('[timetable] device lookup failed:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch device timetable.' });
  }
};
