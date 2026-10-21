import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import mongoose from 'mongoose';
import Audio from './audio.model.js';
import {
  AUDIO_STORAGE_DIR,
  getLectures,
  IOT_STAGING_DIR,
  uploadAudio,
  uploadDeviceBatch,
} from './audio.controller.js';

const response = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test('saves an uploaded MP3 and its metadata', async (t) => {
  const originalCreate = Audio.create;
  const originalReadyState = mongoose.connection.readyState;
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'lectureloop-audio-'));
  const uploadPath = path.join(temporaryDirectory, 'upload.tmp');
  let createdAudio;
  Audio.create = async (metadata) => {
    createdAudio = metadata;
    return { lecture_id: 'lecture-1', ...metadata };
  };
  mongoose.connection.readyState = 1;
  t.after(async () => {
    Audio.create = originalCreate;
    mongoose.connection.readyState = originalReadyState;
    await rm(temporaryDirectory, { recursive: true, force: true });
    if (createdAudio?.file_path) {
      await rm(path.resolve(AUDIO_STORAGE_DIR, '..', '..', createdAudio.file_path), { force: true });
    }
  });
  await writeFile(uploadPath, 'mp3 data');

  const res = response();
  await uploadAudio({
    file: { path: uploadPath, originalname: 'DBMS_18Oct_9AM.mp3' },
    body: { subject: 'DBMS', device_id: 'Pi-301', date: '2026-10-18', duration: '3600' },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(createdAudio.subject, 'DBMS');
  assert.equal(createdAudio.device_id, 'Pi-301');
  assert.equal(createdAudio.duration, 3600);
  assert.equal(createdAudio.date.toISOString(), '2026-10-18T00:00:00.000Z');
  const storedPath = path.resolve(AUDIO_STORAGE_DIR, '..', '..', res.body.data.file_path);
  assert.equal(await readFile(storedPath, 'utf8'), 'mp3 data');
});

test('rejects invalid dates without saving the uploaded file', async (t) => {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'lectureloop-audio-'));
  const uploadPath = path.join(temporaryDirectory, 'upload.tmp');
  await writeFile(uploadPath, 'mp3 data');
  t.after(() => rm(temporaryDirectory, { recursive: true, force: true }));

  const res = response();
  await uploadAudio({
    file: { path: uploadPath, originalname: 'recording.mp3' },
    body: { subject: 'DBMS', device_id: 'Pi-301', date: '2026-99-99', duration: '60' },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /YYYY-MM-DD/);
});

test('filters saved lectures by the requested date and subject', async (t) => {
  const originalFind = Audio.find;
  Audio.find = (filter) => ({
    sort: () => ({
      limit: () => ({
        lean: async () => {
          assert.equal(filter.subject, 'DBMS');
          assert.equal(filter.date.$gte.toISOString(), '2026-10-18T00:00:00.000Z');
          assert.equal(filter.date.$lt.toISOString(), '2026-10-19T00:00:00.000Z');
          return [{ lecture_id: 'lecture-1' }];
        },
      }),
    }),
  });
  t.after(() => {
    Audio.find = originalFind;
  });

  const res = response();
  await getLectures({ query: { date: '2026-10-18', subject: 'DBMS' } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.data, [{ lecture_id: 'lecture-1' }]);
});

test('stores the Pi attendance CSV and MP3 batch idempotently', async (t) => {
  const originalBulkWrite = Audio.bulkWrite;
  const originalReadyState = mongoose.connection.readyState;
  await mkdir(IOT_STAGING_DIR, { recursive: true });
  const attendancePath = path.join(IOT_STAGING_DIR, 'attendance.upload');
  const audioPath = path.join(IOT_STAGING_DIR, 'audio.upload');
  const root = path.resolve(AUDIO_STORAGE_DIR, '..', '..');
  let operations;
  let storedAttendancePath;
  Audio.bulkWrite = async (writes) => {
    operations = writes;
    return { upsertedCount: writes.length };
  };
  mongoose.connection.readyState = 1;
  t.after(async () => {
    Audio.bulkWrite = originalBulkWrite;
    mongoose.connection.readyState = originalReadyState;
    await rm(attendancePath, { force: true });
    await rm(audioPath, { force: true });
    if (operations) {
      await Promise.all(operations.map((operation) => (
        rm(path.resolve(root, operation.updateOne.filter.file_path), { force: true })
      )));
    }
    if (storedAttendancePath) await rm(storedAttendancePath, { force: true });
  });
  await writeFile(attendancePath, 'date,time,student,subject,class_name,room,device_id,status\n2026-10-18,09:01,Asha,DBMS,TE IT,301,Pi-301,Present\n');
  await writeFile(audioPath, 'mp3 data');

  const res = response();
  await uploadDeviceBatch({
    files: {
      attendance: [{ path: attendancePath, originalname: 'attendance_2026-10-18.csv' }],
      audios: [{ path: audioPath, originalname: 'DBMS_18Oct_9AM.mp3' }],
    },
    body: {
      device_id: 'Pi-301',
      date: '2026-10-18',
      audio_metadata: JSON.stringify({
        'DBMS_18Oct_9AM.mp3': {
          subject: 'DBMS',
          date: '2026-10-18',
          device_id: 'Pi-301',
          duration: 3600,
        },
      }),
    },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.audio_count, 1);
  assert.equal(operations.length, 1);
  assert.equal(operations[0].updateOne.update.$setOnInsert.subject, 'DBMS');
  assert.match(res.body.data.attendance_file, /^uploads[\\/]attendance[\\/]/);
  storedAttendancePath = path.resolve(root, res.body.data.attendance_file);
});
