import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// ─── Mock session data ────────────────────────────────────────────────────────
const SESSION = {
  subject: 'Database Management Systems',
  lectureTitle: 'Database Management Systems — Normalization & Keys',
  videoId: 'ztHopE5Wnpc', // real YouTube video ID for demonstration
  totalTopics: 5,
  topics: [
    { id: 1, title: 'Intro to DBMS', start: '00:00', end: '04:20', startSec: 0, endSec: 260, status: 'done' },
    { id: 2, title: 'Models & Schemas', start: '04:20', end: '10:15', startSec: 260, endSec: 615, status: 'done' },
    { id: 3, title: 'Primary Keys & Uniqueness', start: '10:15', end: '17:30', startSec: 615, endSec: 1050, status: 'active' },
    { id: 4, title: 'Foreign Keys & Integrity', start: '17:30', end: '24:10', startSec: 1050, endSec: 1450, status: 'locked' },
    { id: 5, title: 'Normalization', start: '24:10', end: '35:00', startSec: 1450, endSec: 2100, status: 'locked' },
  ],
};

const QUIZ = {
  topicId: 3,
  question: 'Which statement best describes a primary key in a standard SQL relational database?',
  options: [
    { id: 'A', text: 'A minimal superkey that uniquely identifies each tuple and disallows NULL values.' },
    { id: 'B', text: 'Any set of columns that can be used to identify a row, including NULLs.' },
    { id: 'C', text: 'A unique constraint that permits a single NULL value per column.' },
    { id: 'D', text: 'A candidate key chosen arbitrarily, with no restriction on NULL values.' },
  ],
  correctId: 'A',
};

const REMEDIATION_NOTE = {
  invariant: 'Primary Keys: A candidate key chosen by the database designer. Must uniquely identify each tuple AND must strictly disallow NULL values (Entity Integrity rule).',
  tripUp: 'Do not confuse primary keys with candidate keys that allow NULLs or unique constraints that permit a single NULL value.',
  replayClip: { label: 'Primary Key vs. NULL Rule', time: '12:45–14:20', startSec: 765 },
  previousAnswer: { userPick: 'D', correct: 'A' },
};

// ─── Topic status icon ────────────────────────────────────────────────────────
function TopicIcon({ status }) {
  if (status === 'done')
    return <span className="material-symbols-outlined text-tertiary text-[20px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>;
  if (status === 'active')
    return <span className="material-symbols-outlined text-primary text-[20px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>radio_button_checked</span>;
  if (status === 'locked')
    return <span className="material-symbols-outlined text-outline text-[20px] shrink-0">lock</span>;
  return null;
}

// ─── YouTube IFrame Player ────────────────────────────────────────────────────
function YouTubePlayer({ videoId, startSec, paused, onReady }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    // Load YouTube IFrame API once
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    const initPlayer = () => {
      if (playerRef.current) return; // already initialized
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          start: startSec,
          autoplay: 0,
          rel: 0,
          modestbranding: 1,
          controls: 0, // hide native controls — we render our own
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
        },
        events: {
          onReady: (e) => {
            onReady?.(e.target);
          },
        },
      });
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      // cleanup player on unmount
      try { playerRef.current?.destroy(); } catch (_) {}
      playerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return (
    <div className="w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}

// ─── Quiz Overlay ─────────────────────────────────────────────────────────────
function QuizOverlay({ quiz, attempt, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!selected) return;
    setSubmitted(true);
    const correct = selected === quiz.correctId;
    setTimeout(() => {
      onAnswer(correct, selected);
      setSelected(null);
      setSubmitted(false);
    }, 900);
  };

  return (
    <div className="absolute inset-0 bg-inverse-surface/60 backdrop-blur-[3px] z-20 flex items-center justify-center p-space-lg">
      <div className="bg-surface-container-lowest/95 backdrop-blur-xl p-space-xl rounded-2xl shadow-2xl max-w-lg w-full flex flex-col gap-space-lg">
        {/* Header */}
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[24px]">quiz</span>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-primary uppercase tracking-wide">
                Checkpoint • Topic {quiz.topicId} of {SESSION.totalTopics}
              </div>
              <div className="text-[11px] text-on-surface-variant">Attempt {attempt} of 2</div>
            </div>
          </div>
          <h3 className="text-base font-semibold text-on-surface mt-1">{quiz.question}</h3>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-space-xs">
          {quiz.options.map((opt) => {
            let cls = 'border border-outline-variant/30 bg-surface-container-low hover:bg-surface-container text-on-surface';
            if (selected === opt.id) cls = 'border-2 border-primary bg-primary-fixed text-primary font-semibold';
            if (submitted && opt.id === quiz.correctId) cls = 'border-2 border-tertiary bg-tertiary-fixed/20 text-tertiary font-semibold';
            if (submitted && selected === opt.id && opt.id !== quiz.correctId) cls = 'border-2 border-error bg-error-container/30 text-error font-semibold';

            return (
              <button
                key={opt.id}
                onClick={() => !submitted && setSelected(opt.id)}
                className={`w-full text-left px-space-md py-space-sm rounded-xl transition-all text-sm ${cls}`}
              >
                <span className="font-mono font-bold mr-2">{opt.id}.</span> {opt.text}
              </button>
            );
          })}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!selected || submitted}
          id="quiz-submit-btn"
          className="w-full py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold shadow-md hover:opacity-95 active:translate-y-px transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-space-xs"
        >
          <span className="material-symbols-outlined text-[18px]">{submitted ? 'hourglass_top' : 'check'}</span>
          <span>{submitted ? 'Checking...' : 'Submit Answer'}</span>
        </button>
      </div>
    </div>
  );
}

// ─── Remediation Panel ────────────────────────────────────────────────────────
function RemediationPanel({ attempt, onRetry, onReviewFromStart, onReplayClip }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-md p-space-lg flex flex-col gap-space-lg h-full">
      {/* Attempt counter */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-fixed/40 text-on-secondary-fixed text-[11px] font-semibold">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          Attempt {attempt} of 2 • Remediation Active
        </div>
        <span className="material-symbols-outlined text-outline text-[20px]">help_center</span>
      </div>

      {/* Headline */}
      <div>
        <h2 className="text-lg font-semibold text-on-surface">Let's Review This Concept</h2>
        <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
          You didn't get it quite right, but that's part of learning! Revisit the key explanation below and try again.
        </p>
      </div>

      {/* Section A: Watch again */}
      <div className="flex flex-col gap-space-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-outline">Section A: Watch This Part Again</span>
          <span className="text-[11px] font-mono text-primary font-medium">{REMEDIATION_NOTE.replayClip.time}</span>
        </div>
        <div
          onClick={onReplayClip}
          className="bg-surface-container-low rounded-xl p-space-sm flex items-center gap-space-md group hover:bg-surface-container transition-all cursor-pointer"
        >
          <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-surface-container-high shrink-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[28px] group-hover:scale-110 transition-transform">play_circle</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-on-surface group-hover:text-primary transition-colors line-clamp-1">
              {REMEDIATION_NOTE.replayClip.label}
            </span>
            <span className="text-[11px] text-on-surface-variant line-clamp-2">
              Slide breakdown of the SQL NOT NULL constraint requirement.
            </span>
          </div>
        </div>
        <button
          onClick={onReplayClip}
          className="w-full flex items-center justify-center gap-space-xs py-2 px-space-md rounded-lg bg-surface-container-high text-primary hover:bg-surface-variant transition-colors text-sm font-semibold mt-1"
        >
          <span className="material-symbols-outlined text-[18px]">replay</span>
          <span>Replay Key Moment ({REMEDIATION_NOTE.replayClip.time})</span>
        </button>
      </div>

      {/* Section B: Synced notes */}
      <div className="flex flex-col gap-space-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-outline">Section B: Synced Topic Notes</span>
          <span className="material-symbols-outlined text-outline text-[16px]">sync</span>
        </div>
        <div className="bg-surface-bright rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col gap-space-xs">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-secondary-container rounded-l-xl" />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold tracking-wide text-secondary uppercase">Key Invariant</span>
            <span className="material-symbols-outlined text-secondary text-[15px]">lock_reset</span>
          </div>
          <p className="text-xs text-on-surface leading-relaxed">
            <strong className="font-medium">Primary Keys:</strong> A candidate key chosen by the database designer.
            Must uniquely identify each tuple <em className="text-primary font-semibold">AND</em> must strictly
            disallow NULL values (Entity Integrity rule).
          </p>
          <div className="bg-surface-container-lowest p-space-xs rounded-lg mt-1">
            <p className="text-[11px] text-on-surface-variant leading-normal">
              <strong className="text-error font-medium">Common Trip-up:</strong>{' '}
              {REMEDIATION_NOTE.tripUp}
            </p>
          </div>
          <div className="pt-space-xs flex justify-end">
            <a href="#" className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[15px]">menu_book</span>
              Open Full Topic Notes
            </a>
          </div>
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
          <span>Review Topic from Start (10:15)</span>
        </button>
      </div>

      {/* Previous answer footer */}
      <div className="pt-space-md">
        <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-1">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[10px] font-semibold uppercase">Question Checkpoint</span>
            <span className="text-[11px] font-mono text-error font-medium">
              Your Pick: {REMEDIATION_NOTE.previousAnswer.userPick} • Correct: {REMEDIATION_NOTE.previousAnswer.correct}
            </span>
          </div>
          <p className="text-xs text-on-surface line-clamp-2">"{QUIZ.question}"</p>
        </div>
      </div>
    </div>
  );
}

// ─── Correct Answer Panel ─────────────────────────────────────────────────────
function CorrectPanel({ onContinue, isLastTopic }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-md p-space-lg flex flex-col gap-space-lg h-full items-center justify-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-tertiary-fixed/20 text-tertiary flex items-center justify-center">
        <span className="material-symbols-outlined text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
      </div>
      <div>
        <h2 className="text-xl font-bold text-on-surface">Topic Mastered!</h2>
        <p className="text-sm text-on-surface-variant mt-2">
          You answered correctly. Your response has been recorded and synced to your notes.
        </p>
      </div>
      <div className="flex flex-col gap-space-xs w-full">
        <button
          id="continue-topic-btn"
          onClick={onContinue}
          className="w-full py-3 rounded-xl bg-primary-container text-on-primary text-sm font-semibold shadow-md hover:bg-primary active:translate-y-px transition-all flex items-center justify-center gap-space-xs"
        >
          <span className="material-symbols-outlined text-[20px]">{isLastTopic ? 'flag' : 'skip_next'}</span>
          <span>{isLastTopic ? 'Finish Session' : 'Continue to Next Topic'}</span>
        </button>
        <button className="w-full py-2 rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container text-sm font-medium flex items-center justify-center gap-space-xs transition-colors">
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
  const [activeTopicIdx, setActiveTopicIdx] = useState(2); // 0-indexed, topic 3 is active
  const [phase, setPhase] = useState('watching'); // 'watching' | 'quiz' | 'remediation' | 'correct'
  const [attempt, setAttempt] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [topics, setTopics] = useState(SESSION.topics);
  const playerRef = useRef(null);

  const activeTopic = topics[activeTopicIdx];
  const completedCount = topics.filter((t) => t.status === 'done').length;
  const progress = Math.round((completedCount / SESSION.totalTopics) * 100);

  const handlePlayerReady = useCallback((player) => {
    playerRef.current = player;
  }, []);

  const seekTo = useCallback((sec) => {
    playerRef.current?.seekTo(sec, true);
  }, []);

  const handlePlayPause = () => {
    if (!playerRef.current) return;
    const state = playerRef.current.getPlayerState?.();
    if (state === 1) { playerRef.current.pauseVideo(); setIsPlaying(false); }
    else { playerRef.current.playVideo(); setIsPlaying(true); }
  };

  const handleRewind10 = () => {
    if (!playerRef.current) return;
    const t = playerRef.current.getCurrentTime?.() || 0;
    playerRef.current.seekTo(Math.max(0, t - 10), true);
  };

  const handleReplaySegment = () => {
    seekTo(activeTopic.startSec);
    playerRef.current?.playVideo();
    setIsPlaying(true);
    setPhase('watching');
  };

  const handleCheckpointHit = () => {
    playerRef.current?.pauseVideo();
    setIsPlaying(false);
    setPhase('quiz');
  };

  const handleAnswer = (correct) => {
    if (correct) {
      setPhase('correct');
    } else {
      if (attempt >= 2) {
        // Max attempts — still move on but mark as weak
        setPhase('correct');
      } else {
        setAttempt((a) => a + 1);
        setPhase('remediation');
      }
    }
  };

  const handleRetry = () => {
    setPhase('quiz');
  };

  const handleContinue = () => {
    // Mark current as done, unlock next
    const updated = topics.map((t, i) => {
      if (i === activeTopicIdx) return { ...t, status: 'done' };
      if (i === activeTopicIdx + 1) return { ...t, status: 'active' };
      return t;
    });
    setTopics(updated);

    if (activeTopicIdx + 1 < topics.length) {
      setActiveTopicIdx(activeTopicIdx + 1);
      setAttempt(1);
      setPhase('watching');
      seekTo(topics[activeTopicIdx + 1].startSec);
    } else {
      navigate('/session-results');
    }
  };

  const handleReplayClip = () => {
    seekTo(REMEDIATION_NOTE.replayClip.startSec);
    playerRef.current?.playVideo();
    setIsPlaying(true);
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
          <span className="text-on-surface-variant">{SESSION.subject}</span>
          <span className="material-symbols-outlined text-outline text-[16px]">chevron_right</span>
          <span className="font-semibold text-primary">Topic {activeTopicIdx + 1}: {activeTopic?.title}</span>
        </div>
        <div className="flex items-center gap-space-md shrink-0">
          <div className="flex items-center gap-space-xs bg-surface-container-high px-space-md py-1 rounded-full">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] text-on-surface font-medium">
              Topic {activeTopicIdx + 1} of {SESSION.totalTopics} • {progress}%
            </span>
          </div>
          <div className="h-4 w-px bg-surface-container" />
          <button className="flex items-center gap-space-xs px-space-md py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all text-sm">
            <span className="material-symbols-outlined text-[18px]">description</span>
            <span>Full Notes</span>
          </button>
          <Link
            to="/interactive"
            className="flex items-center gap-space-xs px-space-md py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-error hover:bg-error-container/30 transition-all text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Save & Exit</span>
          </Link>
        </div>
      </header>

      {/* ── 3-Pane Workspace ── */}
      <div className="flex flex-col lg:flex-row w-full min-h-[calc(100vh-8.5rem)] p-space-md gap-gutter">

        {/* LEFT: Topic nav */}
        <aside className="w-full lg:w-[260px] shrink-0">
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between h-full">
            <div className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between pb-space-xs">
                <div className="flex items-center gap-space-xs">
                  <span className="text-base font-semibold text-on-surface">Lecture Topics</span>
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                    {SESSION.totalTopics}
                  </span>
                </div>
                <span className="material-symbols-outlined text-outline text-[18px]">view_timeline</span>
              </div>

              <div className="flex flex-col gap-1.5 pt-space-xs">
                {topics.map((topic, i) => {
                  const isActive = i === activeTopicIdx;
                  return (
                    <div key={topic.id}>
                      {isActive ? (
                        <div className="w-full text-left p-space-sm rounded-lg bg-surface-container-high shadow-sm flex items-start gap-space-sm relative overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-lg" />
                          <TopicIcon status="active" />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-semibold text-primary line-clamp-1">{String(i + 1).padStart(2, '0')}. {topic.title}</span>
                            </div>
                            <div className="flex items-center justify-between gap-1 mt-0.5">
                              <span className="text-[10px] font-mono text-primary font-medium">{topic.start} – {topic.end}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary text-on-primary font-semibold">Current</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => topic.status !== 'locked' && setActiveTopicIdx(i)}
                          className={`w-full text-left p-space-sm rounded-lg flex items-start gap-space-sm group transition-colors ${
                            topic.status === 'locked' ? 'opacity-60 cursor-not-allowed' : 'hover:bg-surface-container-low cursor-pointer'
                          }`}
                        >
                          <TopicIcon status={topic.status} />
                          <div className="flex flex-col min-w-0">
                            <span className="text-[11px] text-on-surface-variant group-hover:text-on-surface line-clamp-1">
                              {String(i + 1).padStart(2, '0')}. {topic.title}
                            </span>
                            <span className="text-[10px] font-mono text-outline">{topic.start} – {topic.end}</span>
                          </div>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Segment status widget */}
            <div className="mt-space-md pt-space-md bg-surface-container-low rounded-lg p-space-sm flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-[11px] font-medium">Segment Status</span>
                <span className="text-[11px] font-mono text-primary">
                  {activeTopic ? `${activeTopic.start}–${activeTopic.end}` : ''}
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-tight">
                1 active interactive checkpoint pending on this segment.
              </p>
              <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden mt-1">
                <div className="bg-primary h-full rounded-full w-full" />
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER: Video + controls */}
        <main className="flex-1 flex flex-col gap-space-md min-w-0">
          {/* Video card */}
          <div className="bg-surface-container-lowest rounded-xl shadow-md overflow-hidden flex flex-col">
            {/* Video area */}
            <div className="relative w-full aspect-video bg-inverse-surface overflow-hidden">
              <YouTubePlayer
                videoId={SESSION.videoId}
                startSec={activeTopic?.startSec || 0}
                paused={phase !== 'watching' || !isPlaying}
                onReady={handlePlayerReady}
              />

              {/* Quiz overlay when checkpoint hit */}
              {phase === 'quiz' && (
                <QuizOverlay quiz={QUIZ} attempt={attempt} onAnswer={handleAnswer} />
              )}

              {/* Pause overlay when in remediation/correct */}
              {(phase === 'remediation' || phase === 'correct') && (
                <div className="absolute inset-0 bg-inverse-surface/60 backdrop-blur-[2px] z-10 flex items-center justify-center p-space-lg">
                  <div className="bg-surface-container-lowest/95 backdrop-blur-xl p-space-lg rounded-2xl shadow-xl max-w-md text-center flex flex-col items-center gap-space-sm">
                    <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[28px]">pause_circle</span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-on-surface">Playback Paused at Checkpoint</h3>
                      <p className="text-xs text-on-surface-variant mt-1">
                        Checkpoint reached at <span className="font-mono font-semibold text-on-surface">{activeTopic?.end}</span>.{' '}
                        {phase === 'remediation'
                          ? 'Complete the remediation prompt in the right panel to resume.'
                          : 'Well done! Continue to the next topic when ready.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Player controls */}
            <div className="p-space-md bg-surface-container-lowest flex flex-col gap-space-sm">
              {/* Segmented timeline */}
              <div className="flex flex-col gap-1 w-full">
                <div className="relative w-full h-2.5 bg-surface-container rounded-full overflow-hidden flex cursor-pointer">
                  <div className="h-full bg-surface-container-high opacity-60" style={{ width: `${(activeTopicIdx / SESSION.totalTopics) * 100}%` }} />
                  <div className="h-full bg-primary relative" style={{ width: `${(1 / SESSION.totalTopics) * 100}%` }}>
                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-on-primary shadow-md rounded-full" />
                  </div>
                  <div className="h-full bg-surface-container opacity-40 flex-1" />
                </div>
                <div className="flex items-center justify-between text-outline text-[10px] font-mono">
                  <span>{activeTopic?.start} (Start)</span>
                  <div className="flex items-center gap-1 font-semibold text-primary">
                    <span className="material-symbols-outlined text-[13px]">flag</span>
                    <span>Checkpoint • {activeTopic?.end}</span>
                  </div>
                  <span>{activeTopic?.end} (End)</span>
                </div>
              </div>

              {/* Control bar */}
              <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs">
                {/* Left controls */}
                <div className="flex items-center gap-space-xs">
                  <button
                    onClick={handlePlayPause}
                    aria-label="Play/Pause"
                    className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">{isPlaying ? 'pause' : 'play_arrow'}</span>
                  </button>
                  <button onClick={handleRewind10} aria-label="Rewind 10s" className="w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors">
                    <span className="material-symbols-outlined text-[20px]">replay_10</span>
                  </button>
                  <button aria-label="Forward 10s" disabled className="w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center text-on-surface-variant opacity-40 cursor-not-allowed">
                    <span className="material-symbols-outlined text-[20px]">forward_10</span>
                  </button>
                  <div className="flex items-center gap-1 pl-space-xs">
                    <span className="material-symbols-outlined text-outline text-[18px]">volume_up</span>
                    <div className="w-16 h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div className="bg-on-surface-variant h-full w-[70%]" />
                    </div>
                  </div>
                </div>

                {/* Center: replay segment / trigger checkpoint */}
                <div className="flex items-center gap-space-xs">
                  <button
                    onClick={handleReplaySegment}
                    className="flex items-center gap-space-xs px-space-md py-1.5 rounded-lg bg-surface-container-high text-primary hover:bg-surface-variant transition-colors text-sm font-medium"
                  >
                    <span className="material-symbols-outlined text-[18px]">replay</span>
                    <span>Replay Segment</span>
                  </button>
                  {phase === 'watching' && (
                    <button
                      id="trigger-checkpoint-btn"
                      onClick={handleCheckpointHit}
                      className="flex items-center gap-space-xs px-space-md py-1.5 rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-colors text-sm font-medium shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[18px]">flag</span>
                      <span>Hit Checkpoint</span>
                    </button>
                  )}
                </div>

                {/* Right: topic navigation */}
                <div className="flex items-center gap-space-xs">
                  <button
                    disabled={activeTopicIdx === 0}
                    onClick={() => { setActiveTopicIdx(activeTopicIdx - 1); setPhase('watching'); setAttempt(1); }}
                    className="flex items-center gap-1 px-space-sm py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[16px]">skip_previous</span>
                    <span>Prev</span>
                  </button>
                  <button
                    disabled={phase !== 'correct' && activeTopicIdx < topics.filter(t => t.status !== 'locked').length - 1}
                    className="flex items-center gap-1 px-space-sm py-1.5 rounded-lg bg-surface-container-low text-outline text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>Next</span>
                    <span className="material-symbols-outlined text-[16px]">skip_next</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Topic context card */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-container text-primary font-semibold">
                  In-Progress Topic
                </span>
                <span className="text-outline text-xs">•</span>
                <span className="text-[11px] text-on-surface-variant">Core Relational Model • Chapter 3</span>
              </div>
              <button className="text-primary hover:text-primary-container text-[11px] flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">bookmark_border</span>
                Bookmark Timestamp
              </button>
            </div>
            <h1 className="text-xl font-semibold text-on-surface tracking-tight mt-1">
              Topic {activeTopicIdx + 1}: {activeTopic?.title}
            </h1>
            <p className="text-sm text-on-surface-variant">
              Covers the formal definition of minimal superkeys, candidate keys, and why primary keys disallow NULL
              attributes in standard SQL relational tables to guarantee tuple addressability.
            </p>
            <div className="flex flex-wrap items-center gap-space-xs pt-space-xs mt-1">
              {['Minimal Superkey', 'Entity Integrity', 'Disallowing NULLs', 'Unique Constraints'].map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface-variant text-[11px] font-mono">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </main>

        {/* RIGHT: Adaptive remediation / correct panel */}
        <aside className="w-full lg:w-[380px] shrink-0">
          {phase === 'remediation' ? (
            <RemediationPanel
              attempt={attempt}
              onRetry={handleRetry}
              onReviewFromStart={handleReplaySegment}
              onReplayClip={handleReplayClip}
            />
          ) : phase === 'correct' ? (
            <CorrectPanel onContinue={handleContinue} isLastTopic={isLastTopic} />
          ) : (
            /* Idle panel while watching */
            <div className="bg-surface-container-lowest rounded-xl shadow-md p-space-lg flex flex-col gap-space-md h-full justify-center items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-surface-container-high flex items-center justify-center text-primary-container">
                <span className="material-symbols-outlined text-[32px]">play_lesson</span>
              </div>
              <div>
                <h3 className="text-base font-semibold text-on-surface">Watch the Segment</h3>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  Follow along with Topic {activeTopicIdx + 1}. When you're ready, hit the checkpoint button to test your understanding.
                </p>
              </div>
              <button
                onClick={handleCheckpointHit}
                className="px-space-lg py-2.5 rounded-xl bg-primary-container text-on-primary text-sm font-semibold shadow-md hover:bg-primary active:translate-y-px transition-all flex items-center gap-space-xs"
              >
                <span className="material-symbols-outlined text-[18px]">flag</span>
                <span>I'm Ready — Take the Checkpoint</span>
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
