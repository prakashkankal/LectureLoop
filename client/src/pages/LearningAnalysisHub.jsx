import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchLectureStatus, startLectureAnalysis } from '../services/api.js';

export default function LearningAnalysisHub() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialUrl = searchParams.get('url') || 'https://www.youtube.com/watch?v=ztHopE5Wnpc';
  const lectureId = searchParams.get('lectureId');
  const sessionHref = lectureId
    ? `/interactive/session?lectureId=${encodeURIComponent(lectureId)}`
    : '/interactive';
  const resultsHref = lectureId
    ? `/session-results?lectureId=${encodeURIComponent(lectureId)}`
    : '/interactive';

  const [activeTab, setActiveTab] = useState('youtube');
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [topics, setTopics] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [analysisStatus, setAnalysisStatus] = useState(lectureId ? 'processing' : 'complete');
  const [analysisError, setAnalysisError] = useState('');
  const pollRef = useRef(null);

  // Live timer & step estimator while analysis is processing
  useEffect(() => {
    if (analysisStatus !== 'processing' && analysisStatus !== 'pending') return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        if (next >= 22) setPipelineStep((s) => Math.max(s, 2));
        else if (next >= 8) setPipelineStep((s) => Math.max(s, 1));
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [analysisStatus]);

  useEffect(() => {
    if (!lectureId) {
      setPipelineStep(3);
      const demoTopics = [
        { index: '01', title: 'Introduction to DBMS', startTime: '00:00', endTime: '04:20', duration: '00:00 — 04:20', status: 'mastered', statusText: 'Mastered (100%)', verified: true },
        { index: '02', title: 'Relational Models & Schemas', startTime: '04:20', endTime: '10:15', duration: '04:20 — 10:15', status: 'mastered', statusText: 'Mastered (100%)', verified: true },
        { index: '03', title: 'Primary Keys & Uniqueness Constraints', startTime: '10:15', endTime: '17:30', duration: '10:15 — 17:30', status: 'active', statusText: 'Checkpoint Ready', active: true },
        { index: '04', title: 'Foreign Keys & Referential Integrity', startTime: '17:30', endTime: '24:10', duration: '17:30 — 24:10', status: 'upcoming', statusText: 'Up Next' },
        { index: '05', title: 'Normalization', startTime: '24:10', endTime: '35:00', duration: '24:10 — 35:00', status: 'upcoming', statusText: 'Up Next' },
      ];
      setTopics(demoTopics);
      setSelectedTopic(demoTopics[2]);
      setAnalysisStatus('complete');
      return undefined;
    }

    let isPolling = false;
    const poll = async () => {
      if (isPolling) return;
      isPolling = true;

      try {
        const data = await fetchLectureStatus(lectureId);
        setAnalysisStatus(data.analysisStatus);

        if (data.analysisStatus === 'processing') {
          // Keep polling, timer manages intermediate progress
        } else if (data.analysisStatus === 'complete') {
          setPipelineStep(3);
          const loadedTopics = (data.topics || []).map((topic, i) => ({
            ...topic,
            index: String(topic.index || i + 1).padStart(2, '0'),
            duration: `${topic.startTime || '00:00'} — ${topic.endTime || '00:00'}`,
            status: i === 0 ? 'active' : 'upcoming',
            statusText: i === 0 ? 'Checkpoint Ready' : 'Up Next',
            verified: true,
            active: i === 0,
          }));
          setTopics(loadedTopics);
          setQuizzes(data.quizzes || []);
          if (loadedTopics.length > 0) setSelectedTopic(loadedTopics[0]);
          clearInterval(pollRef.current);
        } else if (data.analysisStatus === 'failed') {
          setAnalysisError(data.analysisError || 'Analysis failed. Please check the video link.');
          clearInterval(pollRef.current);
        }
      } catch (err) {
        console.warn('Polling error:', err.message);
      } finally {
        isPolling = false;
      }
    };

    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => clearInterval(pollRef.current);
  }, [lectureId]);

  const handleReanalyze = async () => {
    setIsReanalyzing(true);
    setPipelineStep(0);
    setElapsedSeconds(0);
    setTopics([]);
    setQuizzes([]);
    setAnalysisStatus('processing');
    setAnalysisError('');
    try {
      const lecture = await startLectureAnalysis({ youtubeUrl: urlInput.trim(), title: 'Lecture', subject: 'General' });
      navigate(`/interactive/analysis?lectureId=${lecture._id}`);
    } catch (err) {
      setAnalysisError(err.message);
      setAnalysisStatus('failed');
    } finally {
      setIsReanalyzing(false);
    }
  };

  const startSession = () => {
    const params = lectureId ? `?lectureId=${lectureId}` : '';
    navigate(`/interactive/session${params}`);
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
              <span>Topic Decomposition Ready</span>
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
              LECTURE ANALYSIS
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
              Interactive Learning Analysis
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
              Review automatically organized topic chapters, inspection timestamps, and checkpoint quizzes generated for this lecture.
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
                onClick={() => navigate('/padhai-ai')}
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
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full pl-12 pr-4 py-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-sm focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container focus:outline-none shadow-inner transition-colors"
                />
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
                      {analysisStatus === 'complete' ? 'Parsed Ready' : analysisStatus === 'failed' ? 'Analysis Failed' : 'Analysis Processing'}
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
                      <span className="material-symbols-outlined text-[28px]">smart_display</span>
                    </div>
                    <span className="text-white font-semibold text-sm">Lecture Video Stream</span>
                    <span className="text-white/70 text-xs">Topic Chapters & Quizzes</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/90 via-inverse-surface/30 to-transparent flex flex-col justify-between p-space-md">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded font-label-sm text-xs bg-surface-container-lowest/90 text-on-surface backdrop-blur-sm">
                        Analyzed Video
                      </span>
                      <span className="px-2 py-0.5 rounded font-code-sm text-xs bg-inverse-surface/80 text-inverse-on-surface">
                        {topics.length} Topics
                      </span>
                    </div>
                    <div className="flex items-center gap-space-sm">
                      <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow">
                        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          play_arrow
                        </span>
                      </div>
                      <span className="font-label-sm text-xs text-inverse-on-surface font-medium">
                        Source Verified
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="font-title-md text-base text-on-surface font-semibold line-clamp-1">
                    Lecture Video
                  </h3>
                  <p className="font-body-sm text-xs text-on-surface-variant line-clamp-2">
                    Segmented into structured learning checkpoints with interactive quizzes.
                  </p>
                </div>
              </div>

              {/* Real-Time Pipeline Progress Steps (7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-space-md">
                <div className="flex items-center justify-between">
                  <div className="font-label-sm text-xs text-outline uppercase tracking-wider font-semibold">
                    Analysis Orchestration Track
                  </div>
                  {(analysisStatus === 'processing' || analysisStatus === 'pending') && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-container/10 text-primary text-[11px] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                      <span>Processing ({elapsedSeconds}s)</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-space-sm">
                  {/* Step 1 */}
                  <div className={`flex items-center gap-space-md p-space-md rounded-lg transition-colors ${
                    pipelineStep === 0 && analysisStatus !== 'complete'
                      ? 'bg-primary-container/10 border border-primary-container/30'
                      : 'bg-surface-container-low'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                      pipelineStep > 0 || analysisStatus === 'complete'
                        ? 'bg-tertiary-container text-on-tertiary'
                        : 'bg-primary-container text-on-primary'
                    }`}>
                      <span className={`material-symbols-outlined text-[18px] ${
                        pipelineStep === 0 && analysisStatus !== 'complete' ? 'animate-spin' : ''
                      }`}>
                        {pipelineStep > 0 || analysisStatus === 'complete' ? 'check' : 'sync'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-label-md text-sm text-on-surface font-medium truncate">
                          1. Video Stream & Audio Extraction
                        </span>
                        <span className={`font-code-sm text-xs font-medium ${
                          pipelineStep > 0 || analysisStatus === 'complete' ? 'text-tertiary' : 'text-primary'
                        }`}>
                          {pipelineStep > 0 || analysisStatus === 'complete' ? 'Transcribed' : 'Transcribing Speech...'}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${
                          pipelineStep > 0 || analysisStatus === 'complete'
                            ? 'bg-tertiary-container w-full'
                            : 'bg-gradient-to-r from-primary via-primary-container to-secondary-container w-3/4 animate-pulse'
                        }`} />
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className={`flex items-center gap-space-md p-space-md rounded-lg transition-colors ${
                    pipelineStep === 1 && analysisStatus !== 'complete'
                      ? 'bg-primary-container/10 border border-primary-container/30'
                      : 'bg-surface-container-low'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                      pipelineStep > 1 || analysisStatus === 'complete'
                        ? 'bg-tertiary-container text-on-tertiary'
                        : pipelineStep === 1
                          ? 'bg-primary-container text-on-primary'
                          : 'bg-surface-container-high text-outline'
                    }`}>
                      <span className={`material-symbols-outlined text-[18px] ${
                        pipelineStep === 1 && analysisStatus !== 'complete' ? 'animate-spin' : ''
                      }`}>
                        {pipelineStep > 1 || analysisStatus === 'complete' ? 'check' : pipelineStep === 1 ? 'psychology' : 'schedule'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-label-md text-sm text-on-surface font-medium truncate">
                          2. Semantic Topic Segmentation
                        </span>
                        <span className={`font-code-sm text-xs font-medium ${
                          pipelineStep > 1 || analysisStatus === 'complete'
                            ? 'text-tertiary'
                            : pipelineStep === 1
                              ? 'text-primary font-semibold'
                              : 'text-outline'
                        }`}>
                          {pipelineStep > 1 || analysisStatus === 'complete'
                            ? `${topics.length || 'Semantic'} Chapters Found`
                            : pipelineStep === 1
                              ? 'Decomposing Chapters...'
                              : 'Pending'}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${
                          pipelineStep > 1 || analysisStatus === 'complete'
                            ? 'bg-tertiary-container w-full'
                            : pipelineStep === 1
                              ? 'bg-gradient-to-r from-primary via-primary-container to-secondary-container w-2/3 animate-pulse'
                              : 'w-0'
                        }`} />
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className={`flex items-center gap-space-md p-space-md rounded-lg transition-colors ${
                    pipelineStep === 2 && analysisStatus !== 'complete'
                      ? 'bg-primary-container/10 border border-primary-container/30'
                      : 'bg-surface-container-low'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                      analysisStatus === 'complete'
                        ? 'bg-tertiary-container text-on-tertiary'
                        : pipelineStep >= 2
                          ? 'bg-primary-container text-on-primary'
                          : 'bg-surface-container-high text-outline'
                    }`}>
                      <span className={`material-symbols-outlined text-[18px] ${
                        pipelineStep === 2 && analysisStatus !== 'complete' ? 'animate-spin' : ''
                      }`}>
                        {analysisStatus === 'complete' ? 'check' : pipelineStep >= 2 ? 'bolt' : 'lock'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-label-md text-sm text-on-surface font-medium truncate">
                          3. Checkpoint Retrieval Quizzes
                        </span>
                        <span className={`font-code-sm text-xs font-semibold ${
                          analysisStatus === 'complete'
                            ? 'text-tertiary'
                            : pipelineStep >= 2
                              ? 'text-primary'
                              : 'text-outline'
                        }`}>
                          {analysisStatus === 'complete'
                            ? `${quizzes.length || 5} Quizzes Ready`
                            : pipelineStep >= 2
                              ? 'Generating Questions...'
                              : 'Pending'}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${
                          analysisStatus === 'complete'
                            ? 'bg-tertiary-container w-full'
                            : pipelineStep >= 2
                              ? 'bg-primary-container w-3/4 animate-pulse'
                              : 'w-0'
                        }`} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detected Topic Blueprint Interactive Inspection List */}
            <div className="flex flex-col gap-space-md">
              {analysisError && (
                <div role="alert" className="p-4 rounded-xl bg-error-container/30 border border-error/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-error text-sm">
                    <span className="material-symbols-outlined text-[22px]">error</span>
                    <span>{analysisError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleReanalyze}
                    className="px-3 py-1.5 rounded-lg bg-error text-on-error font-medium text-xs shadow-sm hover:opacity-90 shrink-0"
                  >
                    Retry Analysis
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="font-headline-sm text-base text-on-surface font-semibold">
                    Detected Topic Blueprint
                  </span>
                  <span className="font-code-sm text-xs px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-medium">
                    {analysisStatus === 'complete' ? `${topics.length} Chapters` : 'Analyzing...'}
                  </span>
                </div>
                <span className="font-label-sm text-xs text-outline">
                  {analysisStatus === 'complete' ? 'Click segment to preview notes or initiate quiz' : 'Updating in real-time'}
                </span>
              </div>

              {/* ── Active Processing Loading State ── */}
              {(analysisStatus === 'processing' || analysisStatus === 'pending') && !analysisError && (
                <div className="flex flex-col gap-4 p-6 rounded-xl bg-surface-container-low border border-primary-container/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-outline-variant/15">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-on-surface">AI Synthesis in Progress</h4>
                        <p className="text-xs text-on-surface-variant">
                          {pipelineStep === 0 && 'Transcribing audio track and mapping speech timestamps...'}
                          {pipelineStep === 1 && 'Segmenting lecture into coherent topics & chapter markers...'}
                          {pipelineStep >= 2 && 'Crafting interactive multiple-choice checkpoint questions...'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-xs font-mono font-medium px-2 py-1 rounded bg-surface-container-lowest text-primary shadow-inner">
                        Elapsed: {elapsedSeconds}s
                      </span>
                    </div>
                  </div>

                  {/* Shimmering Skeleton Chapter Rows */}
                  <div className="flex flex-col gap-2.5">
                    {[
                      { title: 'Decomposing Introduction & Setup', time: '00:00 — 08:30' },
                      { title: 'Synthesizing Core Concepts & Demonstrations', time: '08:30 — 22:15' },
                      { title: 'Analyzing Advanced Operations & Scenarios', time: '22:15 — 41:00' },
                      { title: 'Formulating Review & Summary Section', time: '41:00 — End' },
                    ].map((skeleton, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col md:flex-row md:items-center justify-between p-3.5 rounded-lg bg-surface-container-lowest/80 border border-outline-variant/10 gap-2 animate-pulse"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono font-semibold px-2 py-1 rounded bg-surface-container text-outline">
                            0{idx + 1}
                          </span>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-on-surface/80">{skeleton.title}</span>
                            <span className="text-[11px] font-mono text-outline">{skeleton.time}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-end md:self-auto">
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary-container/10 text-primary font-medium">
                            Analyzing...
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-outline text-center pt-2">
                    Tip: Full analysis generally takes 15–30 seconds. Your chapters and quizzes will appear here automatically.
                  </p>
                </div>
              )}

              {/* ── Completed Topic List ── */}
              {analysisStatus === 'complete' && (
                <div className="flex flex-col gap-space-xs" id="topic-list">
                  {topics.map((t) => {
                    const isActive = t.index === selectedTopic?.index;
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
              )}
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
                  onClick={startSession}
                  className="px-space-xl py-3 rounded-lg bg-primary-container text-on-primary font-label-md text-sm font-semibold flex items-center justify-center gap-space-sm shadow-md hover:bg-primary transition-all active:scale-[0.98] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    play_arrow
                  </span>
                  Start Interactive Session
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
                  onClick={() => navigate(sessionHref)}
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
                  onClick={() => navigate(sessionHref)}
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
                  onClick={() => navigate(resultsHref)}
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
              {topics.length > 0 ? (
                topics.map((t, i) => (
                  <div key={t.index || i} className="p-3 rounded-lg bg-surface-container-low">
                    <div className="flex items-center justify-between">
                      <span className="font-code-sm text-xs text-primary font-bold">
                        [{t.startTime || t.start || '00:00'} - {t.endTime || t.end || '00:00'}] • {t.title}
                      </span>
                    </div>
                    <p className="mt-1 text-on-surface-variant">
                      {t.summary || 'Topic segment notes and key takeaways.'}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-on-surface-variant text-sm">
                  Transcript parsing in progress. Topics and segment timestamps will appear here once loaded.
                </div>
              )}
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
