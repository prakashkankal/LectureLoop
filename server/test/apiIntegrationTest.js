import assert from 'assert';
import http from 'http';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import lectureRoutes from '../src/routes/lectureRoutes.js';
import Lecture from '../src/models/Lecture.js';
import TopicNote from '../src/models/TopicNote.js';

const JWT_SECRET = process.env.JWT_SECRET || 'lectureloop_dev_secret_key_2026';

async function runApiIntegrationTests() {
  console.log('--- [API Integration Test: Topic-Wise Notes Endpoints] ---');

  const app = express();
  app.use(express.json());
  app.use('/api/lectures', lectureRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/lectures`;

  // Create a mock authenticated user token
  const testUserId = new mongoose.Types.ObjectId();
  const testToken = jwt.sign({ id: testUserId.toString(), role: 'student' }, JWT_SECRET, { expiresIn: '1h' });
  const authHeaders = {
    Authorization: `Bearer ${testToken}`,
    'Content-Type': 'application/json',
  };

  console.log(`Test server running on port ${port}`);

  // Setup mock database records using Mongoose models
  const mockLectureId = new mongoose.Types.ObjectId();
  const mockLecture = {
    _id: mockLectureId,
    userId: testUserId,
    title: 'Complete Git and GitHub Tutorial for Beginners',
    subject: 'Version Control',
    status: 'ready',
    analysisStatus: 'complete',
    transcript: `
[00:00] Welcome to Git and GitHub tutorial for beginners.
[00:30] Git is a distributed version control system designed to handle everything from small to large projects.
[02:15] Next up is the GitHub interface, repositories, public vs private repositories.
[05:00] Setting up git and configuring your user email and default branch name.
[08:00] Basic git commands: git init, git add, git commit, and git status.
    `,
    topics: [
      {
        index: 1,
        title: 'Introduction to Git and GitHub',
        startTime: '00:00',
        endTime: '02:15',
        startSec: 0,
        endSec: 135,
        summary: 'Overview of distributed version control, tracking changes, and commit history.',
        keyTerms: ['Version Control', 'Distributed VCS', 'Repository'],
      },
      {
        index: 2,
        title: 'GitHub Interface and Repository Types',
        startTime: '02:15',
        endTime: '05:00',
        startSec: 135,
        endSec: 300,
        summary: 'Navigating GitHub UI, creating public vs private repositories, and README creation.',
        keyTerms: ['Remote Repository', 'Public/Private', 'Markdown'],
      },
      {
        index: 3,
        title: 'Setting Up Git and VS Code',
        startTime: '05:00',
        endTime: '08:00',
        startSec: 300,
        endSec: 480,
        summary: 'Configuring git user credentials, SSH keys, and VS Code integration.',
        keyTerms: ['git config', 'SSH Keys', 'VS Code'],
      },
    ],
  };

  // Temporarily stub Lecture.findOne and TopicNote methods if MongoDB is not connected
  const origLectureFindOne = Lecture.findOne;
  const origTopicNoteFind = TopicNote.find;
  const origTopicNoteFindOne = TopicNote.findOne;
  const origTopicNoteCreate = TopicNote.create;
  const origTopicNoteFindOneAndUpdate = TopicNote.findOneAndUpdate;

  const inMemoryNotes = [];

  Lecture.findOne = ({ _id, userId }) => {
    if (String(_id) === String(mockLectureId)) {
      return Promise.resolve(mockLecture);
    }
    return Promise.resolve(null);
  };

  TopicNote.find = (query) => {
    let result = inMemoryNotes.filter((n) => String(n.lectureId) === String(query.lectureId));
    if (query.generationStatus) {
      result = result.filter((n) => n.generationStatus === query.generationStatus);
    }
    return {
      lean: () => Promise.resolve(JSON.parse(JSON.stringify(result))),
      then: (fn) => Promise.resolve(result).then(fn),
    };
  };

  TopicNote.findOne = (query) => {
    const note = inMemoryNotes.find((n) => {
      const matchLecture = String(n.lectureId) === String(query.lectureId);
      const matchTopic = query.topicIndex != null ? n.topicIndex === query.topicIndex : true;
      return matchLecture && matchTopic;
    });
    if (!note) return Promise.resolve(null);
    return Promise.resolve({
      ...note,
      save: async function () {
        const idx = inMemoryNotes.findIndex((x) => x._id === note._id);
        if (idx !== -1) inMemoryNotes[idx] = { ...this };
        return this;
      },
    });
  };

  TopicNote.create = async (doc) => {
    const saved = {
      _id: new mongoose.Types.ObjectId().toString(),
      ...doc,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: async function () {
        const idx = inMemoryNotes.findIndex((x) => x._id === this._id);
        if (idx !== -1) inMemoryNotes[idx] = { ...this };
        return this;
      },
    };
    inMemoryNotes.push(saved);
    return saved;
  };

  TopicNote.findOneAndUpdate = async (filter, update, opts = {}) => {
    let note = inMemoryNotes.find((n) =>
      String(n.lectureId) === String(filter.lectureId) && n.topicIndex === filter.topicIndex
    );
    if (!note && opts.upsert) {
      note = {
        _id: new mongoose.Types.ObjectId().toString(),
        lectureId: filter.lectureId,
        topicIndex: filter.topicIndex,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryNotes.push(note);
    }
    if (note) {
      Object.assign(note, update);
      note.updatedAt = new Date();
    }
    return note;
  };

  try {
    // ── Test A: GET /api/lectures/:lectureId/notes (initial state) ────────────
    console.log('Test A: GET /api/lectures/:lectureId/notes (initial ungenerated state)');
    const resA = await fetch(`${baseUrl}/${mockLectureId}/notes`, { headers: authHeaders });
    assert.strictEqual(resA.status, 200, 'Should return 200 OK');
    const dataA = await resA.json();
    assert.strictEqual(dataA.success, true);
    assert.strictEqual(dataA.data.totalTopics, 3, 'Should list 3 topics');
    assert.strictEqual(dataA.data.completedCount, 0, 'Should have 0 completed notes initially');
    assert.strictEqual(dataA.data.topics[0].generationStatus, 'not_generated');
    console.log('✓ Test A Passed: Returns ordered topics with not_generated status');

    // ── Test B: POST /api/lectures/:lectureId/topics/:topicId/notes/generate ──
    console.log('Test B: POST /api/lectures/:lectureId/topics/1/notes/generate (generate Topic 1)');
    const resB = await fetch(`${baseUrl}/${mockLectureId}/topics/1/notes/generate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ forceMock: true }),
    });
    assert.strictEqual(resB.status, 201, 'Should return 201 Created');
    const dataB = await resB.json();
    assert.strictEqual(dataB.success, true);
    assert.strictEqual(dataB.data.topicIndex, 1);
    assert.strictEqual(dataB.data.generationStatus, 'completed');
    assert(dataB.data.imageUrl.includes('/notes/image'), 'Should have persistent image URL');
    assert(dataB.data.imageStorageKey, 'Should have persistent storage key');
    console.log('✓ Test B Passed: Topic 1 note generated and persisted successfully');

    // ── Test C: Duplicate generation prevention ───────────────────────────────
    console.log('Test C: Duplicate generation prevention (reuse completed note)');
    const resC = await fetch(`${baseUrl}/${mockLectureId}/topics/1/notes/generate`, {
      method: 'POST',
      headers: authHeaders,
    });
    assert.strictEqual(resC.status, 200, 'Should return 200 with cached note');
    const dataC = await resC.json();
    assert.strictEqual(dataC.success, true);
    assert(dataC.message.includes('Reusing previously generated note'));
    console.log('✓ Test C Passed: Reuses existing notes and prevents duplicate API calls');

    // ── Test D: GET /api/lectures/:lectureId/notes/generation-status ──────────
    console.log('Test D: GET /api/lectures/:lectureId/notes/generation-status');
    const resD = await fetch(`${baseUrl}/${mockLectureId}/notes/generation-status`, { headers: authHeaders });
    assert.strictEqual(resD.status, 200);
    const dataD = await resD.json();
    assert.strictEqual(dataD.data.total, 3);
    assert.strictEqual(dataD.data.completed, 1);
    assert.strictEqual(dataD.data.notGenerated, 2);
    console.log('✓ Test D Passed: Generation status counts reported accurately');

    // ── Test E: Generate remaining topics 2 & 3 ────────────────────────────────
    console.log('Test E: Generate topics 2 and 3');
    for (const tIndex of [2, 3]) {
      const resE = await fetch(`${baseUrl}/${mockLectureId}/topics/${tIndex}/notes/generate`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ forceMock: true }),
      });
      assert.strictEqual(resE.status, 201);
    }
    console.log('✓ Test E Passed: All 3 topics have completed notes');

    // ── Test F: Single Download ───────────────────────────────────────────────
    console.log('Test F: GET /api/lectures/:lectureId/topics/2/notes/download');
    const resF = await fetch(`${baseUrl}/${mockLectureId}/topics/2/notes/download`, { headers: authHeaders });
    assert.strictEqual(resF.status, 200);
    assert.strictEqual(resF.headers.get('content-type'), 'image/png');
    const dispF = resF.headers.get('content-disposition');
    assert(dispF.includes('attachment'), 'Content-Disposition should be attachment');
    assert(dispF.includes('02-github-interface'), 'Filename should be formatted with topic index');
    const bufferF = Buffer.from(await resF.arrayBuffer());
    assert(bufferF.length > 5000, 'Downloaded image buffer should be non-empty valid PNG');
    console.log(`✓ Test F Passed: Single image download works with formatted header (${bufferF.length} bytes)`);

    // ── Test G: Download All ZIP ──────────────────────────────────────────────
    console.log('Test G: GET /api/lectures/:lectureId/notes/download-all');
    const resG = await fetch(`${baseUrl}/${mockLectureId}/notes/download-all`, { headers: authHeaders });
    assert.strictEqual(resG.status, 200);
    assert.strictEqual(resG.headers.get('content-type'), 'application/zip');
    const dispG = resG.headers.get('content-disposition');
    assert(dispG.includes('attachment'), 'Content-Disposition should be attachment');
    assert(dispG.toLowerCase().includes('lecture-loop-complete-git'), 'ZIP filename should be formatted');
    const zipBuffer = Buffer.from(await resG.arrayBuffer());
    assert(zipBuffer.length > 20000, 'ZIP buffer should be populated with all 3 images');
    console.log(`✓ Test G Passed: Downloaded streaming ZIP archive (${Math.round(zipBuffer.length / 1024)} KB)`);

    // ── Test H: Authorization enforcement ─────────────────────────────────────
    console.log('Test H: Verify authentication enforcement');
    const unauthRes = await fetch(`${baseUrl}/${mockLectureId}/notes`);
    assert.strictEqual(unauthRes.status, 401, 'Should reject unauthenticated request with 401');
    console.log('✓ Test H Passed: Unauthorized access properly rejected');

    console.log('\nAll API integration tests passed successfully with 100% assertions satisfied!');
  } finally {
    // Restore stubs
    Lecture.findOne = origLectureFindOne;
    TopicNote.find = origTopicNoteFind;
    TopicNote.findOne = origTopicNoteFindOne;
    TopicNote.create = origTopicNoteCreate;
    TopicNote.findOneAndUpdate = origTopicNoteFindOneAndUpdate;

    server.close();
  }
}

runApiIntegrationTests().catch((err) => {
  console.error('API integration test failed:', err);
  process.exit(1);
});
