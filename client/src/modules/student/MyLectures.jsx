import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserLectures } from '../services/api';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Date: Newest First' },
  { value: 'duration', label: 'Duration (Longest)' },
  { value: 'title', label: 'Title A–Z' },
];

const STAT_STYLES = [
  { icon: 'video_library', iconBg: 'bg-secondary-container/30 text-secondary', subColor: 'text-secondary' },
  { icon: 'check_circle', iconBg: 'bg-tertiary-fixed/30 text-tertiary', subColor: 'text-tertiary' },
  { icon: 'category', iconBg: 'bg-primary-fixed text-primary', subColor: 'text-primary' },
  { icon: 'auto_awesome', iconBg: 'bg-primary-fixed text-primary', subColor: 'text-primary' },
];

// Subject thumbnail icon map
const SUBJECT_THUMB = {
  dbms: { icon: 'database', color: 'text-primary', bg: 'bg-primary-fixed/20' },
  os: { icon: 'memory', color: 'text-secondary', bg: 'bg-secondary-fixed/20' },
  cn: { icon: 'hub', color: 'text-tertiary', bg: 'bg-tertiary-fixed/20' },
  dsa: { icon: 'account_tree', color: 'text-primary-container', bg: 'bg-primary-container/10' },
};

const formatDate = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : 'Date unavailable';
const durationSeconds = (value = '') => {
  const parts = String(value).match(/\d+/g)?.map(Number) || [];
  return parts.reduce((total, part) => total * 60 + part, 0);
};
const formatStatus = (lecture) => {
  const status = lecture.status || lecture.analysisStatus || 'processing';
  if (status === 'ready' || status === 'complete') return { label: 'Ready', bg: 'bg-tertiary-fixed text-on-tertiary-fixed', dot: 'bg-tertiary' };
  if (status === 'revision-due') return { label: 'Revision due', bg: 'bg-secondary-fixed text-on-secondary-fixed', dot: 'bg-secondary' };
  if (status === 'archived') return { label: 'Archived', bg: 'bg-surface-container-high text-on-surface-variant', dot: 'bg-outline' };
  if (status === 'failed') return { label: 'Analysis failed', bg: 'bg-error-container text-error', dot: 'bg-error' };
  return { label: 'Processing', bg: 'bg-secondary-fixed text-on-secondary-fixed', dot: 'bg-secondary' };
};
const normalizeLecture = (item) => {
  const status = formatStatus(item);
  const topics = item.topics || [];
  return {
    ...item,
    id: item._id,
    subject: item.subject || 'Other',
    subjectLabel: item.subject || 'Other',
    date: formatDate(item.createdAt),
    duration: item.duration || 'Duration unavailable',
    filename: item.filename || (item.youtubeVideoId ? `YouTube video · ${item.youtubeVideoId}` : 'No source file'),
    description: item.description || topics.map((topic) => topic.summary).filter(Boolean).join(' '),
    statusLabel: status.label,
    statusBg: status.bg,
    dotColor: status.dot,
    aiIcon: 'auto_awesome',
    aiLabel: topics.length ? `${topics.length} AI topics` : (item.analysisStatus === 'failed' ? 'Analysis unavailable' : 'No AI topics yet'),
  };
};

const ORAL_PRACTICE_ORIGIN = 'http://127.0.0.1:5179';

function createOralPracticeMaterial(lecture) {
  const topics = lecture.topics || [];
  const notes = [lecture.description, ...topics.map((topic) => topic.summary)].filter(Boolean);
  if (!notes.length) return null;
  const keyTerms = topics.flatMap((topic) => topic.keyTerms || []);
  return {
    schemaVersion: 1,
    material: {
      subject: lecture.subjectLabel,
      lecture: lecture.title,
      topic: lecture.title,
      notes: notes.join('\n\n'),
      keyTerms,
    },
  };
}

// ─── Grid Card ────────────────────────────────────────────────────────────────
function LectureGridCard({ lecture, onPracticeOrally }) {
  const navigate = useNavigate();
  const thumb = SUBJECT_THUMB[lecture.subject] || SUBJECT_THUMB.dbms;
  return (
    <div
      className={`group bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden ${
        lecture.highlight ? 'ring-1 ring-secondary/20' : ''
      }`}
    >
      <div className="flex flex-col gap-space-md">
        {/* Header row: subject badge + status + menu */}
        <div className="flex items-center justify-between">
          <span className="px-space-sm py-0.5 rounded-full text-[11px] font-semibold bg-surface-container-high text-primary-container">
            {lecture.subjectLabel}
          </span>
          <div className="flex items-center gap-space-xs">
            <span className={`inline-flex items-center gap-1 px-space-sm py-0.5 rounded-full text-[11px] font-semibold ${lecture.statusBg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${lecture.dotColor}`} />
              {lecture.statusLabel}
            </span>
            <button
              aria-label="Card options"
              className="w-7 h-7 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">more_vert</span>
            </button>
          </div>
        </div>

        {/* Thumbnail + title */}
        <div className="flex gap-space-md items-start">
          <div className={`w-14 h-14 rounded-xl shrink-0 relative overflow-hidden ${thumb.bg} flex items-center justify-center`}>
            <span className={`material-symbols-outlined text-[28px] ${thumb.color} group-hover:scale-110 transition-transform duration-300`}>
              {thumb.icon}
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <h2 className="text-sm font-semibold text-on-surface group-hover:text-primary-container transition-colors line-clamp-2">
              {lecture.title}
            </h2>
            <div className="flex items-center gap-space-sm text-outline text-[11px] mt-1">
              <span>{lecture.date}</span>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[13px]">schedule</span>
                {lecture.duration}
              </span>
            </div>
          </div>
        </div>

        {/* File pill */}
        <div className="flex items-center justify-between px-space-md py-2 rounded-xl bg-surface-container-low">
          <div className="flex items-center gap-space-xs min-w-0">
            <span className="material-symbols-outlined text-outline text-[15px]">audio_file</span>
            <span className="text-[11px] font-mono text-on-surface-variant truncate">{lecture.filename}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-on-surface-variant line-clamp-2">{lecture.description}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-space-md mt-space-md border-t border-surface-container-low">
        <div className="flex items-center gap-space-xs">
          <span className={`material-symbols-outlined text-secondary text-[15px]`}>{lecture.aiIcon}</span>
          <span className="text-[11px] text-secondary font-medium">{lecture.aiLabel}</span>
        </div>
        <div className="flex items-center gap-space-xs">
          <button
            onClick={() => navigate('/notes')}
            className="px-space-md py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">description</span>
            <span>Open Notes</span>
          </button>
          <button
            type="button"
            onClick={() => onPracticeOrally(lecture)}
            className="px-space-md py-1.5 rounded-lg bg-secondary-container text-on-secondary-container text-[11px] font-medium transition-colors hover:opacity-90"
          >
            Practice orally
          </button>
          <button
            type="button"
            onClick={() => navigate('/interactive')}
            className={`px-space-md py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
              lecture.highlight
                ? 'bg-primary text-on-primary hover:bg-primary-container'
                : 'bg-primary-container text-on-primary hover:opacity-90'
            }`}
          >
            Review
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── List Row ─────────────────────────────────────────────────────────────────
function LectureListRow({ lecture, onPracticeOrally }) {
  const navigate = useNavigate();
  const thumb = SUBJECT_THUMB[lecture.subject] || SUBJECT_THUMB.dbms;
  return (
    <div
      className={`group bg-surface-container-lowest rounded-xl px-space-lg py-space-md shadow-sm hover:shadow-md transition-all flex items-center gap-space-md ${
        lecture.highlight ? 'ring-1 ring-secondary/20' : ''
      }`}
    >
      {/* Icon */}
      <div className={`w-12 h-12 rounded-xl shrink-0 ${thumb.bg} flex items-center justify-center`}>
        <span className={`material-symbols-outlined text-[22px] ${thumb.color}`}>{thumb.icon}</span>
      </div>

      {/* Main info */}
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-space-xs flex-wrap">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface-container-high text-primary-container">
            {lecture.subjectLabel}
          </span>
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${lecture.statusBg}`}>
            <span className={`w-1 h-1 rounded-full ${lecture.dotColor}`} />
            {lecture.statusLabel}
          </span>
        </div>
        <h2 className="text-sm font-semibold text-on-surface group-hover:text-primary-container transition-colors truncate mt-0.5">
          {lecture.title}
        </h2>
        <div className="flex items-center gap-space-sm text-outline text-[11px] mt-0.5">
          <span>{lecture.date}</span>
          <span>•</span>
          <span className="flex items-center gap-0.5">
            <span className="material-symbols-outlined text-[12px]">schedule</span>
            {lecture.duration}
          </span>
          <span>•</span>
          <span className="font-mono">{lecture.filename}</span>
        </div>
      </div>

      {/* AI label */}
      <div className="hidden sm:flex items-center gap-space-xs shrink-0">
        <span className="material-symbols-outlined text-secondary text-[14px]">{lecture.aiIcon}</span>
        <span className="text-[11px] text-secondary font-medium">{lecture.aiLabel}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-space-xs shrink-0">
        <button
          onClick={() => navigate('/notes')}
          className="hidden sm:flex items-center gap-1 px-space-md py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface text-[11px] font-medium transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[14px]">description</span>
          <span>Notes</span>
        </button>
        <button
          type="button"
          onClick={() => onPracticeOrally(lecture)}
          className="px-space-md py-1.5 rounded-lg bg-secondary-container text-on-secondary-container text-[11px] font-medium transition-colors hover:opacity-90"
        >
          Practice orally
        </button>
        <button
          type="button"
          onClick={() => navigate('/interactive')}
          className="px-space-md py-1.5 rounded-lg bg-primary-container text-on-primary text-[11px] font-medium hover:opacity-90 transition-opacity"
        >
          Review
        </button>
        <button
          aria-label="More options"
          className="w-7 h-7 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low flex items-center justify-center transition-colors"
        >
          <span className="material-symbols-outlined text-[17px]">more_vert</span>
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MyLecturesPage() {
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [activeSubject, setActiveSubject] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [oralStatus, setOralStatus] = useState('');

  useEffect(() => {
    let active = true;
    fetchUserLectures()
      .then((items) => { if (active) setLectures(items.map(normalizeLecture)); })
      .catch((error) => { if (active) setLoadError(error.message || 'Could not load your lectures.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const subjectChips = useMemo(() => {
    const counts = new Map();
    lectures.forEach((lecture) => counts.set(lecture.subject, (counts.get(lecture.subject) || 0) + 1));
    return [
      { id: 'all', label: `All Subjects (${lectures.length})` },
      ...Array.from(counts, ([id, count]) => ({ id, label: `${id} (${count})` })),
    ];
  }, [lectures]);

  const headerStats = useMemo(() => {
    const ready = lectures.filter((lecture) => lecture.status === 'ready' || lecture.analysisStatus === 'complete').length;
    const topicCount = lectures.reduce((total, lecture) => total + (lecture.topics?.length || 0), 0);
    const subjectCount = new Set(lectures.map((lecture) => lecture.subject)).size;
    return [
      { label: 'My Lectures', value: `${lectures.length}`, sub: 'Saved lectures', ...STAT_STYLES[0] },
      { label: 'Ready', value: `${ready}`, sub: 'Analysis complete', ...STAT_STYLES[1] },
      { label: 'Subjects', value: `${subjectCount}`, sub: 'With saved lectures', ...STAT_STYLES[2] },
      { label: 'AI Topics', value: `${topicCount}`, sub: 'Generated from your lectures', ...STAT_STYLES[3] },
    ];
  }, [lectures]);

  const practiceOrally = (lecture) => {
    const material = createOralPracticeMaterial(lecture);
    if (!material) {
      setOralStatus(`No lecture notes or topic summaries are available for "${lecture.title}" yet.`);
      return;
    }
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const message = {
      type: 'lectureloop:import-material',
      requestId,
      ...material,
    };

    if (window.opener) {
      window.opener.postMessage(message, ORAL_PRACTICE_ORIGIN);
      setOralStatus(`Sending "${lecture.title}" notes to Oral Practice…`);
      return;
    }

    const oralWindow = window.open(ORAL_PRACTICE_ORIGIN, '_blank');
    if (!oralWindow) {
      setOralStatus('Allow pop-ups to open the Oral Practice module.');
      return;
    }

    let timeoutId;

    const handleMessage = (event) => {
      if (event.source !== oralWindow || event.origin !== ORAL_PRACTICE_ORIGIN) return;
      if (event.data?.type === 'lectureloop:oral-practice-ready') {
        oralWindow.postMessage(message, ORAL_PRACTICE_ORIGIN);
      } else if (event.data?.type === 'lectureloop:material-imported' && event.data.requestId === requestId) {
        window.removeEventListener('message', handleMessage);
        window.clearTimeout(timeoutId);
        setOralStatus(`"${lecture.title}" notes are ready in Oral Practice. Review them and start your test.`);
      }
    };

    window.addEventListener('message', handleMessage);
    timeoutId = window.setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      setOralStatus('Could not connect to Oral Practice. Start it with npm run dev in oral-test-module and try again.');
    }, 15000);
    setOralStatus(`Opening Oral Practice with "${lecture.title}"…`);
  };

  const filtered = useMemo(() => {
    let list = lectures;

    // Subject filter
    if (activeSubject !== 'all') {
      list = list.filter((l) => l.subject === activeSubject);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.subjectLabel.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'title') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'duration') {
      list = [...list].sort((a, b) => durationSeconds(b.duration) - durationSeconds(a.duration));
    }
    // 'newest' keeps default order

    return list;
  }, [lectures, search, activeSubject, sortBy]);

  const clearAll = () => {
    setSearch('');
    setActiveSubject('all');
    setSortBy('newest');
  };

  return (
    <div className="flex flex-col w-full">
      <div className="px-gutter py-space-xl flex flex-col gap-space-xl max-w-7xl mx-auto w-full">

        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-lg">
          <div className="flex flex-col gap-space-xs max-w-2xl">
            <div className="flex items-center gap-space-xs text-outline text-[11px] tracking-wider uppercase">
              <span>Overview</span>
              <span className="material-symbols-outlined text-[13px]">chevron_right</span>
              <span className="text-primary-container font-semibold">My Lectures</span>
            </div>
            <h1 className="text-3xl font-bold text-on-surface tracking-tight">My Lectures</h1>
            <p className="text-sm text-on-surface-variant">
              Search, organize, and review your recorded classroom lectures across all subjects with synchronized transcript analysis.
            </p>
            {oralStatus && <p className="text-xs text-primary" role="status">{oralStatus}</p>}
          </div>
          <div className="flex items-center gap-space-md shrink-0">
            <button
              id="lectures-batch-upload-btn"
              className="h-10 px-space-md rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high transition-colors text-sm font-medium flex items-center gap-space-xs shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
              <span>Batch Upload</span>
            </button>
            <button
              id="lectures-add-btn"
              className="h-10 px-space-lg rounded-xl bg-primary-container text-on-primary hover:opacity-95 active:scale-[0.98] transition-all text-sm font-medium flex items-center gap-space-xs shadow-md"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Add Lecture</span>
            </button>
          </div>
        </div>

        {/* ── Analytics Strip ── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-space-md">
          {headerStats.map((s) => (
            <div key={s.label} className="p-space-lg rounded-2xl bg-surface-container-lowest shadow-sm flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-outline font-medium">{s.label}</span>
                <span className={`text-lg font-semibold mt-1 ${s.valueColor || 'text-on-surface'}`}>{s.value}</span>
                <span className={`text-xs font-medium ${s.subColor}`}>{s.sub}</span>
              </div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.iconBg}`}>
                <span className="material-symbols-outlined text-[24px]">{s.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter & Toolbar ── */}
        <div className="bg-surface-container-lowest p-space-md rounded-2xl shadow-sm flex flex-col gap-space-md">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md">
            {/* Search */}
            <div className="relative flex-1 min-w-[280px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                search
              </span>
              <input
                id="lecture-search-input"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search lectures by title, keyword, or date..."
                className="w-full h-10 pl-10 pr-10 rounded-xl bg-surface-container-low text-sm text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest shadow-inner transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                  aria-label="Clear search"
                >
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                </button>
              )}
            </div>

            {/* Sort + View toggle */}
            <div className="flex items-center gap-space-md self-end lg:self-auto">
              <div className="flex items-center gap-space-xs bg-surface-container-low px-space-md py-1.5 rounded-xl">
                <span className="material-symbols-outlined text-outline text-[18px]">sort</span>
                <span className="text-[11px] text-on-surface-variant font-medium">Sort:</span>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-sm text-on-surface focus:outline-none cursor-pointer"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* View toggle */}
              <div className="flex items-center bg-surface-container-low p-1 rounded-xl gap-0.5">
                <button
                  id="view-grid-btn"
                  aria-label="Grid View"
                  onClick={() => setViewMode('grid')}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    viewMode === 'grid'
                      ? 'bg-surface-container-lowest text-primary-container shadow-sm'
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">grid_view</span>
                </button>
                <button
                  id="view-list-btn"
                  aria-label="List View"
                  onClick={() => setViewMode('list')}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    viewMode === 'list'
                      ? 'bg-surface-container-lowest text-primary-container shadow-sm'
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">view_list</span>
                </button>
              </div>
            </div>
          </div>

          {/* Subject filter chips */}
          <div className="flex items-center gap-space-xs overflow-x-auto pb-1" role="group" aria-label="Filter by subject">
            {subjectChips.map((chip) => (
              <button
                key={chip.id}
                id={`chip-${chip.id}`}
                onClick={() => setActiveSubject(chip.id)}
                className={`shrink-0 px-space-md py-1 rounded-full text-sm font-medium transition-colors ${
                  activeSubject === chip.id
                    ? 'bg-primary-container text-on-primary shadow-sm'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Lecture Grid / List ── */}
        {loading ? (
          <div className="rounded-2xl bg-surface-container-lowest p-10 text-center text-sm text-on-surface-variant">Loading your lectures…</div>
        ) : loadError ? (
          <div role="alert" className="rounded-2xl bg-surface-container-lowest p-10 text-center text-sm text-error">{loadError}</div>
        ) : filtered.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
              {filtered.map((l) => (
                <LectureGridCard key={l.id} lecture={l} onPracticeOrally={practiceOrally} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-space-sm">
              {filtered.map((l) => (
                <LectureListRow key={l.id} lecture={l} onPracticeOrally={practiceOrally} />
              ))}
            </div>
          )
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center p-space-xl text-center bg-surface-container-lowest rounded-2xl shadow-sm py-16">
            <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center text-outline mb-space-md">
              <span className="material-symbols-outlined text-[32px]">manage_search</span>
            </div>
            <h3 className="text-lg font-semibold text-on-surface">No lectures found</h3>
            <p className="text-sm text-on-surface-variant max-w-md mt-1 mb-space-lg">
              We couldn't find any lectures matching your current search or active subject filter.
            </p>
            <button
              id="clear-filters-btn"
              onClick={clearAll}
              className="px-space-lg py-2 rounded-xl bg-primary-container text-on-primary text-sm font-medium hover:opacity-90 transition-opacity shadow-sm flex items-center gap-space-xs"
            >
              <span className="material-symbols-outlined text-[18px]">restart_alt</span>
              <span>Clear all filters</span>
            </button>
          </div>
        )}

        {/* ── Footer Stats ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-space-md p-space-lg bg-surface-container-lowest rounded-2xl shadow-sm">
          <div className="flex items-center gap-space-sm text-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-outline text-[18px]">verified</span>
            <span>
              Showing{' '}
              <span className="font-medium text-on-surface">{filtered.length}</span> of{' '}
              <span className="font-medium text-on-surface">{lectures.length}</span> lectures
            </span>
          </div>
          <div className="flex items-center gap-space-xs">
            <button className="px-space-md py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-on-surface text-xs font-medium transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">tune</span>
              <span>Storage & Backup</span>
            </button>
            <button className="px-space-md py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-on-surface text-xs font-medium transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">download</span>
              <span>Export All Transcripts</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
