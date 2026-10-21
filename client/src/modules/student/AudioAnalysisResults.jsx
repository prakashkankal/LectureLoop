import React from 'react';

function SectionCard({ title, icon, children }) {
  return (
    <section className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-space-lg shadow-sm">
      <div className="mb-space-md flex items-center gap-space-sm">
        <span className="material-symbols-outlined text-primary-container">{icon}</span>
        <h2 className="font-headline-sm text-lg font-semibold text-on-surface">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function AudioAnalysisResults({ analysis }) {
  if (!analysis) return null;

  return (
    <div className="flex flex-col gap-space-lg" aria-live="polite">
      <SectionCard title="Lecture Summary" icon="summarize">
        <p className="text-sm leading-relaxed text-on-surface-variant">{analysis.summary}</p>
      </SectionCard>

      <SectionCard title="Key Points" icon="checklist">
        <ul className="list-disc space-y-2 pl-5 text-sm text-on-surface-variant">
          {analysis.keyPoints.map((point, index) => <li key={`${index}-${point}`}>{point}</li>)}
        </ul>
      </SectionCard>

      <SectionCard title="Mind Map" icon="account_tree">
        <div className="rounded-lg bg-primary-fixed/30 px-space-md py-space-sm text-sm font-semibold text-on-surface">
          {analysis.mindMap.centralTopic}
        </div>
        <div className="mt-space-md grid gap-space-md sm:grid-cols-2">
          {analysis.mindMap.branches.map((branch) => (
            <div key={branch.title} className="rounded-lg bg-surface-container-low p-space-md">
              <h3 className="text-sm font-semibold text-primary-container">{branch.title}</h3>
              <ul className="mt-space-xs list-disc space-y-1 pl-5 text-sm text-on-surface-variant">
                {branch.points.map((point, index) => <li key={`${index}-${point}`}>{point}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Knowledge Check" icon="quiz">
        <div className="flex flex-col gap-space-md">
          {analysis.questions.map((question, index) => (
            <article key={`${index}-${question.question}`} className="rounded-lg bg-surface-container-low p-space-md">
              <h3 className="text-sm font-semibold text-on-surface">{index + 1}. {question.question}</h3>
              <ul className="mt-space-sm space-y-1 text-sm text-on-surface-variant">
                {question.options.map((option) => (
                  <li key={option.label} className={option.label === question.correctAnswer ? 'font-semibold text-tertiary' : ''}>
                    {option.label}. {option.text}{option.label === question.correctAnswer && ' — Correct answer'}
                  </li>
                ))}
              </ul>
              <p className="mt-space-sm text-sm text-on-surface-variant">
                <span className="font-semibold text-on-surface">Explanation: </span>{question.explanation}
              </p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Transcript" icon="subtitles">
        <details>
          <summary className="cursor-pointer text-sm font-medium text-primary-container">Show full transcript</summary>
          <p className="mt-space-md whitespace-pre-wrap text-sm leading-relaxed text-on-surface-variant">{analysis.transcript}</p>
        </details>
      </SectionCard>
    </div>
  );
}
