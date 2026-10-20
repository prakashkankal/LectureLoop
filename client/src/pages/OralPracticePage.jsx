import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/oral-practice';
const difficulties = ['basic', 'intermediate', 'advanced'];
const modes = [
  { value: 'english-assessment', label: 'English assessment' },
  { value: 'practice', label: 'Hinglish practice' },
];

function authorizedConfig(extra = {}) {
  const token = localStorage.getItem('lectureloop_token');
  return {
    ...extra,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(extra.headers || {}),
    },
  };
}

function prettyDate(value) {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function SpeechButton({ onTranscript, language = 'en-IN', disabled }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const secondsRef = useRef(0);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const transcriptRef = useRef('');

  useEffect(() => {
    if (!recording) return undefined;
    const timer = window.setInterval(() => {
      secondsRef.current += 1;
      setSeconds(secondsRef.current);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => () => {
    recognitionRef.current?.abort?.();
    recorderRef.current?.stop?.();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function start() {
    setError('');
    setSeconds(0);
    secondsRef.current = 0;
    transcriptRef.current = '';
    chunksRef.current = [];
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        throw new Error('Audio recording is unavailable. You can type your answer instead.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find((type) => window.MediaRecorder.isTypeSupported(type));
      const recorder = new window.MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 300));
        const streamDuration = secondsRef.current;
        try {
          let transcript = transcriptRef.current.trim();
          let source = 'Browser speech recognition';
          if (!transcript && chunksRef.current.length) {
            const form = new FormData();
            form.append('audio', new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }), 'oral-answer.webm');
            form.append('language', language.startsWith('hi') ? 'hi' : 'en');
            const response = await axios.post(`${API_BASE}/transcribe`, form, authorizedConfig());
            transcript = response.data.data.transcript;
            source = 'OpenAI audio transcription';
          }
          if (!transcript) throw new Error('No speech was recognized. Type your answer instead.');
          onTranscript(transcript, streamDuration, source);
        } catch (requestError) {
          setError(requestError.response?.data?.error || requestError.message);
        } finally {
          stream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          setRecording(false);
        }
      };
      recorder.start();

      const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (Recognition) {
        const recognition = new Recognition();
        recognition.lang = language;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event) => {
          let transcript = '';
          for (let index = 0; index < event.results.length; index += 1) {
            transcript += `${event.results[index][0].transcript} `;
          }
          transcriptRef.current = transcript.trim();
        };
        recognition.onerror = (event) => {
          if (event.error === 'not-allowed') setError('Microphone recognition permission was denied.');
        };
        recognitionRef.current = recognition;
        try {
          recognition.start();
        } catch {
          setError('Browser recognition is busy; audio transcription will be used when available.');
        }
      }
      setRecording(true);
    } catch (requestError) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setError(requestError.name === 'NotAllowedError'
        ? 'Microphone permission was denied. Allow microphone access or type your answer.'
        : requestError.message);
    }
  }

  function stop() {
    recognitionRef.current?.stop?.();
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={disabled}
        onClick={recording ? stop : start}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
          recording ? 'bg-error text-on-error' : 'bg-secondary-container text-on-secondary-container'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className="material-symbols-outlined text-[18px]">{recording ? 'stop_circle' : 'mic'}</span>
        {recording ? `Stop recording · ${seconds}s` : 'Speak answer'}
      </button>
      {error && <p role="alert" className="max-w-md text-xs text-error">{error}</p>}
    </div>
  );
}

export default function OralPracticePage() {
  const [tab, setTab] = useState('practice');
  const [materials, setMaterials] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [material, setMaterial] = useState({
    subject: '',
    lecture: '',
    topic: '',
    notes: '',
    keyTerms: [],
  });
  const [difficulty, setDifficulty] = useState('intermediate');
  const [mode, setMode] = useState('english-assessment');
  const [questions, setQuestions] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [originalTranscript, setOriginalTranscript] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [evaluation, setEvaluation] = useState(null);
  const [sessionAttempts, setSessionAttempts] = useState([]);
  const [languageText, setLanguageText] = useState('');
  const [languageResult, setLanguageResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const question = questions[questionIndex];
  const hasNotes = material.notes.trim().length >= 20;

  useEffect(() => {
    let active = true;
    Promise.all([
      axios.get(`${API_BASE}/materials`, authorizedConfig()),
      axios.get(`${API_BASE}/attempts`, authorizedConfig()),
    ]).then(([materialResponse, attemptResponse]) => {
      if (!active) return;
      const loadedMaterials = materialResponse.data.data || [];
      setMaterials(loadedMaterials);
      setAttempts(attemptResponse.data.data || []);
      if (loadedMaterials.length) setMaterial(loadedMaterials[0]);
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.error || requestError.message);
    });
    return () => { active = false; };
  }, []);

  function updateMaterialField(field, value) {
    setMaterial((current) => ({ ...current, [field]: value }));
  }

  function selectMaterial(id) {
    const selected = materials.find((item) => item.id === id);
    if (selected) {
      setMaterial({ ...selected, keyTerms: selected.keyTerms || [] });
      setError('');
    }
  }

  async function startPractice(event) {
    event.preventDefault();
    if (!hasNotes) {
      setError('Add at least 20 characters of source notes before beginning practice.');
      return;
    }
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const response = await axios.post(
        `${API_BASE}/questions`,
        { material, difficulty, count: 5 },
        authorizedConfig()
      );
      setMaterial(response.data.data.material);
      setQuestions(response.data.data.questions);
      setQuestionIndex(0);
      setAnswer('');
      setOriginalTranscript('');
      setEvaluation(null);
      setSessionAttempts([]);
      setTab('session');
      setNotice(response.data.data.provider === 'local'
        ? 'Using source-grounded local prompts. Configure OPENAI_API_KEY for AI-generated questions and feedback.'
        : 'AI-generated oral questions are ready.');
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer(event) {
    event.preventDefault();
    if (!answer.trim() || !question) return;
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(
        `${API_BASE}/evaluate`,
        {
          material,
          question,
          answer: answer.trim(),
          originalTranscript: originalTranscript || answer.trim(),
          durationSeconds,
          difficulty,
          mode,
        },
        authorizedConfig()
      );
      const attempt = response.data.data.attempt;
      setEvaluation(attempt.evaluation);
      setSessionAttempts((current) => [...current, attempt]);
      setAttempts((current) => [attempt, ...current]);
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function nextQuestion() {
    setQuestionIndex((current) => current + 1);
    setAnswer('');
    setOriginalTranscript('');
    setDurationSeconds(0);
    setEvaluation(null);
  }

  function endPractice() {
    setQuestions([]);
    setEvaluation(null);
    setTab('practice');
    setNotice(`Practice session complete. ${sessionAttempts.length} answer${sessionAttempts.length === 1 ? '' : 's'} saved to your history.`);
  }

  async function deleteAttempt(id) {
    setError('');
    try {
      await axios.delete(`${API_BASE}/attempts/${encodeURIComponent(id)}`, authorizedConfig());
      setAttempts((current) => current.filter((attempt) => attempt._id !== id));
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message);
    }
  }

  async function translateResponse(event) {
    event.preventDefault();
    if (!languageText.trim()) return;
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(
        `${API_BASE}/language-assist`,
        { text: languageText },
        authorizedConfig()
      );
      setLanguageResult(response.data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function captureLanguageSpeech(text) {
    setLanguageText((current) => `${current} ${text}`.trim());
  }

  return (
    <section className="mx-auto max-w-7xl px-gutter py-space-xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-primary-container">Oral learning</p>
          <h1 className="text-3xl font-bold text-on-surface">Oral Practice</h1>
          <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">
            Practice explaining lecture concepts aloud, review grounded feedback, and track your progress.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Oral practice sections">
          {[
            ['practice', 'Practice', 'record_voice_over'],
            ['history', 'Progress & history', 'insights'],
            ['language', 'Language helper', 'translate'],
          ].map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id || (id === 'practice' && tab === 'session')}
              onClick={() => { setTab(id); setError(''); }}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                tab === id || (id === 'practice' && tab === 'session')
                  ? 'bg-primary-container text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{icon}</span>{label}
            </button>
          ))}
        </div>
      </div>

      {error && <div role="alert" className="mb-4 rounded-xl border border-error/20 bg-error-container/30 p-3 text-sm text-error">{error}</div>}
      {notice && <div role="status" className="mb-4 rounded-xl border border-primary/20 bg-primary-fixed/40 p-3 text-sm text-on-surface">{notice}</div>}

      {tab === 'practice' && (
        <form onSubmit={startPractice} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
            <h2 className="text-lg font-bold text-on-surface">Choose what to practice</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Select a lecture topic or add your own source notes.</p>
            <label className="mt-5 block text-xs font-semibold text-on-surface-variant" htmlFor="oral-material">
              Lecture topic
            </label>
            <select
              id="oral-material"
              value={materials.some((item) => item.id === material.id) ? material.id : ''}
              onChange={(event) => selectMaterial(event.target.value)}
              className="mt-1 w-full rounded-lg border border-outline-variant/50 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface"
            >
              <option value="">Write or paste custom notes</option>
              {materials.map((item) => <option key={item.id} value={item.id}>{item.subject} · {item.lecture} · {item.topic}</option>)}
            </select>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ['subject', 'Subject'],
                ['lecture', 'Lecture'],
                ['topic', 'Topic'],
              ].map(([field, label]) => (
                <label key={field} className="text-xs font-semibold text-on-surface-variant">
                  {label}
                  <input
                    value={material[field]}
                    onChange={(event) => updateMaterialField(field, event.target.value)}
                    maxLength={160}
                    required
                    className="mt-1 w-full rounded-lg border border-outline-variant/50 bg-surface-container-low px-3 py-2 text-sm text-on-surface"
                  />
                </label>
              ))}
            </div>
            <label className="mt-4 block text-xs font-semibold text-on-surface-variant" htmlFor="oral-notes">
              Source notes
            </label>
            <textarea
              id="oral-notes"
              value={material.notes}
              onChange={(event) => updateMaterialField('notes', event.target.value)}
              rows={8}
              maxLength={30000}
              required
              placeholder="Paste your lecture notes or topic summary here. Questions and feedback will be grounded in this text."
              className="mt-1 w-full resize-y rounded-lg border border-outline-variant/50 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface"
            />
            <label className="mt-4 block text-xs font-semibold text-on-surface-variant" htmlFor="oral-key-terms">
              Key terms <span className="font-normal">(comma-separated)</span>
            </label>
            <input
              id="oral-key-terms"
              value={material.keyTerms.join(', ')}
              onChange={(event) => updateMaterialField('keyTerms', event.target.value.split(',').map((term) => term.trim()).filter(Boolean))}
              maxLength={1500}
              className="mt-1 w-full rounded-lg border border-outline-variant/50 bg-surface-container-low px-3 py-2 text-sm text-on-surface"
            />
            <p className="mt-1 text-xs text-on-surface-variant">{material.notes.length}/30,000 characters · minimum 20</p>
          </div>
          <aside className="h-fit rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
            <h2 className="text-lg font-bold text-on-surface">Practice settings</h2>
            <label className="mt-5 block text-xs font-semibold text-on-surface-variant" htmlFor="oral-difficulty">Difficulty</label>
            <select
              id="oral-difficulty"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
              className="mt-1 w-full rounded-lg border border-outline-variant/50 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface"
            >
              {difficulties.map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
            </select>
            <label className="mt-4 block text-xs font-semibold text-on-surface-variant" htmlFor="oral-mode">Mode</label>
            <select
              id="oral-mode"
              value={mode}
              onChange={(event) => setMode(event.target.value)}
              className="mt-1 w-full rounded-lg border border-outline-variant/50 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface"
            >
              {modes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <div className="mt-5 rounded-xl bg-primary-fixed/40 p-3 text-xs leading-relaxed text-on-surface">
              {hasNotes
                ? 'Questions are created from the source notes. Without an AI key, local prompts and clearly labeled heuristic feedback are used.'
                : 'Select a lecture with notes or paste at least 20 characters of source material to begin.'}
            </div>
            <button
              type="submit"
              disabled={loading || !hasNotes}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-container px-4 py-3 text-sm font-bold text-on-primary shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">{loading ? 'progress_activity' : 'play_arrow'}</span>
              {loading ? 'Preparing questions…' : 'Begin oral practice'}
            </button>
          </aside>
        </form>
      )}

      {tab === 'session' && question && (
        <div className="mx-auto max-w-4xl rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/20 pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-primary-container">{material.topic}</p>
              <h2 className="mt-1 text-lg font-bold text-on-surface">Question {questionIndex + 1} of {questions.length}</h2>
            </div>
            <button type="button" onClick={endPractice} className="rounded-lg border border-outline-variant/50 px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-container-low">End session</button>
          </div>
          <div className="mt-5 rounded-xl bg-surface-container-low p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Explain in your own words</p>
            <p className="mt-2 text-xl font-semibold leading-relaxed text-on-surface">{question.question}</p>
          </div>
          <form onSubmit={submitAnswer} className="mt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <label htmlFor="oral-answer" className="text-sm font-semibold text-on-surface">Your answer</label>
              <SpeechButton
                language={mode === 'practice' ? 'hi-IN' : 'en-IN'}
                disabled={loading || Boolean(evaluation)}
                onTranscript={(transcript, elapsed, source) => {
                  setAnswer(transcript);
                  setOriginalTranscript(transcript);
                  setDurationSeconds(elapsed);
                  setNotice(`Answer captured with ${source}. You can edit it before submission.`);
                }}
              />
            </div>
            <textarea
              id="oral-answer"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              rows={7}
              maxLength={12000}
              placeholder="Type your explanation or use Speak answer."
              disabled={Boolean(evaluation)}
              className="w-full resize-y rounded-lg border border-outline-variant/50 bg-surface-container-low px-3 py-3 text-sm text-on-surface disabled:opacity-70"
            />
            {originalTranscript && <p className="mt-2 text-xs text-on-surface-variant">Original speech transcript is preserved for this answer.</p>}
            {!evaluation
              ? <button type="submit" disabled={loading || !answer.trim()} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-container px-4 py-2.5 text-sm font-bold text-on-primary disabled:opacity-50">{loading ? 'Evaluating…' : 'Submit answer'}</button>
              : <div className="mt-4 rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Answer feedback · {evaluation.evaluationMode}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-surface-container-lowest p-3"><span className="text-xs text-on-surface-variant">Content score</span><strong className="ml-2 text-lg text-on-surface">{evaluation.contentScore}/10</strong><p className="mt-1 text-xs text-on-surface-variant">{evaluation.scoreReasons?.content}</p></div>
                  <div className="rounded-lg bg-surface-container-lowest p-3"><span className="text-xs text-on-surface-variant">Language score</span><strong className="ml-2 text-lg text-on-surface">{evaluation.languageScore}/10</strong><p className="mt-1 text-xs text-on-surface-variant">{evaluation.scoreReasons?.language}</p></div>
                </div>
                <p className="mt-3 text-sm text-on-surface"><strong>Suggested answer:</strong> {evaluation.modelAnswer}</p>
                {evaluation.differences?.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm text-on-surface-variant">{evaluation.differences.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>}
                {evaluation.claritySuggestions?.length > 0 && <p className="mt-2 text-sm text-on-surface-variant">{evaluation.claritySuggestions[0]}</p>}
                <p className="mt-2 text-xs text-on-surface-variant">{evaluation.speakingSuggestion}</p>
                <button type="button" onClick={questionIndex + 1 < questions.length ? nextQuestion : endPractice} className="mt-4 rounded-lg bg-primary-container px-4 py-2.5 text-sm font-bold text-on-primary">
                  {questionIndex + 1 < questions.length ? 'Next question' : 'Finish practice'}
                </button>
              </div>}
          </form>
        </div>
      )}

      {tab === 'session' && !question && (
        <div className="mx-auto max-w-3xl rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-7 text-center">
          <span className="material-symbols-outlined text-4xl text-primary-container">task_alt</span>
          <h2 className="mt-2 text-2xl font-bold text-on-surface">Practice complete</h2>
          <p className="mt-2 text-sm text-on-surface-variant">{sessionAttempts.length} answer{sessionAttempts.length === 1 ? '' : 's'} saved to your progress history.</p>
          <button type="button" onClick={endPractice} className="mt-5 rounded-lg bg-primary-container px-4 py-2.5 text-sm font-bold text-on-primary">Back to practice</button>
        </div>
      )}

      {tab === 'history' && (
        <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="text-xl font-bold text-on-surface">Progress & history</h2><p className="mt-1 text-sm text-on-surface-variant">Your saved oral-practice answers for this account.</p></div>
            <div className="rounded-xl bg-primary-fixed/40 px-4 py-3 text-sm text-on-surface"><strong>{attempts.length}</strong> saved answers</div>
          </div>
          {attempts.length === 0
            ? <p className="rounded-xl bg-surface-container-low p-6 text-center text-sm text-on-surface-variant">Complete a practice answer to start your history.</p>
            : <div className="space-y-3">{attempts.map((attempt) => (
              <article key={attempt._id} className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-xs font-semibold text-primary-container">{attempt.material?.subject} · {attempt.material?.lecture}</p><h3 className="mt-1 font-bold text-on-surface">{attempt.material?.topic}</h3><p className="mt-1 text-xs text-on-surface-variant">{prettyDate(attempt.createdAt)}</p></div>
                  <div className="flex items-center gap-3"><span className="rounded-lg bg-surface-container-lowest px-3 py-2 text-sm font-semibold text-on-surface">{attempt.evaluation?.contentScore}/10 content · {attempt.evaluation?.languageScore}/10 language</span><button type="button" onClick={() => deleteAttempt(attempt._id)} aria-label="Delete practice answer" className="rounded-lg p-2 text-on-surface-variant hover:bg-error-container/40 hover:text-error"><span className="material-symbols-outlined text-[18px]">delete</span></button></div>
                </div>
                <p className="mt-3 text-sm text-on-surface"><strong>Question:</strong> {attempt.question}</p>
                <p className="mt-2 line-clamp-3 text-sm text-on-surface-variant"><strong>Your answer:</strong> {attempt.answer}</p>
                {attempt.evaluation?.evaluationMode === 'local heuristic' && <p className="mt-2 text-xs text-on-surface-variant">Score is a local estimate, not a full semantic assessment.</p>}
              </article>
            ))}</div>}
        </div>
      )}

      {tab === 'language' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <form onSubmit={translateResponse} className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-primary-container">Practice support · not an assessment</p>
            <h2 className="mt-1 text-xl font-bold text-on-surface">Find your English phrasing</h2>
            <p className="mt-2 text-sm text-on-surface-variant">Write a Hindi, English, or mixed explanation. Your original is preserved.</p>
            <textarea value={languageText} onChange={(event) => setLanguageText(event.target.value)} rows={8} maxLength={12000} placeholder="Type or speak your explanation…" className="mt-4 w-full rounded-lg border border-outline-variant/50 bg-surface-container-low px-3 py-3 text-sm text-on-surface" />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <SpeechButton language="hi-IN" disabled={loading} onTranscript={(transcript) => captureLanguageSpeech(transcript)} />
              <button type="submit" disabled={loading || !languageText.trim()} className="rounded-lg bg-primary-container px-4 py-2.5 text-sm font-bold text-on-primary disabled:opacity-50">{loading ? 'Working…' : 'Translate and coach'}</button>
            </div>
          </form>
          <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
            <h2 className="text-lg font-bold text-on-surface">English version</h2>
            {languageResult
              ? <>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-on-surface">{languageResult.translation}</p>
                <p className="mt-4 text-xs text-on-surface-variant">{languageResult.assistanceMode}</p>
                <h3 className="mt-5 font-semibold text-on-surface">Useful phrases</h3>
                <div className="mt-2 space-y-2">{(languageResult.usefulPhrases || []).map((item) => <p key={item.phrase} className="rounded-lg bg-surface-container-low p-3 text-sm"><strong>{item.phrase}</strong><span className="ml-2 text-on-surface-variant">{item.meaning}</span></p>)}</div>
                <button type="button" disabled={!('speechSynthesis' in window)} onClick={() => { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(languageResult.practiceAnswer)); }} className="mt-4 rounded-lg border border-outline-variant/50 px-3 py-2 text-sm font-semibold text-on-surface disabled:opacity-50">Listen to the English version</button>
              </>
              : <p className="mt-3 rounded-xl bg-surface-container-low p-5 text-sm text-on-surface-variant">Your supported English version and speaking phrases will appear here.</p>}
          </section>
        </div>
      )}
    </section>
  );
}
