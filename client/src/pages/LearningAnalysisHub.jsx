import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const TOPICS = [
  {
    index: '01',
    title: 'Introduction to DBMS & Redundancy',
    duration: '00:00 — 04:20 • 4 mins duration',
    status: 'mastered',
    statusText: 'Mastered (100%)',
    verified: true,
  },
  {
    index: '02',
    title: 'Relational Models & Schemas',
    duration: '04:20 — 10:15 • 6 mins duration',
    status: 'mastered',
    statusText: 'Mastered (100%)',
    verified: true,
  },
  {
    index: '03',
    title: 'Primary Keys & Uniqueness Constraints',
    duration: '10:15 — 17:30 • 7 mins duration',
    status: 'active',
    statusText: 'Checkpoint Ready',
    verified: false,
    active: true,
  },
  {
    index: '04',
    title: 'Foreign Keys & Referential Integrity',
    duration: '17:30 — 24:10 • 6 mins duration',
    status: 'flagged',
    statusText: 'Needs Review (Flagged)',
    verified: false,
  },
  {
    index: '05',
    title: 'Boyce-Codd Normal Form (BCNF) Decomposition',
    duration: '24:10 — 35:00 • 11 mins duration',
    status: 'upcoming',
    statusText: 'Up Next',
    verified: false,
  },
];

export default function LearningAnalysisHub() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialUrl = searchParams.get('url') || 'https://www.youtube.com/watch?v=ztHopE5Wnpc';

  const [activeTab, setActiveTab] = useState('youtube');
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(3);
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(TOPICS[2]);

  const handleReanalyze = () => {
    setIsReanalyzing(true);
    setPipelineStep(1);
    setTimeout(() => setPipelineStep(2), 700);
    setTimeout(() => {
      setPipelineStep(3);
      setIsReanalyzing(false);
    }, 1500);
  };

  const startSession = (topicIndex = 3) => {
    navigate('/interactive/session');
  };

  return (
    <div className="flex flex-col w-full pb-16">
      <div className="px-gutter py-space-xl flex flex-col gap-space-xl max-w-[1440px] mx-auto w-full">
        {/* Top Breadcrumb & Status Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-sm">
            <span>Workspace</span>
            <span className="material-symbols-outlined text-outline text-[16px]">chevron_right</span>
            <span>Computer Science</span>
            <span className="material-symbols-outlined text-outline text-[16px]">chevron_right</span>
            <span
              onClick={() => navigate('/interactive')}
              className="text-primary font-medium hover:underline cursor-pointer"
            >
              Interactive Learning
            </span>
            <span className="material-symbols-outlined text-outline text-[16px]">chevron_right</span>
            <span className="text-on-surface font-semibold">AI Studio Analysis</span>
          </div>
          <div className="flex items-center gap-space-sm">
            <div className="inline-flex items-center gap-space-xs px-space-md py-1 rounded-full bg-surface-container-high text-on-surface-variant font-code-sm text-xs shadow-sm">
              <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse"></span>
              <span>Engine v3.4 Active • Low Latency Retrieval</span>
            </div>
          </div>
        </div>

        {/* Studio Hero Module */}
        <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-space-xl shadow-sm border border-outline-variant/20">
          <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-gradient-to-br from-primary-fixed/40 via-secondary-container/20 to-transparent blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col gap-space-md max-w-3xl">
            <div className="inline-flex items-center gap-space-xs px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-xs w-fit font-semibold tracking-wide">
              <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                auto_awesome
              </span>
              AI-NATIVE INGESTION ENGINE
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
              Interactive AI Learning Studio
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
              Turn any YouTube lecture or classroom recording into structured topic segments, active checkpoint quizzes,
              and adaptive remediation loops with real-time semantic synthesis.
            </p>

            {/* Mode Switcher Tabs */}
            <div className="flex flex-wrap items-center gap-space-xs pt-space-sm" id="ingest-tabs">
              <button
                type="button"
                onClick={() => setActiveTab('youtube')}
                className={`px-space-md py-2 rounded-lg font-label-md text-sm flex items-center gap-space-xs shadow-sm transition-all cursor-pointer ${
                  activeTab === 'youtube'
                    ? 'bg-primary-container text-on-primary font-medium'
                    : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">smart_display</span>
                YouTube Lecture URL
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`px-space-md py-2 rounded-lg font-label-md text-sm flex items-center gap-space-xs transition-colors cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-primary-container text-on-primary font-medium shadow-sm'
                    : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
                Classroom File Upload
              </button>
              <button
                type="button"
                onClick={() => navigate('/lectures')}
                className="px-space-md py-2 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant font-label-md text-sm flex items-center gap-space-xs transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">history</span>
                Recent Sessions (8)
              </button>
            </div>
          </div>
        </div>

        {/* Central Ingestion & Pipeline Ingest Card */}
        <div className="flex flex-col gap-space-lg">
          {/* Ingestion Form Bar */}
          <div className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col gap-space-md border border-outline-variant/20">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-space-md">
              <div className="relative flex-1 flex items-center">
                <div className="absolute left-space-md flex items-center pointer-events-none text-error">
                  <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    play_circle
                  </span>
                </div>
                <input
                  aria-label="Lecture URL"
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full pl-12 pr-28 py-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-sm focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container focus:outline-none shadow-inner transition-colors"
                />
                <div className="absolute right-space-md">
                  <span className="px-2 py-0.5 rounded font-code-sm text-xs text-outline bg-surface-container-high">
                    Stanford CS145
                  </span>
                </div>
              </div>
              <button
                id="reanalyze-btn"
                type="button"
                onClick={handleReanalyze}
                disabled={isReanalyzing}
                className="px-space-xl py-3 rounded-lg bg-primary-container text-on-primary font-label-md text-sm font-medium flex items-center justify-center gap-space-xs shadow-md hover:bg-primary transition-all active:scale-[0.99] shrink-0 cursor-pointer disabled:opacity-60"
              >
                <span
                  className={`material-symbols-outlined text-[18px] ${isReanalyzing ? 'animate-spin' : ''}`}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {isReanalyzing ? 'progress_activity' : 'auto_awesome'}
                </span>
                <span>{isReanalyzing ? 'Analyzing Syntactic Stream...' : 'Analyze Lecture'}</span>
              </button>
            </div>

            {/* Capability Pills */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm pt-space-xs">
              <div className="flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-surface-container-low text-on-surface font-label-sm text-xs">
                <span className="material-symbols-outlined text-tertiary-container text-[18px]">check_circle</span>
                <span>Auto-Transcript Extraction</span>
              </div>
              <div className="flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-surface-container-low text-on-surface font-label-sm text-xs">
                <span className="material-symbols-outlined text-tertiary-container text-[18px]">check_circle</span>
                <span>Topic Boundary Detection</span>
              </div>
              <div className="flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-surface-container-low text-on-surface font-label-sm text-xs">
                <span className="material-symbols-outlined text-tertiary-container text-[18px]">check_circle</span>
                <span>In-Video Retrieval Quizzes</span>
              </div>
              <div className="flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-surface-container-low text-on-surface font-label-sm text-xs">
                <span className="material-symbols-outlined text-tertiary-container text-[18px]">check_circle</span>
                <span>Remediation Anchors</span>
              </div>
            </div>
          </div>

          {/* Pipeline Diagnostic Inspection Panel */}
          <div className="rounded-xl bg-surface-container-lowest p-space-xl shadow-md flex flex-col gap-space-xl border border-outline-variant/20">
            {/* Header with Live Pulse */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md pb-space-md border-b border-surface-container-high/40">
              <div className="flex items-center gap-space-md">
                <div className="w-10 h-10 rounded-lg bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">account_tree</span>
                </div>
                <div>
                  <div className="flex items-center gap-space-sm">
                    <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      Lecture Analysis Pipeline & Blueprint
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-xs bg-tertiary-fixed-dim/30 text-on-tertiary-fixed-variant">
                      <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container"></span>
                      Parsed Ready
                    </span>
                  </div>
                  <p className="font-body-sm text-xs text-on-surface-variant">
                    Real-time syntactic decomposition, topic indexing, and checkpoint readiness.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-space-xs self-start sm:self-auto">
                <span className="font-code-sm text-xs text-outline px-space-sm py-1 rounded bg-surface-container-low">
                  ID: LEC-CS145-N03
                </span>
              </div>
            </div>

            {/* Upper Details Grid: Video Card + Real-time Stage Flow */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-center">
              {/* Video Card Details (5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-space-md rounded-xl bg-surface-container-low p-space-md border border-outline-variant/20">
                <div className="relative w-full h-44 rounded-lg overflow-hidden group shadow-sm bg-inverse-surface">
                  <div className="w-full h-full bg-gradient-to-br from-primary-container/80 via-primary/60 to-surface-dim flex flex-col items-center justify-center p-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-surface-container-lowest/20 backdrop-blur-md flex items-center justify-center text-white mb-2 shadow-lg">
                      <span className="material-symbols-outlined text-[28px]">database</span>
                    </div>
                    <span className="text-white font-semibold text-sm">Relational Schemas & Normalization</span>
                    <span className="text-white/70 text-xs">Stanford Engineering CS145</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/90 via-inverse-surface/30 to-transparent flex flex-col justify-between p-space-md">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded font-label-sm text-xs bg-surface-container-lowest/90 text-on-surface backdrop-blur-sm">
                        CS145: Spring Session
                      </span>
                      <span className="px-2 py-0.5 rounded font-code-sm text-xs bg-inverse-surface/80 text-inverse-on-surface">
                        48:20 mins
                      </span>
                    </div>
                    <div className="flex items-center gap-space-sm">
                      <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow">
                        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          play_arrow
                        </span>
                      </div>
                      <span className="font-label-sm text-xs text-inverse-on-surface font-medium">
                        YouTube Source Verified
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="font-title-md text-base text-on-surface font-semibold line-clamp-1">
                    Database Systems: Normalization & FDs
                  </h3>
                  <p className="font-body-sm text-xs text-on-surface-variant line-clamp-2">
                    Prof. Widom • Boyce-Codd normal forms, multi-valued dependencies, and loss-less decomposition guarantees.
                  </p>
                </div>
              </div>

              {/* Real-Time Pipeline Progress Steps (7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-space-md">
                <div className="font-label-sm text-xs text-outline uppercase tracking-wider font-semibold">
                  Analysis Orchestration Track
                </div>
                <div className="flex flex-col gap-space-sm">
                  {/* Step 1 */}
                  <div className="flex items-center gap-space-md p-space-md rounded-lg bg-surface-container-low transition-colors">
                    <div className="w-8 h-8 rounded-full bg-tertiary-container text-on-tertiary flex items-center justify-center shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-[18px]">check</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-label-md text-sm text-on-surface font-medium truncate">
                          1. Video Stream & Transcript Parsed
                        </span>
                        <span className="font-code-sm text-xs text-tertiary font-medium">100% Verified</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                        <div className="h-full bg-tertiary-container rounded-full w-full"></div>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-center gap-space-md p-space-md rounded-lg bg-surface-container-low transition-colors">
                    <div className="w-8 h-8 rounded-full bg-tertiary-container text-on-tertiary flex items-center justify-center shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-[18px]">check</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-label-md text-sm text-on-surface font-medium truncate">
                          2. Semantic Boundaries Segmented
                        </span>
                        <span className="font-code-sm text-xs text-tertiary font-medium">5 Segments Formed</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                        <div
                          className={`h-full bg-tertiary-container rounded-full transition-all duration-500 ${
                            pipelineStep >= 2 ? 'w-full' : 'w-1/2'
                          }`}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-center gap-space-md p-space-md rounded-lg bg-surface-container-low transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        bolt
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-label-md text-sm text-on-surface font-medium truncate">
                          3. Checkpoint Quizzes & Remediation Anchors
                        </span>
                        <span className="font-code-sm text-xs text-primary-container font-semibold">
                          Ready to Launch
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                        <div
                          className={`h-full bg-primary-container rounded-full transition-all duration-500 ${
                            pipelineStep >= 3 ? 'w-full' : 'w-1/3'
                          }`}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detected Topic Blueprint Interactive Inspection List */}
            <div className="flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="font-headline-sm text-base text-on-surface font-semibold">
                    Detected Topic Blueprint
                  </span>
                  <span className="font-code-sm text-xs px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-medium">
                    5 Chapters
                  </span>
                </div>
                <span className="font-label-sm text-xs text-outline">
                  Click segment to preview notes or initiate quiz
                </span>
              </div>

              <div className="flex flex-col gap-space-xs" id="topic-list">
                {TOPICS.map((t) => {
                  const isActive = t.active;
                  return (
                    <div
                      key={t.index}
                      onClick={() => setSelectedTopic(t)}
                      className={`relative flex flex-col md:flex-row md:items-center justify-between p-space-md rounded-lg transition-colors gap-space-sm cursor-pointer ${
                        isActive
                          ? 'bg-primary-fixed/20 shadow-sm border border-primary-container/20'
                          : 'bg-surface-container-low hover:bg-surface-container-high'
                      }`}
                    >
                      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary-container rounded-l-lg"></div>}
                      <div className={`flex items-center gap-space-md min-w-0 ${isActive ? 'pl-space-xs' : ''}`}>
                        <span
                          className={`font-code-sm text-xs font-semibold px-2 py-1 rounded bg-surface-container-lowest ${
                            isActive ? 'text-primary-container font-bold' : 'text-outline'
                          }`}
                        >
                          {t.index}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-space-xs">
                            <span
                              className={`font-label-md text-sm text-on-surface truncate ${
                                isActive ? 'font-semibold' : 'font-medium'
                              }`}
                            >
                              {t.title}
                            </span>
                            {t.verified && (
                              <span className="material-symbols-outlined text-tertiary-container text-[16px]">
                                verified
                              </span>
                            )}
                            {isActive && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary-container text-on-primary">
                                Active
                              </span>
                            )}
                            {t.status === 'flagged' && (
                              <span className="material-symbols-outlined text-error text-[16px]">priority_high</span>
                            )}
                          </div>
                          <span
                            className={`font-code-sm text-xs ${
                              isActive ? 'text-primary font-medium' : 'text-on-surface-variant'
                            }`}
                          >
                            {t.duration}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-space-md self-end md:self-auto shrink-0">
                        {t.status === 'mastered' && (
                          <span className="px-space-md py-0.5 rounded-full font-label-sm text-xs bg-tertiary-fixed-dim/30 text-on-tertiary-fixed-variant font-medium">
                            {t.statusText}
                          </span>
                        )}
                        {t.status === 'active' && (
                          <span className="px-space-md py-0.5 rounded-full font-label-sm text-xs bg-primary-container text-on-primary font-semibold flex items-center gap-1 shadow-sm">
                            <span className="material-symbols-outlined text-[14px]">quiz</span>
                            {t.statusText}
                          </span>
                        )}
                        {t.status === 'flagged' && (
                          <span className="px-space-md py-0.5 rounded-full font-label-sm text-xs bg-error-container text-on-error-container font-medium">
                            {t.statusText}
                          </span>
                        )}
                        {t.status === 'upcoming' && (
                          <span className="px-space-md py-0.5 rounded-full font-label-sm text-xs bg-surface-container-high text-on-surface-variant font-medium">
                            {t.statusText}
                          </span>
                        )}
                        <span className="material-symbols-outlined text-outline text-[20px]">chevron_right</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Launch & Navigation Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-md pt-space-md bg-surface-container-lowest border-t border-surface-container-high/40">
              <button
                type="button"
                onClick={() => navigate('/interactive')}
                className="px-space-md py-2.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low font-label-md text-sm flex items-center justify-center gap-space-xs transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Back to Learning Hub
              </button>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-sm">
                <button
                  type="button"
                  onClick={() => setShowTranscriptModal(true)}
                  className="px-space-lg py-2.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-sm flex items-center justify-center gap-space-xs transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">notes</span>
                  View Full Synced Transcript
                </button>
                <button
                  type="button"
                  onClick={() => startSession(3)}
                  className="px-space-xl py-3 rounded-lg bg-primary-container text-on-primary font-label-md text-sm font-semibold flex items-center justify-center gap-space-sm shadow-md hover:bg-primary transition-all active:scale-[0.98] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    play_arrow
                  </span>
                  Start Interactive Session at Topic 3
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Learning Sessions Section */}
        <div className="flex flex-col gap-space-lg pt-space-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
            <div>
              <h2 className="font-headline-sm text-lg text-on-surface font-semibold">Recent Learning Sessions</h2>
              <p className="font-body-sm text-xs text-on-surface-variant">
                Continue your spaced loops, remediation quizzes, and topic reviews.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/lectures')}
              className="text-primary hover:text-primary-container font-label-md text-sm flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>View All Completed Lectures</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
            {/* Session Card 1: Operating Systems */}
            <div className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-space-md group border border-outline-variant/20">
              <div className="flex flex-col gap-space-sm">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full font-label-sm text-xs bg-surface-container-high text-on-surface-variant font-medium">
                    CS204: OS
                  </span>
                  <span className="font-code-sm text-xs text-outline">Yesterday</span>
                </div>
                <h3 className="font-title-md text-sm text-on-surface font-semibold group-hover:text-primary transition-colors line-clamp-1">
                  Process Scheduling & Context Switch
                </h3>
                <p className="font-body-sm text-xs text-on-surface-variant line-clamp-2">
                  Round Robin, Multi-level feedback queues, preemptive priority algorithms, and PCB register restoration.
                </p>
              </div>

              <div className="flex flex-col gap-space-sm">
                <div className="flex items-center justify-between font-label-sm text-xs">
                  <span className="text-on-surface-variant">6 of 8 Topics Completed</span>
                  <span className="font-code-sm text-xs font-semibold text-primary">75%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                  <div className="h-full bg-primary-container rounded-full" style={{ width: '75%' }}></div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-error-container text-on-error-container font-label-sm text-xs">
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  <span className="truncate">Weak Recall: Priority Inversion Protocol</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/interactive/session')}
                  className="w-full mt-space-xs py-2 rounded-lg bg-surface-container-high hover:bg-primary-container hover:text-on-primary text-on-surface font-label-md text-xs font-medium transition-colors flex items-center justify-center gap-space-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                  Resume Session
                </button>
              </div>
            </div>

            {/* Session Card 2: Computer Networks */}
            <div className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-space-md group border border-outline-variant/20">
              <div className="flex flex-col gap-space-sm">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full font-label-sm text-xs bg-surface-container-high text-on-surface-variant font-medium">
                    CS302: Networks
                  </span>
                  <span className="font-code-sm text-xs text-outline">3 days ago</span>
                </div>
                <h3 className="font-title-md text-sm text-on-surface font-semibold group-hover:text-primary transition-colors line-clamp-1">
                  TCP Handshake, Congestion & Flow Control
                </h3>
                <p className="font-body-sm text-xs text-on-surface-variant line-clamp-2">
                  Three-way handshake, SYN floods, TCP Tahoe vs Reno, additive increase multiplicative decrease (AIMD).
                </p>
              </div>

              <div className="flex flex-col gap-space-sm">
                <div className="flex items-center justify-between font-label-sm text-xs">
                  <span className="text-on-surface-variant">3 of 9 Topics Completed</span>
                  <span className="font-code-sm text-xs font-semibold text-primary">33%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                  <div className="h-full bg-primary-container rounded-full" style={{ width: '33%' }}></div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary-fixed text-secondary font-label-sm text-xs">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  <span className="truncate">Active Learning Loop Ready</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/interactive/session')}
                  className="w-full mt-space-xs py-2 rounded-lg bg-surface-container-high hover:bg-primary-container hover:text-on-primary text-on-surface font-label-md text-xs font-medium transition-colors flex items-center justify-center gap-space-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                  Resume Session
                </button>
              </div>
            </div>

            {/* Session Card 3: Database Management Systems */}
            <div className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-space-md group border border-outline-variant/20">
              <div className="flex flex-col gap-space-sm">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full font-label-sm text-xs bg-tertiary-fixed text-on-tertiary-fixed font-medium">
                    CS301: DBMS
                  </span>
                  <span className="font-code-sm text-xs text-outline">Today</span>
                </div>
                <h3 className="font-title-md text-sm text-on-surface font-semibold group-hover:text-primary transition-colors line-clamp-1">
                  Relational Algebra & Query Trees
                </h3>
                <p className="font-body-sm text-xs text-on-surface-variant line-clamp-2">
                  Projection, selection, Cartesian product, theta-joins, and heuristic query optimization trees.
                </p>
              </div>

              <div className="flex flex-col gap-space-sm">
                <div className="flex items-center justify-between font-label-sm text-xs">
                  <span className="text-on-surface-variant">5 of 5 Topics Completed</span>
                  <span className="font-code-sm text-xs font-semibold text-tertiary">100%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                  <div className="h-full bg-tertiary-container rounded-full" style={{ width: '100%' }}></div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-tertiary-fixed-dim/30 text-on-tertiary-fixed-variant font-label-sm text-xs">
                  <span className="material-symbols-outlined text-[14px]">workspace_premium</span>
                  <span className="truncate">94% Retention Score</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/session-results')}
                  className="w-full mt-space-xs py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high font-label-md text-xs font-medium transition-colors flex items-center justify-center gap-space-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">analytics</span>
                  Review Results
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transcript Modal */}
      {showTranscriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-surface-container-lowest rounded-xl shadow-2xl p-space-lg flex flex-col gap-space-md max-h-[85vh] border border-outline-variant/30">
            <div className="flex items-center justify-between border-b border-surface-container-high pb-space-sm">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary">notes</span>
                <h3 className="font-title-md text-on-surface font-semibold">Synced Lecture Transcript</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTranscriptModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="overflow-y-auto space-y-4 pr-2 font-body-sm text-sm text-on-surface leading-relaxed">
              <div className="p-3 rounded-lg bg-surface-container-low">
                <span className="font-code-sm text-xs text-primary font-bold">[00:00 - 04:20]</span>
                <p className="mt-1">
                  "Welcome everyone to Stanford CS145. Today we're diving deeply into database normalization, functional
                  dependencies, and how to avoid anomaly problems in relational designs..."
                </p>
              </div>
              <div className="p-3 rounded-lg bg-surface-container-low">
                <span className="font-code-sm text-xs text-primary font-bold">[04:20 - 10:15]</span>
                <p className="mt-1">
                  "A functional dependency X determines Y is a constraint between two sets of attributes. In essence, whenever
                  two tuples agree on the attributes of X, they must also agree on Y..."
                </p>
              </div>
              <div className="p-3 rounded-lg bg-surface-container-low border border-primary-container/40">
                <span className="font-code-sm text-xs text-primary font-bold">[10:15 - 17:30] — Active Topic</span>
                <p className="mt-1">
                  "Now notice the distinction between a superkey and a candidate key. A superkey uniquely identifies every row,
                  but a candidate key is minimal—no proper subset can also be a superkey..."
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-surface-container-high">
              <button
                type="button"
                onClick={() => setShowTranscriptModal(false)}
                className="px-space-md py-2 rounded-lg bg-surface-container text-on-surface font-label-md text-sm hover:bg-surface-container-high cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
