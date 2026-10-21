import assert from 'node:assert/strict';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { ATTENDANCE_STORAGE_DIR } from '../../audio/audio.controller.js';
import { getTodayLecture } from './todayLectureController.js';

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

test('returns only the exact student roll row and keeps staff history complete', async (t) => {
  const date = '2098-12-31';
  const file = path.join(ATTENDANCE_STORAGE_DIR, `${date}_test_today_lecture.csv`);
  await mkdir(ATTENDANCE_STORAGE_DIR, { recursive: true });
  await writeFile(file, [
    'roll,name,status,subject,date,timestamp,device_id,room',
    `R1,Student Person,Present,DBMS,${date},09:00,ROOM301,301`,
    `R2,Another Student,Present,DBMS,${date},09:01,ROOM301,301`,
    `R3,Student Person Jr,Present,DBMS,${date},09:02,ROOM301,301`,
  ].join('\n'));
  t.after(() => rm(file, { force: true }));

  const studentResponse = response();
  await getTodayLecture({
    query: { date },
    user: { role: 'student', name: 'Student Person', roll: 'R1' },
  }, studentResponse, (error) => { throw error; });
  assert.equal(studentResponse.statusCode, 200);
  assert.deepEqual(studentResponse.body.attendance.map((row) => row.roll), ['R1']);
  assert.equal(JSON.stringify(studentResponse.body).includes('Another Student'), false);
  assert.equal(JSON.stringify(studentResponse.body).includes('Student Person Jr'), false);

  const studentWithoutRollResponse = response();
  await getTodayLecture({
    query: { date },
    user: { role: 'student', name: 'Student Person' },
  }, studentWithoutRollResponse, (error) => { throw error; });
  assert.deepEqual(studentWithoutRollResponse.body.attendance, []);

  const staffResponse = response();
  await getTodayLecture({
    query: { date },
    user: { role: 'teacher', name: 'Teacher' },
  }, staffResponse, (error) => { throw error; });
  assert.equal(staffResponse.statusCode, 200);
  assert.equal(staffResponse.body.attendance.length, 3);

  const adminResponse = response();
  await getTodayLecture({
    query: { date },
    user: { role: 'admin', name: 'Admin' },
  }, adminResponse, (error) => { throw error; });
  assert.equal(adminResponse.body.attendance.length, 3);
});

test('returns a friendly not-found response when there is no upload', async () => {
  const res = response();
  await getTodayLecture({
    query: { date: '2099-01-01' },
    user: { role: 'student', name: 'Student' },
  }, res, (error) => { throw error; });

  assert.equal(res.statusCode, 404);
  assert.match(res.body.error, /No IoT lecture upload/);
});
