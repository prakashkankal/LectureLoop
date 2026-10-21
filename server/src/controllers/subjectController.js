import Subject from '../models/Subject.js';
import Lecture from '../models/Lecture.js';
import mongoose from 'mongoose';

const unavailable = (res) => res.status(503).json({ success: false, error: 'Subject data is unavailable while the database is disconnected.' });

export const getSubjects = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return unavailable(res);
    const subjects = await Subject.find({ userId: req.user._id }).sort({ title: 1 }).lean();
    return res.json({ success: true, data: subjects });
  } catch (error) {
    console.error('getSubjects error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch subjects' });
  }
};

export const getSubject = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, error: 'Invalid subject ID' });
  if (mongoose.connection.readyState !== 1) return unavailable(res);
  const subject = await Subject.findOne({ _id: id, userId: req.user._id }).lean();
  return subject ? res.json({ success: true, data: subject }) : res.status(404).json({ success: false, error: 'Subject not found' });
};

export const createSubject = async (req, res) => {
  try {
    const { code, title, instructor, term, icon, color } = req.body;
    if (typeof code !== 'string' || !code.trim() || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Course code and title are required' });
    }
    if (mongoose.connection.readyState !== 1) return unavailable(res);
    const subject = await Subject.create({
      code: code.trim(), title: title.trim(), instructor: instructor?.trim() || 'Staff Instructor',
      term: term?.trim() || '', icon: icon || 'menu_book', color: color || 'primary', userId: req.user._id,
    });
    return res.status(201).json({ success: true, data: subject });
  } catch (error) {
    console.error('createSubject error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create subject' });
  }
};

export const updateSubject = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, error: 'Invalid subject ID' });
  const updates = {};
  for (const field of ['code', 'title', 'instructor', 'term', 'icon', 'color']) {
    if (req.body[field] !== undefined) {
      if (typeof req.body[field] !== 'string' || (['code', 'title'].includes(field) && !req.body[field].trim())) {
        return res.status(400).json({ success: false, error: `Invalid ${field}` });
      }
      updates[field] = req.body[field].trim();
    }
  }
  if (mongoose.connection.readyState !== 1) return unavailable(res);
  const subject = await Subject.findOneAndUpdate({ _id: id, userId: req.user._id }, { $set: updates }, { new: true, runValidators: true });
  return subject ? res.json({ success: true, data: subject }) : res.status(404).json({ success: false, error: 'Subject not found' });
};

export const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, error: 'Invalid subject ID' });
    if (mongoose.connection.readyState !== 1) return unavailable(res);
    const subject = await Subject.findOne({ _id: id, userId: req.user._id });
    if (!subject) return res.status(404).json({ success: false, error: 'Subject not found' });
    // Preserve lecture history. Remove the association and retain its historical label.
    await Lecture.updateMany({ userId: req.user._id, subjectId: subject._id }, { $unset: { subjectId: 1 } });
    await subject.deleteOne();
    return res.json({ success: true, data: { _id: subject._id } });
  } catch (error) {
    console.error('deleteSubject error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete subject' });
  }
};
