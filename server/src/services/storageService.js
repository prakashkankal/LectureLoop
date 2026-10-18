import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads/notes');

// Ensure persistent uploads directory exists for local caching
if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch (err) {
    console.warn('[Storage] Could not create local uploads folder:', err.message);
  }
}

/**
 * Get the GridFS bucket instance if MongoDB is connected.
 */
function getGridFSBucket() {
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'topicNotesImages',
    });
  }
  return null;
}

/**
 * Save an image buffer persistently.
 * Stores in MongoDB GridFS + local disk cache (and Cloudinary if configured).
 * Returns { storageKey, url, format, width, height }
 */
export async function saveNoteImage({
  buffer,
  filename,
  contentType = 'image/png',
  lectureId,
  topicIndex,
  width = 1024,
  height = 1792,
}) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('A valid image Buffer is required to save');
  }

  const safeFilename = filename || `note-${lectureId}-${topicIndex}-${Date.now()}.png`;
  let storageKey = '';
  let gridFsFileId = null;

  // 1. Check if Cloudinary is configured via environment
  const cloudinaryUrl = process.env.CLOUDINARY_URL;
  const cloudinaryCloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (cloudinaryUrl || cloudinaryCloud) {
    try {
      const cloudinaryModule = await import('cloudinary');
      const cloudinary = cloudinaryModule.v2 || cloudinaryModule.default;
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'lectureloop_notes',
            public_id: `note_${lectureId}_topic_${topicIndex}_${Date.now()}`,
            resource_type: 'image',
            format: 'png',
          },
          (err, result) => {
            if (err) return reject(err);
            resolve(result);
          }
        );
        stream.end(buffer);
      });

      return {
        storageKey: uploadResult.public_id,
        url: uploadResult.secure_url,
        format: 'png',
        width: uploadResult.width || width,
        height: uploadResult.height || height,
        provider: 'cloudinary',
      };
    } catch (cErr) {
      console.warn('[Storage] Cloudinary upload failed, falling back to GridFS/local storage:', cErr.message);
    }
  }

  // 2. Persist in MongoDB GridFS (permanent object store in DB cluster)
  const bucket = getGridFSBucket();
  if (bucket) {
    try {
      const uploadStream = bucket.openUploadStream(safeFilename, {
        contentType,
        metadata: { lectureId: String(lectureId), topicIndex, width, height, createdAt: new Date() },
      });

      await new Promise((resolve, reject) => {
        const readable = Readable.from(buffer);
        readable.pipe(uploadStream)
          .on('finish', resolve)
          .on('error', reject);
      });

      gridFsFileId = uploadStream.id.toString();
      storageKey = gridFsFileId;
    } catch (gErr) {
      console.warn('[Storage] GridFS save error, falling back to local filesystem:', gErr.message);
    }
  }

  // 3. Save local copy in uploads folder for fast caching and fallback
  const localFileName = storageKey ? `${storageKey}.png` : safeFilename;
  const localFilePath = path.join(UPLOADS_DIR, localFileName);
  try {
    fs.writeFileSync(localFilePath, buffer);
    if (!storageKey) {
      storageKey = localFileName;
    }
  } catch (fsErr) {
    console.warn('[Storage] Local disk write warning:', fsErr.message);
  }

  if (!storageKey) {
    throw new Error('Failed to save image to any persistent storage destination');
  }

  // URL route serviced by Express server to stream image
  const serverBase = process.env.SERVER_BASE_URL || '';
  const url = `${serverBase}/api/lectures/${lectureId}/topics/${topicIndex}/notes/image?k=${storageKey}`;

  return {
    storageKey,
    url,
    format: 'png',
    width,
    height,
    provider: gridFsFileId ? 'gridfs' : 'local',
  };
}

/**
 * Retrieve image buffer from persistent storage.
 */
export async function getNoteImageBuffer(storageKey) {
  if (!storageKey) return null;

  // 1. Try local disk cache first (fastest)
  const localNames = [storageKey, `${storageKey}.png`, path.basename(storageKey)];
  for (const name of localNames) {
    const localPath = path.join(UPLOADS_DIR, name);
    if (fs.existsSync(localPath)) {
      try {
        return fs.readFileSync(localPath);
      } catch (err) {
        // continue
      }
    }
  }

  // 2. Try MongoDB GridFS
  const bucket = getGridFSBucket();
  if (bucket && mongoose.isValidObjectId(storageKey)) {
    try {
      const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(storageKey));
      const chunks = [];
      for await (const chunk of downloadStream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      // Cache locally
      try {
        fs.writeFileSync(path.join(UPLOADS_DIR, `${storageKey}.png`), buffer);
      } catch {}
      return buffer;
    } catch (gErr) {
      console.warn('[Storage] GridFS buffer retrieval error:', gErr.message);
    }
  }

  return null;
}

/**
 * Retrieve a readable stream for the image.
 */
export async function getNoteImageStream(storageKey) {
  if (!storageKey) return null;

  // 1. Check local disk
  const localNames = [storageKey, `${storageKey}.png`, path.basename(storageKey)];
  for (const name of localNames) {
    const localPath = path.join(UPLOADS_DIR, name);
    if (fs.existsSync(localPath)) {
      return fs.createReadStream(localPath);
    }
  }

  // 2. Check GridFS
  const bucket = getGridFSBucket();
  if (bucket && mongoose.isValidObjectId(storageKey)) {
    try {
      return bucket.openDownloadStream(new mongoose.Types.ObjectId(storageKey));
    } catch (gErr) {
      console.warn('[Storage] GridFS stream retrieval error:', gErr.message);
    }
  }

  return null;
}
