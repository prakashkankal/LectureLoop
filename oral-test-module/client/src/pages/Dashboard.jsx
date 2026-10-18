import { useRef, useState } from 'react';
import { ArrowRight, BookOpen, FileUp, Mic2, Play, Sparkles } from 'lucide-react';

export default function Dashboard({ materials, material, onMaterialChange, attempts, onStart, onChooseLecture, loading }) {
  const fileInput = useRef(null);
  const [mode, setMode] = useState('english-assessment');
  const [importMessage, setImportMessage] = useState('');
  const latest = attempts[0];
  const lectureLoopNotesSelected = material.id.startsWith('lectureloop-');

  async function importMaterial(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const contents = await file.text();
      if (file.name.toLowerCase().endsWith('.json')) {
        const parsed = JSON.parse(contents);
        const imported = parsed.material || parsed;
        if (![undefined, 1].includes(parsed.schemaVersion ?? imported.schemaVersion)) throw new Error('Unsupported notes schema version. Use schemaVersion 1.');
        if (typeof imported.notes !== 'string' || imported.notes.trim().length < 20) throw new Error('JSON must contain at least 20 characters of notes.');
        onMaterialChange({
          id: `import-${Date.now()}`,
          subject: imported.subject || 'Imported material',
          lecture: imported.lecture || 'Imported notes',
          topic: imported.topic || imported.lecture || 'Imported topic',
          notes: imported.notes,
          keyTerms: Array.isArray(imported.keyTerms) ? imported.keyTerms : [],
        });
      } else {
        onMaterialChange({ ...material, id: `import-${Date.now()}`, lecture: 'Imported notes', topic: 'Imported topic', notes: contents });
      }
      setImportMessage(`${file.name} imported. Review the notes before starting.`);
    } catch (error) {
      setImportMessage(error.message || 'Could not read this file.');
    }
    event.target.value = '';
  }

  return (
    <div className="dashboard-view">
      <section className="welcome-band">
        <div className="welcome-copy">
          <p className="eyebrow">YOUR SPEAKING PRACTICE</p>
          <h1>Build clarity, one answer at a time.</h1>
          <p>Use your class notes as the source. Your technical understanding and English communication are reviewed separately.</p>
          <a className="button button-primary welcome-cta" href="#practice-setup">Set up a practice <ArrowRight size={15} /></a>
        </div>
        <div className="welcome-illustration" role="img" aria-label="Lecture notes, speech and a microphone">
          <svg className="illustration-book" viewBox="0 0 240 190" aria-hidden="true">
            <ellipse cx="121" cy="162" rx="90" ry="13" fill="#3525cd" opacity=".1" />
            <path d="M35 52c27-12 52-9 84 7v91c-30-15-56-18-84-7V52Z" fill="#fff" stroke="#c7c4f0" strokeWidth="3" strokeLinejoin="round" />
            <path d="M204 52c-27-12-53-9-85 7v91c30-15 57-18 85-7V52Z" fill="#f2f3ff" stroke="#c7c4f0" strokeWidth="3" strokeLinejoin="round" />
            <path d="M119 60v91M51 75c17-5 34-4 51 3M51 91c17-5 34-4 51 3M51 107c17-5 34-4 51 3M153 78c15-5 29-4 40 0M153 94c15-5 29-4 40 0M153 110c15-5 29-4 40 0" fill="none" stroke="#a6a2e8" strokeWidth="4" strokeLinecap="round" />
            <path d="m69 48 13 6 13-6v21l-13-6-13 6V48Z" fill="#57dffe" />
          </svg>
          <div className="illustration-note-card"><span className="note-card-icon"><BookOpen size={14} /></span><span><strong>Class notes</strong><small>Your source material</small></span><span className="note-card-check">✓</span></div>
          <div className="illustration-mic"><Mic2 size={23} strokeWidth={1.8} /></div>
          <div className="illustration-sound" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
          <span className="illustration-spark illustration-spark-one" aria-hidden="true">✦</span>
          <span className="illustration-spark illustration-spark-two" aria-hidden="true">✧</span>
        </div>
      </section>
      <div className="metric-row" aria-label="Your practice summary">
        <article className="metric-card"><span>COMPLETED ANSWERS</span><strong>{attempts.length}</strong><small>Saved to your private history</small></article>
        <article className="metric-card"><span>LATEST CONTENT SCORE</span><strong>{latest ? `${latest.evaluation.contentScore}/10` : '—'}</strong><small>{latest ? latest.topic : 'Complete a practice answer to begin'}</small></article>
        <article className="metric-card"><span>LATEST LANGUAGE SCORE</span><strong>{latest && latest.mode !== 'practice' ? `${latest.evaluation.languageScore}/10` : '—'}</strong><small>Scored independently from content</small></article>
      </div>
      <section className="setup-section" id="practice-setup">
        <div className="section-heading"><div><p className="eyebrow">START A SESSION</p><h2>Choose your learning material</h2></div><div className="material-actions"><span className="quiet-tag"><BookOpen size={14} /> Notes-grounded</span><button className="button button-secondary" type="button" onClick={onChooseLecture}><BookOpen size={15} /> Use lecture notes</button></div></div>
        <div className="setup-grid">
          <div className="material-controls">
            <label className="field-label">Sample lecture<select value={materials.some((item) => item.id === material.id) ? material.id : lectureLoopNotesSelected ? material.id : 'custom'} onChange={(event) => { if (event.target.value === 'choose-lectureloop-notes') { setImportMessage(''); onChooseLecture(); return; } const selected = materials.find((item) => item.id === event.target.value); if (selected) { onMaterialChange(selected); setImportMessage(''); } }}><option value="custom">Imported or custom notes</option><option value="choose-lectureloop-notes">Choose notes from LectureLoop…</option>{lectureLoopNotesSelected && <option value={material.id}>LectureLoop · {material.lecture}</option>}{materials.map((item) => <option value={item.id} key={item.id}>{item.subject} · {item.lecture}</option>)}</select></label>
            {lectureLoopNotesSelected && <div className="lecture-note-source"><BookOpen size={17} /><span><strong>Using notes from your LectureLoop library</strong><small>{material.lecture}</small></span><button type="button" onClick={onChooseLecture}>Change</button></div>}
            <div className="two-fields"><label className="field-label">Subject<input value={material.subject} onChange={(event) => onMaterialChange({ ...material, subject: event.target.value })} maxLength="120" /></label><label className="field-label">Topic<input value={material.topic} onChange={(event) => onMaterialChange({ ...material, topic: event.target.value })} maxLength="160" /></label></div>
            <label className="field-label">Lecture notes<textarea rows="8" value={material.notes} onChange={(event) => onMaterialChange({ ...material, notes: event.target.value })} maxLength="30000" placeholder="Paste lecture notes here (at least 20 characters)…" /></label>
            <div className="import-row"><button type="button" className="button button-secondary" onClick={() => fileInput.current?.click()}><FileUp size={16} /> Import .txt or .json</button><input ref={fileInput} type="file" accept=".txt,.json,text/plain,application/json" hidden onChange={importMaterial} /><span className="muted small">JSON: subject, lecture, topic, notes, keyTerms</span></div>
            {importMessage && <p className="muted small" role="status">{importMessage}</p>}
          </div>
          <aside className="session-options">
            <div className="option-heading"><Sparkles size={18} /><h3>Oral test from these notes</h3></div>
            <p className="muted small">Questions are generated directly from the selected lecture notes. You can answer by speaking or typing.</p>
            <fieldset className="choice-group"><legend>Assessment mode</legend><label className="radio-option"><input type="radio" name="assessment-mode" value="english-assessment" checked={mode === 'english-assessment'} onChange={() => setMode('english-assessment')} /><span><strong>English assessment</strong><small>Score content and English separately.</small></span></label><label className="radio-option"><input type="radio" name="assessment-mode" value="practice" checked={mode === 'practice'} onChange={() => setMode('practice')} /><span><strong>Practice mode</strong><small>Focus on concepts; speech recognition is set to English.</small></span></label></fieldset>
            <div className="instruction-block"><p className="mini-label">BEFORE YOU BEGIN</p><ul><li>One spoken question at a time</li><li>Review and edit your transcript</li><li>Only source notes inform question feedback</li><li>Recordings are not retained</li></ul></div>
            <button className="button button-primary button-wide" onClick={() => onStart(material, mode)} disabled={loading || material.notes.trim().length < 20}>{loading ? 'Preparing questions…' : 'Begin oral practice'} <Play size={16} fill="currentColor" /></button>
            {material.notes.trim().length < 20 && <p className="error-hint">Add at least 20 characters of notes.</p>}
          </aside>
        </div>
      </section>
      <section className="dashboard-bottom">
        <div><div className="section-heading"><div><p className="eyebrow">RECENT PRACTICE</p><h2>Your latest answers</h2></div></div>
          {attempts.length ? <div className="recent-list">{attempts.slice(0, 4).map((attempt) => <article className="recent-row" key={attempt.id}><div className="recent-icon"><Mic2 size={16} /></div><div><strong>{attempt.topic}</strong><span>{new Date(attempt.createdAt).toLocaleDateString()}</span></div><b>{attempt.evaluation.contentScore}/10</b></article>)}</div> : <p className="empty-note">Your saved practice answers will appear here.</p>}
        </div>
        <aside className="helper-banner"><span className="helper-icon"><Sparkles size={19} /></span><p className="eyebrow">PRACTICE AT YOUR PACE</p><h3>Explain ideas in your own words.</h3><p className="muted">Practice mode accepts English or Hinglish responses. Translation is not included in this local, no-AI version.</p></aside>
      </section>
    </div>
  );
}