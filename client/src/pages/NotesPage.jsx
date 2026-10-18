import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  fetchUserLectures,
  fetchLectureTopicNotes,
  generateTopicNote,
  generateAllTopicNotes,
  fetchNotesGenerationStatus,
  regenerateTopicNote,
  downloadAuthenticatedFile,
} from '../services/api';

export default function NotesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const lectureIdParam = searchParams.get('lectureId');

  const [lectures, setLectures] = useState([]);
  const [selectedLectureId, setSelectedLectureId] = useState(lectureIdParam || '');
  const [notesData, setNotesData] = useState(null);
  const [loadingLectures, setLoadingLectures] = useState(true);
  const [loading, setLoading] = useState(Boolean(lectureIdParam));
  const [error, setError] = useState('');

  // Per-topic loading states { [topicIndex]: 'generating' | 'regenerating' | 'downloading' }
  const [topicActionState, setTopicActionState] = useState({});
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [isZipDownloading, setIsZipDownloading] = useState(false);

  // Fullscreen Viewer Modal State
  const [viewerTopic, setViewerTopic] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const pollIntervalRef = useRef(null);

  // 1. Load user lectures on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const userLectures = await fetchUserLectures();
        if (!isMounted) return;
        setLectures(userLectures);
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load lectures');
      } finally {
        if (isMounted) setLoadingLectures(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // 2. Fetch notes whenever selected lecture changes
  const loadLectureNotes = async (lectureId, showLoader = true) => {
    if (!lectureId) return;
    if (showLoader) setLoading(true);
    setError('');
    try {
      const data = await fetchLectureTopicNotes(lectureId);
      setNotesData(data);
    } catch (err) {
      setError(err.message || 'Failed to load lecture notes');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedLectureId) {
      loadLectureNotes(selectedLectureId, true);
    }
  }, [selectedLectureId]);

  // 3. Poll generation status if any topics are processing or bulk generation is active
  useEffect(() => {
    const hasProcessingTopics = notesData?.topics?.some((t) => t.generationStatus === 'processing');
    if (hasProcessingTopics || isBulkGenerating) {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusData = await fetchNotesGenerationStatus(selectedLectureId);
          // If bulk generation was active, check if finished
          if (statusData.processing === 0) {
            setIsBulkGenerating(false);
          }
          // Refresh notes list without flickering
          await loadLectureNotes(selectedLectureId, false);
        } catch (e) {
          console.warn('[NotesPage] Polling notice:', e.message);
        }
      }, 3000);
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [notesData, isBulkGenerating, selectedLectureId]);

  // Handle single topic generation
  const handleGenerateTopic = async (topic) => {
    setTopicActionState((prev) => ({ ...prev, [topic.topicIndex]: 'generating' }));
    try {
      await generateTopicNote(selectedLectureId, topic.topicId || topic.topicIndex);
      await loadLectureNotes(selectedLectureId, false);
    } catch (err) {
      setError(`Generation failed for ${topic.topicTitle}: ${err.message}`);
      await loadLectureNotes(selectedLectureId, false);
    } finally {
      setTopicActionState((prev) => {
        const next = { ...prev };
        delete next[topic.topicIndex];
        return next;
      });
    }
  };

  // Handle single topic regeneration
  const handleRegenerateTopic = async (topic) => {
    setTopicActionState((prev) => ({ ...prev, [topic.topicIndex]: 'regenerating' }));
    try {
      await regenerateTopicNote(selectedLectureId, topic.topicId || topic.topicIndex);
      await loadLectureNotes(selectedLectureId, false);
    } catch (err) {
      setError(`Regeneration failed for ${topic.topicTitle}: ${err.message}`);
      await loadLectureNotes(selectedLectureId, false);
    } finally {
      setTopicActionState((prev) => {
        const next = { ...prev };
        delete next[topic.topicIndex];
        return next;
      });
    }
  };

  // Handle bulk generate all
  const handleGenerateAll = async () => {
    setIsBulkGenerating(true);
    setError('');
    try {
      await generateAllTopicNotes(selectedLectureId);
      await loadLectureNotes(selectedLectureId, false);
    } catch (err) {
      setIsBulkGenerating(false);
      setError(`Bulk generation failed: ${err.message}`);
    }
  };

  // Handle single download
  const handleDownloadSingle = async (topic) => {
    setTopicActionState((prev) => ({ ...prev, [topic.topicIndex]: 'downloading' }));
    try {
      const filename = `${String(topic.topicIndex).padStart(2, '0')}-${topic.topicTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
      await downloadAuthenticatedFile(
        `/lectures/${selectedLectureId}/topics/${topic.topicId || topic.topicIndex}/notes/download`,
        filename
      );
    } catch (err) {
      setError(`Download failed for ${topic.topicTitle}: ${err.message}`);
    } finally {
      setTopicActionState((prev) => {
        const next = { ...prev };
        delete next[topic.topicIndex];
        return next;
      });
    }
  };

  // Handle ZIP download
  const handleDownloadAllZip = async () => {
    setIsZipDownloading(true);
    setError('');
    try {
      const safeTitle = (notesData?.lectureTitle || 'Lecture').toLowerCase().replace(/[^a-z0-9]/g, '-');
      await downloadAuthenticatedFile(
        `/lectures/${selectedLectureId}/notes/download-all`,
        `Lecture-Loop-${safeTitle}-Notes.zip`
      );
    } catch (err) {
      setError(`ZIP download failed: ${err.message}`);
    } finally {
      setIsZipDownloading(false);
    }
  };

  // Switch lecture selector
  const handleLectureChange = (e) => {
    const newId = e.target.value;
    setSelectedLectureId(newId);
    if (!newId) setNotesData(null);
    if (newId) setSearchParams({ lectureId: newId });
    else setSearchParams({});
  };

  const openLectureFolder = (lectureId) => {
    setSelectedLectureId(lectureId);
    setSearchParams({ lectureId });
  };

  const closeLectureFolder = () => {
    setSelectedLectureId('');
    setNotesData(null);
    setSearchParams({});
  };

  // Viewer navigation
  const openViewerForTopic = (topic) => {
    setViewerTopic(topic);
    setZoomLevel(1);
  };

  const navigateViewer = (direction) => {
    if (!viewerTopic || !notesData?.topics) return;
    const completedTopics = notesData.topics.filter((t) => t.generationStatus === 'completed' && t.imageUrl);
    const currentIndex = completedTopics.findIndex((t) => t.topicIndex === viewerTopic.topicIndex);
    if (currentIndex === -1) return;

    if (direction === 'next' && currentIndex < completedTopics.length - 1) {
      setViewerTopic(completedTopics[currentIndex + 1]);
      setZoomLevel(1);
    } else if (direction === 'prev' && currentIndex > 0) {
      setViewerTopic(completedTopics[currentIndex - 1]);
      setZoomLevel(1);
    }
  };

  const topics = notesData?.topics || [];
  const completedNotesCount = topics.filter((t) => t.generationStatus === 'completed').length;
  const isAllGenerated = topics.length > 0 && completedNotesCount === topics.length;

  return (
    <div className="w-full min-h-screen bg-surface px-4 sm:px-6 lg:px-8 py-6 text-on-surface">
      {/* ── Top Bar: Breadcrumb & Lecture Selector ── */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-outline-variant/30">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-[16px]">draw</span>
            <span>Handwritten Infographic Studio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Lecture Notes
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            AI-generated handwritten notes, organized by topic.
          </p>
        </div>

        {/* Lecture folder selector */}
        <div className="flex items-center gap-3">
          <label htmlFor="lecture-select" className="text-xs font-medium text-on-surface-variant shrink-0">
            Open Folder:
          </label>
          <select
            id="lecture-select"
            value={selectedLectureId}
            onChange={handleLectureChange}
            aria-label="Open lecture notes folder"
            className="bg-surface-container-low border border-outline-variant/40 text-on-surface text-sm rounded-xl px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium"
          >
            <option value="">All Lecture Folders</option>
            {lectures.map((lec) => (
              <option key={lec._id} value={lec._id}>
                {lec.title} ({lec.subject})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div role="alert" className="max-w-7xl mx-auto mt-4 p-4 rounded-xl bg-error-container/40 border border-error/20 flex items-start justify-between gap-3 text-error">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-xs font-semibold hover:underline">Dismiss</button>
        </div>
      )}

      {/* ── Main Notes Container ── */}
      <main className="max-w-7xl mx-auto mt-6">
        {loading || loadingLectures ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-on-surface-variant">Loading topic notes and generation metadata…</p>
          </div>
        ) : !selectedLectureId ? (
          lectures.length > 0 ? (
            <section aria-label="Lecture note folders">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-on-surface">Your Lecture Folders</h2>
                <p className="mt-1 text-sm text-on-surface-variant">Open a folder to view and manage its handwritten topic notes.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {lectures.map((lecture) => (
                  <button
                    key={lecture._id}
                    type="button"
                    onClick={() => openLectureFolder(lecture._id)}
                    className="group flex min-h-36 items-center gap-4 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-on-primary">
                      <span className="material-symbols-outlined text-[30px]">folder</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-bold text-on-surface group-hover:text-primary">{lecture.title}</span>
                      <span className="mt-1 block truncate text-xs text-on-surface-variant">{lecture.subject || 'General'}</span>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                        Open notes
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <div className="bg-surface-container-lowest rounded-2xl p-8 sm:p-12 text-center border border-outline-variant/30 flex flex-col items-center max-w-xl mx-auto my-12 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-surface-container-high text-primary flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[32px]">folder_off</span>
              </div>
              <h2 className="text-xl font-bold text-on-surface mb-2">No Lecture Folders Yet</h2>
              <p className="text-sm text-on-surface-variant mb-6">Add a lecture to create a folder for its handwritten topic notes.</p>
              <Link
                to="/lectures"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary-container transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">video_library</span>
                <span>View My Lectures</span>
              </Link>
            </div>
          )
        ) : topics.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-8 sm:p-12 text-center border border-outline-variant/30 flex flex-col items-center max-w-xl mx-auto my-12 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-surface-container-high text-primary flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[32px]">folder_off</span>
            </div>
            <h2 className="text-xl font-bold text-on-surface mb-2">No Topics Available</h2>
            <p className="text-sm text-on-surface-variant mb-6">
              This lecture does not have segmented topics yet. Open the lecture in Interactive Learning to run the AI analysis pipeline first.
            </p>
            <Link
              to="/lectures"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary-container transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">video_library</span>
              <span>View My Lectures</span>
            </Link>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={closeLectureFolder}
              className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>All Lecture Folders</span>
            </button>

            {/* ── Section Header Stats & Download All ZIP ── */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 sm:p-6 border border-outline-variant/30 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div>
                  <span className="text-xs text-on-surface-variant block">Lecture</span>
                  <span className="text-base font-bold text-on-surface">{notesData?.lectureTitle}</span>
                </div>
                <div className="h-8 w-px bg-outline-variant/40 hidden sm:block" />
                <div>
                  <span className="text-xs text-on-surface-variant block">Total Topics</span>
                  <span className="text-base font-bold text-on-surface">{topics.length}</span>
                </div>
                <div className="h-8 w-px bg-outline-variant/40 hidden sm:block" />
                <div>
                  <span className="text-xs text-on-surface-variant block">Generated Notes</span>
                  <span className="text-base font-bold text-primary">
                    {completedNotesCount} / {topics.length}
                  </span>
                </div>
                <div className="h-8 w-px bg-outline-variant/40 hidden sm:block" />
                <div>
                  <span className="text-xs text-on-surface-variant block">Status</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    isAllGenerated
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : completedNotesCount > 0
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-surface-container-high text-on-surface-variant'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isAllGenerated ? 'bg-emerald-500' : completedNotesCount > 0 ? 'bg-amber-500' : 'bg-outline'}`} />
                    {isAllGenerated ? 'All Notes Ready' : completedNotesCount > 0 ? 'Partially Generated' : 'Not Generated'}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Download All ZIP + Bulk Generate */}
              <div className="flex items-center gap-3 shrink-0">
                {!isAllGenerated && (
                  <button
                    onClick={handleGenerateAll}
                    disabled={isBulkGenerating}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${isBulkGenerating ? 'animate-spin' : ''}`}>
                      {isBulkGenerating ? 'sync' : 'auto_awesome'}
                    </span>
                    <span>{isBulkGenerating ? 'Generating All…' : 'Generate Missing'}</span>
                  </button>
                )}

                <button
                  onClick={handleDownloadAllZip}
                  disabled={completedNotesCount === 0 || isZipDownloading}
                  title={completedNotesCount === 0 ? 'Generate notes first to download ZIP' : 'Download all topic notes as a ZIP file'}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-xs sm:text-sm font-semibold shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className={`material-symbols-outlined text-[19px] ${isZipDownloading ? 'animate-bounce' : ''}`}>
                    {isZipDownloading ? 'hourglass_top' : 'folder_zip'}
                  </span>
                  <span>{isZipDownloading ? 'Preparing ZIP…' : 'Download All (.ZIP)'}</span>
                </button>
              </div>
            </div>

            {/* ── Empty State If No Notes Generated At All ── */}
            {completedNotesCount === 0 && !isBulkGenerating && (
              <div className="bg-surface-container-lowest rounded-2xl p-8 sm:p-12 text-center border border-dashed border-outline-variant/60 flex flex-col items-center max-w-2xl mx-auto mb-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[34px]">history_edu</span>
                </div>
                <h3 className="text-xl font-bold text-on-surface mb-2">No handwritten notes generated yet</h3>
                <p className="text-sm text-on-surface-variant max-w-md mb-6 leading-relaxed">
                  Generate separate, beautiful handwritten infographic notes for each topic in this lecture. Each topic will receive a distinct high-resolution infographic page based on its transcript segment.
                </p>
                <button
                  onClick={handleGenerateAll}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-md hover:bg-primary-container hover:shadow-lg transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                  <span>Generate Notes for All Topics</span>
                </button>
              </div>
            )}

            {/* ── Topic-Wise Notes List (Cards / Rows) ── */}
            <div className="space-y-4">
              {topics.map((topic) => {
                const isCompleted = topic.generationStatus === 'completed' && Boolean(topic.imageUrl);
                const isProcessing = topic.generationStatus === 'processing' || topicActionState[topic.topicIndex] === 'generating' || topicActionState[topic.topicIndex] === 'regenerating';
                const isFailed = topic.generationStatus === 'failed';
                const isDownloading = topicActionState[topic.topicIndex] === 'downloading';

                return (
                  <div
                    key={topic.topicIndex}
                    className="group bg-surface-container-lowest rounded-2xl p-4 sm:p-5 border border-outline-variant/30 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Left: Topic info & thumbnail */}
                    <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                      {/* Thumbnail or placeholder */}
                      <div className="w-20 h-28 sm:w-24 sm:h-32 rounded-xl bg-surface-container-low border border-outline-variant/40 shrink-0 overflow-hidden relative flex items-center justify-center group-hover:border-primary/50 transition-colors">
                        {isCompleted ? (
                          <button
                            type="button"
                            onClick={() => openViewerForTopic(topic)}
                            aria-label={`View full infographic notes for ${topic.topicTitle}`}
                            className="w-full h-full relative cursor-pointer group/thumb"
                          >
                            <img
                              src={topic.imageUrl}
                              alt={`Handwritten notes thumbnail for ${topic.topicTitle}`}
                              className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <span className="material-symbols-outlined text-[24px]">visibility</span>
                            </div>
                          </button>
                        ) : isProcessing ? (
                          <div className="flex flex-col items-center justify-center text-primary p-2 text-center">
                            <span className="material-symbols-outlined text-[26px] animate-spin">refresh</span>
                            <span className="text-[10px] font-semibold mt-1">Generating…</span>
                          </div>
                        ) : isFailed ? (
                          <div className="flex flex-col items-center justify-center text-error p-2 text-center">
                            <span className="material-symbols-outlined text-[26px]">report</span>
                            <span className="text-[10px] font-semibold mt-1">Failed</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-outline p-2 text-center">
                            <span className="material-symbols-outlined text-[26px]">menu_book</span>
                            <span className="text-[10px] font-medium mt-1">No Notes</span>
                          </div>
                        )}
                      </div>

                      {/* Topic metadata */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-surface-container text-primary">
                            TOPIC {String(topic.topicIndex).padStart(2, '0')}
                          </span>
                          {topic.startTime && (
                            <span className="text-[11px] font-mono text-outline flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[13px]">schedule</span>
                              {topic.startTime} - {topic.endTime}
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isCompleted
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : isProcessing
                                ? 'bg-primary/10 text-primary animate-pulse'
                                : isFailed
                                  ? 'bg-error-container/40 text-error'
                                  : 'bg-surface-container text-on-surface-variant'
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${isCompleted ? 'bg-emerald-500' : isProcessing ? 'bg-primary' : isFailed ? 'bg-error' : 'bg-outline'}`} />
                            {isCompleted ? 'Ready' : isProcessing ? 'Generating…' : isFailed ? 'Failed' : 'Not Generated'}
                          </span>
                        </div>

                        <h2 className="text-base font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                          {topic.topicTitle}
                        </h2>

                        <p className="text-xs text-on-surface-variant line-clamp-2 mt-1">
                          {topic.summary || 'Summary and transcript context available for notes synthesis.'}
                        </p>

                        {/* Key Terms tags */}
                        {topic.keyTerms?.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            {topic.keyTerms.slice(0, 4).map((term) => (
                              <span key={term} className="px-2 py-0.5 rounded-md bg-surface-container-low text-on-surface-variant text-[10px] font-medium">
                                #{term}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Error info if failed */}
                        {isFailed && topic.errorMessage && (
                          <p className="text-xs text-error mt-2 font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">info</span>
                            <span>{topic.errorMessage}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions (View, Download, Generate/Regenerate) */}
                    <div className="flex items-center justify-end gap-2.5 pt-3 md:pt-0 border-t md:border-t-0 border-outline-variant/20 shrink-0">
                      {isCompleted && (
                        <>
                          {/* View Button */}
                          <button
                            onClick={() => openViewerForTopic(topic)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors"
                          >
                            <span className="material-symbols-outlined text-[17px]">visibility</span>
                            <span>View</span>
                          </button>

                          {/* Individual Download Button (Distinct on right side) */}
                          <button
                            onClick={() => handleDownloadSingle(topic)}
                            disabled={isDownloading}
                            title="Download notes image for this topic"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            <span className={`material-symbols-outlined text-[17px] ${isDownloading ? 'animate-bounce' : ''}`}>
                              download
                            </span>
                            <span>{isDownloading ? 'Downloading…' : 'Download'}</span>
                          </button>

                          {/* Regenerate Action */}
                          <button
                            onClick={() => handleRegenerateTopic(topic)}
                            disabled={isProcessing}
                            title="Regenerate notes for this topic"
                            className="w-9 h-9 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
                          >
                            <span className={`material-symbols-outlined text-[17px] ${isProcessing ? 'animate-spin' : ''}`}>
                              cached
                            </span>
                          </button>
                        </>
                      )}

                      {!isCompleted && !isProcessing && (
                        <button
                          onClick={() => handleGenerateTopic(topic)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-xs font-bold transition-all shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[17px]">auto_awesome</span>
                          <span>{isFailed ? 'Retry Notes' : 'Generate Notes'}</span>
                        </button>
                      )}

                      {isProcessing && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container text-primary text-xs font-semibold">
                          <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <span>Generating notes…</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── Fullscreen High-Resolution Viewer Modal ── */}
      {viewerTopic && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-6 overflow-hidden animate-fadeIn">
          {/* Viewer Header */}
          <div className="w-full max-w-5xl flex items-center justify-between text-white pb-3 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <span className="px-2 py-0.5 rounded bg-primary text-white text-xs font-mono font-bold">
                TOPIC {String(viewerTopic.topicIndex).padStart(2, '0')}
              </span>
              <h2 className="text-sm sm:text-base font-bold truncate">
                {viewerTopic.topicTitle}
              </h2>
            </div>

            {/* Viewer Controls: Zoom In/Out, Download, Close */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                title="Zoom out"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <span className="material-symbols-outlined text-[18px]">zoom_out</span>
              </button>
              <span className="text-xs font-mono px-1">{Math.round(zoomLevel * 100)}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                title="Zoom in"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <span className="material-symbols-outlined text-[18px]">zoom_in</span>
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                title="Reset zoom"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <span className="material-symbols-outlined text-[18px]">fit_screen</span>
              </button>
              <div className="h-5 w-px bg-white/20 mx-1" />
              <button
                onClick={() => handleDownloadSingle(viewerTopic)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-bold"
              >
                <span className="material-symbols-outlined text-[17px]">download</span>
                <span className="hidden sm:inline">Download</span>
              </button>
              <button
                onClick={() => setViewerTopic(null)}
                aria-label="Close notes viewer"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white ml-1"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          {/* Viewer Image Body */}
          <div className="flex-1 w-full flex items-center justify-center overflow-auto my-3 p-2 relative">
            {/* Prev Topic Button */}
            <button
              onClick={() => navigateViewer('prev')}
              title="Previous topic notes"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition-all"
            >
              <span className="material-symbols-outlined text-[22px]">chevron_left</span>
            </button>

            {/* Note Infographic Image */}
            <div
              className="transition-transform duration-200 ease-out max-h-full flex items-center justify-center shadow-2xl rounded-lg overflow-hidden bg-white"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <img
                src={viewerTopic.imageUrl}
                alt={`Handwritten infographic notes for ${viewerTopic.topicTitle}`}
                className="max-h-[82vh] w-auto object-contain rounded-lg"
              />
            </div>

            {/* Next Topic Button */}
            <button
              onClick={() => navigateViewer('next')}
              title="Next topic notes"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition-all"
            >
              <span className="material-symbols-outlined text-[22px]">chevron_right</span>
            </button>
          </div>

          {/* Viewer Footer info */}
          <div className="w-full max-w-5xl flex items-center justify-between text-xs text-white/60 pt-2 border-t border-white/10 shrink-0">
            <span>Use zoom controls or scroll to read fine handwriting &amp; formulas.</span>
            <span>Portrait 2:3 Aspect Ratio • Educational Infographic</span>
          </div>
        </div>
      )}
    </div>
  );
}
