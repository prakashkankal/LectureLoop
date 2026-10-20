import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ZipArchive } from 'archiver';
import sharp from 'sharp';
import {
  extractTopicTranscript,
  generateSourceHash,
  generateHandwrittenInfographicSvg,
  generateTopicInfographicImage,
  createHandwrittenNotesPrompt,
} from '../src/services/notesAiService.js';
import {
  saveNoteImage,
  getNoteImageBuffer,
} from '../src/services/storageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('--- [Test Suite: Topic-Wise Handwritten Infographic Notes] ---');

  // Test 1: Transcript segment extraction by topic timestamp
  console.log('Test 1: Extract topic transcript based on timestamps');
  const sampleTranscript = `
[00:00] Welcome to Git and GitHub tutorial.
[00:15] In this lecture we will cover version control basics.
[02:00] Now let us move into topic two: GitHub interface and repository types.
[02:25] You have public, private, and internal repositories.
[04:30] Next we will discuss basic git commands like git add and commit.
[05:10] Running git commit takes a snapshot of your staged files.
`;

  const topic1Transcript = extractTopicTranscript(sampleTranscript, 0, 115, 'Introduction to Git');
  assert(topic1Transcript.includes('Welcome to Git'), 'Topic 1 transcript should contain introduction');
  assert(!topic1Transcript.includes('git commit takes a snapshot'), 'Topic 1 should not contain topic 3 text');

  const topic2Transcript = extractTopicTranscript(sampleTranscript, 120, 260, 'GitHub Interface');
  assert(topic2Transcript.includes('GitHub interface'), 'Topic 2 transcript should contain repository types');

  console.log('✓ Test 1 Passed: Accurate transcript segment extraction');

  // Test 2: Source hash generation
  console.log('Test 2: Source hash generation for change detection');
  const hash1 = generateSourceHash({ index: 1, title: 'Intro', summary: 'Summary A' }, 'text a');
  const hash2 = generateSourceHash({ index: 1, title: 'Intro', summary: 'Summary A' }, 'text a');
  const hash3 = generateSourceHash({ index: 1, title: 'Intro', summary: 'Summary B' }, 'text b');
  assert.strictEqual(hash1, hash2, 'Identical content must yield identical hash');
  assert.notStrictEqual(hash1, hash3, 'Modified content must yield distinct hash');
  console.log('✓ Test 2 Passed: Consistent deterministic source hashing');

  // Test 3: Image prompt contains only the transcript and handwritten-notes instruction
  console.log('Test 3: Handwritten image prompt uses only transcript content');
  const imagePrompt = createHandwrittenNotesPrompt('[00:15] Git records changes in a repository.');
  assert.strictEqual(
    imagePrompt,
    'Create an image of handwritten notes based only on the transcript below. Do not add information that is not in the transcript.\n\nTranscript:\n[00:15] Git records changes in a repository.'
  );
  console.log('✓ Test 3 Passed: Prompt contains no topic metadata or generated note sections');

  // Test 4: SVG handwritten notes infographic generation & Sharp PNG compilation
  console.log('Test 4: Handwritten SVG infographic rendering & sharp PNG compilation');
  const testSpec = {
    topicTitle: 'Basic Git Commands',
    overview: 'Essential commands to initialize, stage, and commit snapshots in local version control.',
    keyConcepts: [
      { term: 'Working Directory', explanation: 'Untracked and modified local workspace files.' },
      { term: 'Staging Area', explanation: 'Index containing files prepared for the next commit snapshot.' },
      { term: 'Local Repository', explanation: 'Permanent history saved in .git directory.' },
    ],
    steps: [
      '1. Stage changes using git add .',
      '2. Record snapshot with git commit -m "feat: init"',
      '3. Verify repository status using git status',
    ],
    codeOrSyntax: [
      {
        label: 'Commit Command',
        code: 'git commit -m "feat: initial commit"',
        note: 'Provide clear imperative commit message',
      },
    ],
    criticalWarnings: [
      'Never commit credentials, API keys, or .env files to Git.',
    ],
    takeaways: [
      'Always run git status before committing.',
      'Write meaningful commit messages for review.',
    ],
    diagramSummary: 'Working Directory → Staging Index → Local Commit',
  };

  const svgOutput = generateHandwrittenInfographicSvg(testSpec, 4, 'Complete Git & GitHub Tutorial');
  assert(svgOutput.includes('Basic Git Commands'), 'SVG must include topic title');
  assert(svgOutput.includes('COMMON PITFALL'), 'SVG must include warning section');
  assert(svgOutput.includes('QUICK REVISION HIGHLIGHTS'), 'SVG must include revision takeaways');
  assert(svgOutput.includes('git commit -m'), 'SVG must include exact syntax code');

  // Convert SVG to PNG using sharp
  const pngBuffer = await sharp(Buffer.from(svgOutput)).png().toBuffer();
  assert(Buffer.isBuffer(pngBuffer), 'Sharp should produce a valid PNG buffer');
  assert(pngBuffer.length > 10000, 'PNG buffer should be substantial in size');
  const metadata = await sharp(pngBuffer).metadata();
  assert.strictEqual(metadata.width, 1024, 'Image width should be 1024');
  assert.strictEqual(metadata.height, 1792, 'Image height should be 1792 portrait');
  console.log(`✓ Test 4 Passed: Rendered 1024x1792 portrait PNG (${Math.round(pngBuffer.length / 1024)} KB)`);

  // Test 5: Persistent Storage
  console.log('Test 5: Persistent storage saving and retrieval');
  const saveResult = await saveNoteImage({
    buffer: pngBuffer,
    filename: '04-basic-git-commands.png',
    contentType: 'image/png',
    lectureId: 'test_lecture_123',
    topicIndex: 4,
    width: 1024,
    height: 1792,
  });

  assert(saveResult.storageKey, 'Must return a valid storageKey');
  assert(saveResult.url, 'Must return a valid asset url');

  const retrievedBuffer = await getNoteImageBuffer(saveResult.storageKey);
  assert(retrievedBuffer, 'Must retrieve stored image buffer');
  assert.strictEqual(retrievedBuffer.length, pngBuffer.length, 'Retrieved buffer length must match saved buffer');
  console.log('✓ Test 5 Passed: Persistent storage save and retrieval successful');

  // Test 6: ZIP archive stream creation
  console.log('Test 6: ZIP streaming and archive integrity');
  const zipPath = path.join(__dirname, 'test-notes-archive.zip');
  const outputStream = fs.createWriteStream(zipPath);
  const archive = new ZipArchive({ zlib: { level: 9 } });

  const zipPromise = new Promise((resolve, reject) => {
    outputStream.on('close', resolve);
    archive.on('error', reject);
  });

  archive.pipe(outputStream);

  // Append 3 topic note images to simulate complete multi-topic lecture
  const topics = [
    { index: 1, title: 'Introduction to Git and GitHub' },
    { index: 2, title: 'GitHub Interface and Repository Types' },
    { index: 3, title: 'Setting Up Git and VS Code' },
  ];

  for (const t of topics) {
    const topicSvg = generateHandwrittenInfographicSvg({
      topicTitle: t.title,
      overview: `Educational notes for ${t.title}.`,
      keyConcepts: [{ term: 'Concept', explanation: 'Concept description.' }],
      steps: ['Step 1', 'Step 2'],
      codeOrSyntax: [{ label: 'Command', code: 'git --version', note: 'Check version' }],
      criticalWarnings: ['Check git configuration.'],
      takeaways: ['Takeaway point.'],
      diagramSummary: 'Step Flow',
    }, t.index, 'Complete Git Tutorial');

    const topicPng = await sharp(Buffer.from(topicSvg)).png().toBuffer();
    const entryName = `Lecture-Loop-Git-Tutorial-Notes/0${t.index}-${t.title.replace(/\s+/g, '-')}.png`;
    archive.append(topicPng, { name: entryName });
  }

  await archive.finalize();
  await zipPromise;

  assert(fs.existsSync(zipPath), 'ZIP archive file must exist on disk');
  const zipStats = fs.statSync(zipPath);
  assert(zipStats.size > 20000, 'ZIP archive must be populated with all 3 images');
  console.log(`✓ Test 6 Passed: Streamed valid ZIP containing 3 topic notes (${Math.round(zipStats.size / 1024)} KB)`);

  // Cleanup test zip
  try {
    fs.unlinkSync(zipPath);
  } catch {}

  console.log('\nAll 6 core tests passed successfully!');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
