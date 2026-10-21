import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch, fetchDashboardStats } from '../../services/api.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// Status tag config
const STATUS_CONFIG = {
  'ready-for-revision': {
    dot: 'bg-tertiary',
    badge: 'bg-surface-container-low text-on-surface-variant',
    label: 'Ready for Revision',
  },
  ready: {
    dot: 'bg-tertiary',
    badge: 'bg-surface-container-low text-on-surface-variant',
    label: 'Ready',
  },
  'revision-pending': {
    dot: 'bg-outline',
    badge: 'bg-surface-variant text-on-surface-variant',
    label: 'Revision Pending',
  },
};

const SUBJECT_COLOR_MAP = {
  primary: {
    icon: 'bg-primary-fixed text-primary',
    bar: 'bg-primary-container',
    hover: 'group-hover:text-primary',
  },
  secondary: {
    icon: 'bg-secondary-fixed text-secondary',
    bar: 'bg-secondary',
    hover: 'group-hover:text-secondary',
  },
  'secondary-dim': {
    icon: 'bg-secondary-fixed-dim text-on-secondary-fixed',
    bar: 'bg-secondary-container',
    hover: 'group-hover:text-secondary',
  },
  tertiary: {
    icon: 'bg-surface-container-low text-on-surface-variant',
    bar: 'bg-tertiary-container',
    hover: 'group-hover:text-tertiary',
  },
};

const ACTIVITY_COLOR_MAP = {
  primary: 'bg-primary-fixed text-primary',
  secondary: 'bg-secondary-fixed text-secondary',
  tertiary: 'bg-surface-container-low text-on-surface-variant',
  neutral: 'bg-surface-variant text-on-surface-variant',
};

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, iconBg, iconColor, subLabel, subIcon, subColor }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-sm text-on-surface-variant font-medium">{label}</span>
        <div className={`w-10 h-10 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
      </div>
      <div className="mt-space-md">
        <div className="text-2xl font-bold text-on-surface tracking-tight">{value}</div>
        <div className={`flex items-center gap-space-xs mt-space-xs text-xs ${subColor} font-medium`}>
          <span className="material-symbols-outlined text-[14px]">{subIcon}</span>
          <span>{subLabel}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Lecture Card ─────────────────────────────────────────────────────────────
function LectureCard({ lecture }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const status = STATUS_CONFIG[lecture.status] || STATUS_CONFIG['revision-pending'];
  const openLecture = () => {
    if (lecture.id) navigate(`/interactive/${lecture.id}`);
  };

  // waveform color
  const waveColor =
    lecture.subjectColor === 'primary'
      ? 'bg-primary'
      : lecture.subjectColor === 'secondary'
      ? 'bg-secondary'
      : 'bg-outline';

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  // Subject badge color
  let subjectBadge = 'bg-primary-fixed text-primary';
  if (lecture.subjectColor === 'secondary') subjectBadge = 'bg-secondary-fixed text-secondary';
  if (lecture.subjectColor === 'neutral') subjectBadge = 'bg-surface-container-high text-on-surface';

  return (
    <div
      role="link"
      tabIndex={lecture.id ? 0 : -1}
      aria-label={`Open interactive session: ${lecture.title}`}
      onClick={(event) => {
        if (!event.target.closest('button, a')) openLecture();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && lecture.id) {
          event.preventDefault();
          openLecture();
        }
      }}
      className={`bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row gap-space-lg items-start sm:items-center justify-between relative group ${lecture.id ? 'cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary' : ''}`}
    >
      <div className="flex items-start sm:items-center gap-space-md min-w-0">
        {/* Thumbnail */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-surface-container-high flex flex-col items-center justify-center shrink-0 relative overflow-hidden group-hover:bg-surface-container-highest transition-colors">
          <div className="absolute inset-0 opacity-20 flex items-center justify-center gap-0.5 px-2">
            {[6, 10, 4, 8, 5].map((h, i) => (
              <div
                key={i}
                className={`w-1 ${waveColor} rounded-full ${lecture.status === 'ready-for-revision' ? 'animate-pulse' : ''}`}
                style={{ height: `${h * 4}px`, animationDelay: `${i * 75}ms` }}
              />
            ))}
          </div>
          <span
            className={`material-symbols-outlined text-[26px] z-10 ${
              lecture.subjectColor === 'primary'
                ? 'text-primary'
                : lecture.subjectColor === 'secondary'
                ? 'text-secondary'
                : 'text-on-surface-variant'
            }`}
          >
            smart_display
          </span>
          <span className="text-[11px] text-on-surface-variant z-10 mt-0.5">{lecture.duration}</span>
        </div>

        {/* Meta */}
        <div className="flex flex-col min-w-0 gap-1">
          <div className="flex items-center gap-space-sm flex-wrap">
            <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${subjectBadge}`}>
              {lecture.subject}
            </span>
            <span className="text-[11px] text-on-surface-variant">{lecture.date}</span>
            <span className="text-outline text-[11px]">•</span>
            <span className="text-[11px] text-on-surface-variant">{lecture.duration}</span>
          </div>
          <h3 className="text-sm font-semibold text-on-surface truncate group-hover:text-primary-container transition-colors">
            {lecture.title}
          </h3>
          <div className="flex items-center gap-space-sm mt-0.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${status.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
            <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">{lecture.statusMetaIcon}</span>
              {lecture.statusMeta}
            </span>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      <div className="relative shrink-0 self-end sm:self-center" ref={menuRef}>
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors"
          aria-label={`Actions for ${lecture.title}`}
        >
          <span className="material-symbols-outlined text-[20px]">more_vert</span>
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-10 w-44 bg-surface-container-lowest rounded-xl shadow-xl py-space-xs z-30 border border-outline-variant/20">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                if (lecture.id) navigate(`/notes?lectureId=${encodeURIComponent(lecture.id)}`);
                else navigate('/notes');
              }}
              className="w-full flex items-center gap-space-sm px-space-md py-space-xs text-sm text-on-surface hover:bg-surface-container-low text-left"
            >
              <span className="material-symbols-outlined text-[18px] text-outline">description</span>
              <span>View Notes</span>
            </button>
            <button className="w-full flex items-center gap-space-sm px-space-md py-space-xs text-sm text-on-surface hover:bg-surface-container-low text-left">
              <span className="material-symbols-outlined text-[18px] text-outline">edit</span>
              <span>Edit Details</span>
            </button>
            <div className="my-space-xs mx-space-sm h-[1px] bg-surface-container-high" />
            <button className="w-full flex items-center gap-space-sm px-space-md py-space-xs text-sm text-error hover:bg-error-container text-left">
              <span className="material-symbols-outlined text-[18px]">delete</span>
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Subject Card ─────────────────────────────────────────────────────────────
function SubjectCard({ subject }) {
  const navigate = useNavigate();
  const colors = SUBJECT_COLOR_MAP[subject.color] || SUBJECT_COLOR_MAP.primary;
  return (
    <button
      type="button"
      onClick={() => navigate(`/subjects/${encodeURIComponent(subject.id)}`)}
      className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between text-left"
    >
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl ${colors.icon} flex items-center justify-center`}>
          <span className="material-symbols-outlined text-[24px]">{subject.icon}</span>
        </div>
        <span className="px-1.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11px]">
          {subject.lectureCount} lectures
        </span>
      </div>
      <div className="mt-space-lg">
        <h3 className={`text-sm font-semibold text-on-surface ${colors.hover} transition-colors`}>
          {subject.name}
        </h3>
        <p className="text-[11px] text-on-surface-variant mt-1">{subject.description}</p>
        <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-space-md overflow-hidden">
          <div
            className={`${colors.bar} h-full rounded-full transition-all`}
            style={{ width: `${subject.progress}%` }}
          />
        </div>
      </div>
    </button>
  );
}

// ─── Add Lecture Drawer ───────────────────────────────────────────────────────
export function AddLectureDrawer({ isOpen, onClose }) {
  const [title, setTitle] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [subject, setSubject] = useState('');
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectsError, setSubjectsError] = useState('');
  const [preset, setPreset] = useState('comprehensive');

  // Trap body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    let active = true;
    setSubjectsLoading(true);
    setSubjectsError('');
    apiFetch('/subjects')
      .then((response) => {
        if (!active) return;
        const savedSubjects = Array.isArray(response.data) ? response.data : [];
        setSubjects(savedSubjects);
        setSubject((current) => savedSubjects.some((item) => String(item._id) === current)
          ? current
          : String(savedSubjects[0]?._id || ''));
      })
      .catch((error) => {
        if (active) {
          setSubjects([]);
          setSubject('');
          setSubjectsError(error.message || 'Could not load your subjects.');
        }
      })
      .finally(() => {
        if (active) setSubjectsLoading(false);
      });
    return () => { active = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
        <div className="w-screen max-w-md bg-surface-container-lowest shadow-2xl flex flex-col pointer-events-auto">
          {/* Header */}
          <div className="p-space-lg flex items-center justify-between bg-surface-container-low">
            <div className="flex items-center gap-space-sm">
              <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-on-surface" id="drawer-title">
                  Add New Lecture
                </h2>
                <p className="text-[11px] text-on-surface-variant">Prepare recording for smart ingestion</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
              aria-label="Close drawer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Form */}
          <div className="p-space-lg flex-1 overflow-y-auto flex flex-col gap-space-lg">
            {/* Title */}
            <div className="flex flex-col gap-space-xs">
              <label className="text-sm font-medium text-on-surface" htmlFor="lecture-title">
                Lecture Title
              </label>
              <input
                id="lecture-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Distributed Consensus & Raft Protocol"
                className="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline text-sm focus:bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors"
              />
            </div>

            {/* Subject */}
            <div className="flex flex-col gap-space-xs">
              <label className="text-sm font-medium text-on-surface" htmlFor="lecture-subject">
                Subject / Course
              </label>
              <div className="relative">
                <select
                  id="lecture-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={subjectsLoading || subjects.length === 0}
                  className="w-full h-10 px-space-md pr-8 rounded-lg bg-surface-container-low text-on-surface text-sm appearance-none focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary/40 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">{subjectsLoading ? 'Loading subjects…' : subjects.length ? 'Select a subject' : 'No subjects available'}</option>
                  {subjects.map((item) => (
                    <option key={item._id} value={String(item._id)}>{item.code ? `${item.code} — ` : ''}{item.title}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined text-outline text-[18px] absolute right-3 top-2.5 pointer-events-none">
                  expand_more
                </span>
              </div>
              {subjectsError && <p role="alert" className="text-xs text-error">{subjectsError}</p>}
              {!subjectsLoading && !subjectsError && subjects.length === 0 && <p className="text-xs text-on-surface-variant">Create a subject first in <Link to="/my-subjects" onClick={onClose} className="font-semibold text-primary hover:underline">My Subjects</Link>.</p>}
            </div>

            {/* Upload zone */}
            <div className="flex flex-col gap-space-xs">
              <label className="text-sm font-medium text-on-surface">Lecture Media or Slide Pack</label>
              <div className="rounded-xl p-space-xl flex flex-col items-center justify-center gap-space-sm bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer text-center border-2 border-dashed border-outline-variant/50 hover:border-primary/30">
                <div className="w-12 h-12 rounded-full bg-primary-fixed text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">cloud_upload</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-on-surface">Lecture file upload is unavailable</span>
                  <span className="text-[11px] text-on-surface-variant">The material upload service has not been connected.</span>
                </div>
              </div>
            </div>

            {/* Preset */}
            <div className="flex flex-col gap-space-xs">
              <label className="text-sm font-medium text-on-surface">AI Ingestion Preset</label>
              <div className="grid grid-cols-2 gap-space-xs">
                <button
                  type="button"
                  onClick={() => setPreset('comprehensive')}
                  className={`p-space-sm rounded-lg text-left flex flex-col gap-0.5 transition-colors ${
                    preset === 'comprehensive'
                      ? 'bg-primary-fixed text-primary ring-1 ring-primary/40'
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <span className="text-sm font-semibold">Comprehensive</span>
                  <span className="text-[11px] text-on-surface-variant">Transcript + Flashcards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('fast')}
                  className={`p-space-sm rounded-lg text-left flex flex-col gap-0.5 transition-colors ${
                    preset === 'fast'
                      ? 'bg-primary-fixed text-primary ring-1 ring-primary/40'
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <span className="text-sm font-semibold">Fast Summary</span>
                  <span className="text-[11px] text-on-surface-variant">Core takeaways only</span>
                </button>
              </div>
            </div>
          </div>

          <div role="status" className="mx-space-lg rounded-lg border border-outline-variant bg-surface-container-low p-space-sm text-xs text-on-surface-variant">
            Lecture uploads are not connected to a processing API yet. The form can be filled out, but submitting will not save or process a lecture.
          </div>
          {/* Footer */}
          <div className="p-space-lg bg-surface-container-low flex items-center justify-end gap-space-sm border-t border-outline-variant/20">
            <button
              onClick={onClose}
              className="h-10 px-space-md rounded-xl text-on-surface-variant hover:bg-surface-container-high text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled
              title="Lecture processing is not configured yet"
              className="h-10 px-space-lg rounded-xl bg-primary-container text-on-primary text-sm font-medium shadow-sm flex items-center gap-space-xs opacity-50 cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">publish</span>
              <span>Upload & Process</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardOverview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setDashData(await fetchDashboardStats());
    } catch (err) {
      setDashData(null);
      setError(err.message || 'Could not load your dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchDashboardStats()
      .then((data) => {
        if (isMounted) setDashData(data);
      })
      .catch((err) => {
        if (isMounted) {
          setDashData(null);
          setError(err.message || 'Could not load your dashboard. Please try again.');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const stats = dashData?.stats;
  const recentLectures = dashData?.recentLectures || [];
  const subjects = dashData?.subjects || [];
  const recentActivity = dashData?.recentActivity || [];

  return (
    <>
      <AddLectureDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex flex-col w-full">
        <div className="px-gutter py-space-xl flex flex-col gap-space-xl max-w-7xl mx-auto w-full">

          {/* ── Greeting Header ── */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-space-lg">
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center gap-space-xs text-xs">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-primary-fixed text-primary">
                  {user?.semester || 'Learning Workspace'}
                </span>
                <span className="text-outline">• Your overview</span>
              </div>
              <h1 className="text-3xl font-bold text-on-surface tracking-tight">
                {getGreeting()},{' '}
                <span className="text-primary-container">{user?.name?.split(' ')[0] || 'Student'}</span>
              </h1>
              <p className="text-sm text-on-surface-variant max-w-xl">
                Keep your classroom lectures organized and your learning on track with interactive checkpoints.
              </p>
            </div>
            <div className="flex items-center gap-space-sm shrink-0">
              <button
                type="button"
                onClick={() => void loadDashboard()}
                disabled={loading}
                className="h-10 w-10 rounded-xl bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50 transition-colors shadow-sm border border-outline-variant/30 flex items-center justify-center"
                aria-label="Refresh overview"
                title="Refresh overview"
              >
                <span className={`material-symbols-outlined text-[20px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
              </button>
              <Link
                to="/subjects"
                className="h-10 px-space-lg rounded-xl bg-surface-container-lowest text-on-surface hover:bg-surface-container-low transition-all text-sm font-medium shadow-sm flex items-center gap-space-xs border border-outline-variant/30"
              >
                <span className="material-symbols-outlined text-[18px] text-outline">folder_open</span>
                <span>Browse Subjects</span>
              </Link>
              <button
                onClick={() => setDrawerOpen(true)}
                id="add-lecture-header-btn"
                className="h-10 px-space-lg rounded-xl bg-primary-container text-on-primary hover:bg-primary transition-all text-sm font-medium shadow-sm flex items-center gap-space-xs"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                <span>Add Lecture</span>
              </button>
            </div>
          </div>

          {/* ── KPI Cards ── */}
          {error && (
            <div role="alert" className="flex flex-col gap-3 rounded-lg border border-error/30 bg-error-container/30 px-space-md py-3 text-sm text-error sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </span>
              <button type="button" onClick={() => void loadDashboard()} className="shrink-0 font-semibold underline underline-offset-2">
                Retry
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
            <KpiCard
              label="Total Lectures"
              value={loading || error ? '—' : stats?.totalLectures ?? 0}
              icon="play_circle"
              iconBg="bg-primary-fixed"
              iconColor="text-primary"
              subLabel={stats?.weeklyGrowth || '+0 this week'}
              subIcon="trending_up"
              subColor="text-tertiary"
            />
            <KpiCard
              label="Subjects"
              value={loading || error ? '—' : stats?.totalSubjects ?? 0}
              icon="layers"
              iconBg="bg-secondary-fixed"
              iconColor="text-secondary"
              subLabel="Your saved subjects"
              subIcon="history_edu"
              subColor="text-on-surface-variant"
            />
            <KpiCard
              label="Notes Saved"
              value={loading || error ? '—' : stats?.notesSaved ?? 0}
              icon="description"
              iconBg="bg-surface-container-low"
              iconColor="text-on-surface-variant"
              subLabel="Handwritten topic pages"
              subIcon="auto_awesome"
              subColor="text-on-surface-variant"
            />
            <KpiCard
              label="Pending Revision"
              value={loading || error ? '—' : stats?.pendingRevision ?? 0}
              icon="update"
              iconBg="bg-surface-variant"
              iconColor="text-on-surface-variant"
              subLabel="Scheduled for review"
              subIcon="alarm"
              subColor="text-error"
            />
          </div>

          {/* ── 2-Column Layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl">

            {/* PRIMARY COLUMN */}
            <div className="lg:col-span-8 flex flex-col gap-space-xl">

              {/* Recent Lectures */}
              <div className="flex flex-col gap-space-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-sm">
                    <h2 className="text-xl font-semibold text-on-surface">Recent Lectures</h2>
                    <span className="px-1.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11px]">
                      {loading || error ? '—' : `${stats?.totalLectures ?? 0} total`}
                    </span>
                  </div>
                  <Link
                    to="/my-lectures"
                    className="text-primary-container text-sm font-medium hover:underline flex items-center gap-space-xs group"
                  >
                    <span>View All</span>
                    <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-0.5">
                      arrow_forward
                    </span>
                  </Link>
                </div>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-surface-container-lowest rounded-xl p-space-lg h-24 animate-pulse" />
                    ))}
                  </div>
                ) : recentLectures.length ? (
                  recentLectures.map((lecture) => (
                    <LectureCard key={lecture.id} lecture={lecture} />
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-outline-variant/50 bg-surface-container-lowest px-5 py-8 text-center">
                    <span className="material-symbols-outlined text-[28px] text-outline">video_library</span>
                    <p className="mt-2 text-sm font-medium text-on-surface">{error ? 'Recent lectures are unavailable.' : 'No lectures yet'}</p>
                    {!error && <p className="mt-1 text-xs text-on-surface-variant">Add a lecture to see it in your overview.</p>}
                  </div>
                )}
              </div>

              {/* My Subjects */}
              <div className="flex flex-col gap-space-md">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-on-surface">My Subjects</h2>
                  <Link
                    to="/subjects"
                    className="text-primary-container text-sm font-medium hover:underline flex items-center gap-space-xs group"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                    <span>Add Subject</span>
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  {loading
                    ? [1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-surface-container-lowest rounded-xl p-space-lg h-36 animate-pulse" />
                      ))
                    : subjects.length ? subjects.map((subject) => (
                        <SubjectCard key={subject.id} subject={subject} />
                      )) : (
                        <div className="sm:col-span-2 rounded-xl border border-dashed border-outline-variant/50 bg-surface-container-lowest px-5 py-8 text-center">
                          <span className="material-symbols-outlined text-[28px] text-outline">auto_stories</span>
                          <p className="mt-2 text-sm font-medium text-on-surface">{error ? 'Subjects are unavailable.' : 'No subjects yet'}</p>
                          {!error && <p className="mt-1 text-xs text-on-surface-variant">Create a subject to organize your lectures.</p>}
                        </div>
                      )}
                </div>
              </div>
            </div>

            {/* SECONDARY COLUMN */}
            <div className="lg:col-span-4 flex flex-col gap-space-xl">

              {/* Quick Actions */}
              <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-on-surface">Quick Actions</h3>
                  <span className="material-symbols-outlined text-outline text-[20px]">bolt</span>
                </div>
                <div className="flex flex-col gap-space-xs">
                  {/* Add lecture */}
                  <button
                    id="qa-add-lecture-btn"
                    onClick={() => setDrawerOpen(true)}
                    className="w-full flex items-center gap-space-md p-space-sm rounded-lg hover:bg-surface-container-low transition-colors text-left group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary-fixed text-primary flex items-center justify-center shrink-0 group-hover:bg-primary-container group-hover:text-on-primary transition-colors">
                      <span className="material-symbols-outlined text-[18px]">upload_file</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-on-surface">Add New Lecture</span>
                      <span className="text-[11px] text-on-surface-variant">Upload audio, video or slides</span>
                    </div>
                  </button>

                  {/* Browse library */}
                  <button
                    onClick={() => navigate('/my-lectures')}
                    className="w-full flex items-center gap-space-md p-space-sm rounded-lg hover:bg-surface-container-low transition-colors text-left group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-secondary-fixed text-secondary flex items-center justify-center shrink-0 group-hover:bg-secondary group-hover:text-on-secondary transition-colors">
                      <span className="material-symbols-outlined text-[18px]">folder_copy</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-on-surface">Browse Lecture Library</span>
                      <span className="text-[11px] text-on-surface-variant">Inspect full catalog archive</span>
                    </div>
                  </button>

                  {/* Saved notes */}
                  <button
                    onClick={() => navigate('/notes')}
                    className="w-full flex items-center gap-space-md p-space-sm rounded-lg hover:bg-surface-container-low transition-colors text-left group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-surface-container-high text-on-surface flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-on-primary transition-colors">
                      <span className="material-symbols-outlined text-[18px]">feed</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-on-surface">Access Saved Notes</span>
                      <span className="text-[11px] text-on-surface-variant">Read AI synthesis & briefs</span>
                    </div>
                  </button>

                  {/* Revision drill */}
                  <button
                    onClick={() => navigate('/revision')}
                    className="w-full flex items-center gap-space-md p-space-sm rounded-lg hover:bg-surface-container-low transition-colors text-left group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-surface-variant text-on-surface-variant flex items-center justify-center shrink-0 group-hover:bg-inverse-surface group-hover:text-inverse-on-surface transition-colors">
                      <span className="material-symbols-outlined text-[18px]">replay</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-on-surface">Start Revision Drill</span>
                      <span className="text-[11px] text-on-surface-variant">Run active recall cards</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-on-surface">Recent Activity</h3>
                  <span className="material-symbols-outlined text-outline text-[20px]">schedule</span>
                </div>
                <div className="flex flex-col gap-space-md relative before:absolute before:top-2 before:bottom-2 before:left-4 before:w-[2px] before:bg-surface-container-high">
                  {recentActivity.length ? recentActivity.map((event) => {
                    const colorClass = ACTIVITY_COLOR_MAP[event.color] || ACTIVITY_COLOR_MAP.neutral;
                    return (
                      <button type="button" key={event.id} onClick={() => event.href && navigate(event.href)} disabled={!event.href} className="flex items-start gap-space-md relative z-10 text-left disabled:cursor-default">
                        <div
                          className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center shrink-0 ring-4 ring-surface-container-lowest`}
                        >
                          <span className="material-symbols-outlined text-[16px]">{event.icon}</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-on-surface">{event.label}</span>
                          <span className="text-[11px] text-on-surface-variant">{event.time}</span>
                        </div>
                      </button>
                    );
                  }) : (
                    <p className="py-4 text-center text-sm text-on-surface-variant">
                      {loading ? 'Loading activity…' : error ? 'Activity is unavailable.' : 'Your lecture and subject activity will appear here.'}
                    </p>
                  )}
                </div>
              </div>

              {/* Live overview status */}
              <div className="bg-surface-container-low rounded-xl p-space-md flex items-center gap-space-sm text-on-surface-variant shadow-sm">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${error ? 'bg-error' : loading ? 'bg-amber-500 animate-pulse' : 'bg-tertiary'}`} />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-on-surface">{error ? 'Overview unavailable' : loading ? 'Updating overview…' : 'Overview up to date'}</span>
                  <span className="text-[11px] truncate text-on-surface-variant">
                    {error ? 'Refresh to retry loading your account data.' : 'Based on your saved lectures, subjects, and notes.'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
