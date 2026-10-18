import { Activity, BookOpenCheck, Languages, MessageSquareText, Volume2 } from 'lucide-react';

function TermGroup({ title, items, emptyText }) {
  return (
    <div className="term-group">
      <h4>{title}</h4>
      {!items?.length ? <p className="muted small">{emptyText}</p> : items.map((item) => (
        <div className="term-row" key={item.term}><strong>{item.term}</strong><span>{item.explanation}</span></div>
      ))}
    </div>
  );
}

export default function FeedbackReport({ attempt, practiceMode }) {
  const { evaluation } = attempt;
  const fillers = evaluation.fillers || [];
  const fillerCount = fillers.reduce((total, item) => total + item.count, 0);
  const wordCount = attempt.answer.trim().split(/\s+/).filter(Boolean).length;
  const fillerRate = wordCount ? Math.round((fillerCount / wordCount) * 1000) / 10 : 0;

  return (
    <section className="feedback-stack" aria-labelledby="feedback-title">
      <div className="feedback-heading">
        <p className="eyebrow">ANSWER REVIEW</p>
        <h2 id="feedback-title">Your answer, thoughtfully unpacked.</h2>
        {evaluation.evaluationMode === 'local heuristic' && <p className="notice notice-warm">Local estimate only. Scores use note and answer patterns; they are not a full semantic or grammar assessment.</p>}
      </div>
      <div className="score-grid">
        <article className="score-panel score-content"><span>CONTENT</span><strong>{evaluation.contentScore}<small>/10</small></strong><p>{evaluation.scoreReasons?.content}</p></article>
        {!practiceMode && <article className="score-panel score-language"><span>ENGLISH COMMUNICATION</span><strong>{evaluation.languageScore}<small>/10</small></strong><p>{evaluation.scoreReasons?.language}</p></article>}
        {!practiceMode && <article className="score-panel score-total"><span>AVERAGE</span><strong>{evaluation.overallScore}<small>/10</small></strong><p>Simple mean of content and language scores. Accent is not scored.</p></article>}
      </div>
      <div className="report-grid">
        <article className="report-panel">
          <header><MessageSquareText size={17} /><h3>Your words</h3></header>
          <p className="mini-label">ORIGINAL TRANSCRIPT</p>
          <blockquote>{attempt.originalTranscript || 'No speech transcript was captured; text answer used.'}</blockquote>
          {attempt.answer !== attempt.originalTranscript && <><p className="mini-label">EDITED SUBMISSION</p><blockquote>{attempt.answer}</blockquote></>}
        </article>
        <article className="report-panel">
          <header><Languages size={17} /><h3>English correction</h3></header>
          <p>{evaluation.correctedEnglish || attempt.answer}</p>
          {evaluation.grammarCorrections?.length > 0 && <div className="correction-list">{evaluation.grammarCorrections.map((item, index) => <p key={`${item.original}-${index}`}><del>{item.original}</del><span> → </span><strong>{item.corrected}</strong><small>{item.reason}</small></p>)}</div>}
          {!evaluation.grammarCorrections?.length && <p className="muted small">No specific grammar corrections were returned.</p>}
        </article>
        <article className="report-panel report-wide">
          <header><BookOpenCheck size={17} /><h3>Model answer and key differences</h3></header>
          <p className="model-answer">{evaluation.modelAnswer}</p>
          <ul className="plain-list">{(evaluation.differences || []).map((item, index) => <li key={index}>{item}</li>)}</ul>
          <div className="suggestion-strip">{(evaluation.claritySuggestions || []).map((item) => <span key={item}>{item}</span>)}</div>
        </article>
        <article className="report-panel report-wide">
          <header><Activity size={17} /><h3>Speaking and vocabulary</h3></header>
          <div className="speaking-stats"><div><strong>{attempt.durationSeconds ? evaluation.paceWpm : '—'}</strong><span>words/min</span></div><div><strong>{fillerCount}</strong><span>fillers · {fillerRate}% per 100 words</span></div><div><strong>{evaluation.vocabulary?.coverage ?? 0}%</strong><span>term coverage</span></div></div>
          <p className="muted small">{evaluation.paceLabel} Filler detection is transcript-based and may miss meaningful or misrecognized uses.</p>
          <p>{evaluation.speakingSuggestion}</p>
          <div className="filler-list">{fillers.length ? fillers.map((item) => <span key={item.phrase}>{item.phrase}: {item.count}</span>) : <span>No configured fillers detected</span>}</div>
          <div className="vocabulary-grid">
            <TermGroup title="Used in context" items={evaluation.vocabulary?.correct} emptyText="No terms identified." />
            <TermGroup title="Worth revisiting" items={evaluation.vocabulary?.missing} emptyText="No missing terms flagged." />
            <TermGroup title="Needs context review" items={evaluation.vocabulary?.incorrect} emptyText="No incorrect use flagged." />
          </div>
        </article>
      </div>
      <button className="button button-secondary" disabled={!('speechSynthesis' in window)} onClick={() => window.speechSynthesis.speak(new SpeechSynthesisUtterance(evaluation.modelAnswer))}><Volume2 size={17} /> Hear model answer</button>
    </section>
  );
}