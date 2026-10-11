import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// ─── Constants ────────────────────────────────────────────────────────────────
const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]{11}/;

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'needs-review', label: 'Needs Review' },
];

const SESSIONS = [
  {
    id: '1',
    category: 'in-progress',
    title: 'Database Management Systems — Normalization & Keys',
    lastStudied: 'Today, 10:30 AM',
    duration: '48:20',
    topics: 8,
    completed: 5,
    progress: 62,
    progressColor: 'bg-primary-container',
    progressLabel: 'text-primary-container',
    badge: { text: 'In Progress', bg: 'bg-primary-container text-on-primary', dot: 'bg-surface-bright animate-pulse' },
    action: { label: 'Continue Learning', icon: 'play_arrow', primary: true },
    secondaryAction: { icon: 'more_vert' },
    extra: null,
    thumbnail: 'dbms',
  },
  {
    id: '2',
    category: 'completed',
    title: 'Operating Systems — Process Scheduling & Threads',
    lastStudied: 'Yesterday',
    duration: '1:12:45',
    topics: 6,
    completed: 6,
    progress: 100,
    progressColor: 'bg-tertiary-container',
    progressLabel: 'text-tertiary',
    badge: { text: 'Completed', bg: 'bg-tertiary-fixed text-on-tertiary-fixed', icon: 'check_circle' },
    action: { label: 'View Results', icon: 'analytics', primary: false },
    secondaryAction: { icon: 'replay' },
    extra: { icon: 'workspace_premium', text: '92% First-pass accuracy', color: 'text-tertiary' },
    thumbnail: 'os',
  },
  {
    id: '3',
    category: 'needs-review',
    title: 'Computer Networks — TCP/IP 3-Way Handshake',
    lastStudied: '3 days ago',
    duration: '35:10',
    topics: 9,
    completed: 3,
    progress: 33,
    progressColor: 'bg-primary-container',
    progressLabel: 'text-primary-container',
    badge: { text: 'Needs Review', bg: 'bg-error-container text-on-error-container', icon: 'priority_high' },
    action: { label: 'Resume Session', icon: 'play_circle', primary: true },
    secondaryAction: { icon: 'more_vert' },
    extra: { icon: 'warning', text: '1 Weak Topic flagged (TCP Congestion Window)', color: 'text-error' },
    thumbnail: 'cn',
  },
];

const THUMBNAIL_GRADIENT = {
  dbms: 'from-primary-fixed/60 via-primary-fixed/20 to-transparent',
  os: 'from-secondary-fixed/60 via-secondary-fixed/20 to-transparent',
  cn: 'from-tertiary-fixed/60 via-tertiary-fixed/20 to-transparent',
};

const THUMBNAIL_ICON = {
  dbms: { icon: 'database', color: 'text-primary' },
  os: { icon: 'memory', color: 'text-secondary' },
  cn: { icon: 'hub', color: 'text-tertiary' },
};

const BOTTOM_STATS = [
  { value: '24.5 hrs', label: 'Active Study Time', icon: 'timer', color: 'text-primary-container' },
  { value: '142', label: 'Checkpoints Cleared', icon: 'rule', color: 'text-secondary' },
  { value: '88.4%', label: 'Retention Score', icon: 'trending_up', color: 'text-tertiary-container' },
  { value: '14 Days', label: 'Consecutive Loop Streak', icon: 'bolt', color: 'text-primary-container' },
];

// ─── Thumbnail placeholder ────────────────────────────────────────────────────
function SessionThumbnail({ type, duration }) {
  const t = THUMBNAIL_ICON[type] || THUMBNAIL_ICON.dbms;
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
function SessionCard({ session, hidden, onAction }) {
  if (hidden) return null;
  const { badge, action, secondaryAction, extra } = session;
  return (
    <div className="group flex flex-col justify-between rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex flex-col gap-space-md">
        {/* Thumbnail */}
        <div className="relative">
          <SessionThumbnail type={session.thumbnail} duration={session.duration} />
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
            <span>Last studied: {session.lastStudied}</span>
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
          onClick={() => onAction && onAction(session)}
          className={`w-full inline-flex items-center justify-center gap-space-sm py-2.5 px-space-md rounded-xl text-sm font-medium shadow-sm transition-colors cursor-pointer ${
            action.primary
              ? 'bg-primary-container text-on-primary hover:bg-primary'
              : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">{action.icon}</span>
          <span>{action.label}</span>
        </button>
        <button
          onClick={() => onAction && onAction(session)}
          className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors shrink-0 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">{secondaryAction.icon}</span>
        </button>
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
  const inputRef = useRef(null);

  const validateUrl = (val) => {
    if (!val.trim()) return 'Please enter a YouTube URL.';
    if (!YOUTUBE_REGEX.test(val.trim())) return 'Please enter a valid YouTube URL (e.g. https://youtube.com/watch?v=...).';
    return '';
  };

  const handleAnalyze = () => {
    const err = validateUrl(url);
    if (err) {
      setUrlError(err);
      inputRef.current?.focus();
      return;
    }
    setUrlError('');
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      navigate(`/interactive/analysis?url=${encodeURIComponent(url.trim())}`);
    }, 600);
  };

  const handleAddYTBtn = () => {
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    inputRef.current?.focus();
    inputRef.current?.select();
  };

  const filteredSessions = SESSIONS.filter(
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
                <span className="text-[11px] uppercase tracking-wider font-semibold">Active Synthesis Protocol</span>
              </div>
              <h1 className="text-3xl font-bold text-on-surface tracking-tight">Interactive Learning</h1>
              <p className="text-sm text-on-surface-variant">Turn any lecture into an active learning experience.</p>
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
                    <span className="px-2 py-0.5 rounded-full bg-secondary-fixed/50 text-on-secondary-fixed-variant text-[11px] font-semibold">
                      AI Engine v2.4
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant mt-1">
                    Paste a lecture link and we'll organize its topics into an interactive learning session with segmented playback and active checkpoint questions.
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
                      placeholder="https://www.youtube.com/watch?v=... (e.g. Stanford CS145 - Databases)"
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
                <button className="text-sm text-primary-container hover:underline inline-flex items-center gap-0.5">
                  <span>View All (8)</span>
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

            {/* Cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
              {filteredSessions.length > 0 ? (
                filteredSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    hidden={false}
                    onAction={(sess) => {
                      if (sess.action.label === 'View Results') {
                        navigate('/session-results');
                      } else {
                        navigate('/interactive/session');
                      }
                    }}
                  />
                ))
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
            {BOTTOM_STATS.map((stat) => (
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
    </div>
  );
}
