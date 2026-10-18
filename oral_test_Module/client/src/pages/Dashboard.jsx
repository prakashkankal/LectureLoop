import { useRef, useState } from 'react';
import { ArrowRight, BookOpen, FileUp, Mic2, Play, Sparkles } from 'lucide-react';

export default function Dashboard({ materials, material, onMaterialChange, attempts, onStart, onNavigate, loading }) {
  const fileInput = useRef(null);
  const [difficulty, setDifficulty] = useState('intermediate');
  const [mode, setMode] = useState('english-assessment');
  const [importMessage, setImportMessage] = useState('');
  const latest = attempts[0];

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
        <div className="welcome-copy"><p className="eyebrow">YOUR SPEAKING PRACTICE</p><h1>Build clarity, one answer at a time.</h1><p>Use your class notes as the source. Your technical understanding and English communication are reviewed separately.</p></div>
        <div className="welcome-mark"><Mic2 size={36} strokeWidth={1.5} /><span>Listen · Think · Speak</span></div>
      </section>
      <div className="metric-row">
        <article className="metric-card"><span>COMPLETED ANSWERS</span><strong>{attempts.length}</strong><small>Saved to your private history</small></article>
        <article className="metric-card"><span>LATEST CONTENT SCORE</span><strong>{latest ? `${latest.evaluation.contentScore}/10` : '—'}</strong><small>{latest ? latest.topic : 'Complete a practice answer to begin'}</small></article>
        <article className="metric-card"><span>LATEST LANGUAGE SCORE</span><strong>{latest && latest.mode !== 'practice' ? `${latest.evaluation.languageScore}/10` : '—'}</strong><small>Scored independently from content</small></article>
      </div>
      <section className="setup-section">
        <div className="section-heading"><div><p className="eyebrow">START A SESSION</p><h2>Choose your learning material</h2></div><span className="quiet-tag"><BookOpen size={14} /> Notes-grounded</span></div>
        <div className="setup-grid">
          <div className="material-controls">
            <label className="field-label">Sample lecture<select value={materials.some((item) => item.id === material.id) ? material.id : 'custom'} onChange={(event) => { const selected = materials.find((item) => item.id === event.target.value); if (selected) { onMaterialChange(selected); setImportMessage(''); } }}><option value="custom">Imported or custom notes</option>{materials.map((item) => <option value={item.id} key={item.id}>{item.subject} · {item.lecture}</option>)}</select></label>
            <div className="two-fields"><label className="field-label">Subject<input value={material.subject} onChange={(event) => onMaterialChange({ ...material, subject: event.target.value })} maxLength="120" /></label><label className="field-label">Topic<input value={material.topic} onChange={(event) => onMaterialChange({ ...material, topic: event.target.value })} maxLength="160" /></label></div>
            <label className="field-label">Lecture notes<textarea rows="8" value={material.notes} onChange={(event) => onMaterialChange({ ...material, notes: event.target.value })} maxLength="30000" placeholder="Paste lecture notes here (at least 20 characters)…" /></label>
            <div className="import-row"><button type="button" className="button button-secondary" onClick={() => fileInput.current?.click()}><FileUp size={16} /> Import .txt or .json</button><input ref={fileInput} type="file" accept=".txt,.json,text/plain,application/json" hidden onChange={importMaterial} /><span className="muted small">JSON: subject, lecture, topic, notes, keyTerms</span></div>
            {importMessage && <p className="muted small" role="status">{importMessage}</p>}
          </div>
          <aside className="session-options">
            <div className="option-heading"><Sparkles size={18} /><h3>Practice settings</h3></div>
            <fieldset className="choice-group"><legend>Difficulty</legend><div className="segmented-control">{['basic', 'intermediate', 'advanced'].map((value) => <button type="button" className={difficulty === value ? 'selected' : ''} key={value} onClick={() => setDifficulty(value)}>{value}</button>)}</div></fieldset>
            <fieldset className="choice-group"><legend>Assessment mode</legend><label className="radio-option"><input type="radio" name="assessment-mode" value="english-assessment" checked={mode === 'english-assessment'} onChange={() => setMode('english-assessment')} /><span><strong>English assessment</strong><small>Score content and English separately.</small></span></label><label className="radio-option"><input type="radio" name="assessment-mode" value="practice" checked={mode === 'practice'} onChange={() => setMode('practice')} /><span><strong>Practice mode</strong><small>Focus on concepts; try Hinglish if useful.</small></span></label></fieldset>
            <div className="instruction-block"><p className="mini-label">BEFORE YOU BEGIN</p><ul><li>One spoken question at a time</li><li>Review and edit your transcript</li><li>Only source notes inform question feedback</li><li>Recordings are not retained</li></ul></div>
            <button className="button button-primary button-wide" onClick={() => onStart(material, difficulty, mode)} disabled={loading || material.notes.trim().length < 20}>{loading ? 'Preparing questions…' : 'Begin oral practice'} <Play size={16} fill="currentColor" /></button>
            {material.notes.trim().length < 20 && <p className="error-hint">Add at least 20 characters of notes.</p>}
          </aside>
        </div>
      </section>
      <section className="dashboard-bottom">
        <div><div className="section-heading"><div><p className="eyebrow">RECENT PRACTICE</p><h2>Your latest answers</h2></div></div>
          {attempts.length ? <div className="recent-list">{attempts.slice(0, 4).map((attempt) => <article className="recent-row" key={attempt.id}><div className="recent-icon"><Mic2 size={16} /></div><div><strong>{attempt.topic}</strong><span>{new Date(attempt.createdAt).toLocaleDateString()} · {attempt.difficulty}</span></div><b>{attempt.evaluation.contentScore}/10</b></article>)}</div> : <p className="empty-note">Your saved practice answers will appear here.</p>}
        </div>
        <aside className="helper-banner"><span className="helper-icon"><Sparkles size={19} /></span><p className="eyebrow">NEED LANGUAGE SUPPORT?</p><h3>Think in two languages. Practice in English.</h3><p className="muted">Use the Hinglish helper for translation practice. It is separate from independent assessment.</p><button type="button" className="button-link" onClick={() => onNavigate('language')}>Open language helper <ArrowRight size={15} /></button></aside>
      </section>
    </div>
  );
}