import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CircleStop, LoaderCircle, Mic, RotateCcw, Volume2 } from 'lucide-react';
import FeedbackReport from '../components/FeedbackReport.jsx';
import { api } from '../services/api.js';
import { getRecognitionConstructor, speakQuestion } from '../services/speech.js';

export default function PracticeSession({ material, questions, difficulty, mode, onExit, onAttemptSaved }) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [originalTranscript, setOriginalTranscript] = useState('');
  const [editedAnswer, setEditedAnswer] = useState('');
  const [transcriptSource, setTranscriptSource] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const chunksRef = useRef([]);
  const speechTextRef = useRef('');

  const question = questions[questionIndex];

  useEffect(() => {
    if (!recording) return undefined;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
    recognitionRef.current?.abort?.();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function acceptTranscript(text, source) {
    const normalized = text.trim();
    setOriginalTranscript(normalized);
    setEditedAnswer(normalized);
    setTranscriptSource(source);
  }

  async function startRecording() {
    setError('');
    setOriginalTranscript('');
    setEditedAnswer('');
    setTranscriptSource('');
    speechTextRef.current = '';
    setSeconds(0);
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('Audio recording is unavailable in this browser. Type your answer instead.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setBusy(true);
        let transcript = speechTextRef.current.trim();
        let source = transcript ? 'Browser speech recognition' : '';
        if (!transcript && chunksRef.current.length) {
          try {
            const form = new FormData();
            form.append('audio', new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }), 'answer.webm');
            form.append('language', mode === 'practice' ? 'hi' : 'en');
            const result = await api('/transcribe', { method: 'POST', body: form });
            transcript = result.transcript;
            source = 'Configured speech service';
          } catch (transcriptionError) {
            setError(`${transcriptionError.message} You can type or edit your answer below.`);
          }
        }
        if (transcript) acceptTranscript(transcript, source);
        else if (!speechTextRef.current.trim()) setError((current) => current || 'No words were recognized. Check microphone access or type your answer.');
        setBusy(false);
      };
      recorder.start();
      const Recognition = getRecognitionConstructor();
      if (Recognition) {
        const recognition = new Recognition();
        recognition.lang = mode === 'practice' ? 'hi-IN' : 'en-IN';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event) => {
          let transcript = '';
          for (let index = 0; index < event.results.length; index += 1) transcript += `${event.results[index][0].transcript} `;
          speechTextRef.current = transcript.trim();
        };
        recognition.onerror = (event) => {
          if (event.error === 'not-allowed') setError('Speech recognition permission was denied. You can still type your answer.');
        };
        recognitionRef.current = recognition;
        try { recognition.start(); } catch { /* A browser may already own the recognition session. */ }
      }
      setRecording(true);
    } catch (recordError) {
      const message = recordError.name === 'NotAllowedError'
        ? 'Microphone permission was denied. Allow microphone access or type your answer.'
        : recordError.name === 'NotFoundError'
          ? 'No microphone was found. Connect one or type your answer.'
          : recordError.message || 'Could not start recording.';
      setError(message);
    }
  }

  function stopRecording() {
    recognitionRef.current?.stop?.();
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    setRecording(false);
  }

  async function submitAnswer(event) {
    event.preventDefault();
    if (!editedAnswer.trim()) {
      setError('Add or record an answer before submitting.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await api('/evaluate', {
        method: 'POST',
        body: JSON.stringify({
          material,
          question,
          answer: editedAnswer,
          originalTranscript: originalTranscript || editedAnswer,
          difficulty,
          mode: mode === 'practice' ? 'practice' : 'english-assessment',
          durationSeconds: originalTranscript ? seconds : 0,
        }),
      });
      setFeedback(result.attempt);
      onAttemptSaved();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function nextQuestion() {
    if (questionIndex + 1 >= questions.length) {
      onExit();
      return;
    }
    setQuestionIndex((value) => value + 1);
    setFeedback(null);
    setOriginalTranscript('');
    setEditedAnswer('');
    setTranscriptSource('');
    setSeconds(0);
    setError('');
  }

  return (
    <section className="session-view">
      <button className="text-button" onClick={onExit}><ArrowLeft size={16} /> Exit practice</button>
      <div className="session-topline"><div><p className="eyebrow">{material.subject} · {material.topic}</p><h1>Speak your understanding</h1></div><span className="difficulty-tag">{difficulty}</span></div>
      <div className="progress-line" aria-label={`Question ${questionIndex + 1} of ${questions.length}`}><span style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} /></div>
      <p className="muted small">Question {questionIndex + 1} of {questions.length} · {mode === 'practice' ? 'Practice mode' : 'English assessment mode'}</p>
      {!feedback ? <div className="question-layout">
        <article className="question-card">
          <div className="question-card-top"><span className="question-index">0{questionIndex + 1}</span><button className="icon-button" title="Read question aloud" aria-label="Read question aloud" disabled={!('speechSynthesis' in window)} onClick={() => speakQuestion(question.question)}><Volume2 size={18} /></button></div>
          <p className="mini-label">YOUR ORAL QUESTION</p><h2>{question.question}</h2>
          <p className="muted">Take a moment to organize your answer. You can record or type.</p>
        </article>
        <form className="answer-card" onSubmit={submitAnswer}>
          <div className="answer-tools">
            <button type="button" className={`record-button ${recording ? 'is-recording' : ''}`} onClick={recording ? stopRecording : startRecording} disabled={busy}>
              {recording ? <CircleStop size={18} /> : <Mic size={18} />}{recording ? 'Stop recording' : 'Record answer'}
            </button>
            <span className={`record-state ${recording ? 'record-on' : ''}`}>{recording ? `Recording · ${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` : 'Microphone ready'}</span>
          </div>
          {error && <p className="error-message" role="alert">{error}</p>}
          {busy && <p className="loading-note"><LoaderCircle size={16} className="spin" /> Processing speech…</p>}
          {originalTranscript && <div className="original-transcript"><span className="mini-label">ORIGINAL TRANSCRIPT · {transcriptSource || 'typed answer'}</span><p>{originalTranscript}</p></div>}
          <label className="field-label" htmlFor="answer-text">{originalTranscript ? 'Review and edit before submitting' : 'Your answer'}<textarea id="answer-text" rows="7" value={editedAnswer} onChange={(event) => setEditedAnswer(event.target.value)} placeholder="Your transcript will appear here. You can also type your answer…" maxLength="12000" /></label>
          <p className="muted small">Edits are stored separately from the original transcript. Recordings are processed temporarily and discarded.</p>
          <button className="button button-primary button-wide" disabled={busy || recording}>{busy ? 'Evaluating…' : 'Submit answer'} <ArrowRight size={17} /></button>
        </form>
      </div> : <>
        <FeedbackReport attempt={feedback} practiceMode={mode === 'practice'} />
        <div className="session-footer"><button className="button button-secondary" onClick={() => { setFeedback(null); setOriginalTranscript(''); setEditedAnswer(''); }}><RotateCcw size={16} /> Try this question again</button><button className="button button-primary" onClick={nextQuestion}>{questionIndex + 1 === questions.length ? 'Finish practice set' : 'Next question'} {questionIndex + 1 === questions.length ? <Check size={17} /> : <ArrowRight size={17} />}</button></div>
      </>}
    </section>
  );
}