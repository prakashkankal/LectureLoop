import { useState } from 'react';
import { Activity, RotateCcw, Trash2 } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import FeedbackReport from '../components/FeedbackReport.jsx';

const fillerCount = (attempt) => (attempt.evaluation.fillers || []).reduce((sum, item) => sum + item.count, 0);

function ChartPanel({ title, subtitle, data, lines, formatter }) {
  return <article className="chart-panel"><div className="chart-heading"><div><h3>{title}</h3><p>{subtitle}</p></div></div>
    {data.length < 1 ? <div className="chart-empty">Complete a practice answer to create this chart.</div> : <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 2 }}><CartesianGrid stroke="#e4e9e0" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11, fill: '#747d71' }} axisLine={false} tickLine={false} /><YAxis domain={formatter === 'score' ? [0, 10] : ['auto', 'auto']} tick={{ fontSize: 11, fill: '#747d71' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ border: '1px solid #dfe5db', borderRadius: 8, fontSize: 12 }} /><Line type="monotone" dataKey={lines[0].key} name={lines[0].name} stroke={lines[0].color} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />{lines[1] && <Line type="monotone" dataKey={lines[1].key} name={lines[1].name} stroke={lines[1].color} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />}</LineChart></ResponsiveContainer></div>}
  </article>;
}

export default function ProgressPage({ attempts, onRetry, onDelete }) {
  const [selected, setSelected] = useState(null);
  const ordered = [...attempts].reverse().map((attempt, index) => {
    const terms = attempt.material?.keyTerms || [];
    const coverage = attempt.evaluation.vocabulary?.coverage ?? (terms.length ? Math.round(((attempt.evaluation.vocabulary?.correct?.length || 0) / terms.length) * 100) : 0);
    const totalWords = attempt.answer.trim().split(/\s+/).filter(Boolean).length;
    return {
      ...attempt,
      label: `#${index + 1}`,
      content: attempt.evaluation.contentScore,
      language: attempt.mode === 'practice' ? null : attempt.evaluation.languageScore,
      pace: attempt.durationSeconds ? attempt.evaluation.paceWpm : null,
      fillersPer100: totalWords ? Math.round((fillerCount(attempt) / totalWords) * 10000) / 100 : 0,
      vocabulary: coverage,
    };
  });
  const assessedAttempts = attempts.filter((attempt) => attempt.mode !== 'practice');
  const previous = assessedAttempts[1];
  const latest = assessedAttempts[0];
  const topicGroups = Object.values(attempts.reduce((groups, attempt) => {
    const group = groups[attempt.topic] || { topic: attempt.topic, scores: [], terms: [] };
    group.scores.push(attempt.evaluation.contentScore);
    const coverage = attempt.evaluation.vocabulary?.coverage;
    if (Number.isFinite(coverage)) group.terms.push(coverage);
    groups[attempt.topic] = group;
    return groups;
  }, {})).map((group) => ({ ...group, average: group.scores.reduce((sum, score) => sum + score, 0) / group.scores.length })).sort((left, right) => left.average - right.average);
  const strongestTopics = [...topicGroups].sort((left, right) => right.average - left.average).slice(0, 2);
  const contentDelta = latest && previous ? Math.round((latest.evaluation.contentScore - previous.evaluation.contentScore) * 10) / 10 : null;
  const languageDelta = latest && previous ? Math.round((latest.evaluation.languageScore - previous.evaluation.languageScore) * 10) / 10 : null;

  return <section className="progress-view">
    <div className="page-intro"><p className="eyebrow">YOUR PRACTICE RECORD</p><h1>Progress you can trace.</h1><p className="muted">Every chart below reflects answers saved to your account. No sample history is added.</p></div>
    <div className="progress-summary">
      <article><span>ANSWER ATTEMPTS</span><strong>{attempts.length}</strong><small>Across all topics</small></article>
      <article><span>CONTENT CHANGE</span><strong className={contentDelta > 0 ? 'delta-up' : ''}>{contentDelta === null ? '—' : `${contentDelta > 0 ? '+' : ''}${contentDelta}`}</strong><small>{contentDelta === null ? 'Complete two attempts to compare' : 'Compared with previous answer'}</small></article>
      <article><span>LANGUAGE CHANGE</span><strong className={languageDelta > 0 ? 'delta-up' : ''}>{languageDelta === null ? '—' : `${languageDelta > 0 ? '+' : ''}${languageDelta}`}</strong><small>English assessment only</small></article>
    </div>
    <div className="charts-grid">
      <ChartPanel title="Content and language" subtitle="Separate 0–10 scores by saved attempt" data={ordered} formatter="score" lines={[{ key: 'content', name: 'Content', color: '#367b50' }, { key: 'language', name: 'Language', color: '#c87943' }]} />
      <ChartPanel title="Speaking pace" subtitle="Approximate words per minute" data={ordered} lines={[{ key: 'pace', name: 'Words/min', color: '#347f87' }]} />
      <ChartPanel title="Filler expressions" subtitle="Detected count per 100 answer words" data={ordered} lines={[{ key: 'fillersPer100', name: 'Per 100 words', color: '#c87943' }]} />
      <ChartPanel title="Technical vocabulary" subtitle="Coverage against the source note terms" data={ordered} lines={[{ key: 'vocabulary', name: 'Coverage %', color: '#697d41' }]} />
    </div>
    <div className="revision-grid">
      <section className="revision-panel"><div className="section-heading"><div><p className="eyebrow">REVISION SIGNALS</p><h2>Strengths and next steps</h2></div><Activity size={18} /></div>
        {!topicGroups.length ? <p className="empty-note">Topic suggestions appear after your first saved answer.</p> : <>
          <p className="signal-section-title">A strength to build on</p>
          {strongestTopics.map((group) => <div className="topic-signal" key={`strong-${group.topic}`}><div><strong>{group.topic}</strong><span>Average across {group.scores.length} saved {group.scores.length === 1 ? 'answer' : 'answers'}</span></div><div className="signal-score"><b>{group.average.toFixed(1)}</b><span>/10</span><div><i style={{ width: `${Math.max(0, Math.min(100, group.average * 10))}%` }} /></div></div></div>)}
          <p className="signal-section-title">Worth another pass</p>
          {topicGroups.slice(0, 2).map((group) => <div className="topic-signal" key={`revisit-${group.topic}`}><div><strong>{group.topic}</strong><span>Average across {group.scores.length} saved {group.scores.length === 1 ? 'answer' : 'answers'}</span></div><div className="signal-score"><b>{group.average.toFixed(1)}</b><span>/10</span><div><i style={{ width: `${Math.max(0, Math.min(100, group.average * 10))}%` }} /></div></div></div>)}
          <p className="muted small">Practice suggestion: explain one key term in your own words, then connect it to an example from your notes. These are practice cues, not claims about learning gain.</p>
        </>}
      </section>
      <section className="history-panel"><div className="section-heading"><div><p className="eyebrow">PRIVATE HISTORY</p><h2>Saved answers</h2></div></div>
        {!attempts.length ? <div className="empty-history"><div className="empty-icon"><Activity size={20} /></div><h3>No attempts yet</h3><p>Your dashboard will fill in as you practice. Scores are never fabricated.</p></div> : <div className="history-list">{attempts.map((attempt) => <article className="history-row" key={attempt.id}>
          <button className="history-main" onClick={() => setSelected(selected?.id === attempt.id ? null : attempt)}><span className="history-date">{new Date(attempt.createdAt).toLocaleDateString()}</span><strong>{attempt.topic}</strong><span className="history-scores"><b>{attempt.evaluation.contentScore}</b> content{attempt.mode === 'practice' ? '' : <> · <b>{attempt.evaluation.languageScore}</b> language</>}</span></button>
          <div className="history-actions"><button className="icon-button" title="Retry this saved question" aria-label="Retry this saved question" onClick={() => onRetry(attempt)} disabled={!attempt.material?.notes || !attempt.questionData?.question}><RotateCcw size={16} /></button><button className="icon-button danger-hover" title="Delete attempt" aria-label="Delete attempt" onClick={() => onDelete(attempt.id)}><Trash2 size={16} /></button></div>
        </article>)}</div>}
      </section>
    </div>
    {selected && <section className="history-detail"><div className="section-heading"><div><p className="eyebrow">SAVED FEEDBACK</p><h2>{selected.topic}</h2></div><button className="icon-button" aria-label="Close saved feedback" onClick={() => setSelected(null)}>×</button></div><p className="history-question">{selected.question}</p><FeedbackReport attempt={selected} practiceMode={selected.mode === 'practice'} /><button className="button button-secondary" onClick={() => onRetry(selected)}><RotateCcw size={16} /> Retry with original notes</button></section>}
  </section>;
}