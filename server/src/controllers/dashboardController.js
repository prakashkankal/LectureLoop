/**
 * Dashboard Controller
 * Returns real KPI stats, recent lectures, subjects, and activity
 * computed from MongoDB for the authenticated user.
 */

import Lecture from '../models/Lecture.js';
import Subject from '../models/Subject.js';
import TopicNote from '../models/TopicNote.js';
import mongoose from 'mongoose';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60)   return 'Just now';
  if (seconds < 3600)  return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return formatDate(date);
}

/**
 * Map lecture DB status to the dashboard card shape the frontend expects
 */
function mapLectureForDashboard(lecture) {
  // Determine visual status
  let status = 'revision-pending';
  let statusLabel = 'Revision Pending';
  let statusMeta = 'Processing';
  let statusMetaIcon = 'hourglass_top';

  if (lecture.analysisStatus === 'complete' && lecture.status === 'ready') {
    status = 'ready-for-revision';
    statusLabel = 'Ready for Revision';
    statusMeta = `${lecture.topics?.length || 0} topics analyzed`;
    statusMetaIcon = 'auto_stories';
  } else if (lecture.analysisStatus === 'complete') {
    status = 'ready';
    statusLabel = 'Ready';
    statusMeta = 'Analysis Complete';
    statusMetaIcon = 'psychology';
  } else if (lecture.analysisStatus === 'processing') {
    status = 'revision-pending';
    statusLabel = 'Processing';
    statusMeta = 'AI analyzing...';
    statusMetaIcon = 'sync';
  } else if (lecture.analysisStatus === 'failed') {
    status = 'revision-pending';
    statusLabel = 'Failed';
    statusMeta = 'Analysis failed';
    statusMetaIcon = 'error';
  }

  // Estimate duration from topics if not set
  let duration = lecture.duration;
  if (!duration && lecture.topics?.length) {
    const maxSec = Math.max(...lecture.topics.map(t => t.endSec || 0));
    duration = maxSec >= 3600
      ? `${Math.floor(maxSec / 3600)}h ${Math.floor((maxSec % 3600) / 60)}m`
      : `${Math.ceil(maxSec / 60)}m`;
  }

  return {
    id: lecture._id,
    title: lecture.title,
    subject: lecture.subject,
    subjectColor: 'primary',  // Will be matched with subject color below
    date: formatDate(lecture.createdAt),
    duration: duration || '—',
    status,
    statusLabel,
    statusMeta,
    statusMetaIcon,
  };
}

// ─── Main Handler ────────────────────────────────────────────────────────────

export const getDashboardStats = async (req, res) => {
  try {
    // Do not report placeholder counts as live dashboard data.
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, error: 'Dashboard data is temporarily unavailable because the database is disconnected.' });
    }

    const userId = req.user?._id;

    // ── KPI Stats ────────────────────────────────────────────────────────────
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalLectures, totalSubjects, notesSaved, pendingRevision, thisWeekCount] =
      await Promise.all([
        Lecture.countDocuments({ userId, youtubeVideoId: { $ne: '' } }),
        Subject.countDocuments({ userId }),
        TopicNote.countDocuments({ userId, generationStatus: 'completed', imageUrl: { $ne: '' } }),
        Lecture.countDocuments({ userId, youtubeVideoId: { $ne: '' }, status: 'revision-due' }),
        Lecture.countDocuments({ userId, youtubeVideoId: { $ne: '' }, createdAt: { $gte: oneWeekAgo } }),
      ]);

    const weeklyGrowth = thisWeekCount > 0
      ? `+${thisWeekCount} added this week`
      : 'No new lectures this week';

    // ── Recent Lectures (top 5) ──────────────────────────────────────────────
    const rawLectures = await Lecture.find({ userId, youtubeVideoId: { $ne: '' } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title subject duration status analysisStatus topics createdAt')
      .lean();

    // Build a subject→color map from the user's subjects
    const allSubjects = await Subject.find({ userId }).lean();
    const subjectColorMap = {};
    allSubjects.forEach(s => {
      subjectColorMap[s.title] = s.color || 'primary';
      // Also map short codes: "Database Management Systems (DBMS)" → try matching subject field
      subjectColorMap[s.code] = s.color || 'primary';
    });

    const recentLectures = rawLectures.map(lec => {
      const mapped = mapLectureForDashboard(lec);
      // Try to match subject color
      mapped.subjectColor = subjectColorMap[lec.subject] || 'neutral';
      return mapped;
    });

    // ── Subjects ─────────────────────────────────────────────────────────────
    const subjectLectureCounts = await Lecture.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), youtubeVideoId: { $ne: '' }, subjectId: { $in: allSubjects.map((subject) => subject._id) } } },
      { $group: { _id: '$subjectId', count: { $sum: 1 } } },
    ]);
    const subjectLectureCountMap = new Map(subjectLectureCounts.map((item) => [String(item._id), item.count]));
    const subjects = allSubjects.map(s => ({
      id: s._id,
      name: s.title,
      description: `${s.instructor} • ${s.term}`,
      icon: s.icon || 'menu_book',
      color: s.color || 'primary',
      lectureCount: subjectLectureCountMap.get(String(s._id)) || 0,
      progress: s.coverage || 0,
    }));

    // ── Recent Activity (derived from timestamps) ────────────────────────────
    const activity = [];

    // Recent lectures as activity events
    const recentCreatedLectures = await Lecture.find({ userId, youtubeVideoId: { $ne: '' } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title createdAt analysisStatus')
      .lean();

    recentCreatedLectures.forEach(lec => {
      activity.push({
        id: `lec_${lec._id}`,
        label: `Added lecture: ${lec.title}`,
        time: timeAgo(lec.createdAt),
        icon: 'file_upload',
        color: 'primary',
        sourceType: 'interactive-lecture',
        href: `/interactive/${lec._id}`,
        sortDate: lec.createdAt,
      });
    });

    // Completed analyses as activity events
    const completedLectures = await Lecture.find({ userId, youtubeVideoId: { $ne: '' }, analysisStatus: 'complete' })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('title updatedAt')
      .lean();

    completedLectures.forEach(lec => {
      activity.push({
        id: `analysis_${lec._id}`,
        label: `Analysis complete: ${lec.title}`,
        time: timeAgo(lec.updatedAt),
        icon: 'task_alt',
        color: 'tertiary',
        sourceType: 'interactive-lecture',
        href: `/interactive/${lec._id}`,
        sortDate: lec.updatedAt,
      });
    });

    // Recent subjects as activity events
    const recentSubjects = await Subject.find({ userId })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('title createdAt')
      .lean();

    recentSubjects.forEach(sub => {
      activity.push({
        id: `sub_${sub._id}`,
        label: `Created subject: ${sub.title}`,
        time: timeAgo(sub.createdAt),
        icon: 'create_new_folder',
        color: 'secondary',
        sourceType: 'subject',
        href: `/my-subjects/${sub._id}`,
        sortDate: sub.createdAt,
      });
    });

    // Sort by most recent, take top 8
    activity.sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate));
    const recentActivity = activity.slice(0, 8).map(({ sortDate, ...rest }) => rest);

    // ── Response ─────────────────────────────────────────────────────────────
    res.json({
      success: true,
      data: {
        stats: { totalLectures, totalSubjects, notesSaved, pendingRevision, weeklyGrowth },
        recentLectures,
        subjects,
        recentActivity,
      },
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
};
