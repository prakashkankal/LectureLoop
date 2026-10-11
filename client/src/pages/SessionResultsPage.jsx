import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

// ─── Mock Results Data ────────────────────────────────────────────────────────
const RESULTS = {
  lectureCode: 'Lecture 04 • Relational Schema Architecture',
  lectureTitle: 'Database Management Systems',
  summary: '4 out of 5 topic checkpoints',
  retentionPercent: 80,
  retentionLabel: 'Proficient Tier II',
  examEstimate: '89% on Exam',
  kpis: [
    { label: 'First-Pass Accuracy', value: '80%', delta: '+12%', deltaColor: 'text-tertiary', icon: 'query_stats', iconColor: 'text-primary-container', sub: 'Post targeted segment replay' },
    { label: 'Active Engagement', value: '32', unit: 'm', valueNote: 'vs 48m passive', icon: 'timer', iconColor: 'text-secondary', sub: '33% time saved via active loops' },
    { label: 'Topic Checkpoints', value: '4 / 5', badge: '80% Cleared', badgeColor: 'text-tertiary-container', icon: 'verified', iconColor: 'text-tertiary', sub: '1 review milestone remaining' },
    { label: 'Remediations Resolved', value: '2', unit: 'Replays', icon: 'auto_fix_high', iconColor: 'text-secondary', sub: 'AI-assisted precision clips' },
  ],
  checkpoints: [
    { idx: '01', title: 'Intro to DBMS Architecture', status: 'mastered', attempt: '1st Attempt', score: '100% Score', scoreColor: 'text-tertiary' },
    { idx: '02', title: 'Relational Algebra & Schema Models', status: 'mastered', attempt: '1st Attempt', score: '100% Score', scoreColor: 'text-tertiary' },
    { idx: '03', title: 'Primary Keys & Uniqueness Guarantees', status: 'recovered', attempt: '2 Attempts', score: '100% Post-Replay', scoreColor: 'text-secondary', clip: '12:45 clip' },
    {
      idx: '04',
      title: 'Foreign Keys & Referential Integrity',
      status: 'flagged',
      attempt: '3 Attempts logged',
      score: '50%',
      scoreColor: 'text-error',
      confidence: 'Low',
      diagnosis: "Persistent confusion detected on semantic differences between ON DELETE CASCADE versus RESTRICT constraints under cascading updates.",
    },
    { idx: '05', title: 'Normalization Forms (1NF, 2NF, 3NF & BCNF)', status: 'mastered', attempt: '1st Attempt', score: '100% Score', scoreColor: 'text-tertiary' },
  ],
};

// ─── Mastery gauge (SVG circle) ───────────────────────────────────────────────
function MasteryGauge({ percent, label, tier, exam }) {
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
        <span className="text-[11px] font-mono text-tertiary font-medium">Estimated {exam}</span>
      </div>
    </div>
  );
}

// ─── Mind-map SVG visualization ───────────────────────────────────────────────
function MindMapPreview() {
  return (
    <svg className="w-full h-32 text-on-surface" fill="none" viewBox="0 0 300 120">
      {/* Branches */}
      <path d="M150 20 L70 65" stroke="currentColor" strokeDasharray="3 3" strokeOpacity="0.15" strokeWidth="2" />
      <path d="M150 20 L150 65" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
      <path d="M150 20 L230 65" stroke="currentColor" strokeDasharray="3 3" strokeOpacity="0.15" strokeWidth="2" />
      <path d="M70 65 L40 100" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2" />
      <path d="M70 65 L95 100" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2" />
      <path d="M230 65 L210 100" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2" />
      <path d="M230 65 L260 100" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2" />
      {/* Root */}
      <rect fill="#4f46e5" height="24" rx="12" width="80" x="110" y="8" />
      <text fill="#ffffff" fontFamily="Inter" fontSize="9" fontWeight="600" textAnchor="middle" x="150" y="24">RDBMS Kernel</text>
      {/* L1 nodes */}
      <rect fill="#dae2fd" height="20" rx="10" width="70" x="35" y="55" />
      <text fill="#131b2e" fontFamily="Inter" fontSize="8" textAnchor="middle" x="70" y="68">Schema</text>
      <rect fill="#ffdad6" height="20" rx="10" width="70" x="115" y="55" />
      <text fill="#93000a" fontFamily="Inter" fontSize="8" fontWeight="600" textAnchor="middle" x="150" y="68">Foreign Keys (!)</text>
      <rect fill="#dae2fd" height="20" rx="10" width="70" x="195" y="55" />
      <text fill="#131b2e" fontFamily="Inter" fontSize="8" textAnchor="middle" x="230" y="68">Normalization</text>
      {/* L2 dots */}
      <circle cx="40" cy="100" fill="#7ffc97" r="6" />
      <circle cx="95" cy="100" fill="#7ffc97" r="6" />
      <circle cx="210" cy="100" fill="#7ffc97" r="6" />
      <circle cx="260" cy="100" fill="#7ffc97" r="6" />
    </svg>
  );
}

// ─── Checkpoint row ───────────────────────────────────────────────────────────
function CheckpointRow({ cp }) {
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
                <span className="text-[11px] font-mono text-error font-medium">{cp.idx} • CRITICAL GAP</span>
                <span className="inline-flex px-2 py-0.5 rounded-full bg-error-container/60 text-on-error-container text-[10px] font-semibold">Flagged for Review</span>
              </div>
              <h3 className="text-sm font-semibold text-on-surface mt-1">{cp.title}</h3>
              <div className="flex items-center gap-space-sm mt-1 text-on-surface-variant text-xs">
                <span>Score: <strong className="text-error font-semibold">{cp.score}</strong></span>
                <span className="text-outline">•</span>
                <span>{cp.attempt}</span>
                <span className="text-outline">•</span>
                <span>Confidence: {cp.confidence}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-space-md p-space-md bg-surface-container-low rounded-xl">
          <div className="flex items-center gap-space-xs text-primary text-[11px] font-semibold mb-1">
            <span className="material-symbols-outlined text-[15px]">psychology</span>
            AI Remediation Diagnostics
          </div>
          <p className="text-xs text-on-surface leading-relaxed">{cp.diagnosis}</p>
          <div className="mt-space-md flex flex-wrap items-center gap-space-sm">
            <button className="inline-flex items-center gap-1.5 px-space-md py-1.5 rounded-lg bg-primary-container text-on-primary text-[11px] font-medium hover:opacity-95 transition-all shadow-sm">
              <span className="material-symbols-outlined text-[15px]">play_circle</span>
              <span>Replay Clip (18:20)</span>
            </button>
            <button className="inline-flex items-center gap-1.5 px-space-md py-1.5 rounded-lg bg-surface-container-lowest text-on-surface text-[11px] font-medium hover:bg-surface-container transition-all">
              <span className="material-symbols-outlined text-[15px] text-outline">description</span>
              <span>Synced Note</span>
            </button>
            <button className="inline-flex items-center gap-1.5 px-space-md py-1.5 rounded-lg bg-surface-container-lowest text-on-surface text-[11px] font-medium hover:bg-surface-container transition-all">
              <span className="material-symbols-outlined text-[15px] text-outline">bolt</span>
              <span>Quick 2m Drill</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const iconMap = { mastered: { bg: 'bg-tertiary-fixed text-on-tertiary-fixed', icon: 'done' }, recovered: { bg: 'bg-secondary-fixed text-on-secondary-fixed', icon: 'cached' } };
  const { bg, icon } = iconMap[cp.status] || iconMap.mastered;
  const badgeMap = { mastered: 'bg-tertiary-fixed/50 text-on-tertiary-fixed-variant', recovered: 'bg-secondary-fixed/50 text-on-secondary-fixed-variant' };

  return (
    <div className="group bg-surface-container-lowest p-space-md rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-space-md">
      <div className="flex items-center gap-space-md min-w-0">
        <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-space-xs">
            <span className="text-[11px] font-mono text-outline">{cp.idx}</span>
            <span className="text-sm font-medium text-on-surface truncate">{cp.title}</span>
          </div>
          <div className="flex items-center gap-space-sm mt-0.5 text-on-surface-variant text-xs">
            <span>{cp.attempt}</span>
            <span className="text-outline">•</span>
            <span className={`font-mono font-medium ${cp.scoreColor}`}>{cp.score}</span>
            {cp.clip && (
              <>
                <span className="text-outline">•</span>
                <span className="flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[13px]">videocam</span>
                  {cp.clip}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 capitalize ${badgeMap[cp.status] || 'bg-surface-container text-on-surface-variant'}`}>
        {cp.status}
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SessionResultsPage() {
  const navigate = useNavigate();

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
                {['Workspace', 'Computer Science', 'Interactive Learning', 'Session Results'].map((crumb, i, arr) => (
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
              <button className="inline-flex items-center gap-space-xs px-space-md py-2 rounded-xl bg-surface-container-lowest shadow-sm text-on-surface text-sm font-medium hover:bg-surface-container-low transition-all">
                <span className="material-symbols-outlined text-[18px] text-outline">picture_as_pdf</span>
                <span>Export Summary</span>
              </button>
              <button className="inline-flex items-center gap-space-xs px-space-md py-2 rounded-xl bg-surface-container-high text-primary text-sm font-medium hover:bg-surface-container-highest transition-all">
                <span className="material-symbols-outlined text-[18px]">account_tree</span>
                <span>Save to Mind-Map</span>
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
                    <span className="text-[11px] font-mono text-primary font-medium uppercase tracking-wider">{RESULTS.lectureCode}</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-on-surface tracking-tight">{RESULTS.lectureTitle}</h2>
                  <p className="text-sm text-on-surface-variant">
                    You mastered <strong className="text-on-surface font-semibold">{RESULTS.summary} topic checkpoints</strong>. 1 concept flagged for targeted spaced repetition before midterms.
                  </p>
                </div>
              </div>
              <MasteryGauge
                percent={RESULTS.retentionPercent}
                tier={RESULTS.retentionLabel}
                exam={RESULTS.examEstimate}
              />
            </div>

            {/* KPI metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
              {RESULTS.kpis.map((kpi) => (
                <div key={kpi.label} className="bg-surface-container-low rounded-xl p-space-md flex flex-col justify-between">
                  <div className="flex items-center justify-between text-on-surface-variant mb-space-xs">
                    <span className="text-[11px] font-medium">{kpi.label}</span>
                    <span className={`material-symbols-outlined text-[18px] ${kpi.iconColor}`}>{kpi.icon}</span>
                  </div>
                  <div className="flex items-baseline gap-space-xs">
                    <span className="text-2xl font-semibold text-on-surface">{kpi.value}</span>
                    {kpi.unit && <span className="text-base text-on-surface-variant">{kpi.unit}</span>}
                    {kpi.delta && (
                      <span className={`text-[11px] font-medium flex items-center ${kpi.deltaColor}`}>
                        <span className="material-symbols-outlined text-[13px]">arrow_upward</span>{kpi.delta}
                      </span>
                    )}
                    {kpi.badge && <span className={`text-[11px] font-medium ${kpi.badgeColor}`}>{kpi.badge}</span>}
                    {kpi.valueNote && <span className="text-[11px] text-outline">{kpi.valueNote}</span>}
                  </div>
                  <span className="text-[11px] text-on-surface-variant mt-1">{kpi.sub}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── 2-column breakdown ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">

            {/* LEFT: Checkpoint breakdown */}
            <div className="lg:col-span-7 flex flex-col gap-space-md">
              <div className="flex items-center justify-between pb-space-xs">
                <div>
                  <h2 className="text-xl font-semibold text-on-surface">Checkpoint Breakdown</h2>
                  <p className="text-xs text-on-surface-variant">Step-by-step topic performance and diagnostic logs</p>
                </div>
                <span className="text-[11px] font-mono text-outline px-2.5 py-1 bg-surface-container rounded-lg">5 Checkpoints</span>
              </div>
              {RESULTS.checkpoints.map((cp) => (
                <CheckpointRow key={cp.idx} cp={cp} />
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
                <button className="w-full inline-flex items-center justify-center gap-space-xs px-space-md py-2.5 rounded-xl bg-surface-container text-primary text-sm font-medium hover:bg-surface-container-high transition-colors">
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
