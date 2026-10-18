import { useRef, useState } from 'react';
import { ArrowLeftRight, LoaderCircle, Mic, Volume2 } from 'lucide-react';
import { api } from '../services/api.js';
import { getRecognitionConstructor, speakQuestion } from '../services/speech.js';

export default function LanguageCoach() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  async function translate(event) {
    event.preventDefault();
    if (!text.trim()) return setError('Enter or speak a response first.');
    setBusy(true);
    setError('');
    try {
      setResult(await api('/language-assist', { method: 'POST', body: JSON.stringify({ text }) }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function toggleSpeech() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const Recognition = getRecognitionConstructor();
    if (!Recognition) return setError('Speech recognition is unavailable. Type your Hinglish response instead.');
    const recognition = new Recognition();
    recognition.lang = 'hi-IN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = '';
      for (let index = 0; index < event.results.length; index += 1) transcript += `${event.results[index][0].transcript} `;
      setText(transcript.trim());
    };
    recognition.onerror = (event) => { setError(event.error === 'not-allowed' ? 'Microphone permission was denied. Type your response instead.' : 'Speech recognition stopped. You can continue by typing.'); setListening(false); };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    try { recognition.start(); setListening(true); setError(''); } catch { setError('Could not start speech recognition.'); }
  }

  return (
    <section className="language-view">
      <div className="page-intro"><p className="eyebrow">LANGUAGE PRACTICE · NOT AN ASSESSMENT</p><h1>Find your English phrasing.</h1><p className="muted">Start with the explanation you can give. Keep technical terms and meaning; the helper will offer an English version to practice.</p></div>
      <form className="language-input-panel" onSubmit={translate}>
        <div className="language-panel-head"><div><span className="language-dot">हि</span><div><strong>Your original response</strong><small>Hindi, English, or mixed</small></div></div><button type="button" className={`button button-secondary ${listening ? 'button-recording' : ''}`} onClick={toggleSpeech}><Mic size={16} />{listening ? 'Stop listening' : 'Speak response'}</button></div>
        <textarea value={text} onChange={(event) => setText(event.target.value)} rows="7" maxLength="12000" placeholder="उदाहरण: Normalization ka goal duplicate data aur update anomalies ko reduce karna hai…" />
        {error && <p className="error-message" role="alert">{error}</p>}
        <button className="button button-primary" disabled={busy}>{busy ? <><LoaderCircle size={16} className="spin" /> Translating…</> : <><ArrowLeftRight size={16} /> Translate and coach</>}</button>
      </form>
      {result && <section className="translation-result" aria-live="polite">
        <div className="translation-columns"><article className="translation-side original-side"><p className="mini-label">ORIGINAL · PRESERVED</p><p>{text}</p></article><article className="translation-side english-side"><div className="translation-title"><p className="mini-label">NATURAL ENGLISH</p><button className="icon-button" title="Practice saying this answer" aria-label="Practice saying this answer" disabled={!('speechSynthesis' in window)} onClick={() => speakQuestion(result.practiceAnswer)}><Volume2 size={17} /></button></div><p>{result.translation}</p><button className="button button-secondary" disabled={!('speechSynthesis' in window)} onClick={() => speakQuestion(result.practiceAnswer)}><Volume2 size={16} /> Practice this answer</button></article></div>
        <div className="phrase-panel"><h3>Useful explanation phrases</h3><div className="phrase-list">{(result.usefulPhrases || []).map((item) => <p key={item.phrase}><strong>{item.phrase}</strong><span>{item.meaning}</span></p>)}</div></div>
        <p className="notice notice-warm">{result.assistanceMode} Translation is practice support, not an independent oral assessment.</p>
      </section>}
    </section>
  );
}