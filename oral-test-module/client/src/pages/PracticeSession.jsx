import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CircleStop, LoaderCircle, Mic, RotateCcw, Sparkles, Volume2 } from 'lucide-react';
import FeedbackReport from '../components/FeedbackReport.jsx';
import { api } from '../services/api.js';
import { getRecognitionConstructor, SPEECH_RECOGNITION_LANGUAGE, speakQuestion } from '../services/speech.js';

export default function PracticeSession({ material, questions, mode, onExit, onAttemptSaved }) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [originalTranscript, setOriginalTranscript] = useState('');
  const [editedAnswer, setEditedAnswer] = useState('');
  const [transcriptSource, setTranscriptSource] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechTextRef = useRef('');

  const question = questions[questionIndex];
  const wordCount = editedAnswer.trim() ? editedAnswer.trim().split(/\s+/).length : 0;

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
    setLiveTranscript('');
    speechTextRef.current = '';
    setSeconds(0);
    try {
      const Recognition = getRecognitionConstructor();
      if (!Recognition) throw new Error('Browser speech recognition is unavailable. Type your answer instead.');
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access is unavailable in this browser. Type your answer instead.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recognition = new Recognition();
      recognition.lang = SPEECH_RECOGNITION_LANGUAGE;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        let transcript = '';
        for (let index = 0; index < event.results.length; index += 1) transcript += `${event.results[index][0].transcript} `;
        speechTextRef.current = transcript.trim();
        setLiveTranscript(speechTextRef.current);
        setEditedAnswer(speechTextRef.current);
      };
      recognition.onerror = (event) => {
        if (event.error === 'not-allowed') setError('Speech recognition permission was denied. You can still type your answer.');
      };
      recognition.onend = () => {
        const transcript = speechTextRef.current.trim();
        if (transcript) acceptTranscript(transcript, 'Browser speech recognition');
        else setError((current) => current || 'No words were recognized. Check microphone access or type your answer.');
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setRecording(false);
      };
      recognitionRef.current = recognition;
      recognition.start();
      setRecording(true);
    } catch (recordError) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
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
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
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
    setLiveTranscript('');
    setSeconds(0);
    setError('');
  }

  return (
    <section className="session-view">
      <button className="text-button" onClick={onExit}><ArrowLeft size={16} /> Exit practice</button>
      <div className="session-topline"><div><p className="eyebrow">{material.subject} · {material.topic}</p><h1>Speak your understanding</h1></div><span className="session-count">QUESTION {String(questionIndex + 1).padStart(2, '0')} <span>/ {String(questions.length).padStart(2, '0')}</span></span></div>
      <div className="session-progress"><div className="progress-line" aria-label={`Question ${questionIndex + 1} of ${questions.length}`}><span style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} /></div><span>{Math.round(((questionIndex + 1) / questions.length) * 100)}% complete</span></div>
      <p className="muted small session-mode">{mode === 'practice' ? 'Practice mode · Speak in the language that feels natural' : 'English assessment · Explain the idea in your own words'}</p>
      {!feedback ? <div className="question-layout">
        <article className="question-card">
          <div className="question-card-top"><span className="question-index"><Sparkles size={17} /> YOUR TURN</span><button className="read-question" title="Read question aloud" aria-label="Read question aloud" disabled={!('speechSynthesis' in window)} onClick={() => speakQuestion(question.question)}><Volume2 size={16} /> Listen</button></div>
          <p className="mini-label">A QUESTION FROM YOUR LECTURE NOTES</p><h2>{question.question}</h2>
          {question.keyTerms?.length > 0 && <div className="question-concepts"><span>IDEAS TO THINK ABOUT</span>{question.keyTerms.slice(0, 4).map((term) => <span className="concept-chip" key={term}>{term}</span>)}</div>}
          <div className="answer-coach"><span className="coach-icon"><Sparkles size={15} /></span><div><strong>Need a starting point?</strong><p>Describe the idea, explain how it works, then share an example.</p></div></div>
        </article>
        <form className="answer-card" onSubmit={submitAnswer}>
          <div className="answer-panel-heading"><div><span className="answer-live-dot" /> YOUR RESPONSE</div><span>{wordCount} words</span></div>
          <div className={`voice-stage ${recording ? 'voice-stage-active' : ''}`}>
            <div className="voice-orb"><div className="voice-bars" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <i key={index} style={{ '--bar-index': index }} />)}</div></div>
            <strong>{recording ? 'You’re doing great — keep going' : editedAnswer ? 'Your answer is taking shape' : 'Take a breath. You’ve got this.'}</strong>
            <span className={`record-state ${recording ? 'record-on' : ''}`} aria-live="polite">{recording ? `Listening · ${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` : 'Speak freely or type your answer'}</span>
            <button type="button" className={`record-button ${recording ? 'is-recording' : ''}`} onClick={recording ? stopRecording : startRecording} disabled={busy} aria-pressed={recording}>
              {recording ? <CircleStop size={18} /> : <Mic size={18} />}{recording ? 'Finish speaking' : 'Start speaking'}
            </button>
          </div>
          {error && <p className="error-message" role="alert">{error}</p>}
          {busy && <p className="loading-note"><LoaderCircle size={16} className="spin" /> Getting your answer ready…</p>}
          {recording && <p className="live-caption" aria-live="polite"><span>LIVE TRANSCRIPT</span>{liveTranscript || 'Listening for your first words…'}</p>}
          {originalTranscript && <div className="original-transcript"><span className="mini-label">ORIGINAL TRANSCRIPT · {transcriptSource || 'typed answer'}</span><p>{originalTranscript}</p></div>}
          <label className="field-label answer-input-label" htmlFor="answer-text">{originalTranscript ? 'Review and edit your words' : 'Or type your answer'}<textarea id="answer-text" rows="5" value={editedAnswer} onChange={(event) => setEditedAnswer(event.target.value)} placeholder="Start speaking to see your words appear here, or type your explanation…" maxLength="12000" /></label>
          <button className="button button-primary button-wide submit-answer" disabled={busy || recording || !editedAnswer.trim()}>{busy ? 'Preparing your feedback…' : 'I’m ready to submit'} <ArrowRight size={17} /></button>
          <p className="answer-privacy">Your answer is saved to your private practice history. Recordings are not stored.</p>
        </form>
      </div> : <>
        <FeedbackReport attempt={feedback} practiceMode={mode === 'practice'} />
        <div className="session-footer"><button className="button button-secondary" onClick={() => { setFeedback(null); setOriginalTranscript(''); setEditedAnswer(''); }}><RotateCcw size={16} /> Try this question again</button><button className="button button-primary" onClick={nextQuestion}>{questionIndex + 1 === questions.length ? 'Finish practice set' : 'Next question'} {questionIndex + 1 === questions.length ? <Check size={17} /> : <ArrowRight size={17} />}</button></div>
      </>}
    </section>
  );
}