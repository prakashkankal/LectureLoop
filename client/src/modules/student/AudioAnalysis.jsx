import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const MAX_AUDIO_SIZE = 25 * 1024 * 1024;
const AUDIO_ACCEPT = '.flac,.m4a,.mp3,.mp4,.mpeg,.mpga,.ogg,.wav,.webm';

function SectionCard({ title, icon, children }) {
  return (
    <section className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm border border-outline-variant/20">
      <div className="flex items-center gap-space-sm mb-space-md">
        <span className="material-symbols-outlined text-primary-container">{icon}</span>
        <h2 className="font-headline-sm text-lg text-on-surface font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function AudioLectureAnalysis() {
  const [audio, setAudio] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    setAnalysis(null);
    setError('');

    if (selectedFile && selectedFile.size > MAX_AUDIO_SIZE) {
      setAudio(null);
      setError('Audio file must be 25 MB or smaller.');
      event.target.value = '';
      return;
    }

    setAudio(selectedFile);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!audio || isAnalyzing) return;

    setError('');
    setAnalysis(null);
    setIsAnalyzing(true);

    const formData = new FormData();
    formData.append('audio', audio);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/lectures/analyze-audio',
        formData,
      );
      if (!response.data?.success || !response.data?.data) {
        throw new Error(response.data?.error || 'The server returned an invalid analysis.');
      }
      setAnalysis(response.data.data);
    } catch (requestError) {
      setError(
        requestError.response?.data?.error
          || requestError.message
          || 'Unable to analyze this audio. Please try again.',
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col w-full pb-16">
      <div className="px-gutter py-space-xl flex flex-col gap-space-xl max-w-[1100px] mx-auto w-full">
        <div className="flex flex-col gap-space-sm">
          <Link
            to="/interactive/analysis"
            className="text-sm text-primary-container hover:underline w-fit"
          >
            Back to Interactive Learning
          </Link>
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-primary-container text-[30px]">graphic_eq</span>
            <h1 className="font-headline-lg text-3xl text-on-surface font-bold">Audio Lecture Analysis</h1>
          </div>
          <p className="text-sm text-on-surface-variant max-w-2xl">
            Upload a recorded lecture to create a transcript, concise summary, key points, a mind map, and a five-question quiz.
          </p>
        </div>

        <section className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm border border-outline-variant/20">
          <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
            <label htmlFor="lecture-audio" className="text-sm font-semibold text-on-surface">
              Select an audio recording
            </label>
            <input
              id="lecture-audio"
              type="file"
              accept={AUDIO_ACCEPT}
              onChange={handleFileChange}
              disabled={isAnalyzing}
              className="block w-full text-sm text-on-surface-variant file:mr-4 file:rounded-lg file:border-0 file:bg-primary-container file:px-4 file:py-2 file:font-medium file:text-on-primary hover:file:bg-primary disabled:opacity-60"
            />
            <p className="text-xs text-on-surface-variant">
              MP3, MP4, MPEG, M4A, WAV, WEBM, FLAC, or OGG. Maximum size: 25 MB.
              {audio && ` Selected: ${audio.name} (${(audio.size / (1024 * 1024)).toFixed(1)} MB)`}
            </p>

            {error && (
              <div role="alert" className="rounded-lg border border-error/30 bg-error-container/40 p-3 text-sm text-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!audio || isAnalyzing}
              className="inline-flex items-center justify-center gap-space-xs rounded-lg bg-primary-container px-space-lg py-3 text-sm font-medium text-on-primary shadow-sm transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit"
            >
              <span className={`material-symbols-outlined text-[18px] ${isAnalyzing ? 'animate-spin' : ''}`}>
                {isAnalyzing ? 'progress_activity' : 'auto_awesome'}
              </span>
              {isAnalyzing ? 'Transcribing and analyzing...' : 'Analyze recording'}
            </button>
            {isAnalyzing && (
              <p role="status" className="text-sm text-on-surface-variant">
                This can take a few minutes depending on the recording length.
              </p>
            )}
          </form>
        </section>

        {analysis && (
          <div className="flex flex-col gap-space-lg" aria-live="polite">
            <SectionCard title="Lecture Summary" icon="summarize">
              <p className="text-sm text-on-surface-variant leading-relaxed">{analysis.summary}</p>
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
                    <h3 className="text-sm font-semibold text-on-surface">
                      {index + 1}. {question.question}
                    </h3>
                    <ul className="mt-space-sm space-y-1 text-sm text-on-surface-variant">
                      {question.options.map((option) => (
                        <li
                          key={option.label}
                          className={option.label === question.correctAnswer ? 'font-semibold text-tertiary' : ''}
                        >
                          {option.label}. {option.text}
                          {option.label === question.correctAnswer && ' — Correct answer'}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-space-sm text-sm text-on-surface-variant">
                      <span className="font-semibold text-on-surface">Explanation: </span>
                      {question.explanation}
                    </p>
                  </article>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Transcript" icon="subtitles">
              <details>
                <summary className="cursor-pointer text-sm font-medium text-primary-container">
                  Show full transcript
                </summary>
                <p className="mt-space-md whitespace-pre-wrap text-sm leading-relaxed text-on-surface-variant">
                  {analysis.transcript}
                </p>
              </details>
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}
