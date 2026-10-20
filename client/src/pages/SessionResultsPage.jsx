import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchLecture } from '../services/api.js';

// ─── Mastery gauge (SVG circle) ───────────────────────────────────────────────
function MasteryGauge({ percent, tier, exam }) {
  const dash = percent; // stroke-dasharray out of 100
  return (
    <div className="flex items-center gap-space-md bg-surface-container-low p-space-md rounded-2xl self-start lg:self-center">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-surface-container-highest"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none" stroke="currentColor" strokeWidth="3.5"
          />
          <path
            className="text-primary-container stroke-current"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            strokeDasharray={`${dash}, 100`}
            strokeLinecap="round"
            strokeWidth="3.5"
          />
        </svg>
        <span className="absolute text-lg font-bold text-on-surface">{percent}%</span>
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">Overall Retention</span>
        <span className="text-sm text-on-surface font-semibold">{tier}</span>
        <span className="text-[11px] font-mono text-tertiary font-medium">{exam}</span>
      </div>
    </div>
  );
}

// ─── Checkpoint row ───────────────────────────────────────────────────────────
function CheckpointRow({ cp, onReplay }) {
  if (cp.status === 'flagged') {
    return (
      <div className="relative bg-surface-container-lowest p-space-lg rounded-2xl shadow-md border-l-4 border-l-error">
        <div className="flex items-start justify-between gap-space-md">
          <div className="flex items-start gap-space-md">
            <div className="w-10 h-10 rounded-xl bg-error-container text-on-error-container flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[22px]">warning</span>
            </div>
            <div>
              <div className="flex items-center gap-space-xs">
                <span className="text-[11px] font-mono text-error font-medium">{cp.idx} • NEEDS ATTENTION</span>
                <span className="inline-flex px-2 py-0.5 rounded-full bg-error-container/60 text-on-error-container text-[10px] font-semibold">Flagged for Review</span>
              </div>
              <h3 className="text-sm font-semibold text-on-surface mt-1">{cp.title}</h3>
              <div className="flex items-center gap-space-sm mt-1 text-on-surface-variant text-xs">
                <span>Timestamp: <strong className="font-mono text-on-surface">{cp.time}</strong></span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-space-md p-space-md bg-surface-container-low rounded-xl">
          <div className="flex items-center gap-space-xs text-primary text-[11px] font-semibold mb-1">
            <span className="material-symbols-outlined text-[15px]">psychology</span>
            Review Summary
          </div>
          <p className="text-xs text-on-surface leading-relaxed">{cp.summary || 'Revisit this topic segment to solidify understanding.'}</p>
          <div className="mt-space-md flex flex-wrap items-center gap-space-sm">
            <button
              onClick={() => onReplay?.(cp.index)}
              className="inline-flex items-center gap-1.5 px-space-md py-1.5 rounded-lg bg-primary-container text-on-primary text-[11px] font-medium hover:opacity-95 transition-all shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">play_circle</span>
              <span>Replay Topic Segment</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-surface-container-lowest p-space-md rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-space-md">
      <div className="flex items-center gap-space-md min-w-0">
        <div className="w-9 h-9 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-space-xs">
            <span className="text-[11px] font-mono text-outline">{cp.idx}</span>
            <span className="text-sm font-medium text-on-surface truncate">{cp.title}</span>
          </div>
          <div className="flex items-center gap-space-sm mt-0.5 text-on-surface-variant text-xs">
            <span>Completed</span>
            <span className="text-outline">•</span>
            <span className="font-mono text-outline">{cp.time}</span>
          </div>
        </div>
      </div>
      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 bg-tertiary-fixed/50 text-on-tertiary-fixed-variant">
        Mastered
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SessionResultsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lectureId = searchParams.get('lectureId');

  const [lecture, setLecture] = useState(null);
  const [loading, setLoading] = useState(Boolean(lectureId));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!lectureId) return;
    const loadData = async () => {
      try {
        const data = await fetchLecture(lectureId);
        setLecture(data);
      } catch (err) {
        setError(err.message || 'Failed to load lecture results.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [lectureId]);

  // Derive dynamic metrics from real lecture data
  const topics = lecture?.topics || [];
  const completedCount = topics.filter((t) => t.completed).length;
  const totalTopics = topics.length || 1;
  const retentionPercent = topics.length > 0 ? Math.round((completedCount / totalTopics) * 100) : 100;
  
  let retentionTier = 'Proficient';
  if (retentionPercent >= 90) retentionTier = 'Mastery Cleared';
  else if (retentionPercent < 60) retentionTier = 'Review Recommended';

  const exportNotesAsMarkdown = () => {
    if (!lecture) return;
    const lines = [
      `# ${lecture.title || 'Lecture Summary'}`,
      `**Subject:** ${lecture.subject || 'General'}`,
      `**Completion:** ${completedCount} / ${totalTopics} Chapters (${retentionPercent}%)`,
      '',
      '## Chapter Breakdown',
      ...topics.map((t, i) => [
        `### Chapter ${i + 1}: ${t.title} (${t.startTime || '00:00'} - ${t.endTime || '00:00'})`,
        t.summary ? `${t.summary}\n` : '',
        t.keyTerms?.length ? `*Key Terms:* ${t.keyTerms.join(', ')}\n` : '',
      ].join('\n')),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(lecture.title || 'lecture_notes').replace(/[^a-zA-Z0-9]/g, '_')}_notes.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleReplayTopic = () => {
    if (lectureId) {
      navigate(`/interactive/session?lectureId=${lectureId}`);
    } else {
      navigate('/interactive');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-space-sm text-on-surface-variant">
        <span className="material-symbols-outlined animate-spin text-[28px]">progress_activity</span>
        <span>Loading session results...</span>
      </div>
    );
  }

  const lectureTitle = lecture?.title || 'Interactive Learning Session';
  const lectureSubject = lecture?.subject || 'General';

  return (
    <div className="flex flex-col w-full">
      <div className="relative w-full overflow-hidden px-gutter py-space-xl">
        {/* Ambient glows */}
        <div className="absolute -top-24 right-1/4 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -left-20 w-80 h-80 bg-tertiary-fixed/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto flex flex-col gap-space-xl">

          {/* ── Header ── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center gap-space-xs text-[11px] text-on-surface-variant">
                {['Workspace', lectureSubject, 'Interactive Learning', 'Session Results'].map((crumb, i, arr) => (
                  <React.Fragment key={crumb}>
                    <span className={i === arr.length - 1 ? 'text-primary-container font-semibold' : 'hover:text-primary cursor-pointer transition-colors'}>
                      {crumb}
                    </span>
                    {i < arr.length - 1 && <span className="material-symbols-outlined text-[13px] text-outline">chevron_right</span>}
                  </React.Fragment>
                ))}
              </div>
              <div className="flex items-center gap-space-sm mt-0.5">
                <h1 className="text-3xl font-bold text-on-surface tracking-tight">Session Mastery & Results</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-tertiary-container/15 text-tertiary text-[11px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                  Synced
                </span>
              </div>
            </div>
            <div className="flex items-center gap-space-sm flex-wrap">
              <button
                onClick={exportNotesAsMarkdown}
                id="export-summary-btn"
                className="inline-flex items-center gap-space-xs px-space-md py-2 rounded-xl bg-surface-container-lowest shadow-sm text-on-surface text-sm font-medium hover:bg-surface-container-low transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-outline">download</span>
                <span>Export Notes (.md)</span>
              </button>
              <button
                onClick={handleReplayTopic}
                className="inline-flex items-center gap-space-xs px-space-md py-2 rounded-xl bg-surface-container-high text-primary text-sm font-medium hover:bg-surface-container-highest transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">replay</span>
                <span>Re-play Session</span>
              </button>
              <Link
                to="/"
                id="results-dashboard-btn"
                className="inline-flex items-center gap-space-xs px-space-md py-2 rounded-xl bg-primary-container text-on-primary text-sm font-medium shadow-sm hover:opacity-95 active:translate-y-px transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">dashboard</span>
                <span>Dashboard</span>
              </Link>
            </div>
          </div>

          {error && (
            <div role="alert" className="p-space-md rounded-xl bg-error-container/40 text-error text-sm">
              {error}
            </div>
          )}

          {/* ── Hero celebration banner ── */}
          <div className="relative bg-surface-container-lowest rounded-2xl shadow-sm p-space-lg overflow-hidden">
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-gradient-to-bl from-tertiary-fixed/30 to-primary-fixed/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg mb-space-xl pb-space-lg border-b border-surface-container">
              <div className="flex items-start gap-space-md max-w-2xl">
                <div className="w-14 h-14 rounded-2xl bg-tertiary-container/15 text-tertiary flex items-center justify-center shrink-0 shadow-inner">
                  <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-space-xs">
                    <span className="text-[11px] font-mono text-primary font-medium uppercase tracking-wider">{lectureSubject}</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-on-surface tracking-tight">{lectureTitle}</h2>
                  <p className="text-sm text-on-surface-variant">
                    You completed <strong className="text-on-surface font-semibold">{completedCount} of {totalTopics} topic checkpoints</strong>.
                  </p>
                </div>
              </div>
              <MasteryGauge
                percent={retentionPercent}
                tier={retentionTier}
                exam={`${retentionPercent}% Checkpoints`}
              />
            </div>

            {/* KPI metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
              <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col justify-between">
                <div className="flex items-center justify-between text-on-surface-variant mb-space-xs">
                  <span className="text-[11px] font-medium">Topic Completion</span>
                  <span className="material-symbols-outlined text-[18px] text-primary-container">rule</span>
                </div>
                <div className="text-2xl font-semibold text-on-surface">{completedCount} / {totalTopics}</div>
                <span className="text-[11px] text-on-surface-variant mt-1">{retentionPercent}% of chapter goals met</span>
              </div>

              <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col justify-between">
                <div className="flex items-center justify-between text-on-surface-variant mb-space-xs">
                  <span className="text-[11px] font-medium">Lecture Chapters</span>
                  <span className="material-symbols-outlined text-[18px] text-secondary">view_timeline</span>
                </div>
                <div className="text-2xl font-semibold text-on-surface">{totalTopics}</div>
                <span className="text-[11px] text-on-surface-variant mt-1">AI-segmented topic chapters</span>
              </div>

              <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col justify-between">
                <div className="flex items-center justify-between text-on-surface-variant mb-space-xs">
                  <span className="text-[11px] font-medium">Mastery Tier</span>
                  <span className="material-symbols-outlined text-[18px] text-tertiary">workspace_premium</span>
                </div>
                <div className="text-2xl font-semibold text-on-surface">{retentionTier}</div>
                <span className="text-[11px] text-on-surface-variant mt-1">Based on retrieval performance</span>
              </div>

              <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col justify-between">
                <div className="flex items-center justify-between text-on-surface-variant mb-space-xs">
                  <span className="text-[11px] font-medium">Study Mode</span>
                  <span className="material-symbols-outlined text-[18px] text-primary">play_lesson</span>
                </div>
                <div className="text-2xl font-semibold text-on-surface">Interactive</div>
                <span className="text-[11px] text-on-surface-variant mt-1">Video checkpoints enabled</span>
              </div>
            </div>
          </div>

          {/* ── 2-column breakdown ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">

            {/* LEFT: Checkpoint breakdown */}
            <div className="lg:col-span-7 flex flex-col gap-space-md">
              <div className="flex items-center justify-between pb-space-xs">
                <div>
                  <h2 className="text-xl font-semibold text-on-surface">Checkpoint Breakdown</h2>
                  <p className="text-xs text-on-surface-variant">Step-by-step topic performance and chapter notes</p>
                </div>
                <span className="text-[11px] font-mono text-outline px-2.5 py-1 bg-surface-container rounded-lg">
                  {topics.length} Checkpoints
                </span>
              </div>

              {topics.map((t, idx) => (
                <CheckpointRow
                  key={t.index || idx}
                  cp={{
                    idx: String(idx + 1).padStart(2, '0'),
                    index: t.index,
                    title: t.title,
                    time: `${t.startTime || '00:00'} - ${t.endTime || '00:00'}`,
                    status: t.completed ? 'mastered' : 'flagged',
                    summary: t.summary,
                  }}
                  onReplay={handleReplayTopic}
                />
              ))}
            </div>

            {/* RIGHT: Knowledge bridges */}
            <div className="lg:col-span-5 flex flex-col gap-space-md">
              <div className="flex items-center justify-between pb-space-xs">
                <div>
                  <h2 className="text-xl font-semibold text-on-surface">Knowledge Bridges</h2>
                  <p className="text-xs text-on-surface-variant">Connected workspace integrations</p>
                </div>
                <span className="material-symbols-outlined text-outline text-[20px]">hub</span>
              </div>

              {/* Card A: Mind-map */}
              <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-space-sm">
                    <span className="inline-flex items-center gap-1 text-primary-container text-[11px] font-medium">
                      <span className="material-symbols-outlined text-[15px]">account_tree</span>
                      Knowledge Artifact
                    </span>
                    <span className="text-[11px] text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full">8 Concept Nodes</span>
                  </div>
                  <h3 className="text-sm font-semibold text-on-surface mb-1">Generated Mind-Map Notes Ready</h3>
                  <p className="text-xs text-on-surface-variant mb-space-md">
                    A hierarchical relational model graph was synthesized automatically from your lecture stream and quiz inputs.
                  </p>
                  <div className="relative bg-surface-container-low rounded-xl p-space-md mb-space-md overflow-hidden flex flex-col items-center justify-center">
                    <MindMapPreview />
                    <span className="absolute bottom-1 right-2 text-[9px] text-outline font-mono">Auto-assembled in 1.4s</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate(lectureId ? `/notes?lectureId=${lectureId}` : '/notes')}
                  className="w-full inline-flex items-center justify-center gap-space-xs px-space-md py-2.5 rounded-xl bg-surface-container text-primary text-sm font-medium hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  <span>Open in Notes & Mind-Maps Studio</span>
                  <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                </button>
              </div>

              {/* Card B: Spaced revision */}
              <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-space-sm">
                    <span className="inline-flex items-center gap-1 text-secondary text-[11px] font-medium">
                      <span className="material-symbols-outlined text-[15px]">update</span>
                      Retention Schedule
                    </span>
                    <span className="text-[11px] font-mono text-outline">Tier 1 • 24h</span>
                  </div>
                  <h3 className="text-sm font-semibold text-on-surface mb-1">Spaced Revision Queued</h3>
                  <p className="text-xs text-on-surface-variant mb-space-md">
                    <strong className="text-on-surface">Foreign Key Referential Integrity</strong> has been auto-enqueued for an adaptive flash recall check tomorrow at 18:00.
                  </p>
                  <div className="flex items-center gap-space-md p-space-sm bg-surface-container-low rounded-xl mb-space-md">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary-container shrink-0">
                      <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-on-surface truncate">Tomorrow, 6:00 PM</div>
                      <div className="text-[11px] text-on-surface-variant truncate">4 micro-cards • 3 min active recall</div>
                    </div>
                  </div>
                </div>
                <button className="w-full inline-flex items-center justify-center gap-space-xs px-space-md py-2.5 rounded-xl bg-surface-container text-on-surface text-sm font-medium hover:bg-surface-container-high transition-colors">
                  <span>View in Revision Queue</span>
                  <span className="material-symbols-outlined text-[15px]">schedule</span>
                </button>
              </div>

              {/* Card C: Oral drill */}
              <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-space-sm">
                    <span className="inline-flex items-center gap-1 text-primary-container text-[11px] font-medium">
                      <span className="material-symbols-outlined text-[15px]">mic</span>
                      Verbal Solidification
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-semibold">Optional</span>
                  </div>
                  <h3 className="text-sm font-semibold text-on-surface mb-1">Oral Explanation Drill</h3>
                  <p className="text-xs text-on-surface-variant mb-space-md">
                    Feynman Technique: Record a 60-second voice explanation of{' '}
                    <em className="italic text-on-surface">"Primary vs. Foreign Keys"</em> to solidify intuitive recall.
                  </p>
                </div>
                <button
                  id="start-voice-drill-btn"
                  className="w-full inline-flex items-center justify-center gap-space-xs px-space-md py-2.5 rounded-xl bg-primary-container text-on-primary text-sm font-medium shadow-sm hover:opacity-95 active:translate-y-px transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">mic_none</span>
                  <span>Start 60s Voice Drill</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="pt-space-lg border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-space-md">
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs px-space-lg py-3 rounded-xl bg-surface-container-lowest text-on-surface shadow-sm text-sm font-medium hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-outline">arrow_back</span>
              <span>Back to Student Dashboard</span>
            </Link>
            <div className="flex items-center gap-space-sm w-full sm:w-auto justify-end">
              <button
                id="continue-next-lecture-btn"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs px-space-lg py-3 rounded-xl bg-primary-container text-on-primary shadow-sm text-sm font-medium hover:opacity-95 active:translate-y-px transition-all"
              >
                <span>Continue to Next Lecture: Operating Systems</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
