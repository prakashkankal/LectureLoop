import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteLecture, fetchUserLectures, startLectureAnalysis } from '../services/api.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]{11}/;

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'needs-review', label: 'Needs Review' },
];

const SUBJECT_STYLES = [
  { match: /database|dbms|sql/i, icon: 'database', color: 'text-primary' },
  { match: /operating system|kernel/i, icon: 'memory', color: 'text-secondary' },
  { match: /network|tcp|internet/i, icon: 'hub', color: 'text-tertiary' },
  { match: /algorithm|data structure/i, icon: 'account_tree', color: 'text-primary-container' },
];

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '—';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = Math.floor(seconds % 60);
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function formatLastStudied(dateValue) {
  if (!dateValue) return 'Not studied yet';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Not studied yet';
  const elapsed = Date.now() - date.getTime();
  if (elapsed < 60 * 60 * 1000) return 'Today, recently';
  if (elapsed < 24 * 60 * 60 * 1000) return 'Today';
  if (elapsed < 48 * 60 * 60 * 1000) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function toSession(lecture) {
  const topics = lecture.topics || [];
  const completed = topics.filter((topic) => topic.completed).length;
  const total = topics.length;
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const flagged = topics.some((topic) => topic.flagged || topic.needsReview || topic.status === 'needs-review');
  const category = lecture.analysisStatus === 'failed' || flagged
    ? 'needs-review'
    : total > 0 && completed === total
      ? 'completed'
      : 'in-progress';
  const durationSeconds = topics.reduce((max, topic) => Math.max(max, Number(topic.endSec) || 0), 0)
    || topics.reduce((sum, topic) => sum + Math.max(0, (Number(topic.endSec) || 0) - (Number(topic.startSec) || 0)), 0);
  const style = SUBJECT_STYLES.find((entry) => entry.match.test(lecture.subject || ''))
    || { icon: 'menu_book', color: 'text-primary' };
  const isAnalyzed = lecture.analysisStatus === 'complete';
  const isCompleted = category === 'completed';
  const needsReview = category === 'needs-review';

  return {
    id: String(lecture._id),
    title: lecture.title || 'Untitled Lecture',
    subject: lecture.subject || 'General',
    lastStudied: formatLastStudied(lecture.updatedAt || lecture.createdAt),
    duration: lecture.duration || formatDuration(durationSeconds),
    topics: total,
    completed,
    completedDurationSeconds: topics.filter((topic) => topic.completed)
      .reduce((sum, topic) => sum + Math.max(0, (Number(topic.endSec) || 0) - (Number(topic.startSec) || 0)), 0),
    progress,
    progressColor: isCompleted ? 'bg-tertiary-container' : 'bg-primary-container',
    progressLabel: isCompleted ? 'text-tertiary' : 'text-primary-container',
    category,
    badge: needsReview
      ? { text: lecture.analysisStatus === 'failed' ? 'Analysis Failed' : 'Needs Review', bg: 'bg-error-container text-on-error-container', icon: 'priority_high' }
      : isCompleted
        ? { text: 'Completed', bg: 'bg-tertiary-fixed text-on-tertiary-fixed', icon: 'check_circle' }
        : { text: isAnalyzed ? 'In Progress' : 'Analyzing', bg: 'bg-primary-container text-on-primary', dot: 'bg-surface-bright animate-pulse' },
    action: !isAnalyzed
      ? { label: 'View Status', icon: 'hourglass_top', primary: true, href: `/interactive/analysis?lectureId=${lecture._id}` }
      : isCompleted
        ? { label: 'Review & Replay', icon: 'replay', primary: false, href: `/interactive/session?lectureId=${lecture._id}` }
        : { label: 'Continue Learning', icon: 'play_arrow', primary: true, href: `/interactive/session?lectureId=${lecture._id}` },
    secondaryAction: { icon: 'more_vert' },
    extra: needsReview
      ? { icon: 'warning', text: lecture.analysisStatus === 'failed' ? 'Analysis needs attention' : 'Review flagged topics', color: 'text-error' }
      : null,
    thumbnail: style,
    analysisHref: `/interactive/analysis?lectureId=${lecture._id}`,
  };
}

// ─── Thumbnail placeholder ────────────────────────────────────────────────────
function SessionThumbnail({ thumbnail, duration }) {
  const t = thumbnail || { icon: 'menu_book', color: 'text-primary' };
  const waveHeights = [32, 56, 20, 44, 28, 36, 16, 48];
  return (
    <div className="relative w-full h-44 rounded-xl overflow-hidden bg-surface-container-high">
      {/* Animated waveform background */}
      <div className="absolute inset-0 flex items-end justify-center gap-1 px-6 pb-4 opacity-25">
        {waveHeights.map((h, i) => (
          <div
            key={i}
            className={`w-2 rounded-full ${t.color.replace('text-', 'bg-')}`}
            style={{ height: `${h}px`, animation: `pulse 1.4s ease-in-out ${i * 0.12}s infinite` }}
          />
        ))}
      </div>
      {/* Center icon */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span className={`material-symbols-outlined text-[48px] ${t.color} opacity-70`}>{t.icon}</span>
        <span className="text-xs text-on-surface-variant font-medium opacity-70">Learning Session</span>
      </div>
      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t from-inverse-surface/60 via-transparent to-transparent`} />
      {/* Duration badge */}
      <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-inverse-surface/80 text-inverse-on-surface text-[11px] font-mono">
        {duration}
      </div>
    </div>
  );
}

// ─── Session Card ─────────────────────────────────────────────────────────────
function SessionCard({ session, hidden, onAction, onViewBreakdown, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  if (hidden) return null;
  const { badge, action, secondaryAction, extra } = session;
  return (
    <div className="group flex flex-col justify-between rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex flex-col gap-space-md">
        {/* Thumbnail */}
        <div className="relative">
          <SessionThumbnail thumbnail={session.thumbnail} duration={session.duration} />
          {/* Status badge */}
          <div className="absolute top-3 left-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${badge.bg} text-[11px] font-semibold shadow-sm`}>
              {badge.dot && <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />}
              {badge.icon && <span className="material-symbols-outlined text-[13px]">{badge.icon}</span>}
              {badge.text}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-xs text-outline text-xs">
            <span className="material-symbols-outlined text-[15px]">schedule</span>
          <span>Last active: {session.lastStudied}</span>
          </div>
          <h3 className="text-sm font-semibold text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
            {session.title}
          </h3>
        </div>

        {/* Progress */}
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-on-surface-variant font-medium">{session.topics} topics detected</span>
            <span className={`${session.progressLabel} font-semibold`}>
              {session.completed} / {session.topics} completed ({session.progress}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
            <div
              className={`h-full rounded-full ${session.progressColor} transition-all`}
              style={{ width: `${session.progress}%` }}
            />
          </div>
          {extra && (
            <div className={`flex items-center gap-1 ${extra.color} text-[11px] font-medium mt-0.5`}>
              <span className="material-symbols-outlined text-[15px]">{extra.icon}</span>
              <span>{extra.text}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="pt-space-lg mt-space-sm flex items-center gap-space-sm">
        <button
          onClick={() => onAction?.(session)}
          className={`w-full inline-flex items-center justify-center gap-space-sm py-2.5 px-space-md rounded-xl text-sm font-medium shadow-sm transition-colors cursor-pointer ${
            action.primary
              ? 'bg-primary-container text-on-primary hover:bg-primary'
              : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">{action.icon}</span>
          <span>{action.label}</span>
        </button>
        <div className="relative shrink-0">
          <button
            type="button"
            aria-label={`More options for ${session.title}`}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">{secondaryAction.icon}</span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 bottom-12 z-20 min-w-48 rounded-xl bg-surface-container-lowest p-1.5 shadow-xl ring-1 ring-outline-variant/30">
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onViewBreakdown?.(session); }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-container-low"
              >View Topic Breakdown</button>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onDelete?.(session); }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-error hover:bg-error-container/30"
              >Delete Session</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InteractiveLearningHub() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [stats, setStats] = useState({ totalTime: '0.0 hrs', checkpoints: 0, activeSessions: 0, completedCount: 0 });
  const inputRef = useRef(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const lectures = await fetchUserLectures();
      setSessions(lectures.map(toSession));
    } catch (err) {
      console.warn('Interactive sessions failed to load:', err.message);
      setSessions([]);
      setLoadError('Could not load your saved lectures. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    const topicCount = sessions.reduce((sum, session) => sum + session.topics, 0);
    const completedCount = sessions.reduce((sum, session) => sum + session.completed, 0);
    const studiedSeconds = sessions.reduce((sum, session) => sum + session.completedDurationSeconds, 0);
    setStats({
      totalTime: `${(studiedSeconds / 3600).toFixed(1)} hrs`,
      checkpoints: completedCount,
      activeSessions: sessions.length,
      completedCount: topicCount ? Math.round((completedCount / topicCount) * 100) : 0,
    });
  }, [sessions]);

  const validateUrl = (val) => {
    if (!val.trim()) return 'Please enter a YouTube URL.';
    if (!YOUTUBE_REGEX.test(val.trim())) return 'Please enter a valid YouTube URL (e.g. https://youtube.com/watch?v=...).';
    return '';
  };

  const handleAnalyze = async () => {
    const err = validateUrl(url);
    if (err) {
      setUrlError(err);
      inputRef.current?.focus();
      return;
    }
    setUrlError('');
    setIsAnalyzing(true);

    try {
      const lecture = await startLectureAnalysis({
        youtubeUrl: url.trim(),
        title: 'Lecture',
        subject: 'General',
      });
      navigate(`/interactive/analysis?lectureId=${lecture._id}`);
    } catch (apiErr) {
      console.error('Analysis start error:', apiErr);
      navigate(`/interactive/analysis?url=${encodeURIComponent(url.trim())}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddYTBtn = () => {
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    inputRef.current?.focus();
    inputRef.current?.select();
  };

  const handleDeleteSession = async (session) => {
    if (!window.confirm(`Delete “${session.title}”? This will remove the saved lecture and its analysis.`)) return;
    try {
      await deleteLecture(session.id);
      setSessions((current) => current.filter((item) => item.id !== session.id));
    } catch (err) {
      setLoadError(err.message || 'Could not delete this session.');
    }
  };

  const filteredSessions = sessions.filter(
    (s) => activeFilter === 'all' || s.category === activeFilter
  );

  return (
    <div className="flex flex-col w-full">
      {/* Ambient glow */}
      <div className="relative w-full overflow-hidden px-gutter py-space-xl">
        <div className="pointer-events-none absolute -top-24 right-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute top-48 -left-20 w-80 h-80 rounded-full bg-secondary-container/20 blur-3xl" />

        <div className="max-w-7xl mx-auto flex flex-col gap-space-xl relative z-10">

          {/* ── Page Header ── */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center gap-space-xs text-primary-container">
                <span className="material-symbols-outlined text-[18px]">psychology</span>
                <span className="text-[11px] uppercase tracking-wider font-semibold">Active Learning</span>
              </div>
              <h1 className="text-3xl font-bold text-on-surface tracking-tight">Interactive Learning</h1>
              <p className="text-sm text-on-surface-variant">Turn any video lecture into an interactive study session with checkpoints.</p>
            </div>
            <button
              onClick={handleAddYTBtn}
              id="add-yt-hub-btn"
              className="inline-flex items-center gap-space-sm px-space-lg py-2.5 rounded-xl bg-primary-container text-on-primary text-sm font-medium shadow-sm hover:bg-primary transition-all active:translate-y-[1px] shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>+ Add YouTube Lecture</span>
            </button>
          </div>

          {/* ── Hero Input Card ── */}
          <section className="relative w-full rounded-2xl bg-surface-container-lowest p-space-xl shadow-sm">
            {/* Accent glow line */}
            <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-primary-container/40 to-transparent rounded-full" />

            <div className="max-w-4xl mx-auto flex flex-col gap-space-lg">
              {/* Heading group */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-space-md">
                <div className="w-12 h-12 rounded-xl bg-error-container/40 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-error text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    smart_display
                  </span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-space-sm flex-wrap">
                    <h2 className="text-xl font-semibold text-on-surface">Learn from a YouTube Lecture</h2>
                  </div>
                  <p className="text-sm text-on-surface-variant mt-1">
                    Paste a lecture link to organize topics into an interactive session with chapter checkpoints and review quizzes.
                  </p>
                </div>
              </div>

              {/* Input Row */}
              <div className="p-2 rounded-xl bg-surface-container-low shadow-inner">
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <div className={`relative flex items-center flex-1 w-full bg-surface-container-lowest rounded-lg px-space-md py-2 shadow-sm transition-all ${urlError ? 'ring-2 ring-error/40' : ''}`}>
                    <span
                      className="material-symbols-outlined text-error text-[22px] mr-space-sm shrink-0"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      play_circle
                    </span>
                    <input
                      ref={inputRef}
                      id="youtube-url-input"
                      type="text"
                      value={url}
                      onChange={(e) => { setUrl(e.target.value); if (urlError) setUrlError(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                      placeholder="https://www.youtube.com/watch?v=... (Paste YouTube lecture URL)"
                      className="w-full bg-transparent text-sm text-on-surface placeholder:text-outline focus:outline-none pr-space-sm"
                    />
                    {url && (
                      <button
                        onClick={() => { setUrl(''); setUrlError(''); inputRef.current?.focus(); }}
                        className="text-outline hover:text-on-surface p-1 transition-colors"
                        aria-label="Clear input"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    )}
                  </div>
                  <button
                    id="analyze-lecture-btn"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-space-sm px-space-xl py-3 rounded-lg bg-primary-container hover:bg-primary text-on-primary text-sm font-medium shrink-0 shadow-sm transition-all active:translate-y-[1px] disabled:opacity-70"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${isAnalyzing ? 'animate-spin' : ''}`}>
                      {isAnalyzing ? 'progress_activity' : 'auto_awesome'}
                    </span>
                    <span>{isAnalyzing ? 'Analyzing Topics...' : 'Analyze Lecture'}</span>
                  </button>
                </div>
              </div>

              {/* Validation error */}
              {urlError && (
                <div className="flex items-center gap-space-xs text-error text-xs -mt-2">
                  <span className="material-symbols-outlined text-[15px]">error</span>
                  <span>{urlError}</span>
                </div>
              )}

              {/* Helper + feature badges */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md text-on-surface-variant">
                <div className="flex items-center gap-space-xs text-xs">
                  <span className="material-symbols-outlined text-outline text-[15px]">verified_user</span>
                  <span>Use a lecture you have permission to access. Supports YouTube recordings, chapter markers, and auto-captions.</span>
                </div>
                <div className="flex flex-wrap items-center gap-space-xs">
                  {[
                    { emoji: '⚡', label: 'Automatic Topic Segmentation', color: 'text-secondary' },
                    { emoji: '🎯', label: 'Segment-by-Segment Quizzes', color: 'text-primary-container' },
                    { emoji: '🔄', label: 'Targeted Replay & Notes', color: 'text-tertiary-container' },
                  ].map((b) => (
                    <span
                      key={b.label}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-xs font-medium text-on-surface"
                    >
                      <span className={`font-bold ${b.color}`}>{b.emoji}</span>
                      {b.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── Recent Learning Sessions ── */}
          <section className="flex flex-col gap-space-md">
            {/* Header + filter tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
              <div className="flex items-baseline gap-space-md">
                <h2 className="text-xl font-semibold text-on-surface">Recent Learning Sessions</h2>
                <button onClick={() => setActiveFilter('all')} className="text-sm text-primary-container hover:underline inline-flex items-center gap-0.5">
                  <span>View All ({sessions.length})</span>
                  <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                </button>
              </div>
              {/* Filter pill tabs */}
              <div className="flex items-center p-1 rounded-xl bg-surface-container-high w-fit" role="tablist">
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={activeFilter === tab.id}
                    onClick={() => setActiveFilter(tab.id)}
                    className={`px-space-md py-1 rounded-lg text-sm font-medium transition-all ${
                      activeFilter === tab.id
                        ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {loadError && (
              <div role="alert" className="flex items-center justify-between gap-space-md rounded-xl bg-error-container/40 px-space-md py-space-sm text-sm text-error">
                <span>{loadError}</span>
                <button type="button" onClick={loadSessions} className="shrink-0 font-semibold underline">Retry</button>
              </div>
            )}

            {/* Cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
              {loading ? (
                <div className="col-span-full flex items-center justify-center gap-space-sm py-12 text-on-surface-variant">
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  <span>Loading your learning sessions...</span>
                </div>
              ) : filteredSessions.length > 0 ? (
                filteredSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    hidden={false}
                    onAction={(sess) => navigate(sess.action.href)}
                    onViewBreakdown={(sess) => navigate(sess.analysisHref)}
                    onDelete={handleDeleteSession}
                  />
                ))
              ) : sessions.length === 0 && activeFilter === 'all' && !loadError ? (
                <div className="col-span-full flex flex-col items-center justify-center rounded-2xl bg-surface-container-lowest py-14 px-space-xl text-center shadow-sm">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-fixed text-primary mb-4">
                    <span className="material-symbols-outlined text-[32px]">play_lesson</span>
                  </div>
                  <h3 className="text-lg font-semibold text-on-surface">Your learning sessions will appear here</h3>
                  <p className="mt-2 max-w-lg text-sm text-on-surface-variant">Paste a YouTube lecture link above to create your first interactive session. We’ll organize it into topics and checkpoints.</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {['Computer Science', 'Study a lecture', 'Practice with quizzes'].map((suggestion) => (
                      <span key={suggestion} className="rounded-full bg-surface-container px-3 py-1 text-xs text-on-surface-variant">{suggestion}</span>
                    ))}
                  </div>
                  <button type="button" onClick={handleAddYTBtn} className="mt-5 rounded-xl bg-primary-container px-space-lg py-2.5 text-sm font-medium text-on-primary hover:bg-primary">
                    Add your first lecture
                  </button>
                </div>
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center text-outline mb-4">
                    <span className="material-symbols-outlined text-[32px]">manage_search</span>
                  </div>
                  <h3 className="text-lg font-semibold text-on-surface">No sessions found</h3>
                  <p className="text-sm text-on-surface-variant mt-1 mb-4">No sessions match the selected filter.</p>
                  <button
                    onClick={() => setActiveFilter('all')}
                    className="px-space-lg py-2 rounded-xl bg-primary-container text-on-primary text-sm font-medium hover:opacity-90 transition-opacity shadow-sm flex items-center gap-space-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                    <span>Show all sessions</span>
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* ── How It Works ── */}
          <section className="rounded-2xl bg-surface-container-low p-space-xl relative overflow-hidden">
            <div className="flex flex-col gap-space-lg relative z-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-sm">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-outline font-medium">Pedagogical Framework</div>
                  <h2 className="text-xl font-semibold text-on-surface mt-1">How Interactive Learning Works</h2>
                </div>
                <div className="flex items-center gap-2 text-outline text-xs">
                  <span className="material-symbols-outlined text-[18px]">sync</span>
                  <span>Based on Cognitive Load Theory & Retrieval Practice</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
                {[
                  {
                    phase: 'PHASE 01',
                    icon: 'view_timeline',
                    title: '1. Analyze',
                    desc: 'Identify lecture topic boundaries & timestamps automatically through deep semantic transcript decomposition.',
                    dot: 'bg-secondary',
                    dotLabel: 'Automatic topic detection',
                  },
                  {
                    phase: 'PHASE 02',
                    icon: 'quiz',
                    title: '2. Practice',
                    desc: 'Stop after each topic to verify comprehension with quick, adaptive checkpoint questions before moving ahead.',
                    dot: 'bg-primary-container',
                    dotLabel: 'Immediate retrieval checkpoint',
                  },
                  {
                    phase: 'PHASE 03',
                    icon: 'replay_circle_filled',
                    title: '3. Master',
                    desc: 'If you struggle, replay only that exact segment with synchronized notes and structured hints before retrying.',
                    dot: 'bg-tertiary-container',
                    dotLabel: 'Adaptive remediation loop',
                  },
                ].map((step) => (
                  <div
                    key={step.phase}
                    className="flex flex-col gap-space-md p-space-lg rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-xl bg-surface-container-high text-primary-container flex items-center justify-center">
                        <span className="material-symbols-outlined text-[24px]">{step.icon}</span>
                      </div>
                      <span className="text-[11px] font-mono text-outline px-2 py-1 rounded bg-surface-container">
                        {step.phase}
                      </span>
                    </div>
                    <div className="flex flex-col gap-space-xs">
                      <h3 className="text-sm font-semibold text-on-surface">{step.title}</h3>
                      <p className="text-sm text-on-surface-variant">{step.desc}</p>
                    </div>
                    <div className="pt-2 border-t border-surface-container flex items-center gap-1.5 text-on-surface-variant text-xs">
                      <span className={`w-2 h-2 rounded-full ${step.dot}`} />
                      <span>{step.dotLabel}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Bottom Stats Row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-md py-space-sm">
            {[
              { value: stats.totalTime, label: 'Active Study Time', icon: 'timer', color: 'text-primary-container' },
              { value: String(stats.checkpoints), label: 'Checkpoints Cleared', icon: 'rule', color: 'text-secondary' },
              { value: String(stats.activeSessions), label: 'Active Sessions', icon: 'play_lesson', color: 'text-tertiary-container' },
              { value: `${stats.completedCount}%`, label: 'Topic Completion', icon: 'trending_up', color: 'text-primary-container' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-space-md p-space-md rounded-xl bg-surface-container-lowest shadow-sm">
                <div className={`w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center ${stat.color}`}>
                  <span className="material-symbols-outlined text-[20px]">{stat.icon}</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-base font-semibold text-on-surface">{stat.value}</span>
                  <span className="text-[11px] text-outline truncate">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── AI Analysis Loading Modal Overlay ── */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/60 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-surface-container-lowest p-6 sm:p-8 shadow-2xl border border-outline-variant/30 flex flex-col gap-6 overflow-hidden">
            {/* Glowing accent backdrop */}
            <div className="pointer-events-none absolute -top-20 -right-20 w-48 h-48 rounded-full bg-primary-container/20 blur-3xl animate-pulse" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-secondary-container/20 blur-3xl" />

            {/* Header with animated AI badge */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-container/10 text-primary-container font-semibold text-xs tracking-wide">
                <span className="w-2 h-2 rounded-full bg-primary-container animate-ping" />
                <span>AI ANALYSIS IN PROGRESS</span>
              </div>
              <span className="material-symbols-outlined text-outline animate-spin text-[20px]">
                progress_activity
              </span>
            </div>

            {/* Title & Description */}
            <div className="flex flex-col gap-1.5">
              <h3 className="text-xl font-bold text-on-surface">Decomposing Lecture with AI</h3>
              <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                We are transcribing speech, indexing semantic chapter boundaries, and creating retrieval checkpoints.
              </p>
            </div>

            {/* Video Target Pill */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 min-w-0">
              <span className="material-symbols-outlined text-error text-[22px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                smart_display
              </span>
              <span className="text-xs text-on-surface font-mono truncate flex-1">
                {url || 'Processing YouTube Video...'}
              </span>
            </div>

            {/* Progress Pipeline Animation */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-xs shadow-sm">
                  <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                </div>
                <div className="flex-1">
                  <span className="text-xs font-semibold text-on-surface">1. Extracting Video Audio & Transcript</span>
                  <div className="text-[11px] text-on-surface-variant">Accessing YouTube captions or Groq Whisper pipeline</div>
                </div>
              </div>

              <div className="flex items-center gap-3 opacity-80">
                <div className="w-7 h-7 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center text-xs">
                  <span className="material-symbols-outlined text-[16px]">psychology</span>
                </div>
                <div className="flex-1">
                  <span className="text-xs font-semibold text-on-surface">2. Semantic Topic Segmentation</span>
                  <div className="text-[11px] text-on-surface-variant">Detecting timestamp transitions & key concepts</div>
                </div>
              </div>

              <div className="flex items-center gap-3 opacity-60">
                <div className="w-7 h-7 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center text-xs">
                  <span className="material-symbols-outlined text-[16px]">quiz</span>
                </div>
                <div className="flex-1">
                  <span className="text-xs font-semibold text-on-surface">3. Checkpoint Quiz Construction</span>
                  <div className="text-[11px] text-on-surface-variant">Generating in-video recall challenges</div>
                </div>
              </div>
            </div>

            {/* Animated Indeterminate Progress Bar */}
            <div className="relative w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
              <div className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-r from-primary via-primary-container to-secondary-container rounded-full animate-pulse" />
            </div>

            {/* Footer Status Note */}
            <div className="flex items-center justify-between text-[11px] text-outline pt-1 border-t border-outline-variant/15">
              <span>Transferring to Analysis Studio...</span>
              <span className="font-semibold text-primary">Please wait</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
