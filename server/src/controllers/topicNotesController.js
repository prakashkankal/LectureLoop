import mongoose from 'mongoose';
import { ZipArchive } from 'archiver';
import Lecture from '../models/Lecture.js';
import TopicNote from '../models/TopicNote.js';
import {
  extractTopicTranscript,
  generateSourceHash,
  generateTopicInfographicImage,
} from '../services/notesAiService.js';
import {
  saveNoteImage,
  getNoteImageBuffer,
  getNoteImageStream,
} from '../services/storageService.js';

// In-memory lock map to prevent duplicate concurrent generation requests
const activeGenerations = new Set();

/**
 * Helper to sanitize filenames for OS compatibility and ZIP entries.
 */
function sanitizeFilename(name) {
  return (name || 'topic')
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * Format topic index with leading zero (e.g. 01, 02).
 */
function padIndex(idx) {
  return String(idx || 1).padStart(2, '0');
}

/**
 * Resolve topic by either MongoDB _id or numeric index.
 */
function findTopic(lecture, topicId) {
  if (!lecture || !Array.isArray(lecture.topics)) return null;
  return lecture.topics.find(
    (t) => String(t._id) === String(topicId) || String(t.index) === String(topicId)
  ) || null;
}

// ─── A. GET /api/lectures/:lectureId/notes ─────────────────────────────────────
/**
 * Return all notes for the selected lecture, ordered by topic.
 * Indicates which topics do not have generated notes yet.
 */
export const getLectureNotes = async (req, res) => {
  try {
    const { lectureId } = req.params;
    if (!mongoose.isValidObjectId(lectureId)) {
      return res.status(400).json({ success: false, error: 'Invalid lecture ID' });
    }

    const lecture = await Lecture.findOne({ _id: lectureId, userId: req.user?._id });
    if (!lecture) {
      return res.status(404).json({ success: false, error: 'Lecture not found or unauthorized' });
    }

    // Retrieve all existing note records for this lecture
    const existingNotes = await TopicNote.find({ lectureId }).lean();
    const notesMap = new Map(existingNotes.map((n) => [Number(n.topicIndex), n]));

    // Build the ordered topic notes list
    const topicsWithNotes = (lecture.topics || []).map((topic) => {
      const existing = notesMap.get(topic.index);
      const isLockActive = activeGenerations.has(`${lectureId}_${topic.index}`);
      const status = isLockActive ? 'processing' : existing?.generationStatus || 'not_generated';

      return {
        topicIndex: topic.index,
        topicId: String(topic._id || topic.index),
        topicTitle: topic.title,
        startTime: topic.startTime,
        endTime: topic.endTime,
        startSec: topic.startSec,
        endSec: topic.endSec,
        summary: topic.summary,
        keyTerms: topic.keyTerms || [],
        noteId: existing?._id || null,
        imageUrl: existing?.imageUrl || '',
        imageStorageKey: existing?.imageStorageKey || '',
        generationStatus: status,
        generationModel: existing?.generationModel || '',
        generationVersion: existing?.generationVersion || 1,
        errorMessage: existing?.errorMessage || '',
        updatedAt: existing?.updatedAt || null,
        createdAt: existing?.createdAt || null,
      };
    });

    const totalTopics = topicsWithNotes.length;
    const completedCount = topicsWithNotes.filter((t) => t.generationStatus === 'completed').length;
    const processingCount = topicsWithNotes.filter((t) => t.generationStatus === 'processing').length;
    const failedCount = topicsWithNotes.filter((t) => t.generationStatus === 'failed').length;

    return res.json({
      success: true,
      data: {
        lectureId: lecture._id,
        lectureTitle: lecture.title,
        subject: lecture.subject,
        totalTopics,
        completedCount,
        processingCount,
        failedCount,
        topics: topicsWithNotes,
      },
    });
  } catch (err) {
    console.error('[TopicNotesController] getLectureNotes error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve lecture notes' });
  }
};

// ─── B. POST /api/lectures/:lectureId/topics/:topicId/notes/generate ───────────
/**
 * Generate notes for a single topic.
 */
export const generateTopicNote = async (req, res) => {
  const { lectureId, topicId } = req.params;
  const force = Boolean(req.body.force || req.query.force);

  if (!mongoose.isValidObjectId(lectureId)) {
    return res.status(400).json({ success: false, error: 'Invalid lecture ID' });
  }

  const lecture = await Lecture.findOne({ _id: lectureId, userId: req.user?._id });
  if (!lecture) {
    return res.status(404).json({ success: false, error: 'Lecture not found or unauthorized' });
  }

  const topic = findTopic(lecture, topicId);
  if (!topic) {
    return res.status(404).json({ success: false, error: 'Topic not found in lecture' });
  }

  const lockKey = `${lectureId}_${topic.index}`;

  // Prevent duplicate concurrent generation requests
  if (activeGenerations.has(lockKey)) {
    return res.status(409).json({
      success: false,
      error: 'Note generation is already in progress for this topic',
      data: { topicIndex: topic.index, status: 'processing' },
    });
  }

  // Check if note already exists and completed
  const existing = await TopicNote.findOne({ lectureId, topicIndex: topic.index });
  if (existing && existing.generationStatus === 'completed' && existing.imageUrl && !force) {
    return res.json({
      success: true,
      message: 'Reusing previously generated note',
      data: existing,
    });
  }

  // Set in-memory generation lock
  activeGenerations.add(lockKey);

  try {
    // 1. Mark status as processing in DB
    let note = existing;
    if (!note) {
      note = await TopicNote.create({
        userId: req.user._id,
        lectureId: lecture._id,
        topicId: String(topic._id || topic.index),
        topicIndex: topic.index,
        topicTitle: topic.title,
        generationStatus: 'processing',
        errorMessage: '',
      });
    } else {
      note.generationStatus = 'processing';
      note.errorMessage = '';
      await note.save();
    }

    // 2. Extract topic transcript slice
    const transcriptSlice = extractTopicTranscript(
      lecture.transcript,
      topic.startSec,
      topic.endSec,
      topic.title
    );

    // 3. Generate infographic image (via OpenAI DALL-E 3 with deterministic fallback)
    const { buffer, spec, width, height, model } = await generateTopicInfographicImage({
      topic,
      transcriptSlice,
      lectureTitle: lecture.title,
      forceMock: req.body.forceMock === true,
    });

    // 4. Save image persistently
    const filename = `${padIndex(topic.index)}-${sanitizeFilename(topic.title)}.png`;
    const savedStorage = await saveNoteImage({
      buffer,
      filename,
      contentType: 'image/png',
      lectureId: lecture._id,
      topicIndex: topic.index,
      width,
      height,
    });

    // 5. Update note metadata in MongoDB
    note.imageUrl = savedStorage.url;
    note.imageStorageKey = savedStorage.storageKey;
    note.imageFormat = savedStorage.format;
    note.imageWidth = savedStorage.width;
    note.imageHeight = savedStorage.height;
    note.contentSummary = spec;
    note.transcriptVersion = generateSourceHash(topic, transcriptSlice);
    note.generationStatus = 'completed';
    note.generationModel = model;
    note.errorMessage = '';
    await note.save();

    activeGenerations.delete(lockKey);
    return res.status(201).json({ success: true, data: note });
  } catch (err) {
    activeGenerations.delete(lockKey);
    console.error(`[TopicNotesController] Error generating note for topic ${topic.index}:`, err);

    // If regeneration failed and previous image was valid, preserve it
    if (existing && existing.imageUrl) {
      existing.generationStatus = 'completed';
      existing.errorMessage = `Regeneration failed: ${err.message}. Showing previous notes version.`;
      await existing.save();
      return res.status(500).json({
        success: false,
        error: `Regeneration failed: ${err.message}. Previous version preserved.`,
        data: existing,
      });
    }

    // Otherwise mark as failed
    await TopicNote.findOneAndUpdate(
      { lectureId, topicIndex: topic.index },
      { generationStatus: 'failed', errorMessage: err.message || 'Generation failed' },
      { upsert: true }
    );

    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate topic notes',
    });
  }
};

// ─── C. POST /api/lectures/:lectureId/notes/generate-all ───────────────────────
/**
 * Bulk generate notes for all topics not yet completed.
 */
export const generateAllTopicNotes = async (req, res) => {
  try {
    const { lectureId } = req.params;
    if (!mongoose.isValidObjectId(lectureId)) {
      return res.status(400).json({ success: false, error: 'Invalid lecture ID' });
    }

    const lecture = await Lecture.findOne({ _id: lectureId, userId: req.user?._id });
    if (!lecture) {
      return res.status(404).json({ success: false, error: 'Lecture not found or unauthorized' });
    }

    if (!lecture.topics || lecture.topics.length === 0) {
      return res.status(400).json({ success: false, error: 'Lecture has no topics to generate notes for' });
    }

    const existingNotes = await TopicNote.find({ lectureId });
    const completedIndices = new Set(
      existingNotes.filter((n) => n.generationStatus === 'completed' && n.imageUrl).map((n) => n.topicIndex)
    );

    const pendingTopics = lecture.topics.filter((t) => !completedIndices.has(t.index));

    if (pendingTopics.length === 0) {
      return res.json({
        success: true,
        message: 'All topic notes are already generated',
        data: { total: lecture.topics.length, completed: completedIndices.size, generated: 0 },
      });
    }

    // Return 202 Accepted immediately so client can poll status
    res.status(202).json({
      success: true,
      message: `Initiating generation for ${pendingTopics.length} topics`,
      data: {
        total: lecture.topics.length,
        alreadyCompleted: completedIndices.size,
        enqueued: pendingTopics.length,
      },
    });

    // Run bulk generation asynchronously in sequence to respect API limits
    (async () => {
      for (const topic of pendingTopics) {
        const lockKey = `${lectureId}_${topic.index}`;
        if (activeGenerations.has(lockKey)) continue;

        activeGenerations.add(lockKey);
        try {
          await TopicNote.findOneAndUpdate(
            { lectureId: lecture._id, topicIndex: topic.index },
            {
              userId: req.user._id,
              topicTitle: topic.title,
              topicId: String(topic._id || topic.index),
              generationStatus: 'processing',
              errorMessage: '',
            },
            { upsert: true }
          );

          const transcriptSlice = extractTopicTranscript(
            lecture.transcript,
            topic.startSec,
            topic.endSec,
            topic.title
          );

          const { buffer, spec, width, height, model } = await generateTopicInfographicImage({
            topic,
            transcriptSlice,
            lectureTitle: lecture.title,
          });

          const filename = `${padIndex(topic.index)}-${sanitizeFilename(topic.title)}.png`;
          const savedStorage = await saveNoteImage({
            buffer,
            filename,
            contentType: 'image/png',
            lectureId: lecture._id,
            topicIndex: topic.index,
            width,
            height,
          });

          await TopicNote.findOneAndUpdate(
            { lectureId: lecture._id, topicIndex: topic.index },
            {
              imageUrl: savedStorage.url,
              imageStorageKey: savedStorage.storageKey,
              imageFormat: savedStorage.format,
              imageWidth: savedStorage.width,
              imageHeight: savedStorage.height,
              contentSummary: spec,
              transcriptVersion: generateSourceHash(topic, transcriptSlice),
              generationStatus: 'completed',
              generationModel: model,
              errorMessage: '',
            }
          );
        } catch (err) {
          console.error(`[Bulk Notes] Failed for topic ${topic.index}:`, err.message);
          await TopicNote.findOneAndUpdate(
            { lectureId: lecture._id, topicIndex: topic.index },
            { generationStatus: 'failed', errorMessage: err.message }
          );
        } finally {
          activeGenerations.delete(lockKey);
        }
      }
      console.log(`[Bulk Notes] Completed bulk run for lecture ${lectureId}`);
    })();
  } catch (err) {
    console.error('[TopicNotesController] generateAllTopicNotes error:', err);
    return res.status(500).json({ success: false, error: 'Failed to initiate bulk generation' });
  }
};

// ─── D. GET /api/lectures/:lectureId/notes/generation-status ───────────────────
/**
 * Return generation status summary and per-topic states.
 */
export const getNotesGenerationStatus = async (req, res) => {
  try {
    const { lectureId } = req.params;
    if (!mongoose.isValidObjectId(lectureId)) {
      return res.status(400).json({ success: false, error: 'Invalid lecture ID' });
    }

    const lecture = await Lecture.findOne({ _id: lectureId, userId: req.user?._id });
    if (!lecture) {
      return res.status(404).json({ success: false, error: 'Lecture not found' });
    }

    const notes = await TopicNote.find({ lectureId }).lean();
    const notesMap = new Map(notes.map((n) => [Number(n.topicIndex), n]));

    const topicStatuses = (lecture.topics || []).map((t) => {
      const n = notesMap.get(t.index);
      const isLockActive = activeGenerations.has(`${lectureId}_${t.index}`);
      const status = isLockActive ? 'processing' : n?.generationStatus || 'not_generated';
      return {
        topicIndex: t.index,
        topicTitle: t.title,
        status,
        imageUrl: n?.imageUrl || '',
        errorMessage: n?.errorMessage || '',
      };
    });

    const total = topicStatuses.length;
    const completed = topicStatuses.filter((t) => t.status === 'completed').length;
    const processing = topicStatuses.filter((t) => t.status === 'processing').length;
    const failed = topicStatuses.filter((t) => t.status === 'failed').length;
    const notGenerated = topicStatuses.filter((t) => t.status === 'not_generated').length;

    return res.json({
      success: true,
      data: {
        total,
        completed,
        processing,
        failed,
        notGenerated,
        isComplete: total > 0 && completed === total,
        topicStatuses,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to check generation status' });
  }
};

// ─── E. POST /api/lectures/:lectureId/topics/:topicId/notes/regenerate ─────────
/**
 * Explicitly regenerate note for a topic.
 * Preserves the previous version until replacement succeeds.
 */
export const regenerateTopicNote = async (req, res) => {
  req.body.force = true;
  return generateTopicNote(req, res);
};

// ─── F. GET /api/lectures/:lectureId/topics/:topicId/notes/download ───────────
/**
 * Download a single topic's note image.
 */
export const downloadTopicNote = async (req, res) => {
  try {
    const { lectureId, topicId } = req.params;
    if (!mongoose.isValidObjectId(lectureId)) {
      return res.status(400).json({ success: false, error: 'Invalid lecture ID' });
    }

    const lecture = await Lecture.findOne({ _id: lectureId, userId: req.user?._id });
    if (!lecture) {
      return res.status(404).json({ success: false, error: 'Lecture not found' });
    }

    const topic = findTopic(lecture, topicId);
    if (!topic) {
      return res.status(404).json({ success: false, error: 'Topic not found' });
    }

    const note = await TopicNote.findOne({ lectureId, topicIndex: topic.index });
    if (!note || note.generationStatus !== 'completed' || !note.imageStorageKey) {
      return res.status(404).json({ success: false, error: 'Note image has not been generated for this topic' });
    }

    const filename = `${padIndex(topic.index)}-${sanitizeFilename(topic.title)}.png`;

    const buffer = await getNoteImageBuffer(note.imageStorageKey);
    if (!buffer) {
      return res.status(404).json({ success: false, error: 'Stored image file could not be located' });
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);
  } catch (err) {
    console.error('[TopicNotesController] downloadTopicNote error:', err);
    return res.status(500).json({ success: false, error: 'Failed to download image file' });
  }
};

// ─── G. GET /api/lectures/:lectureId/notes/download-all ────────────────────────
/**
 * Stream all available topic notes as a single ZIP archive.
 */
export const downloadAllNotesZip = async (req, res) => {
  try {
    const { lectureId } = req.params;
    if (!mongoose.isValidObjectId(lectureId)) {
      return res.status(400).json({ success: false, error: 'Invalid lecture ID' });
    }

    const lecture = await Lecture.findOne({ _id: lectureId, userId: req.user?._id });
    if (!lecture) {
      return res.status(404).json({ success: false, error: 'Lecture not found' });
    }

    const notes = await TopicNote.find({
      lectureId,
      generationStatus: 'completed',
    }).lean();

    if (!notes || notes.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No completed topic notes available to download. Please generate notes first.',
      });
    }

    // Sort notes by topic index matching original lecture sequence
    notes.sort((a, b) => a.topicIndex - b.topicIndex);

    const safeLectureTitle = sanitizeFilename(lecture.title);
    const zipFilename = `Lecture-Loop-${safeLectureTitle}-Notes.zip`;
    const folderName = `Lecture-Loop-${safeLectureTitle}-Notes`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

    const archive = new ZipArchive({ zlib: { level: 9 } });

    archive.on('warning', (w) => console.warn('[ZIP Warning]', w));
    archive.on('error', (err) => {
      console.error('[ZIP Stream Error]', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Failed to create ZIP stream' });
      }
    });

    archive.pipe(res);

    for (const note of notes) {
      const topic = (lecture.topics || []).find((t) => t.index === note.topicIndex);
      const title = topic?.title || note.topicTitle || `Topic-${note.topicIndex}`;
      const entryFilename = `${padIndex(note.topicIndex)}-${sanitizeFilename(title)}.png`;

      const buffer = await getNoteImageBuffer(note.imageStorageKey);
      if (buffer) {
        archive.append(buffer, { name: `${folderName}/${entryFilename}` });
      }
    }

    await archive.finalize();
  } catch (err) {
    console.error('[TopicNotesController] downloadAllNotesZip error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: 'Failed to build ZIP archive' });
    }
  }
};

// ─── H. GET /api/lectures/:lectureId/topics/:topicId/notes/image ───────────────
/**
 * Stream note image directly for <img> tags and full-resolution viewing.
 */
export const getTopicNoteImage = async (req, res) => {
  try {
    const { lectureId, topicId } = req.params;
    const storageKey = req.query.k;

    // Fast path: if storageKey is given directly
    if (storageKey) {
      const buffer = await getNoteImageBuffer(storageKey);
      if (buffer) {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(buffer);
      }
    }

    if (!mongoose.isValidObjectId(lectureId)) {
      return res.status(400).send('Invalid lecture ID');
    }

    const note = await TopicNote.findOne({
      lectureId,
      $or: [{ topicId }, { topicIndex: Number(topicId) || -1 }],
    });

    if (!note || !note.imageStorageKey) {
      return res.status(404).send('Note image not found');
    }

    const buffer = await getNoteImageBuffer(note.imageStorageKey);
    if (!buffer) {
      return res.status(404).send('Stored image file not found');
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
  } catch (err) {
    console.error('[TopicNotesController] getTopicNoteImage error:', err);
    return res.status(500).send('Failed to serve image');
  }
};
