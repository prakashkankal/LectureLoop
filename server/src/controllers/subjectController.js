import Subject from '../models/Subject.js';
import mongoose from 'mongoose';

// Default initial subjects matching the design tokens and catalog
const DEFAULT_SUBJECTS = [
  {
    _id: 'sub_dbms_1',
    code: 'CS-301',
    title: 'Database Management Systems (DBMS)',
    instructor: 'Prof. Aris Thorne',
    term: 'Fall 2024',
    icon: 'database',
    color: 'primary',
    coverage: 68,
    lectureCount: 4,
    totalHours: '3.2 Hours',
    statusNote: 'Vector indexing up to date',
  },
  {
    _id: 'sub_os_2',
    code: 'CS-302',
    title: 'Operating Systems (OS)',
    instructor: 'Dr. Elena Rostova',
    term: 'Fall 2024',
    icon: 'memory',
    color: 'secondary',
    coverage: 52,
    lectureCount: 3,
    totalHours: '2.6 Hours',
    statusNote: '1 sync scheduled',
  },
  {
    _id: 'sub_dsa_4',
    code: 'CS-202',
    title: 'Data Structures & Algorithms',
    instructor: 'Dr. Marcus Vance',
    term: 'Fall 2024',
    icon: 'account_tree',
    color: 'tertiary',
    coverage: 31,
    lectureCount: 2,
    totalHours: '1.8 Hours',
    statusNote: '2 quizzes pending',
  },
];

// In-memory fallback if MongoDB is not connected
let memorySubjects = [...DEFAULT_SUBJECTS];

/**
 * GET /api/subjects
 * Returns all subjects for the user, initializing with defaults if none exist
 */
export const getSubjects = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      let subjects = await Subject.find({ userId: req.user?._id }).sort({ createdAt: 1 });
      if (subjects.length === 0 && !req.user?.subjectsInitialized) {
        // Seed default subjects for this user
        const seeded = DEFAULT_SUBJECTS.map((s) => ({
          ...s,
          _id: undefined,
          userId: req.user?._id,
        }));
        subjects = await Subject.insertMany(seeded);
        await req.user.updateOne({ subjectsInitialized: true });
      }
      return res.json({ success: true, data: subjects });
    }

    return res.json({ success: true, data: memorySubjects, _offline: true });
  } catch (err) {
    console.error('getSubjects error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch subjects' });
  }
};

/**
 * POST /api/subjects
 * Create a new course / subject track
 */
export const createSubject = async (req, res) => {
  try {
    const { code, title, instructor, term, icon, color } = req.body;

    if (!code || !title) {
      return res.status(400).json({ success: false, error: 'Course code and title are required' });
    }

    const newSubjectData = {
      code: code.trim(),
      title: title.trim(),
      instructor: instructor?.trim() || 'Staff Instructor',
      term: term?.trim() || 'Fall 2024',
      icon: icon || 'menu_book',
      color: color || 'primary',
      coverage: 0,
      lectureCount: 0,
      totalHours: '0.0 Hours',
      statusNote: 'New course track initialized',
      userId: req.user?._id,
    };

    if (mongoose.connection.readyState === 1) {
      const subject = await Subject.create(newSubjectData);
      return res.status(201).json({ success: true, data: subject });
    }

    const mockSubject = {
      ...newSubjectData,
      _id: `sub_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    memorySubjects.unshift(mockSubject);
    return res.status(201).json({ success: true, data: mockSubject, _offline: true });
  } catch (err) {
    console.error('createSubject error:', err);
    res.status(500).json({ success: false, error: 'Failed to create subject' });
  }
};

/**
 * DELETE /api/subjects/:id
 * Delete one subject owned by the logged-in user
 */
export const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ success: false, error: 'Invalid subject ID' });
      }

      const subject = await Subject.findOneAndDelete({ _id: id, userId: req.user?._id });
      if (!subject) {
        return res.status(404).json({ success: false, error: 'Subject not found' });
      }

      await req.user.updateOne({ subjectsInitialized: true });
      return res.json({ success: true, data: { _id: subject._id } });
    }

    const subjectIndex = memorySubjects.findIndex((subject) => subject._id === id);
    if (subjectIndex === -1) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    const [subject] = memorySubjects.splice(subjectIndex, 1);
    return res.json({ success: true, data: { _id: subject._id }, _offline: true });
  } catch (err) {
    console.error('deleteSubject error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete subject' });
  }
};
