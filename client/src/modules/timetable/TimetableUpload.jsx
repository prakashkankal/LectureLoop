import React, { useState } from 'react';
import axios from 'axios';
import TimetablePreview from './TimetablePreview';

const API_BASE = 'http://localhost:5000/api';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const COLUMN_KEYS = ['day', 'start', 'end', 'subject', 'class', 'room', 'device'];

const displayTime = (value) => {
  if (value instanceof Date) {
    return `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}`;
  }
  if (typeof value === 'number' && value >= 0 && value < 1) {
    const minutes = Math.round(value * 1440) % 1440;
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }
  return String(value ?? '').trim();
};

const parsePreview = async (file) => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('The workbook does not contain a worksheet.');

  const [headers = [], ...data] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: true,
    blankrows: false,
  });
  const normalizedHeaders = headers.map((header) => String(header).trim().toLowerCase());
  const missing = COLUMN_KEYS.filter((key) => !normalizedHeaders.includes(key));
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(', ')}.`);

  const indexes = new Map(normalizedHeaders.map((header, index) => [header, index]));
  const rows = data.filter((row) => row.some((value) => String(value).trim() !== '')).map((row) => {
    const get = (key) => row[indexes.get(key)] ?? '';
    return {
      day: String(get('day')).trim(),
      start_time: displayTime(get('start')),
      end_time: displayTime(get('end')),
      subject: String(get('subject')).trim(),
      class_name: String(get('class')).trim(),
      room_no: String(get('room')).trim(),
      device_id: String(get('device')).trim(),
    };
  });
  if (rows.length === 0) throw new Error('The worksheet does not contain any timetable entries.');
  return rows;
};

export default function TimetableUpload() {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(null);
    setRows([]);
    setError('');
    setNotice('');
    if (!selectedFile) return;
    if (!selectedFile.name.toLowerCase().endsWith('.xlsx')) {
      setError('Choose an .xlsx file.');
      event.target.value = '';
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('The Excel file must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }

    try {
      const previewRows = await parsePreview(selectedFile);
      setFile(selectedFile);
      setRows(previewRows);
    } catch (parseError) {
      setError(parseError.message || 'Unable to read this Excel workbook.');
      event.target.value = '';
    }
  };

  const handleConfirm = async () => {
    if (!file || isUploading) return;
    setIsUploading(true);
    setError('');
    setNotice('');

    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await axios.post(`${API_BASE}/teacher/upload-timetable`, formData);
      setNotice(response.data?.message || 'Timetable uploaded successfully.');
      setFile(null);
      setRows([]);
    } catch (uploadError) {
      setError(
        uploadError.response?.data?.error
          || uploadError.message
          || 'Unable to upload this timetable.',
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-space-xl px-gutter py-space-xl">
      <header className="flex flex-col gap-space-sm">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-[30px] text-primary-container">calendar_month</span>
          <h1 className="font-headline-lg text-3xl font-bold text-on-surface">Upload timetable</h1>
        </div>
        <p className="max-w-2xl text-sm text-on-surface-variant">
          Choose an Excel workbook with Day, Start, End, Subject, Class, Room, and Device columns.
          Review the rows before confirming the upload.
        </p>
      </header>

      <section className="flex flex-col gap-space-md rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-space-lg shadow-sm">
        <label htmlFor="timetable-file" className="text-sm font-semibold text-on-surface">
          Select an .xlsx timetable
        </label>
        <input
          id="timetable-file"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={handleFileChange}
          disabled={isUploading}
          className="block w-full text-sm text-on-surface-variant file:mr-4 file:rounded-lg file:border-0 file:bg-primary-container file:px-4 file:py-2 file:font-medium file:text-on-primary disabled:opacity-60"
        />
        {file && <p className="text-xs text-on-surface-variant">Selected: {file.name}</p>}
        {error && <p role="alert" className="rounded-lg bg-error-container/40 p-3 text-sm text-error">{error}</p>}
        {notice && <p role="status" className="rounded-lg bg-tertiary-fixed p-3 text-sm text-on-surface">{notice}</p>}
      </section>

      <TimetablePreview rows={rows} onConfirm={handleConfirm} isUploading={isUploading} />
    </div>
  );
}
