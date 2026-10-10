/**
 * Dashboard Controller
 * Returns mock KPI stats and recent activity for the student dashboard.
 * These will be replaced with real DB queries once Lectures/Notes models are added.
 */

const MOCK_RECENT_LECTURES = [
  {
    id: '1',
    title: 'Database Management Systems — Normalization',
    subject: 'DBMS',
    subjectColor: 'primary',
    date: 'Oct 24, 2024',
    duration: '48m',
    status: 'ready-for-revision',
    statusLabel: 'Ready for Revision',
    statusMeta: 'Summary Synced',
    statusMetaIcon: 'auto_stories',
  },
  {
    id: '2',
    title: 'Operating Systems — Process Scheduling',
    subject: 'Operating Systems',
    subjectColor: 'secondary',
    date: 'Oct 22, 2024',
    duration: '56m',
    status: 'ready',
    statusLabel: 'Ready',
    statusMeta: 'Flashcards Prepared',
    statusMetaIcon: 'psychology',
  },
  {
    id: '3',
    title: 'Computer Networks — TCP/IP Fundamentals',
    subject: 'Computer Networks',
    subjectColor: 'neutral',
    date: 'Oct 19, 2024',
    duration: '42m',
    status: 'revision-pending',
    statusLabel: 'Revision Pending',
    statusMeta: 'Review in 2 days',
    statusMetaIcon: 'alarm',
  },
];

const MOCK_SUBJECTS = [
  {
    id: '1',
    name: 'Database Management Systems',
    description: 'Relational schema, SQL optimization & ACID',
    icon: 'database',
    color: 'secondary',
    lectureCount: 4,
    progress: 75,
  },
  {
    id: '2',
    name: 'Operating Systems',
    description: 'Kernels, multithreading & virtual memory',
    icon: 'memory',
    color: 'primary',
    lectureCount: 3,
    progress: 60,
  },
  {
    id: '3',
    name: 'Computer Networks',
    description: 'OSI model, routing protocols & sockets',
    icon: 'hub',
    color: 'secondary-dim',
    lectureCount: 3,
    progress: 45,
  },
  {
    id: '4',
    name: 'Data Structures & Algorithms',
    description: 'Complexity analysis, graphs & dynamic programming',
    icon: 'account_tree',
    color: 'tertiary',
    lectureCount: 2,
    progress: 85,
  },
];

const MOCK_ACTIVITY = [
  {
    id: '1',
    type: 'upload',
    label: 'Added lecture: DBMS Normalization',
    time: '2 hours ago',
    icon: 'file_upload',
    color: 'primary',
  },
  {
    id: '2',
    type: 'notes',
    label: 'Notes saved for Process Scheduling',
    time: 'Yesterday, 4:15 PM',
    icon: 'task_alt',
    color: 'tertiary',
  },
  {
    id: '3',
    type: 'subject',
    label: 'Created new subject: Computer Networks',
    time: '3 days ago',
    icon: 'create_new_folder',
    color: 'secondary',
  },
  {
    id: '4',
    type: 'review',
    label: 'Completed review: Binary Search Trees',
    time: '5 days ago',
    icon: 'check_circle',
    color: 'neutral',
  },
];

export const getDashboardStats = async (req, res) => {
  try {
    // Mock stats — will be replaced with real DB aggregations in Phase 5+
    const stats = {
      totalLectures: 12,
      totalSubjects: 4,
      notesSaved: 8,
      pendingRevision: 3,
      weeklyGrowth: '+2 added this week',
    };

    res.json({
      success: true,
      data: {
        stats,
        recentLectures: MOCK_RECENT_LECTURES,
        subjects: MOCK_SUBJECTS,
        recentActivity: MOCK_ACTIVITY,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
};
