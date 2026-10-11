import Lecture from '../models/Lecture.js';
import mongoose from 'mongoose';

// Mock topics generated for any lecture (simulates AI segmentation)
const generateMockTopics = (subject) => {
  const topicSets = {
    dbms: [
      { index: 1, title: 'Intro to DBMS Architecture', startTime: '00:00', endTime: '04:20', completed: false },
      { index: 2, title: 'Relational Algebra & Schema Models', startTime: '04:20', endTime: '10:15', completed: false },
      { index: 3, title: 'Primary Keys & Uniqueness', startTime: '10:15', endTime: '17:30', completed: false },
      { index: 4, title: 'Foreign Keys & Integrity', startTime: '17:30', endTime: '24:10', completed: false },
      { index: 5, title: 'Normalization (1NF–BCNF)', startTime: '24:10', endTime: '35:00', completed: false },
    ],
    os: [
      { index: 1, title: 'Process vs Threads', startTime: '00:00', endTime: '06:00', completed: false },
      { index: 2, title: 'CPU Scheduling Algorithms', startTime: '06:00', endTime: '14:00', completed: false },
      { index: 3, title: 'Synchronization & Semaphores', startTime: '14:00', endTime: '22:30', completed: false },
      { index: 4, title: 'Deadlock Detection', startTime: '22:30', endTime: '30:00', completed: false },
    ],
    default: [
      { index: 1, title: 'Introduction', startTime: '00:00', endTime: '08:00', completed: false },
      { index: 2, title: 'Core Concepts', startTime: '08:00', endTime: '20:00', completed: false },
      { index: 3, title: 'Advanced Topics', startTime: '20:00', endTime: '35:00', completed: false },
      { index: 4, title: 'Summary & Review', startTime: '35:00', endTime: '45:00', completed: false },
    ],
  };

  const key = subject?.toLowerCase();
  return topicSets[key] || topicSets.default;
};

/**
 * POST /api/lectures
 * Create a new lecture. If MongoDB is connected, persists to DB.
 * Otherwise returns a mock response so the UI still works.
 */
export const createLecture = async (req, res) => {
  try {
    const { title, subject, youtubeUrl, duration, description } = req.body;

    if (!title || !subject) {
      return res.status(400).json({ success: false, error: 'title and subject are required' });
    }

    const topics = generateMockTopics(subject);

    // If MongoDB is connected, persist; otherwise return a mock in-memory response
    if (mongoose.connection.readyState === 1) {
      const lecture = await Lecture.create({
        title,
        subject,
        youtubeUrl: youtubeUrl || '',
        duration: duration || '',
        description: description || '',
        topics,
        status: 'processing',
        userId: req.user?._id,
      });

      return res.status(201).json({ success: true, data: lecture });
    }

    // Offline / no DB — return structured mock
    const mockLecture = {
      _id: `mock_${Date.now()}`,
      title,
      subject,
      youtubeUrl: youtubeUrl || '',
      duration: duration || '00:00',
      description: description || '',
      status: 'processing',
      topics,
      createdAt: new Date().toISOString(),
    };

    return res.status(201).json({ success: true, data: mockLecture, _offline: true });
  } catch (err) {
    console.error('createLecture error:', err);
    res.status(500).json({ success: false, error: 'Failed to create lecture' });
  }
};

/**
 * GET /api/lectures
 * Return all lectures for the current user (mock if no DB).
 */
export const getLectures = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const lectures = await Lecture.find({ userId: req.user?._id }).sort({ createdAt: -1 });
      return res.json({ success: true, data: lectures });
    }
    // Offline — empty list
    return res.json({ success: true, data: [], _offline: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch lectures' });
  }
};
