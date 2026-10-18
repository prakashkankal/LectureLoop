import React, { useState, useMemo } from 'react';

// ─── Mock Data ────────────────────────────────────────────────────────────────
const LECTURES = [
  {
    id: '1',
    subject: 'dbms',
    subjectLabel: 'DBMS',
    title: 'Database Management Systems — Normalization & 3NF',
    date: 'Oct 24, 2024',
    duration: '48m 15s',
    filename: 'lecture_dbms_lec14.mp3',
    filesize: '32 MB',
    description: "Coverage of functional dependencies, Armstrong's axioms, Boyce-Codd Normal Form, and lossy vs lossless decompositions.",
    aiLabel: '9 AI Key Concepts',
    aiIcon: 'bolt',
    status: 'ready',
    statusLabel: 'Archived & Ready',
    statusBg: 'bg-tertiary-fixed text-on-tertiary-fixed',
    dotColor: 'bg-tertiary',
  },
  {
    id: '2',
    subject: 'os',
    subjectLabel: 'Operating Systems',
    title: 'Operating Systems — Process Scheduling & Semaphores',
    date: 'Oct 22, 2024',
    duration: '56m 20s',
    filename: 'os_class_oct22.m4a',
    filesize: '41 MB',
    description: 'Multi-level feedback queues, synchronization barriers, dining philosophers puzzle, and race condition mitigations.',
    aiLabel: '14 AI Flashcards',
    aiIcon: 'bolt',
    status: 'ready',
    statusLabel: 'Ready',
    statusBg: 'bg-tertiary-fixed text-on-tertiary-fixed',
    dotColor: 'bg-tertiary',
  },
  {
    id: '3',
    subject: 'cn',
    subjectLabel: 'Computer Networks',
    title: 'Computer Networks — TCP/IP 3-Way Handshake',
    date: 'Oct 19, 2024',
    duration: '42m 00s',
    filename: 'cn_tcp_handshake.mp3',
    filesize: '29 MB',
    description: 'SYN, SYN-ACK, ACK sequence numbers, sliding window flow control, and TCP congestion window algorithm breakdown.',
    aiLabel: 'Loop Due (Spaced Rep.)',
    aiIcon: 'event_repeat',
    status: 'revision-due',
    statusLabel: 'Revision Due',
    statusBg: 'bg-secondary-fixed text-on-secondary-fixed',
    dotColor: 'bg-secondary',
    highlight: true,
  },
  {
    id: '4',
    subject: 'dsa',
    subjectLabel: 'Data Structures',
    title: 'Data Structures — Balanced AVL Trees & Rotations',
    date: 'Oct 16, 2024',
    duration: '61m 10s',
    filename: 'dsa_avl_lecture.mp3',
    filesize: '45 MB',
    description: 'Balance factors (-1, 0, 1), single left/right rotations, double LR/RL rotations with step-by-step recursion trace.',
    aiLabel: '8 AI Drill Quizzes',
    aiIcon: 'bolt',
    status: 'ready',
    statusLabel: 'Ready',
    statusBg: 'bg-tertiary-fixed text-on-tertiary-fixed',
    dotColor: 'bg-tertiary',
  },
  {
    id: '5',
    subject: 'dbms',
    subjectLabel: 'DBMS',
    title: 'DBMS — SQL Joins and Query Optimization',
    date: 'Oct 14, 2024',
    duration: '50m 30s',
    filename: 'dbms_joins_opt.wav',
    filesize: '38 MB',
    description: 'Nested loop, hash join, merge join costs, index lookup benchmarks, and query execution tree plan transformations.',
    aiLabel: '11 AI Concepts',
    aiIcon: 'bolt',
    status: 'ready',
    statusLabel: 'Ready',
    statusBg: 'bg-tertiary-fixed text-on-tertiary-fixed',
    dotColor: 'bg-tertiary',
  },
  {
    id: '6',
    subject: 'os',
    subjectLabel: 'Operating Systems',
    title: "Operating Systems — Deadlock Detection & Banker's Algorithm",
    date: 'Oct 10, 2024',
    duration: '45m 00s',
    filename: 'os_deadlock_oct10.mp3',
    filesize: '34 MB',
    description: 'Mutual exclusion, hold and wait conditions, circular wait graphs, safe sequence computation, and safe state matrix.',
    aiLabel: '6 Interactive Loops',
    aiIcon: 'bolt',
    status: 'ready',
    statusLabel: 'Ready',
    statusBg: 'bg-tertiary-fixed text-on-tertiary-fixed',
    dotColor: 'bg-tertiary',
  },
];

const SUBJECT_CHIPS = [
  { id: 'all', label: 'All Subjects (12)' },
  { id: 'dbms', label: 'DBMS (4)' },
  { id: 'os', label: 'Operating Systems (3)' },
  { id: 'cn', label: 'Computer Networks (3)' },
  { id: 'dsa', label: 'Data Structures (2)' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Date: Newest First' },
  { value: 'duration', label: 'Duration (Longest)' },
  { value: 'title', label: 'Title A–Z' },
];

const HEADER_STATS = [
  { label: 'Total Preserved', value: '12 Sessions', sub: '5.2 hrs total audio', subColor: 'text-secondary', icon: 'graphic_eq', iconBg: 'bg-secondary-container/30 text-secondary' },
  { label: 'Active Loops', value: '4 Enrolled', sub: '94% Retention score', subColor: 'text-tertiary', icon: 'all_inclusive', iconBg: 'bg-tertiary-fixed/30 text-tertiary' },
  { label: 'Revisions Pending', value: '2 Overdue', sub: 'Next: TCP 3-Way', subColor: 'text-on-surface-variant', valueColor: 'text-error', icon: 'priority_high', iconBg: 'bg-error-container/40 text-error' },
  { label: 'AI Transcripts', value: '100% Vectorized', sub: '3,420 key terms', subColor: 'text-primary', icon: 'auto_awesome', iconBg: 'bg-primary-fixed text-primary' },
];

// Subject thumbnail icon map
const SUBJECT_THUMB = {
  dbms: { icon: 'database', color: 'text-primary', bg: 'bg-primary-fixed/20' },
  os: { icon: 'memory', color: 'text-secondary', bg: 'bg-secondary-fixed/20' },
  cn: { icon: 'hub', color: 'text-tertiary', bg: 'bg-tertiary-fixed/20' },
  dsa: { icon: 'account_tree', color: 'text-primary-container', bg: 'bg-primary-container/10' },
};

const ORAL_PRACTICE_ORIGIN = 'http://127.0.0.1:5179';

function createOralPracticeMaterial(lecture) {
  const keyTerms = lecture.description.split(/,| and /i).map((term) => term.trim()).filter(Boolean);
  return {
    schemaVersion: 1,
    material: {
      subject: lecture.subjectLabel,
      lecture: lecture.title,
      topic: lecture.title,
      notes: [
        `${lecture.title} covers the concepts listed in its lecture description.`,
        ...keyTerms.map((term) => `${term} is one of the concepts covered in ${lecture.title}.`),
      ].join(' '),
      keyTerms,
    },
  };
}

// ─── Grid Card ────────────────────────────────────────────────────────────────
function LectureGridCard({ lecture, onPracticeOrally }) {
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
          <span className="text-[11px] font-mono text-outline shrink-0 ml-2">{lecture.filesize}</span>
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
          <button className="px-space-md py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface text-[11px] font-medium transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">description</span>
            <span>Open Notes</span>
          </button>
          <button
            onClick={() => onPracticeOrally(lecture)}
            className="px-space-md py-1.5 rounded-lg bg-secondary-container text-on-secondary-container text-[11px] font-medium transition-colors hover:opacity-90"
          >
            Practice orally
          </button>
          <button
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
        <button className="hidden sm:flex items-center gap-1 px-space-md py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface text-[11px] font-medium transition-colors">
          <span className="material-symbols-outlined text-[14px]">description</span>
          <span>Notes</span>
        </button>
        <button
          onClick={() => onPracticeOrally(lecture)}
          className="px-space-md py-1.5 rounded-lg bg-secondary-container text-on-secondary-container text-[11px] font-medium transition-colors hover:opacity-90"
        >
          Practice orally
        </button>
        <button className="px-space-md py-1.5 rounded-lg bg-primary-container text-on-primary text-[11px] font-medium hover:opacity-90 transition-opacity">
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
  const [search, setSearch] = useState('');
  const [activeSubject, setActiveSubject] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [oralStatus, setOralStatus] = useState('');

  const practiceOrally = (lecture) => {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const message = {
      type: 'lectureloop:import-material',
      requestId,
      ...createOralPracticeMaterial(lecture),
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
    let list = LECTURES;

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
      list = [...list].sort((a, b) => {
        const parse = (s) => {
          const [m, sec] = s.split('m ');
          return parseInt(m) * 60 + parseInt(sec || '0');
        };
        return parse(b.duration) - parse(a.duration);
      });
    }
    // 'newest' keeps default order

    return list;
  }, [search, activeSubject, sortBy]);

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
          {HEADER_STATS.map((s) => (
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
            {SUBJECT_CHIPS.map((chip) => (
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
        {filtered.length > 0 ? (
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
              <span className="font-medium text-on-surface">{LECTURES.length}</span> lectures
            </span>
            <span className="text-outline">•</span>
            <span className="font-medium text-on-surface">5.2 hours of classroom audio preserved</span>
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
