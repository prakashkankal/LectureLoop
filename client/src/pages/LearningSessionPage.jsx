import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { createLectureBookmark, fetchLecture, fetchLectureSession, fetchLectureTopicNotes, generateTopicNote, downloadAuthenticatedFile, flagLectureTopicForReview, markLectureTopicComplete, saveLectureNote, saveLectureSession, submitLectureQuizAttempt } from '../services/api.js';

// ─── Mock session data ────────────────────────────────────────────────────────

// ─── Topic status icon ────────────────────────────────────────────────────────
function TopicIcon({ status }) {
  if (status === 'done')
    return <span className="material-symbols-outlined text-tertiary text-[20px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>;
  if (status === 'active')
    return <span className="material-symbols-outlined text-primary text-[20px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>radio_button_checked</span>;
  if (status === 'locked')
    return <span className="material-symbols-outlined text-outline text-[20px] shrink-0">lock</span>;
  return <span className="material-symbols-outlined text-outline text-[20px] shrink-0">play_circle</span>;
}

// ─── Time format helpers ──────────────────────────────────────────────────────
function formatTime(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '00:00';
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function parseTimeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const parts = String(timeStr).split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(timeStr) || 0;
}

// ─── YouTube IFrame Player ────────────────────────────────────────────────────
function YouTubePlayer({ videoId, startSec, paused, onReady, onPlayStateChange, onPlayerError }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    let disposed = false;
    const previousReadyHandler = window.onYouTubeIframeAPIReady;
    // Load YouTube IFrame API once
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    const initPlayer = () => {
      if (disposed || playerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          start: startSec,
          autoplay: 0,
          rel: 0,
          modestbranding: 1,
          controls: 0,
          disablekb: 0,
          fs: 1, // Enable full screen
          iv_load_policy: 3,
        },
        events: {
          onReady: (e) => {
            onReady?.(e.target);
          },
          onStateChange: (e) => {
            // YT.PlayerState.PLAYING = 1, PAUSED = 2, ENDED = 0
            if (e.data === 1) onPlayStateChange?.(true);
            else if (e.data === 2 || e.data === 0) onPlayStateChange?.(false);
          },
          onError: (e) => onPlayerError?.(`YouTube could not play this video (error ${e.data}). Check the video link or its playback permissions.`),
        },
      });
    };

    const readyHandler = () => {
      previousReadyHandler?.();
      initPlayer();
    };
    if (window.YT?.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = readyHandler;
    }

    return () => {
      disposed = true;
      if (window.onYouTubeIframeAPIReady === readyHandler) window.onYouTubeIframeAPIReady = previousReadyHandler;
      // cleanup player on unmount
      try { playerRef.current?.destroy(); } catch (_) {}
      playerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  useEffect(() => {
    if (!playerRef.current) return;
    try {
      if (paused) {
        const state = playerRef.current.getPlayerState?.();
        if (state === 1) {
          playerRef.current.pauseVideo?.();
        }
      }
    } catch (_) {}
  }, [paused]);

  return (
    <div className="w-full h-full">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

// ─── Semantic icon for quiz options ──────────────────────────────────────────
function getOptionSemanticIcon(id, text = '') {
  const lower = text.toLowerCase();
  if (lower.includes('code') || lower.includes('compile') || lower.includes('program') || lower.includes('syntax') || lower.includes('develop')) return 'code';
  if (lower.includes('time') || lower.includes('track') || lower.includes('change') || lower.includes('history') || lower.includes('version')) return 'history';
  if (lower.includes('web') || lower.includes('host') || lower.includes('internet') || lower.includes('network') || lower.includes('site') || lower.includes('url')) return 'language';
  if (lower.includes('encrypt') || lower.includes('lock') || lower.includes('security') || lower.includes('protect') || lower.includes('auth')) return 'lock';
  if (lower.includes('data') || lower.includes('database') || lower.includes('storage') || lower.includes('save')) return 'database';
  if (lower.includes('file') || lower.includes('folder') || lower.includes('document')) return 'description';
  if (id === 'A') return 'code';
  if (id === 'B') return 'history';
  if (id === 'C') return 'language';
  if (id === 'D') return 'lock';
  return 'help_outline';
}

// ─── Checkpoint Quiz Card (Center flexible container matching design) ─────────
function CheckpointQuizCard({
  quiz,
  activeTopic,
  totalTopics,
  activeTopicQuizzes,
  activeQuizIndex,
  sessionData,
  isMarked,
  onToggleMark,
  onAnswer,
  onNavigateQuestion,
  onReturnToVideo,
  onContinueTopic,
}) {
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const submissionIdRef = useRef('');

  const totalQuestions = activeTopicQuizzes.length || 1;
  const currentAttempts = (sessionData?.quizAttempts || []).filter(
    (item) => item.topicIndex === activeTopic?.index && (item.quizIndex || 1) === activeQuizIndex
  );
  const latestAttempt = currentAttempts[currentAttempts.length - 1] || null;
  const isCorrect = latestAttempt?.correct === true;
  const isAttempted = !!latestAttempt;

  useEffect(() => {
    setError('');
    submissionIdRef.current = '';
    if (latestAttempt) {
      setSelected(latestAttempt.selectedAnswer);
    } else {
      setSelected(null);
    }
  }, [activeTopic?.index, activeQuizIndex, latestAttempt?.submissionId, latestAttempt?.selectedAnswer]);

  const handleSubmit = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      if (!submissionIdRef.current) {
        submissionIdRef.current = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      }
      await onAnswer(selected, submissionIdRef.current);
    } catch (err) {
      setError(err.message || 'Could not verify answer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (activeQuizIndex < totalQuestions) {
      onNavigateQuestion(activeQuizIndex + 1);
    } else {
      onContinueTopic();
    }
  };

  const progressPercent = Math.round((activeQuizIndex / totalQuestions) * 100);

  return (
    <div className="w-full flex flex-col rounded-2xl overflow-hidden shadow-lg border border-outline-variant/30 bg-surface-container-lowest animate-fade-in transition-all">
      {/* Top Banner with purple/indigo gradient matching design */}
      <div className="bg-gradient-to-r from-[#1d1145] via-[#2f1354] to-[#431b73] px-4 py-2.5 sm:px-5 sm:py-3 text-white flex flex-col gap-2 relative overflow-hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
              <span className="material-symbols-outlined text-[19px] text-white">quiz</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-medium text-violet-200/90 truncate">
                Topic {activeTopic?.index || 1}: {activeTopic?.title}
              </span>
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight">
                Checkpoint Quiz
              </h2>
            </div>
          </div>
          <div className="shrink-0 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white font-semibold text-xs shadow-xs">
            {activeQuizIndex} / {totalQuestions}
          </div>
        </div>

        {/* Progress bar inside banner */}
        <div className="flex items-center gap-2.5">
          <div className="flex-1 h-1.5 rounded-full bg-black/35 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-400 to-indigo-300 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold text-violet-200/90 shrink-0 font-mono">
            {progressPercent}% Complete
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3.5 sm:p-4 md:p-5 flex flex-col gap-2.5 sm:gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-on-surface-variant">
            Question {activeQuizIndex} of {totalQuestions}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
            <span className="material-symbols-outlined text-[13px]">radio_button_checked</span>
            Single Choice
          </span>
        </div>

        <h3 className="text-sm sm:text-base font-bold text-on-surface leading-snug tracking-tight">
          {quiz?.question}
        </h3>

        {error && (
          <p role="alert" className="p-2.5 rounded-lg bg-error/10 border border-error/30 text-xs text-error font-medium">
            {error}
          </p>
        )}

        {/* Options List */}
        <div className="flex flex-col gap-2">
          {(quiz?.options || []).map((opt) => {
            const isOptSelected = selected === opt.id;
            const isOptAttempted = isAttempted && latestAttempt?.selectedAnswer === opt.id;
            const isOptCorrect = isOptAttempted && isCorrect;
            const isOptIncorrect = isOptAttempted && !isCorrect;

            let borderClass = 'border-outline-variant/40 hover:border-primary/60 hover:bg-surface-container-low bg-surface-container-lowest';
            if (isOptCorrect) {
              borderClass = 'border-2 border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 shadow-sm';
            } else if (isOptIncorrect) {
              borderClass = 'border-2 border-error bg-error/10 text-error shadow-sm';
            } else if (isOptSelected) {
              borderClass = 'border-2 border-primary bg-primary/10 text-on-surface font-semibold shadow-xs';
            }

            return (
              <button
                key={opt.id}
                type="button"
                disabled={submitting}
                onClick={() => {
                  if (submitting) return;
                  setSelected(opt.id);
                  submissionIdRef.current = '';
                }}
                className={`w-full py-2 px-3 sm:py-2.5 sm:px-3.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all text-left cursor-pointer ${borderClass}`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                      isOptCorrect
                        ? 'bg-emerald-600 text-white'
                        : isOptIncorrect
                        ? 'bg-error text-white'
                        : isOptSelected
                        ? 'bg-primary text-on-primary'
                        : 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-violet-300'
                    }`}
                  >
                    {opt.id}
                  </span>
                  <span className="material-symbols-outlined text-[17px] text-on-surface-variant/70 shrink-0">
                    {getOptionSemanticIcon(opt.id, opt.text)}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-on-surface leading-tight">
                    {opt.text}
                  </span>
                </div>

                {isOptCorrect ? (
                  <span
                    className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[20px] shrink-0"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                ) : isOptIncorrect ? (
                  <span
                    className="material-symbols-outlined text-error text-[20px] shrink-0"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    cancel
                  </span>
                ) : isOptSelected ? (
                  <span className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center shrink-0">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  </span>
                ) : (
                  <span className="w-4 h-4 rounded-full border border-outline-variant/60 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback / Explanation */}
        {isAttempted && (
          <div
            className={`p-2.5 sm:p-3 rounded-lg border flex items-start gap-2.5 animate-fade-in ${
              isCorrect
                ? 'bg-emerald-500/10 border-emerald-500/30 text-on-surface'
                : 'bg-error/10 border-error/30 text-on-surface'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[18px] shrink-0 mt-0.5 ${
                isCorrect ? 'text-emerald-600' : 'text-error'
              }`}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {isCorrect ? 'check_circle' : 'info'}
            </span>
            <div className="flex flex-col gap-0.5 text-xs">
              <span className={`font-semibold ${isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-error'}`}>
                {isCorrect ? 'Correct! Well done.' : 'Not quite. Check the explanation:'}
              </span>
              <p className="text-on-surface-variant leading-relaxed">
                {quiz?.explanation || activeTopic?.summary || 'Review key terms for this chapter to solidify your grasp.'}
              </p>
            </div>
          </div>
        )}

        {/* Actions Row */}
        <div className="pt-2.5 border-t border-outline-variant/30 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleMark(activeQuizIndex)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                isMarked
                  ? 'border-pink-500/40 bg-pink-500/10 text-pink-600 dark:text-pink-400'
                  : 'border-outline-variant/50 text-on-surface hover:bg-surface-container-low'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[16px] ${
                  isMarked ? 'text-pink-600 dark:text-pink-400' : 'text-outline'
                }`}
                style={isMarked ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                bookmark
              </span>
              <span>{isMarked ? 'Marked' : 'Mark for Review'}</span>
            </button>

            <button
              type="button"
              onClick={onReturnToVideo}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">play_circle</span>
              <span className="hidden sm:inline">Return to Video</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isCorrect ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center justify-center gap-1.5 px-4 py-1.5 sm:px-5 sm:py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow active:translate-y-px transition-all cursor-pointer"
              >
                <span>{activeQuizIndex < totalQuestions ? 'Next Question' : 'Complete Checkpoint'}</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            ) : isAttempted && !isCorrect ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!selected || submitting}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-primary text-on-primary font-semibold text-xs sm:text-sm shadow-sm hover:opacity-95 transition-all disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">{submitting ? 'progress_activity' : 'refresh'}</span>
                  <span>{submitting ? 'Submitting…' : 'Retry Question'}</span>
                </button>
                {activeQuizIndex < totalQuestions && (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low text-xs font-medium"
                  >
                    <span>Skip</span>
                    <span className="material-symbols-outlined text-[15px]">skip_next</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!selected || submitting}
                className="flex items-center justify-center gap-1.5 px-4 py-1.5 sm:px-5 sm:py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow active:translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">{submitting ? 'progress_activity' : 'arrow_forward'}</span>
                <span>{submitting ? 'Checking…' : 'Next Question'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Quiz Right Sidebar Helper Panel ──────────────────────────────────────────
function QuizSidebar({
  activeTopic,
  activeTopicQuizzes,
  activeQuizIndex,
  sessionData,
  markedQuestions,
  onNavigateQuestion,
  timeLeft,
  quickTipDismissed,
  onDismissQuickTip,
}) {
  const totalQuestions = activeTopicQuizzes.length || 1;
  const attempts = (sessionData?.quizAttempts || []).filter(
    (item) => item.topicIndex === activeTopic?.index
  );
  const correctQuizIndexes = new Set(
    attempts.filter((a) => a.correct).map((a) => a.quizIndex || 1)
  );
  const answeredCount = correctQuizIndexes.size;
  const quizProgressPercent = Math.round((answeredCount / totalQuestions) * 100);

  // Reference 300s = 5m
  const initialTime = 300;
  const timeProgressPercent = Math.min(100, Math.max(0, (timeLeft / initialTime) * 100));

  const tipText =
    activeTopic?.summary ||
    'Version control helps you track changes, collaborate with others, and maintain different versions of your project over time.';

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Time Left Card */}
      <div className="bg-surface-container-lowest rounded-xl p-3 sm:p-3.5 border border-outline-variant/30 shadow-sm flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[19px]">timer</span>
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant block">
              Time Left
            </span>
            <span className="text-lg sm:text-xl font-bold font-mono text-on-surface leading-tight">
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
        <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${timeProgressPercent}%` }}
          />
        </div>
      </div>

      {/* Question Navigator Card */}
      <div className="bg-surface-container-lowest rounded-xl p-3 sm:p-3.5 border border-outline-variant/30 shadow-sm flex flex-col gap-3">
        <h3 className="text-xs font-bold text-on-surface">Question Navigator</h3>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-1.5 text-[10px] text-on-surface-variant">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
            <span>Current</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>Answered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-outline shrink-0" />
            <span>Not Answered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0" />
            <span>Marked</span>
          </div>
        </div>

        {/* Question Numbers Grid */}
        <div className="grid grid-cols-5 gap-1.5 pt-0.5">
          {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((qNum) => {
            const isCurrent = qNum === activeQuizIndex;
            const isAnswered = correctQuizIndexes.has(qNum);
            const isMarked = markedQuestions.has(qNum);

            let btnStyle = 'border border-outline-variant/60 text-on-surface hover:bg-surface-container-low';
            if (isCurrent) {
              btnStyle = 'bg-primary text-on-primary font-bold shadow-xs';
            } else if (isMarked) {
              btnStyle = 'border-2 border-pink-500 bg-pink-500/15 text-pink-600 dark:text-pink-400 font-bold';
            } else if (isAnswered) {
              btnStyle = 'border-2 border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold';
            }

            return (
              <button
                key={qNum}
                type="button"
                onClick={() => onNavigateQuestion(qNum)}
                className={`h-8 sm:h-8.5 rounded-lg flex items-center justify-center text-xs transition-all cursor-pointer ${btnStyle}`}
              >
                {qNum}
              </button>
            );
          })}
        </div>

        {/* Progress */}
        <div className="border-t border-outline-variant/30 pt-2 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-on-surface">
            <span>Quiz Progress</span>
            <span className="font-mono">{answeredCount}/{totalQuestions}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${quizProgressPercent}%` }}
            />
          </div>
          <span className="text-[10px] text-right text-on-surface-variant font-mono">
            {quizProgressPercent}% Complete
          </span>
        </div>
      </div>

      {/* Quick Tip Card */}
      {!quickTipDismissed && (
        <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-3 border border-primary/20 shadow-xs flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-primary font-bold text-xs">
              <span className="material-symbols-outlined text-[16px]">lightbulb</span>
              <span>Quick Tip</span>
            </div>
            <button
              type="button"
              onClick={onDismissQuickTip}
              className="text-on-surface-variant hover:text-on-surface p-0.5 rounded transition-colors"
              aria-label="Dismiss quick tip"
            >
              <span className="material-symbols-outlined text-[15px]">close</span>
            </button>
          </div>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            {tipText}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Remediation Panel ────────────────────────────────────────────────────────
function RemediationPanel({ attempt, topic, quiz, result, onRetry, onReviewFromStart, onReplayClip }) {
  const explanation = result?.explanation || quiz?.explanation || topic?.summary || 'Review the core definitions and properties for this topic.';
  const resultQuiz = result?.quiz || quiz;
  const correctOption = resultQuiz?.options?.find((option) => option.id === resultQuiz?.correctId);
  const tripUpText = topic?.summary && topic.summary !== explanation ? topic.summary : '';
  const timeLabel = topic ? `${topic.start || topic.startTime || '00:00'} – ${topic.end || topic.endTime || '00:00'}` : 'Segment';

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-md p-space-lg flex flex-col gap-space-lg h-full">
      {/* Attempt counter */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-fixed/40 text-on-secondary-fixed text-[11px] font-semibold">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          Attempt {attempt} • Reviewing Concept
        </div>
        <span className="material-symbols-outlined text-outline text-[20px]">help_center</span>
      </div>

      {/* Headline */}
      <div>
        <h2 className="text-lg font-semibold text-on-surface">Let's Review This Concept</h2>
        <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
          Take a moment to review this topic's explanation before attempting the checkpoint again.
        </p>
      </div>

      {/* Section A: Watch again */}
      <div className="flex flex-col gap-space-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-outline">Watch This Part Again</span>
          <span className="text-[11px] font-mono text-primary font-medium">{timeLabel}</span>
        </div>
        <div
          onClick={onReplayClip}
          className="bg-surface-container-low rounded-xl p-space-sm flex items-center gap-space-md group hover:bg-surface-container transition-all cursor-pointer"
        >
          <div className="relative w-20 h-14 rounded-lg overflow-hidden bg-surface-container-high shrink-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[24px] group-hover:scale-110 transition-transform">play_circle</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-on-surface group-hover:text-primary transition-colors line-clamp-1">
              {topic?.title || 'Current Topic Segment'}
            </span>
            <span className="text-[11px] text-on-surface-variant line-clamp-2">
              {topic?.summary || 'Re-watch this segment to reinforce your comprehension.'}
            </span>
          </div>
        </div>
        <button
          onClick={onReplayClip}
          className="w-full flex items-center justify-center gap-space-xs py-2 px-space-md rounded-lg bg-surface-container-high text-primary hover:bg-surface-variant transition-colors text-sm font-semibold mt-1"
        >
          <span className="material-symbols-outlined text-[18px]">replay</span>
          <span>Replay Segment ({timeLabel})</span>
        </button>
      </div>

      {/* Section B: Topic explanation */}
      <div className="flex flex-col gap-space-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-outline">Key Concept Notes</span>
          <span className="material-symbols-outlined text-outline text-[16px]">menu_book</span>
        </div>
        <div role="status" className="rounded-lg bg-error-container/40 p-space-sm text-xs text-on-surface">
          <p className="font-semibold text-error">That answer was incorrect.</p>
          {correctOption && <p className="mt-1">Correct answer: <span className="font-semibold">{correctOption.id}. {correctOption.text}</span></p>}
        </div>
        <div className="bg-surface-bright rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col gap-space-xs">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-secondary-container rounded-l-xl" />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold tracking-wide text-secondary uppercase">Explanation</span>
            <span className="material-symbols-outlined text-secondary text-[15px]">tips_and_updates</span>
          </div>
          <p className="text-xs text-on-surface leading-relaxed">
            {explanation}
          </p>
          {tripUpText && (
            <div className="bg-surface-container-lowest p-space-xs rounded-lg mt-1">
              <p className="text-[11px] text-on-surface-variant leading-normal">
                <strong className="text-primary font-medium">Checkpoint Note:</strong> {tripUpText}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Section C: Actions */}
      <div className="flex flex-col gap-space-xs pt-space-xs">
        <button
          id="retry-question-btn"
          onClick={onRetry}
          className="w-full py-2.5 px-space-md rounded-xl bg-primary text-on-primary hover:opacity-95 active:scale-[0.99] transition-all text-sm font-semibold shadow-md flex items-center justify-center gap-space-xs"
        >
          <span className="material-symbols-outlined text-[20px]">refresh</span>
          <span>Retry Question</span>
        </button>
        <button
          onClick={onReviewFromStart}
          className="w-full py-2 px-space-md rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors text-sm font-medium flex items-center justify-center gap-space-xs"
        >
          <span className="material-symbols-outlined text-[18px]">fast_rewind</span>
          <span>Rewind Topic to Start ({topic?.start || topic?.startTime || '00:00'})</span>
        </button>
      </div>
      {/* Previous answer footer */}
      <div className="pt-space-xs">
        <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-1">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[10px] font-semibold uppercase">Question Checkpoint</span>
          </div>
          <p className="text-xs text-on-surface line-clamp-2">"{quiz?.question || 'Review the checkpoint question.'}"</p>
        </div>
      </div>
    </div>
  );
}

// ─── Correct Answer Panel ─────────────────────────────────────────────────────
function CorrectPanel({ onContinue, isLastTopic, isLastQuestion, onBookmark, quiz, result }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-md p-space-lg flex flex-col gap-space-lg h-full items-center justify-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-tertiary-fixed/20 text-tertiary flex items-center justify-center">
        <span className="material-symbols-outlined text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
      </div>
      <div>
        <h2 className="text-xl font-bold text-on-surface">{isLastQuestion ? 'Topic Mastered!' : 'Correct Answer!'}</h2>
        <p className="text-sm text-on-surface-variant mt-2">
          {isLastQuestion ? 'You answered all topic questions correctly. Your checkpoint results have been saved.' : 'You answered correctly. Continue to the next question.'}
        </p>
        {(result?.explanation || quiz?.explanation) && <p className="mt-3 rounded-lg bg-tertiary-fixed/20 p-3 text-left text-sm text-on-surface">{result?.explanation || quiz.explanation}</p>}
      </div>
      <div className="flex flex-col gap-space-xs w-full">
        <button
          id="continue-topic-btn"
          onClick={onContinue}
          className="w-full py-3 rounded-xl bg-primary-container text-on-primary text-sm font-semibold shadow-md hover:bg-primary active:translate-y-px transition-all flex items-center justify-center gap-space-xs"
        >
          <span className="material-symbols-outlined text-[20px]">{!isLastQuestion ? 'quiz' : isLastTopic ? 'flag' : 'skip_next'}</span>
          <span>{!isLastQuestion ? 'Next Question' : isLastTopic ? 'Finish Session' : 'Continue to Next Topic'}</span>
        </button>
        <button onClick={onBookmark} className="w-full py-2 rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container text-sm font-medium flex items-center justify-center gap-space-xs transition-colors">
          <span className="material-symbols-outlined text-[18px]">bookmark_border</span>
          <span>Bookmark This Timestamp</span>
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LearningSessionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { lectureId: routeLectureId } = useParams();
  const lectureId = routeLectureId || searchParams.get('lectureId');
  const requestedTopicIndex = searchParams.has('topicIndex') ? Number(searchParams.get('topicIndex')) : null;
  const requestedSeek = searchParams.has('seek') ? Math.max(0, Number(searchParams.get('seek')) || 0) : null;
  const [lectureData, setLectureData] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const topicsLoadedForLectureRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setLoadError('');
      setLectureData(null);
      setSessionData(null);
      setTopics([]);
      topicsLoadedForLectureRef.current = null;
      if (!lectureId) {
        setLoadError('Choose a lecture from Interactive Learning to start a saved session.');
        setIsLoading(false);
        return;
      }

      try {
        const [data, savedSession] = await Promise.all([fetchLecture(lectureId), fetchLectureSession(lectureId)]);
        setLectureData(data);
        setSessionData(savedSession);
      } catch (err) {
        if (err.status === 401) {
          navigate('/login', { replace: true });
          return;
        }
        setLoadError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [lectureId, navigate]);

  const [activeTopicIdx, setActiveTopicIdx] = useState(0);
  const [phase, setPhase] = useState('watching'); // 'watching' | 'quiz' | 'remediation' | 'correct'
  const [attempt, setAttempt] = useState(1);
  const [activeQuizIndex, setActiveQuizIndex] = useState(1);
  const [quizResult, setQuizResult] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlaybackControls, setShowPlaybackControls] = useState(true);
  const [topics, setTopics] = useState([]);
  const playerRef = useRef(null);
  const playbackControlsTimeoutRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [transcriptQuery, setTranscriptQuery] = useState('');
  const [sessionNote, setSessionNote] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [bookmarks, setBookmarks] = useState([]);
  const [noteId, setNoteId] = useState('');
  const [noteDraftTopicIndex, setNoteDraftTopicIndex] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [sessionSaveError, setSessionSaveError] = useState('');
  const [checkpointMessage, setCheckpointMessage] = useState('');
  const [playerError, setPlayerError] = useState('');
  const [playerReady, setPlayerReady] = useState(false);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [topicsCollapsed, setTopicsCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1240);
  const [leftTab, setLeftTab] = useState('topics'); // 'topics' | 'quizzes'
  const [rightTab, setRightTab] = useState('transcript');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [checkpointOpen, setCheckpointOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('lectureloop-theme') === 'dark');
  const [markedQuestions, setMarkedQuestions] = useState(new Set());
  const [quizTimeLeft, setQuizTimeLeft] = useState(300);
  const [quickTipDismissed, setQuickTipDismissed] = useState(false);
  const [topicNotes, setTopicNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [generatingTopicIndex, setGeneratingTopicIndex] = useState(null);
  const [notesError, setNotesError] = useState('');
  const [viewerNoteTopic, setViewerNoteTopic] = useState(null);
  const [viewerZoom, setViewerZoom] = useState(1);

  const loadTopicNotesData = useCallback(async () => {
    if (!lectureId) return;
    try {
      setLoadingNotes(true);
      const data = await fetchLectureTopicNotes(lectureId);
      if (data?.topics) setTopicNotes(data.topics);
      setNotesError('');
    } catch (e) {
      setNotesError(e.message || 'Could not load handwritten notes. Please try again.');
      console.warn('[LearningSession] Failed to load topic notes:', e.message);
    } finally {
      setLoadingNotes(false);
    }
  }, [lectureId]);

  useEffect(() => {
    loadTopicNotesData();
  }, [loadTopicNotesData]);

  const handleGenerateNoteFromSession = async (topic) => {
    setGeneratingTopicIndex(topic.topicIndex);
    setNotesError('');
    try {
      await generateTopicNote(lectureId, topic.topicId || topic.topicIndex);
      await loadTopicNotesData();
    } catch (err) {
      setNotesError(err.message || 'Could not create handwritten notes. Please try again.');
      console.error('Note generation error:', err);
    } finally {
      setGeneratingTopicIndex(null);
    }
  };

  const handleDownloadNoteFromSession = async (topic) => {
    try {
      const filename = `${String(topic.topicIndex).padStart(2, '0')}-${topic.topicTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
      await downloadAuthenticatedFile(
        `/lectures/${lectureId}/topics/${topic.topicId || topic.topicIndex}/notes/download`,
        filename
      );
    } catch (err) {
      console.error('Note download error:', err);
    }
  };

  const handleDownloadAllZipFromSession = async () => {
    try {
      const safeTitle = (lectureData?.title || 'lecture').toLowerCase().replace(/[^a-z0-9]/g, '-');
      await downloadAuthenticatedFile(
        `/lectures/${lectureId}/notes/download-all`,
        `Lecture-Loop-${safeTitle}-Notes.zip`
      );
    } catch (err) {
      console.error('ZIP download error:', err);
    }
  };


  useEffect(() => {
    if (phase !== 'quiz') return;
    const timer = setInterval(() => {
      setQuizTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const handleToggleMark = useCallback((quizIndex) => {
    setMarkedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(quizIndex)) next.delete(quizIndex);
      else next.add(quizIndex);
      return next;
    });
  }, []);

  const centerColRef = useRef(null);
  const transcriptContainerRef = useRef(null);
  const [videoSectionHeight, setVideoSectionHeight] = useState(null);

  useEffect(() => {
    if (!centerColRef.current) return;
    const updateHeight = () => {
      if (centerColRef.current && window.innerWidth >= 1200) {
        setVideoSectionHeight(Math.round(centerColRef.current.offsetHeight));
      } else {
        setVideoSectionHeight(null);
      }
    };
    updateHeight();
    const ro = new ResizeObserver(() => {
      updateHeight();
    });
    ro.observe(centerColRef.current);
    window.addEventListener('resize', updateHeight);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, [phase]);

  const sessionDataRef = useRef(sessionData);
  const lastPositionSavedRef = useRef(0);
  const lastPositionSaveAtRef = useRef(0);
  const currentTimeRef = useRef(0);
  // Refs that keep polling interval free of stale closures
  const activeTopicRef = useRef(null);
  const phaseRef = useRef('watching');
  const currentQuizRef = useRef(null);
  const lectureIdRef = useRef(lectureId);
  const revealPlaybackControls = useCallback(() => {
    setShowPlaybackControls(true);
    window.clearTimeout(playbackControlsTimeoutRef.current);
    playbackControlsTimeoutRef.current = window.setTimeout(() => {
      setShowPlaybackControls(false);
    }, 5000);
  }, []);

  useEffect(() => {
    playbackControlsTimeoutRef.current = window.setTimeout(() => {
      setShowPlaybackControls(false);
    }, 5000);
    return () => window.clearTimeout(playbackControlsTimeoutRef.current);
  }, []);

  useEffect(() => { sessionDataRef.current = sessionData; }, [sessionData]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  // Keep live refs in sync with latest state for use inside the polling interval
  useEffect(() => { activeTopicRef.current = topics[activeTopicIdx] ?? null; }, [topics, activeTopicIdx]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { lectureIdRef.current = lectureId; }, [lectureId]);
  useEffect(() => {
    if (phase !== 'watching') {
      setChaptersOpen(false);
      setSettingsOpen(false);
      setCheckpointOpen(false);
    }
  }, [phase]);

  useEffect(() => {
    if (lectureData?.topics?.length > 0 && sessionData && topicsLoadedForLectureRef.current !== lectureId) {
      const loadedTopics = lectureData.topics.map((topic) => {
        const status = topic.completed ? 'done' : topic.locked ? 'locked' : 'available';
        return {
          ...topic,
          id: topic.index,
          start: topic.startTime,
          end: topic.endTime,
          startSec: topic.startSec ?? parseTimeToSeconds(topic.startTime),
          endSec: topic.endSec ?? parseTimeToSeconds(topic.endTime),
          status,
        };
      });
      setTopics(loadedTopics);
      topicsLoadedForLectureRef.current = lectureId;
      const requestedIndex = loadedTopics.findIndex((topic) => topic.index === requestedTopicIndex);
      const savedIndex = loadedTopics.findIndex((topic) => topic.index === sessionData?.session?.topicIndex);
      const firstIncomplete = loadedTopics.findIndex((topic) => topic.status !== 'done');
      setActiveTopicIdx(requestedIndex >= 0 ? requestedIndex : savedIndex >= 0 ? savedIndex : firstIncomplete >= 0 ? firstIncomplete : 0);
    }
  }, [lectureData, sessionData, lectureId, requestedTopicIndex]);

  useEffect(() => {
    if (!sessionData) return;
    setBookmarks((sessionData.bookmarks || []).map((item) => ({ id: item._id, time: item.timestampSec, title: item.label || lectureData?.topics?.find((topic) => topic.index === item.topicIndex)?.title || 'Bookmark', topicIndex: item.topicIndex })));
    setReviewQueue((sessionData.topics || []).filter((topic) => topic.needsReview).map((topic) => topic.title));
  }, [sessionData, lectureData]);

  useEffect(() => {
    const topicIndex = lectureData?.topics?.[activeTopicIdx]?.index;
    setAttempt((sessionData?.quizAttempts || []).filter((item) =>
      item.topicIndex === topicIndex && (item.quizIndex || 1) === activeQuizIndex
    ).length + 1);
  }, [sessionData?.quizAttempts, lectureData, activeTopicIdx, activeQuizIndex]);

  useEffect(() => {
    const topicIndex = lectureData?.topics?.[activeTopicIdx]?.index;
    const note = (sessionData?.notes || []).find((item) => item.topicIndex === topicIndex);
    setNoteId(note?._id || '');
    setSessionNote(note?.content || '');
    setNoteDraftTopicIndex(topicIndex ?? null);
  }, [sessionData, lectureData, activeTopicIdx]);

  const activeTopic = topics[activeTopicIdx];
  const totalTopics = topics.length;
  const completedCount = topics.filter((t) => t.status === 'done').length;
  const progress = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;
  const activeTopicQuizzes = activeTopic
    ? (lectureData?.quizzes || [])
        .filter((quiz) => quiz.topicIndex === activeTopic.index)
        .sort((a, b) => (a.quizIndex || 1) - (b.quizIndex || 1))
    : [];
  const currentQuiz = activeTopicQuizzes.find((quiz) => (quiz.quizIndex || 1) === activeQuizIndex) || null;
  // Keep ref in sync so polling interval always has the latest quiz
  currentQuizRef.current = currentQuiz;
  const timelineRef = useRef(null);
  const isScrubbingRef = useRef(false);
  const wasPlayingBeforeScrubRef = useRef(false);

  const lectureTotalDuration = playerDuration;
  const nextCheckpoint = topics.find((topic) => topic.endSec > currentTime) || null;
  const getTopicResumeSec = (topic) => sessionData?.session?.topicPositions?.find((item) => item.topicIndex === topic?.index)?.positionSec ?? topic?.startSec ?? 0;

  useEffect(() => {
    if (!lectureId || !sessionData || !activeTopic || noteDraftTopicIndex !== activeTopic.index) return undefined;
    const existing = (sessionData.notes || []).find((item) => item._id === noteId);
    if (!sessionNote.trim() && !existing) return undefined;
    if (existing?.content === sessionNote) return undefined;
    const timer = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const savedNote = await saveLectureNote(lectureId, {
          noteId: noteId || undefined,
          topicIndex: activeTopic.index,
          timestampSec: currentTimeRef.current,
          content: sessionNote,
        });
        setNoteId(savedNote._id);
        setSessionData((data) => ({ ...data, notes: [...(data.notes || []).filter((item) => item._id !== savedNote._id), savedNote] }));
        setSaveStatus('saved');
        setSessionSaveError('');
      } catch (error) {
        setSaveStatus('error');
        setSessionSaveError(error.message);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [lectureId, sessionData, activeTopic, noteDraftTopicIndex, noteId, sessionNote]);

  const handlePlayerReady = useCallback((player) => {
    playerRef.current = player;
    setPlayerReady(true);
    setPlayerDuration(player.getDuration?.() || 0);
    const savedSession = sessionDataRef.current?.session;
    const topicPosition = savedSession?.topicPositions?.find((item) => item.topicIndex === activeTopic?.index)?.positionSec;
    const savedPosition = requestedSeek ?? (Number(topicPosition ?? savedSession?.positionSec) || 0);
    lastPositionSavedRef.current = savedPosition;
    if (requestedSeek != null || savedPosition > 0) {
      player.seekTo(savedPosition, true);
      setCurrentTime(savedPosition);
    }
  }, [requestedSeek, activeTopic?.index]);

  const seekTo = useCallback((sec) => {
    playerRef.current?.seekTo?.(sec, true);
    setCurrentTime(sec);
  }, []);

  const persistPosition = useCallback(async (positionSec = currentTimeRef.current, topic = activeTopic) => {
    if (!lectureId || topic?.index == null || !Number.isFinite(positionSec)) return false;
    try {
      const savedSession = await saveLectureSession(lectureId, { positionSec, topicIndex: topic.index });
      lastPositionSavedRef.current = positionSec;
      setSessionData((data) => ({ ...data, session: savedSession }));
      setSaveStatus('saved');
      setSessionSaveError('');
      return true;
    } catch (error) {
      setSaveStatus('error');
      setSessionSaveError(error.message);
      return false;
    }
  }, [lectureId, activeTopic]);

  const allTranscriptLines = [...(lectureData?.transcript || '').matchAll(/\[(\d{2}:\d{2}(?::\d{2})?)\]\s*([^[]+)/g)]
    .map((match) => ({ time: match[1], seconds: parseTimeToSeconds(match[1]), text: match[2].trim() }))
    .filter((line) => line.text)
    .map((line, index, items) => ({ ...line, nextSec: items[index + 1]?.seconds ?? Infinity }));
  const transcriptLines = allTranscriptLines.filter((line) => line.text.toLowerCase().includes(transcriptQuery.toLowerCase()));
  const currentTranscriptLine = allTranscriptLines.find((line) => currentTime >= line.seconds && currentTime < line.nextSec);
  const currentTranscriptLineSeconds = currentTranscriptLine?.seconds;

  useEffect(() => {
    if (rightTab !== 'transcript' || currentTranscriptLineSeconds == null) return;
    const container = transcriptContainerRef.current;
    if (!container) return;

    const activeEl = document.getElementById(`transcript-line-${currentTranscriptLineSeconds}`);
    if (!activeEl) return;

    // Use getBoundingClientRect for bulletproof relative positioning inside the scrolling container
    const containerRect = container.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    const relativeTop = activeRect.top - containerRect.top + container.scrollTop;

    // Position active line at ~30% from the top so previous lines remain visible above
    const targetScrollTop = relativeTop - (container.clientHeight * 0.30);

    container.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth',
    });
  }, [currentTranscriptLineSeconds, rightTab]);

  const showSaved = (message) => {
    setSavedMessage(message);
    window.setTimeout(() => setSavedMessage(''), 1800);
  };
  const addBookmark = async () => {
    if (!lectureId || !activeTopic) return;
    try {
      const saved = await createLectureBookmark(lectureId, { topicIndex: activeTopic.index, timestampSec: Math.floor(currentTime), label: activeTopic.title });
      const item = { id: saved._id, time: saved.timestampSec, title: saved.label || activeTopic.title, topicIndex: saved.topicIndex };
      setBookmarks((items) => items.some((entry) => entry.id === item.id || (entry.time === item.time && entry.topicIndex === item.topicIndex)) ? items : [...items, item]);
      setSessionData((data) => ({ ...data, bookmarks: [...(data?.bookmarks || []).filter((entry) => entry._id !== saved._id), saved] }));
      showSaved('Timestamp bookmarked');
      setSessionSaveError('');
    } catch (error) {
      setSessionSaveError(error.message);
      showSaved('Bookmark could not be saved');
    }
  };
  const persistCurrentNote = async () => {
    if (!lectureId || !activeTopic || (!sessionNote.trim() && !noteId)) return;
    setSaveStatus('saving');
    try {
      const savedNote = await saveLectureNote(lectureId, { noteId: noteId || undefined, topicIndex: activeTopic.index, timestampSec: currentTimeRef.current, content: sessionNote });
      setNoteId(savedNote._id);
      setSessionData((data) => ({ ...data, notes: [...(data.notes || []).filter((item) => item._id !== savedNote._id), savedNote] }));
      setSaveStatus('saved');
      setSessionSaveError('');
      return true;
    } catch (error) {
      setSaveStatus('error');
      setSessionSaveError(error.message);
      return false;
    }
  };
  const addToRevision = async () => {
    const label = activeTopic?.title || 'Current topic';
    if (!lectureId || activeTopic?.index == null) return;
    try {
      const response = await flagLectureTopicForReview(lectureId, activeTopic.index);
      setReviewQueue((items) => items.includes(label) ? items : [...items, label]);
      setSessionData((data) => ({ ...data, topics: response.topics }));
      showSaved('Added to revision');
      setSessionSaveError('');
    } catch (error) {
      setSessionSaveError(error.message);
      showSaved('Could not add to revision');
    }
  };
  const markCurrentComplete = async () => {
    if (!lectureId || activeTopic?.index == null) return;
    try {
      const response = await markLectureTopicComplete(lectureId, activeTopic.index);
      setTopics((items) => items.map((topic, index) => index === activeTopicIdx ? { ...topic, status: 'done', completed: true } : topic));
      setSessionData((data) => ({ ...data, topics: response.topics }));
      showSaved('Topic marked complete');
      setSessionSaveError('');
    } catch (error) {
      setSessionSaveError(error.message);
      showSaved('Completion could not be saved');
    }
  };
  const toggleCaptions = () => {
    const next = !captionsOn;
    setCaptionsOn(next);
    playerRef.current?.loadModule?.('captions');
    playerRef.current?.setOption?.('captions', 'track', next ? {} : null);
  };
  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
    localStorage.setItem('lectureloop-theme', next ? 'dark' : 'light');
  };

  // Active continuous polling to keep currentTime and player state in sync.
  // Uses refs for all mutable values so the interval never needs to be torn
  // down/recreated, eliminating stale-closure bugs.
  useEffect(() => {
    const timer = setInterval(() => {
      if (!playerRef.current) return;
      try {
        const t = playerRef.current.getCurrentTime?.();
        const actualDuration = playerRef.current.getDuration?.();
        if (actualDuration > 0) setPlayerDuration((previous) => previous || actualDuration);
        if (typeof t === 'number' && Number.isFinite(t)) {
          setCurrentTime(t);
          const lid = lectureIdRef.current;
          const topic = activeTopicRef.current;
          if (lid && Math.abs(t - lastPositionSavedRef.current) >= 2 && Date.now() - lastPositionSaveAtRef.current >= 5000 && topic?.index != null) {
            lastPositionSaveAtRef.current = Date.now();
            saveLectureSession(lid, { positionSec: t, topicIndex: topic.index })
              .then((savedSession) => { lastPositionSavedRef.current = t; setSessionData((data) => ({ ...data, session: savedSession })); setSaveStatus('saved'); setSessionSaveError(''); })
              .catch((error) => { setSaveStatus('error'); setSessionSaveError(error.message); });
          }
        }
        const state = playerRef.current.getPlayerState?.();
        // 1 = PLAYING, 2 = PAUSED, 0 = ENDED, 3 = BUFFERING
        if (state === 1) {
          setIsPlaying(true);
          const topic = activeTopicRef.current;
          const currentPhase = phaseRef.current;
          const quiz = currentQuizRef.current;
          if (currentPhase === 'watching' && topic?.endSec && t >= topic.endSec) {
            playerRef.current.pauseVideo?.();
            setIsPlaying(false);
            if (quiz) {
              setPhase('quiz');
            } else {
              setCheckpointMessage('There is no checkpoint quiz configured for this topic. Your completion has not been changed.');
            }
          }
        } else if (state === 2 || state === 0) {
          setIsPlaying(false);
        }
      } catch (_) {}
    }, 200);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // stable — reads all mutable values from refs, never stale

  if (isLoading) {
    return <div aria-label="Loading learning session" className="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)_340px] gap-4 p-4 animate-pulse"><div className="h-[calc(100vh-8rem)] rounded-xl bg-surface-container-high" /><div className="space-y-4"><div className="aspect-video rounded-xl bg-surface-container-high" /><div className="h-14 rounded-xl bg-surface-container-high" /><div className="h-48 rounded-xl bg-surface-container-high" /></div><div className="h-[calc(100vh-8rem)] rounded-xl bg-surface-container-high hidden xl:block" /></div>;
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4 text-error max-w-md text-center px-6">
          <h2 className="text-lg font-semibold">Failed to load session</h2>
          <p className="text-sm text-on-surface-variant">{loadError}</p>
          <div className="flex flex-wrap justify-center gap-2"><button onClick={() => window.location.reload()} className="mt-2 px-6 py-2 rounded-xl bg-primary-container text-on-primary text-sm font-medium">Retry</button><button onClick={() => navigate('/interactive')} className="mt-2 px-6 py-2 rounded-xl bg-surface-container-low text-on-surface-variant text-sm font-medium">Go Back</button></div>
        </div>
      </div>
    );
  }

  if (topics.length === 0) {
    const analysisMessage = lectureData?.analysisStatus === 'failed'
      ? lectureData.analysisError || 'The lecture could not be analyzed.'
      : lectureData?.analysisStatus === 'processing' || lectureData?.analysisStatus === 'pending'
        ? 'Lecture analysis is still processing. Return to your lecture list and reopen this session when it is ready.'
        : 'No topic segments are available for this lecture yet.';
    return <div className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center px-6 text-center"><span className="material-symbols-outlined mb-3 text-4xl text-outline">video_library</span><h2 className="text-lg font-semibold text-on-surface">Learning session unavailable</h2><p className="mt-2 text-sm text-on-surface-variant">{analysisMessage}</p><button onClick={() => navigate('/interactive')} className="mt-5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary">Return to Interactive Learning</button></div>;
  }

  const handlePlayPause = () => {
    if (!playerRef.current || phase !== 'watching') return;
    const state = playerRef.current.getPlayerState?.();
    if (state === 1) {
      playerRef.current.pauseVideo?.();
      setIsPlaying(false);
      void persistPosition();
    } else {
      playerRef.current.playVideo?.();
      setIsPlaying(true);
    }
  };

  const handleRewind10 = () => {
    if (!playerRef.current || phase !== 'watching') return;
    const t = playerRef.current.getCurrentTime?.() || 0;
    seekTo(Math.max(0, t - 10));
  };

  const handleForward10 = () => {
    if (!playerRef.current || phase !== 'watching') return;
    const t = playerRef.current.getCurrentTime?.() || 0;
    const dur = lectureTotalDuration || playerRef.current.getDuration?.() || 9999;
    seekTo(Math.min(dur, t + 10));
  };

  const handleVolumeChange = (newVol) => {
    if (!playerRef.current) return;
    setVolume(newVol);
    playerRef.current.setVolume?.(newVol);
    if (newVol === 0) {
      playerRef.current.mute?.();
      setIsMuted(true);
    } else if (isMuted) {
      playerRef.current.unMute?.();
      setIsMuted(false);
    }
  };

  const handleFullscreen = () => {
    const container = document.getElementById('video-player-container');
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const seekFromTimeline = (e, resumePlayback = true, savePosition = true) => {
    if (!timelineRef.current || phase !== 'watching') return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetDuration = playerDuration || playerRef.current?.getDuration?.() || 0;
    if (!targetDuration) return;

    const targetSec = Math.round(ratio * targetDuration);
    if (savePosition) void persistPosition(currentTime, activeTopic);

    const foundIdx = topics.findIndex(
      (t) => targetSec >= (t.startSec || 0) && targetSec < (t.endSec || 999999)
    );
    if (foundIdx >= 0) {
      setActiveTopicIdx(foundIdx);
      if (phase !== 'watching') setPhase('watching');
    }

    seekTo(targetSec);
    if (resumePlayback) {
      playerRef.current?.playVideo?.();
      setIsPlaying(true);
    }
  };

  const handleTimelinePointerDown = (event) => {
    if (!lectureTotalDuration || phase !== 'watching') return;
    event.currentTarget.setPointerCapture(event.pointerId);
    timelineRef.current?.focus();
    wasPlayingBeforeScrubRef.current = isPlaying;
    isScrubbingRef.current = true;
    seekFromTimeline(event, false);
  };

  const handleTimelinePointerMove = (event) => {
    if (isScrubbingRef.current) seekFromTimeline(event, false, false);
  };

  const handleTimelinePointerUp = () => {
    isScrubbingRef.current = false;
    const finalPosition = playerRef.current?.getCurrentTime?.();
    if (Number.isFinite(finalPosition)) {
      setCurrentTime(finalPosition);
      void persistPosition(finalPosition, activeTopic);
    }
    if (wasPlayingBeforeScrubRef.current && phase === 'watching') {
      playerRef.current?.playVideo?.();
      setIsPlaying(true);
    }
    wasPlayingBeforeScrubRef.current = false;
  };

  const handleReplaySegment = () => {
    void persistPosition(currentTime, activeTopic);
    seekTo(activeTopic.startSec);
    playerRef.current?.playVideo();
    setIsPlaying(true);
    setPhase('watching');
  };

  const handleCheckpointHit = () => {
    if (phase === 'quiz') return;
    playerRef.current?.pauseVideo();
    setIsPlaying(false);
    void persistPosition();
    const nextQuiz = activeTopicQuizzes.find((quiz) => !(sessionData?.quizAttempts || []).some((item) =>
      item.topicIndex === quiz.topicIndex &&
      (item.quizIndex || 1) === (quiz.quizIndex || 1) &&
      item.correct
    ));
    if (nextQuiz) {
      const quizIndex = nextQuiz.quizIndex || 1;
      setActiveQuizIndex(quizIndex);
      setAttempt((sessionData?.quizAttempts || []).filter((item) =>
        item.topicIndex === nextQuiz.topicIndex && (item.quizIndex || 1) === quizIndex
      ).length + 1);
      setQuizResult(null);
      setCheckpointMessage('');
      setPhase('quiz');
    } else if (activeTopicQuizzes.length > 0) {
      setActiveQuizIndex(1);
      setAttempt(1);
      setQuizResult(null);
      setCheckpointMessage('');
      setPhase('quiz');
    } else {
      setCheckpointMessage('No checkpoint quiz is configured for this topic.');
    }
  };

  const handleAnswer = async (selectedAnswer, submissionId) => {
    if (!lectureId || !activeTopic || !currentQuiz) throw new Error('This checkpoint is not available.');
    const response = await submitLectureQuizAttempt(lectureId, {
      topicIndex: activeTopic.index,
      quizIndex: currentQuiz.quizIndex || 1,
      selectedAnswer,
      submissionId,
    });
    if (!response?.attempt) throw new Error('The checkpoint response was incomplete. Please try submitting again.');
    const result = response.attempt;
    setQuizResult(response);
    setSessionData((data) => ({
      ...data,
      quizAttempts: [...(data?.quizAttempts || []), result],
      topics: response.topicCompleted ? (data?.topics || []).map((topic) => topic.index === activeTopic.index ? { ...topic, completed: true } : topic) : data?.topics,
    }));
    if (response.topicCompleted) {
      setTopics((items) => items.map((topic, index) => index === activeTopicIdx ? { ...topic, status: 'done', completed: true } : topic));
    }
    setPhase('quiz');
    return response;
  };

  const handleRetry = () => {
    setQuizResult(null);
    setPhase('quiz');
  };

  const handleContinue = async () => {
    if (activeQuizIndex < activeTopicQuizzes.length) {
      setActiveQuizIndex(activeQuizIndex + 1);
      setQuizResult(null);
      setPhase('quiz');
      return;
    }
    try {
      if (activeTopic?.status !== 'done' && activeTopic?.index != null) await markLectureTopicComplete(lectureId, activeTopic.index);
      setTopics((items) => items.map((topic, index) => index === activeTopicIdx ? { ...topic, status: 'done', completed: true } : topic));
      setSessionSaveError('');
    } catch (error) {
      setSessionSaveError(error.message);
      return;
    }
    if (activeTopicIdx + 1 < topics.length) {
      setQuizResult(null);
      setActiveTopicIdx(activeTopicIdx + 1);
      setActiveQuizIndex(1);  // ← reset quiz index for the new topic
      setAttempt(1);
      setPhase('watching');
      setCheckpointMessage('');
      seekTo(getTopicResumeSec(topics[activeTopicIdx + 1]));
    } else {
      navigate(`/session-results?lectureId=${lectureId}`);
    }
  };

  const handleSaveAndExit = async () => {
    try {
      const noteSaved = await persistCurrentNote();
      if (!noteSaved && (sessionNote.trim() || noteId)) return;
      if (lectureId && activeTopic?.index != null) {
        setSaveStatus('saving');
        await saveLectureSession(lectureId, { positionSec: currentTime, topicIndex: activeTopic.index });
        lastPositionSavedRef.current = currentTime;
        setSaveStatus('saved');
      }
      navigate('/interactive');
    } catch (error) {
      setSessionSaveError(error.message);
      setSaveStatus('error');
    }
  };

  const isLastTopic = activeTopicIdx === topics.length - 1;

  return (
    <div className="flex flex-col w-full">
      {/* ── Session Context Bar ── */}
      <header className="w-full bg-surface-container-lowest px-gutter py-space-sm flex flex-col md:flex-row md:items-center md:justify-between gap-space-sm shadow-sm z-20">
        <div className="flex items-center flex-wrap gap-space-xs text-on-surface text-sm">
          <Link to="/interactive" className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">psychology</span>
            Interactive Learning
          </Link>
          <span className="material-symbols-outlined text-outline text-[16px]">chevron_right</span>
          <span className="text-on-surface-variant">{lectureData?.subject || 'General'}</span>
          <span className="material-symbols-outlined text-outline text-[16px]">chevron_right</span>
          <span className="font-semibold text-primary">Topic {activeTopicIdx + 1}: {activeTopic?.title}</span>
        </div>
        <div className="flex items-center gap-space-md shrink-0">
          <div className="flex flex-col gap-1 min-w-40">
            <div className="flex justify-between gap-3 text-[11px] text-on-surface font-medium"><span>Topic {activeTopicIdx + 1} of {totalTopics}</span><span>{progress}% complete</span></div>
            <div className="h-1.5 rounded-full bg-surface-container overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} /></div>
          </div>
          <div className="h-4 w-px bg-surface-container" />
          <button onClick={toggleTheme} aria-label="Toggle light and dark mode" title="Toggle light/dark mode" className="w-9 h-9 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-primary"><span className="material-symbols-outlined text-[19px]">{darkMode ? 'light_mode' : 'dark_mode'}</span></button>
          <button onClick={() => navigate(`/notes?lectureId=${lectureId}`)} className="flex items-center gap-space-xs px-space-md py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all text-sm" title="Open AI handwritten notes for this lecture">
            <span className="material-symbols-outlined text-[18px]">draw</span>
            <span>Handwritten Notes</span>
          </button>
          <button
            onClick={handleSaveAndExit}
            className="flex items-center gap-space-xs px-space-md py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-error hover:bg-error-container/30 transition-all text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>{saveStatus === 'saving' ? 'Saving…' : 'Save & Exit'}</span>
          </button>
        </div>
      </header>
      {sessionSaveError && <div role="alert" className="mx-space-md mt-2 rounded-lg bg-error-container/40 px-3 py-2 text-xs text-error">{sessionSaveError}</div>}

      {/* ── Workspace ── */}
      <div className="flex flex-col w-full p-space-md gap-space-md xl:gap-gutter overflow-x-hidden">
        {/* TOP ROW: Video Section with Left and Right Panels matching video section height */}
        <div className="flex flex-col min-[1200px]:flex-row min-[1200px]:items-stretch w-full gap-space-md xl:gap-gutter">

        {/* LEFT: Topic nav */}
        <aside
          style={videoSectionHeight ? { height: `${videoSectionHeight}px`, maxHeight: `${videoSectionHeight}px` } : undefined}
          className={`order-2 min-[1200px]:order-1 w-full shrink-0 transition-[width] duration-200 overflow-hidden flex flex-col ${topicsCollapsed ? 'min-[1200px]:w-[68px]' : 'min-[1200px]:w-[260px] 2xl:w-[280px]'}`}
        >
          <div className="bg-surface-container-lowest rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col justify-between h-full border border-outline-variant/30 overflow-hidden">
            <div className="flex flex-col gap-space-sm min-h-0 flex-1 overflow-hidden">
              <div className="flex items-center justify-between pb-space-xs shrink-0">
                {!topicsCollapsed && (
                  <div className="flex items-center gap-4 border-b border-outline-variant/30 text-xs w-full">
                    <button
                      type="button"
                      onClick={() => setLeftTab('topics')}
                      className={`flex items-center gap-1.5 pb-2 font-semibold border-b-2 transition-all ${
                        leftTab === 'topics'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">format_list_bulleted</span>
                      <span>Topics</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-surface-container text-on-surface-variant">
                        {totalTopics}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeftTab('quizzes')}
                      className={`flex items-center gap-1.5 pb-2 font-semibold border-b-2 transition-all ${
                        leftTab === 'quizzes'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">quiz</span>
                      <span>Quizzes</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-surface-container text-on-surface-variant">
                        {(lectureData?.quizzes || []).length}
                      </span>
                    </button>
                  </div>
                )}
                <button onClick={() => setTopicsCollapsed((value) => !value)} aria-label={topicsCollapsed ? 'Expand panel' : 'Collapse panel'} title={topicsCollapsed ? 'Expand panel' : 'Collapse panel'} className="w-8 h-8 rounded-lg hover:bg-surface-container-low text-outline shrink-0 ml-1"><span className="material-symbols-outlined text-[18px]">{topicsCollapsed ? 'left_panel_open' : 'left_panel_close'}</span></button>
              </div>

              {!topicsCollapsed && leftTab === 'topics' && <>
              <div className="flex flex-col gap-1.5 pt-1 shrink-0">
                <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium">
                  <span>Course Progress</span>
                  <span className="font-semibold text-on-surface">{progress}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-surface-container overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 min-h-0 flex-1 overflow-y-auto pr-1">
                {topics.map((topic, i) => {
                  const isActive = i === activeTopicIdx;
                  return (
                    <div key={topic.id || i}>
                      {isActive ? (
                        <div className="w-full text-left p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-xs flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-sm shadow-primary/30">
                              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-semibold text-primary truncate">
                                {String(i + 1).padStart(2, '0')}. {topic.title}
                              </span>
                              <span className="text-[11px] text-outline font-mono">
                                {topic.startSec != null && topic.endSec != null ? formatTime(Math.max(0, topic.endSec - topic.startSec)) : topic.start ? `${topic.start} – ${topic.end}` : '05:27'}
                              </span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-primary text-on-primary text-[10px] font-semibold shrink-0">
                            Current
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={topic.status === 'locked'}
                          onClick={() => {
                            if (topic.status === 'locked') return;
                            void persistPosition(currentTime, activeTopic);
                            setActiveTopicIdx(i);
                            setPhase('watching');
                            seekTo(getTopicResumeSec(topic));
                            playerRef.current?.playVideo?.();
                            setIsPlaying(true);
                          }}
                          className={`w-full text-left p-3 rounded-2xl flex items-center gap-3 transition-colors ${
                            topic.status === 'locked' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface-container-low cursor-pointer'
                          }`}
                        >
                          <div className="w-9 h-9 rounded-full border border-outline-variant/60 text-outline flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[20px]">
                              {topic.status === 'done' ? 'check' : topic.status === 'locked' ? 'lock' : 'play_arrow'}
                            </span>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-medium text-on-surface truncate">
                              {String(i + 1).padStart(2, '0')}. {topic.title}
                            </span>
                            <span className="text-[11px] text-outline font-mono">
                              {topic.startSec != null && topic.endSec != null ? formatTime(Math.max(0, topic.endSec - topic.startSec)) : topic.start ? `${topic.start} – ${topic.end}` : '06:46'}
                            </span>
                          </div>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              </>}

              {!topicsCollapsed && leftTab === 'quizzes' && (
                <div className="flex flex-col gap-2 pt-space-xs min-h-0 flex-1 overflow-y-auto pr-1">
                  <div className="flex items-center justify-between text-[11px] text-on-surface-variant px-1 font-medium shrink-0">
                    <span>Topic Checkpoints</span>
                    <span>{(lectureData?.quizzes || []).length} available</span>
                  </div>
                  {topics.map((topic, i) => {
                    const topicQuizzes = (lectureData?.quizzes || []).filter((q) => q.topicIndex === topic.index);
                    const isCurrentTopic = i === activeTopicIdx;
                    const topicAttempts = (sessionData?.quizAttempts || []).filter((a) => a.topicIndex === topic.index);
                    const passed = topicAttempts.some((a) => a.score >= 0.7 || a.passed);

                    return (
                      <div
                        key={`quiz-tab-${topic.id || i}`}
                        className={`p-2.5 rounded-xl border transition-all ${
                          isCurrentTopic
                            ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20'
                            : 'bg-surface-container-low border-outline-variant/30 hover:border-outline-variant/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-mono text-primary font-semibold">
                              Topic {String(i + 1).padStart(2, '0')}
                            </span>
                            <h4 className="text-xs font-semibold text-on-surface truncate">
                              {topic.title}
                            </h4>
                          </div>
                          {passed ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                              <span className="material-symbols-outlined text-[11px]">check_circle</span>
                              Passed
                            </span>
                          ) : topicAttempts.length > 0 ? (
                            <span className="inline-flex items-center text-[9px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                              {topicAttempts.length} att.
                            </span>
                          ) : (
                            <span className="text-[9px] text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded shrink-0">
                              {topicQuizzes.length} Qs
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-outline-variant/20">
                          <span className="text-[10px] text-outline font-mono">
                            {topic.end ? `At ${topic.end}` : `${topicQuizzes.length} Questions`}
                          </span>
                          <button
                            type="button"
                            disabled={topic.status === 'locked' || topicQuizzes.length === 0}
                            onClick={() => {
                              void persistPosition(currentTime, activeTopic);
                              setActiveTopicIdx(i);
                              setActiveQuizIndex(1);
                              setPhase('quiz');
                              playerRef.current?.pauseVideo?.();
                              setIsPlaying(false);
                            }}
                            className="text-[10px] font-semibold text-primary hover:text-primary-hover px-2 py-0.5 rounded hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {isCurrentTopic && phase === 'quiz' ? 'Current Quiz' : 'Take Quiz →'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {(!lectureData?.quizzes || lectureData.quizzes.length === 0) && (
                    <p className="p-3 text-center text-xs text-on-surface-variant rounded-lg bg-surface-container-low">
                      No quizzes configured for this lecture yet.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Segment status widget */}
            {!topicsCollapsed && <div className="mt-2 pt-2 bg-surface-container-low rounded-lg p-2.5 flex flex-col gap-1.5 shrink-0">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-[11px] font-medium">Segment Status</span>
                <span className="text-[11px] font-mono text-primary font-semibold">
                  {formatTime(currentTime)} / {activeTopic?.end || '00:00'}
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-tight">
                Interactive checkpoint waiting at <span className="font-mono text-on-surface font-semibold">{activeTopic?.end || 'end'}</span>.
              </p>
              <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-primary h-full rounded-full transition-[width] duration-200 ease-linear"
                  style={{
                    width: `${
                      activeTopic?.endSec && activeTopic?.endSec > (activeTopic?.startSec || 0)
                        ? Math.min(
                            100,
                            Math.max(
                              0,
                              ((currentTime - (activeTopic?.startSec || 0)) /
                                ((activeTopic?.endSec || 1) - (activeTopic?.startSec || 0))) *
                                100
                            )
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>}
          </div>
        </aside>

        {/* CENTER: Video + controls OR Flexible Checkpoint Quiz */}
        <main
          ref={centerColRef}
          className="order-1 min-[1200px]:order-2 flex-1 flex flex-col min-w-0"
        >
          {phase === 'quiz' && currentQuiz ? (
            <CheckpointQuizCard
              quiz={currentQuiz}
              activeTopic={activeTopic}
              totalTopics={totalTopics}
              activeTopicQuizzes={activeTopicQuizzes}
              activeQuizIndex={activeQuizIndex}
              sessionData={sessionData}
              isMarked={markedQuestions.has(activeQuizIndex)}
              onToggleMark={handleToggleMark}
              onAnswer={handleAnswer}
              onNavigateQuestion={(num) => setActiveQuizIndex(num)}
              onReturnToVideo={() => setPhase('watching')}
              onContinueTopic={handleContinue}
            />
          ) : null}

          {/* Video card */}
          <div
            id="video-player-container"
            tabIndex={phase === 'quiz' ? -1 : 0}
            className={phase === 'quiz' ? 'hidden' : 'relative flex flex-col overflow-hidden rounded-xl bg-black shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary'}
            onKeyDown={(event) => {
              const target = event.target instanceof Element ? event.target : null;
              if (event.altKey || event.ctrlKey || event.metaKey || target?.isContentEditable || target?.closest('input, textarea, select')) return;
              if (event.code === 'Space') {
                if (target?.closest('button, a')) return;
                event.preventDefault();
                handlePlayPause();
              } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault();
                if (event.key === 'ArrowLeft') handleRewind10();
                else handleForward10();
              } else {
                return;
              }
              revealPlaybackControls();
            }}
          >
            {/* Video area */}
            <div
              className="video-player-stage relative w-full aspect-video bg-inverse-surface overflow-hidden"
              onClick={(event) => {
                if (event.target instanceof Element && event.target.closest('button, a, input, select')) return;
                event.currentTarget.closest('#video-player-container')?.focus();
              }}
              onPointerMove={revealPlaybackControls}
              onPointerDown={revealPlaybackControls}
              onTouchStart={revealPlaybackControls}
            >
              {lectureData?.youtubeVideoId ? <YouTubePlayer
                videoId={lectureData.youtubeVideoId}
                startSec={activeTopic?.startSec || 0}
                paused={phase !== 'watching' || !isPlaying}
                onReady={handlePlayerReady}
                onPlayStateChange={setIsPlaying}
                onPlayerError={setPlayerError}
              /> : <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-inverse-on-surface">Video source is unavailable for this lecture.</div>}

              <div aria-hidden={!showPlaybackControls} className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-300 ${showPlaybackControls ? 'opacity-100' : 'opacity-0'}`}>
                <div className="flex items-center gap-8 text-white sm:gap-12">
                  <button
                    onClick={handleRewind10}
                    aria-label="Rewind 10 seconds"
                    title="Rewind 10 seconds"
                    disabled={phase !== 'watching' || !showPlaybackControls}
                    className="pointer-events-auto flex h-12 w-12 items-center justify-center text-white transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-40 sm:h-14 sm:w-14"
                  >
                    <span className="material-symbols-outlined text-[25px] sm:text-[30px]">replay_10</span>
                  </button>
                  <button
                    onClick={handlePlayPause}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    title={isPlaying ? 'Pause' : 'Play'}
                    disabled={phase !== 'watching' || !showPlaybackControls}
                    id="video-play-pause-btn"
                    className="pointer-events-auto flex h-14 w-14 items-center justify-center text-white transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-40 sm:h-16 sm:w-16"
                  >
                    <span className="material-symbols-outlined text-[32px]">{isPlaying ? 'pause' : 'play_arrow'}</span>
                  </button>
                  <button
                    onClick={handleForward10}
                    aria-label="Forward 10 seconds"
                    title="Forward 10 seconds"
                    disabled={phase !== 'watching' || !showPlaybackControls}
                    className="pointer-events-auto flex h-12 w-12 items-center justify-center text-white transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-40 sm:h-14 sm:w-14"
                  >
                    <span className="material-symbols-outlined text-[25px] sm:text-[30px]">forward_10</span>
                  </button>
                </div>
              </div>

              <div
                aria-hidden={!showPlaybackControls}
                inert={!showPlaybackControls}
                className={`pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 bg-gradient-to-b from-black/85 via-black/45 to-transparent px-3 pb-12 pt-3 text-white transition-opacity duration-300 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:px-5 ${showPlaybackControls ? 'opacity-100' : 'opacity-0'}`}
              >
                <div className="min-w-0 flex-1 sm:max-w-[55%]">
                  <div className="line-clamp-2 text-xs font-semibold leading-snug sm:text-sm">{lectureData?.title || 'Lecture video'}</div>
                  {lectureData?.subject && <div className="mt-0.5 line-clamp-1 text-[11px] text-white/70">{lectureData.subject}</div>}
                </div>
                <div className="pointer-events-auto flex shrink-0 items-center justify-end gap-1.5">
                  <label className="flex h-8 items-center gap-1 rounded-lg border border-white/20 bg-black/45 px-2 text-[11px] text-white">
                    <span className="material-symbols-outlined text-[15px]">slow_motion_video</span>
                    <select
                      aria-label="Playback speed"
                      value={playbackRate}
                      onChange={(event) => {
                        const rate = Number(event.target.value);
                        setPlaybackRate(rate);
                        playerRef.current?.setPlaybackRate?.(rate);
                      }}
                      className="max-w-[3.4rem] appearance-none bg-transparent text-white outline-none"
                    >
                      {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => <option key={rate} value={rate} className="bg-slate-900 text-white">{rate}×</option>)}
                    </select>
                  </label>
                  <button onClick={toggleCaptions} aria-pressed={captionsOn} aria-label="Toggle captions" title="Toggle captions" className={`flex h-8 w-9 items-center justify-center rounded-lg border text-xs font-semibold text-white transition-colors ${captionsOn ? 'border-primary bg-primary' : 'border-white/20 bg-black/45 hover:bg-white/20'}`}>CC</button>
                  <button onClick={() => setSettingsOpen((open) => !open)} aria-expanded={settingsOpen} aria-label="Player settings" title="Player settings" className="flex h-8 w-9 items-center justify-center rounded-lg border border-white/20 bg-black/45 text-white hover:bg-white/20">
                    <span className="material-symbols-outlined text-[19px]">settings</span>
                  </button>
                  <button onClick={handleFullscreen} aria-label="Toggle fullscreen" title="Toggle fullscreen" className="flex h-8 w-9 items-center justify-center rounded-lg border border-white/20 bg-black/45 text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                    <span className="material-symbols-outlined text-[19px]">fullscreen</span>
                  </button>
                </div>
              </div>
              {settingsOpen && <div className="absolute right-4 top-14 z-10 w-56 rounded-xl border border-white/15 bg-slate-950/95 p-3 text-white shadow-xl backdrop-blur-md">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold">Playback settings</span>
                  <button onClick={() => setSettingsOpen(false)} aria-label="Close settings" className="text-white/70 hover:text-white"><span className="material-symbols-outlined text-[17px]">close</span></button>
                </div>
                <label className="flex flex-col gap-2 border-t border-white/10 py-2 text-xs">
                  <span className="flex items-center justify-between"><span>Volume</span><span>{isMuted ? 0 : volume}%</span></span>
                  <input aria-label="Volume" type="range" min="0" max="100" value={isMuted ? 0 : volume} onChange={(event) => handleVolumeChange(Number(event.target.value))} className="w-full cursor-pointer accent-primary" />
                </label>
              </div>}

              {chaptersOpen && topics.length > 0 && <section aria-label="Chapters" className="absolute bottom-3 left-3 right-auto z-10 flex w-[min(22rem,calc(100%-1.5rem))] max-h-[58%] flex-col overflow-hidden rounded-xl border border-white/15 bg-slate-950/90 p-2 text-white shadow-lg backdrop-blur-md sm:bottom-auto sm:left-4 sm:top-16 sm:max-h-[calc(100%-5rem)]">
                <div className="mb-1 flex items-center justify-between px-1.5 py-1">
                  <span className="text-xs font-semibold">Chapters</span>
                  <button onClick={() => setChaptersOpen(false)} aria-label="Close chapters" title="Close chapters" className="flex h-7 w-7 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                    <span className="material-symbols-outlined text-[17px]">close</span>
                  </button>
                </div>
                <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto sm:max-h-64 sm:flex-none">
                  {topics.map((topic, index) => {
                    const isActive = index === activeTopicIdx;
                    return <button
                      key={topic.id}
                      disabled={topic.status === 'locked' || phase !== 'watching'}
                      onClick={() => {
                        void persistPosition(currentTime, activeTopic);
                        setActiveTopicIdx(index);
                        setPhase('watching');
                        setAttempt(1);
                        seekTo(getTopicResumeSec(topic));
                        playerRef.current?.playVideo?.();
                        setIsPlaying(true);
                        setChaptersOpen(false);
                      }}
                      aria-current={isActive ? 'step' : undefined}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 ${isActive ? 'bg-primary/80 text-white' : 'text-white/85 hover:bg-white/15'}`}
                    >
                      <span className="shrink-0 font-mono text-white/70">{topic.start}</span>
                      <span className="min-w-0 flex-1 truncate">{topic.title}</span>
                      {isActive && <span className="shrink-0 text-[10px] font-semibold text-violet-100">Current</span>}
                    </button>;
                  })}
                </div>
              </section>}

              {lectureData?.youtubeVideoId && !playerReady && !playerError && <div role="status" className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-inverse-surface text-inverse-on-surface"><span className="material-symbols-outlined animate-spin text-3xl motion-reduce:animate-none">progress_activity</span><span className="text-sm">Loading video…</span></div>}
              {playerError && <div role="alert" className="absolute inset-x-4 bottom-4 z-20 rounded-lg bg-black/80 p-3 text-sm text-white"><span>{playerError}</span><button onClick={() => window.location.reload()} className="ml-3 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">Retry</button></div>}


            </div>

            {/* Player controls */}
            <div
              aria-hidden={!showPlaybackControls}
              inert={!showPlaybackControls}
              className={`video-player-controls flex flex-col gap-1.5 px-3 pb-3 pt-2 text-white transition-opacity duration-300 sm:px-4 sm:pb-4 ${showPlaybackControls ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
            >
              {/* Segmented timeline & scrubber */}
              <div className="flex flex-col gap-1.5 w-full">
                {/* Timeline Bar Track */}
                <div
                  ref={timelineRef}
                  role="slider"
                  aria-label="Video timeline"
                  aria-valuemin={0}
                  aria-valuemax={Math.round(lectureTotalDuration || 0)}
                  aria-valuenow={Math.round(currentTime)}
                  aria-valuetext={`${formatTime(currentTime)} of ${formatTime(lectureTotalDuration)}`}
                  aria-disabled={!lectureTotalDuration || phase !== 'watching'}
                  tabIndex={0}
                  onPointerDown={handleTimelinePointerDown}
                  onPointerMove={handleTimelinePointerMove}
                  onPointerUp={handleTimelinePointerUp}
                  onPointerCancel={handleTimelinePointerUp}
                  className={`group relative flex h-6 w-full touch-none select-none items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${lectureTotalDuration && phase === 'watching' ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                  title={phase !== 'watching' ? 'Seeking is paused at this checkpoint' : lectureTotalDuration ? 'Drag, click, or use the arrow keys to seek' : 'Video duration is loading'}
                >
                  <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/25 transition-[height] group-hover:h-2">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-150 ease-linear"
                      style={{ width: `${lectureTotalDuration ? Math.min(100, Math.max(0, (currentTime / lectureTotalDuration) * 100)) : 0}%` }}
                    />
                  </div>

                  {lectureTotalDuration > 0 && topics.map((topic, index) => {
                    const chapterPosition = Math.min(100, Math.max(0, (topic.startSec / lectureTotalDuration) * 100));
                    const checkpointPosition = Math.min(100, Math.max(0, (topic.endSec / lectureTotalDuration) * 100));
                    return <React.Fragment key={`timeline-${topic.id || index}`}>
                      {index > 0 && <span
                        aria-hidden="true"
                        title={`Chapter ${index + 1}: ${topic.title} · ${topic.start}`}
                        className="pointer-events-auto absolute left-0 top-1/2 z-10 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-900 bg-sky-400"
                        style={{ left: `${chapterPosition}%` }}
                      />}
                      <span
                        aria-hidden="true"
                        title={`Checkpoint: ${topic.title} · ${topic.end}`}
                        className="pointer-events-auto absolute left-0 top-1/2 z-10 flex h-3 w-3 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white shadow-sm"
                        style={{ left: `${checkpointPosition}%` }}
                      >?</span>
                    </React.Fragment>;
                  })}

                  {/* Scrubber Knob Indicator */}
                  {lectureTotalDuration > 0 && (
                    <div
                      className="pointer-events-none absolute left-0 top-1/2 z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-white shadow transition-[left] duration-150 ease-linear group-hover:scale-110"
                      style={{
                        left: `${Math.min(100, Math.max(0, (currentTime / lectureTotalDuration) * 100))}%`,
                      }}
                    />
                  )}
                </div>

                {/* Timeline Labels */}
                <div className="flex items-center justify-between gap-2 px-0.5 text-[11px] font-mono">
                  <span className="shrink-0 text-xs font-bold text-white">{formatTime(currentTime)}</span>

                  <div className="flex min-w-0 flex-1 items-center justify-center gap-1 text-[10px] text-white/75 sm:text-[11px]">
                    <span className="text-white/55">•</span>
                    <span className="max-w-40 truncate">{activeTopic?.title || 'No active chapter'}</span>
                  </div>

                  {nextCheckpoint && <div className="relative">
                    <button
                      onClick={() => setCheckpointOpen((open) => !open)}
                      aria-expanded={checkpointOpen}
                      aria-label={`Next checkpoint: ${nextCheckpoint.title} at ${nextCheckpoint.end}`}
                      title="Next checkpoint"
                      className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:text-[11px]"
                    >
                      <span className="material-symbols-outlined text-[15px] text-violet-300">flag</span>
                      <span className="hidden max-w-24 truncate sm:inline">{nextCheckpoint.title}</span>
                      <span className="whitespace-nowrap">in {formatTime(Math.max(0, nextCheckpoint.endSec - currentTime))}</span>
                    </button>
                    {checkpointOpen && <div className="absolute bottom-full right-0 z-30 mb-2 w-52 rounded-lg border border-white/15 bg-slate-950/95 p-3 text-xs text-white shadow-lg">
                      <div className="font-semibold">Next checkpoint</div>
                      <div className="mt-1 truncate text-white/80">{nextCheckpoint.title}</div>
                      <div className="mt-1 text-white/60">{nextCheckpoint.end} · in {formatTime(Math.max(0, nextCheckpoint.endSec - currentTime))}</div>
                    </div>}
                  </div>}

                  <span className="shrink-0 font-medium text-white/70">{lectureTotalDuration ? formatTime(lectureTotalDuration) : '--:--'}</span>
                </div>
              </div>
              {checkpointMessage && <p role="status" className="text-xs text-on-surface-variant">{checkpointMessage}</p>}

            </div>
          </div>

          {phase !== 'quiz' && (
            <div className="flex flex-wrap items-center justify-between gap-3 border border-t-0 border-outline-variant/30 bg-surface-container-lowest px-3 py-3 sm:px-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleReplaySegment}
                  disabled={phase !== 'watching' || !activeTopic}
                  className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary-fixed/60 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary-fixed focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">replay</span>
                  <span>Replay Segment</span>
                </button>
                <button
                  id="trigger-checkpoint-btn"
                  onClick={handleCheckpointHit}
                  className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">flag</span>
                  <span>Hit Checkpoint</span>
                </button>
              </div>

              <div className="flex items-center gap-1 rounded-lg bg-surface-container-low p-1">
                {topics.length > 0 && <button
                  onClick={() => setChaptersOpen((open) => !open)}
                  aria-expanded={chaptersOpen}
                  aria-label={chaptersOpen ? 'Hide chapters' : 'Show chapters'}
                  title={chaptersOpen ? 'Hide chapters' : 'Show chapters'}
                  disabled={phase !== 'watching'}
                  className={`flex min-h-9 items-center gap-1 rounded-md px-2 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40 ${chaptersOpen ? 'bg-primary-fixed text-primary' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}
                >
                  <span className="material-symbols-outlined text-[17px]">format_list_bulleted</span>
                  <span className="hidden sm:inline">Chapters</span>
                </button>}
                <button
                  disabled={activeTopicIdx === 0 || phase !== 'watching'}
                  onClick={() => {
                    if (activeTopicIdx > 0) {
                      const prevIdx = activeTopicIdx - 1;
                      void persistPosition(currentTime, activeTopic);
                      setActiveTopicIdx(prevIdx);
                      setPhase('watching');
                      setAttempt(1);
                      seekTo(getTopicResumeSec(topics[prevIdx]));
                    }
                  }}
                  className="flex min-h-9 items-center gap-1 rounded-md px-2 text-xs text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[16px]">skip_previous</span>
                  <span>Prev</span>
                </button>
                <button
                  disabled={activeTopicIdx >= topics.length - 1 || (topics[activeTopicIdx + 1]?.status === 'locked') || phase !== 'watching'}
                  onClick={() => {
                    if (activeTopicIdx < topics.length - 1) {
                      const nextIdx = activeTopicIdx + 1;
                      void persistPosition(currentTime, activeTopic);
                      setActiveTopicIdx(nextIdx);
                      setPhase('watching');
                      setAttempt(1);
                      seekTo(getTopicResumeSec(topics[nextIdx]));
                    }
                  }}
                  className="flex min-h-9 items-center gap-1 rounded-md px-2 text-xs text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span>Next</span>
                  <span className="material-symbols-outlined text-[16px]">skip_next</span>
                </button>
              </div>
            </div>
          )}

          {/* Topic context card — directly below controls, no gap */}
          {phase !== 'quiz' && (
            <div className="bg-surface-container-lowest rounded-b-xl p-space-lg flex flex-col gap-space-xs border-t border-outline-variant/20">
              <div className="flex items-center gap-space-xs">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-container text-primary font-semibold">
                  In-Progress Topic
                </span>
                <span className="text-outline text-xs">•</span>
                <span className="text-[11px] text-on-surface-variant">Chapter {activeTopicIdx + 1} of {totalTopics}</span>
              </div>
              <h1 className="text-xl font-semibold text-on-surface tracking-tight mt-1">
                Topic {activeTopicIdx + 1}: {activeTopic?.title}
              </h1>
              <p className="text-sm text-on-surface-variant">
                {activeTopic?.summary || 'Follow along with the lecture to master this chapter.'}
              </p>
              {activeTopic?.keyTerms?.length > 0 && (
                <div className="flex flex-wrap items-center gap-space-xs pt-space-xs mt-1">
                  {activeTopic.keyTerms.map((tag) => (
                    <span key={tag} className="px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface-variant text-[11px] font-mono">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>

        {/* RIGHT: Materials tabs or Quiz helper sidebar */}
        <aside
          style={videoSectionHeight ? { height: `${videoSectionHeight}px`, maxHeight: `${videoSectionHeight}px` } : { height: '520px', maxHeight: '520px' }}
          className="order-3 w-full min-[1200px]:w-[300px] 2xl:w-[340px] shrink-0 min-w-0 overflow-hidden flex flex-col"
        >
          {phase === 'quiz' && currentQuiz ? (
            <QuizSidebar
              activeTopic={activeTopic}
              activeTopicQuizzes={activeTopicQuizzes}
              activeQuizIndex={activeQuizIndex}
              sessionData={sessionData}
              markedQuestions={markedQuestions}
              onNavigateQuestion={(num) => setActiveQuizIndex(num)}
              timeLeft={quizTimeLeft}
              quickTipDismissed={quickTipDismissed}
              onDismissQuickTip={() => setQuickTipDismissed(true)}
            />
          ) : (
            <section id="learning-materials" className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 h-full flex flex-col overflow-hidden">
              <div role="tablist" aria-label="Learning materials" className="grid grid-cols-2 border-b border-outline-variant/30 px-2 shrink-0">
                {[['transcript', 'Transcript'], ['notes', 'Notes']].map(([id, label]) => (
                  <button key={id} role="tab" aria-selected={rightTab === id} onClick={() => setRightTab(id)} className={`px-1 py-3 text-[11px] sm:text-xs font-medium border-b-2 transition-colors ${rightTab === id ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>{label}</button>
                ))}
              </div>
              <div className="flex-1 min-h-0 p-3 sm:p-4 flex flex-col overflow-hidden">
                {phase === 'remediation' ? (
                  <RemediationPanel attempt={attempt} topic={activeTopic} quiz={currentQuiz} result={quizResult} onRetry={handleRetry} onReviewFromStart={handleReplaySegment} onReplayClip={handleReplaySegment} />
                ) : phase === 'correct' ? (
                  <CorrectPanel onContinue={handleContinue} isLastTopic={isLastTopic} isLastQuestion={activeQuizIndex >= activeTopicQuizzes.length} onBookmark={addBookmark} quiz={currentQuiz} result={quizResult} />
                ) : rightTab === 'transcript' ? (
                  <div className="h-full flex flex-col gap-2 min-h-0 flex-1 overflow-hidden">
                    <input aria-label="Search transcript" value={transcriptQuery} onChange={(e) => setTranscriptQuery(e.target.value)} placeholder="Search in transcript…" className="w-full shrink-0 rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-xs outline-none focus:border-primary" />
                    <div
                      ref={transcriptContainerRef}
                      className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1"
                    >
                      {transcriptLines.length ? transcriptLines.map((line, index) => {
                        const current = currentTime >= line.seconds && currentTime < line.nextSec;
                        const isPast = !current && currentTime >= line.nextSec;
                        return (
                          <button
                            id={`transcript-line-${line.seconds}`}
                            key={`${line.seconds}-${index}`}
                            onClick={() => {
                              const topicIndex = topics.findIndex((topic) => line.seconds >= topic.startSec && line.seconds < topic.endSec);
                              void persistPosition(currentTime, activeTopic);
                              if (topicIndex >= 0) setActiveTopicIdx(topicIndex);
                              seekTo(line.seconds);
                              playerRef.current?.playVideo?.();
                              setIsPlaying(true);
                            }}
                            className={`relative flex w-full gap-2 rounded-lg p-2.5 text-left text-xs sm:text-sm transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                              current
                                ? 'bg-primary/15 border-l-2 border-primary pl-2 text-primary font-semibold shadow-sm'
                                : isPast
                                  ? 'text-on-surface-variant/40 hover:text-on-surface-variant hover:bg-surface-container-low'
                                  : 'text-on-surface-variant hover:bg-surface-container-low'
                            }`}
                          >
                            <span className={`shrink-0 font-mono text-xs ${current ? 'text-primary font-bold' : isPast ? 'opacity-40' : ''}`}>{line.time}</span>
                            <span className="leading-snug">{line.text}</span>
                            {current && (
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 flex h-1.5 w-1.5 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                              </span>
                            )}
                          </button>
                        );
                      }) : <p className="p-2 text-xs text-on-surface-variant">{lectureData?.transcript ? 'No transcript lines match this search.' : 'No transcript is available for this lecture.'}</p>}
                    </div>
                  </div>
                ) : rightTab === 'notes' ? (
                  <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 pr-1">
                    {/* Header: Infographic Notes count & ZIP action */}
                    <div className="flex items-center justify-between shrink-0 pb-2 border-b border-outline-variant/30">
                      <div>
                        <h3 className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-primary">draw</span>
                          <span>Handwritten Notes</span>
                        </h3>
                        <span className="text-[10px] text-on-surface-variant">
                          {topicNotes.filter((t) => t.generationStatus === 'completed').length} of {topics.length} illustrated topic pages ready
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {topicNotes.some((t) => t.generationStatus === 'completed') && (
                          <button
                            type="button"
                            onClick={handleDownloadAllZipFromSession}
                            title="Download all topic notes as ZIP"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary text-on-primary text-[10px] font-bold hover:bg-primary-container transition-all"
                          >
                            <span className="material-symbols-outlined text-[13px]">folder_zip</span>
                            <span>ZIP</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(`/notes?lectureId=${lectureId}`)}
                          title="Open Notes Studio in full page"
                          className="flex items-center gap-0.5 px-2 py-1 rounded-md bg-surface-container text-on-surface-variant hover:text-on-surface text-[10px] font-medium transition-colors"
                        >
                          <span>Studio</span>
                          <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                        </button>
                      </div>
                    </div>

                    {notesError && (
                      <div role="alert" className="shrink-0 rounded-lg border border-error/30 bg-error-container/40 px-3 py-2 text-[11px] text-error">
                        {notesError}
                      </div>
                    )}

                    {/* All Images Related to Current Video */}
                    {loadingNotes && topicNotes.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-on-surface-variant text-xs">
                        <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                        <span>Loading topic notes…</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {(topicNotes.length > 0
                          ? topicNotes
                          : topics.map((t) => ({ ...t, topicIndex: t.index, topicTitle: t.title, generationStatus: 'not_generated' }))
                        ).map((topicItem) => {
                          const isCurrentTopic = activeTopic?.index === topicItem.topicIndex;
                          const isCompleted = topicItem.generationStatus === 'completed' && Boolean(topicItem.imageUrl);
                          const isGenerating = generatingTopicIndex === topicItem.topicIndex || topicItem.generationStatus === 'processing';

                          return (
                            <div
                              key={topicItem.topicIndex}
                              className={`rounded-xl p-2.5 border transition-all flex flex-col gap-2 ${
                                isCurrentTopic
                                  ? 'bg-primary/5 border-primary/40 shadow-sm'
                                  : 'bg-surface-container-low border-outline-variant/30 hover:border-outline-variant/60'
                              }`}
                            >
                              {/* Header row */}
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-surface-container text-primary">
                                  Topic {String(topicItem.topicIndex).padStart(2, '0')}
                                </span>
                                {isCurrentTopic && (
                                  <span className="text-[9px] font-semibold text-primary uppercase tracking-wider">
                                    Current Playing
                                  </span>
                                )}
                                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                                  isCompleted
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : isGenerating
                                      ? 'bg-primary/10 text-primary animate-pulse'
                                      : 'bg-surface-container text-on-surface-variant'
                                }`}>
                                  {isCompleted ? 'Ready' : isGenerating ? 'Generating…' : 'Not Generated'}
                                </span>
                              </div>

                              {/* Title */}
                              <h4 className="text-xs font-semibold text-on-surface line-clamp-1">
                                {topicItem.topicTitle}
                              </h4>

                              {/* Image Preview / Thumbnail */}
                              {isCompleted ? (
                                <div
                                  onClick={() => { setViewerNoteTopic(topicItem); setViewerZoom(1); }}
                                  className="relative w-full h-36 rounded-lg overflow-hidden bg-surface-container-lowest border border-outline-variant/30 group cursor-pointer"
                                  title="Click to view full-resolution handwritten notes"
                                >
                                  <img
                                    src={topicItem.imageUrl}
                                    alt={`Handwritten notes for ${topicItem.topicTitle}`}
                                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                                    loading="lazy"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                                    <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                                    <span>View Note</span>
                                  </div>
                                </div>
                              ) : isGenerating ? (
                                <div className="w-full h-24 rounded-lg bg-surface-container flex flex-col items-center justify-center text-primary text-xs gap-1">
                                  <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                  <span className="text-[11px] font-medium">Generating infographic…</span>
                                </div>
                              ) : (
                                <div className="w-full h-16 rounded-lg bg-surface-container-lowest border border-dashed border-outline-variant/40 flex items-center justify-center text-outline text-xs gap-1.5">
                                  <span className="material-symbols-outlined text-[16px]">image_not_supported</span>
                                  <span className="text-[10px]">No handwritten note yet</span>
                                </div>
                              )}

                              {/* Action buttons */}
                              <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-outline-variant/20">
                                {isCompleted && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => { setViewerNoteTopic(topicItem); setViewerZoom(1); }}
                                      className="px-2.5 py-1 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface text-[11px] font-semibold transition-colors flex items-center gap-1"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">visibility</span>
                                      <span>View</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadNoteFromSession(topicItem)}
                                      className="px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold transition-colors flex items-center gap-1"
                                      title="Download image"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">download</span>
                                      <span>Download</span>
                                    </button>
                                  </>
                                )}

                                {!isCompleted && !isGenerating && (
                                  <button
                                    type="button"
                                    onClick={() => handleGenerateNoteFromSession(topicItem)}
                                    disabled={generatingTopicIndex !== null}
                                    className="w-full py-1.5 rounded-md bg-primary text-on-primary text-[11px] font-bold hover:bg-primary-container transition-all flex items-center justify-center gap-1 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                                    <span>Create handwritten note</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </section>
          )}
        </aside>
      </div>

      {/* ── High-Resolution Image Viewer Modal ── */}
      {viewerNoteTopic && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-6 overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="w-full max-w-4xl flex items-center justify-between text-white pb-3 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="px-2 py-0.5 rounded bg-primary text-white text-xs font-mono font-bold">
                TOPIC {String(viewerNoteTopic.topicIndex).padStart(2, '0')}
              </span>
              <h3 className="text-sm sm:text-base font-bold truncate">
                {viewerNoteTopic.topicTitle}
              </h3>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setViewerZoom((z) => Math.max(0.6, z - 0.2))}
                title="Zoom out"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <span className="material-symbols-outlined text-[18px]">zoom_out</span>
              </button>
              <span className="text-xs font-mono px-1">{Math.round(viewerZoom * 100)}%</span>
              <button
                onClick={() => setViewerZoom((z) => Math.min(2.5, z + 0.2))}
                title="Zoom in"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <span className="material-symbols-outlined text-[18px]">zoom_in</span>
              </button>
              <button
                onClick={() => setViewerZoom(1)}
                title="Reset zoom"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <span className="material-symbols-outlined text-[18px]">fit_screen</span>
              </button>
              <div className="h-5 w-px bg-white/20 mx-1" />
              <button
                onClick={() => handleDownloadNoteFromSession(viewerNoteTopic)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-bold"
              >
                <span className="material-symbols-outlined text-[17px]">download</span>
                <span>Download</span>
              </button>
              <button
                onClick={() => setViewerNoteTopic(null)}
                aria-label="Close notes viewer"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white ml-1"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 w-full flex items-center justify-center overflow-auto my-3 p-2">
            <div
              className="transition-transform duration-200 ease-out max-h-full flex items-center justify-center shadow-2xl rounded-lg overflow-hidden bg-white"
              style={{ transform: `scale(${viewerZoom})` }}
            >
              <img
                src={viewerNoteTopic.imageUrl}
                alt={`Handwritten infographic notes for ${viewerNoteTopic.topicTitle}`}
                className="max-h-[82vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="w-full max-w-4xl flex items-center justify-between text-xs text-white/60 pt-2 border-t border-white/10 shrink-0">
            <span>Scroll or use zoom controls to inspect fine handwriting &amp; formulas.</span>
            <span>Educational Handwritten Infographic</span>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
