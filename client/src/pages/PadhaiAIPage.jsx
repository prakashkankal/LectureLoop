import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../services/api.js';
import AudioAnalysisResults from '../modules/student/AudioAnalysisResults.jsx';

const AUDIO_ACCEPT = '.flac,.m4a,.mp3,.mp4,.mpeg,.mpga,.ogg,.wav,.webm';
const MAX_AUDIO_SIZE = 25 * 1024 * 1024;

export default function PadhaiAIPage() {
  const { materialId } = useParams();
  const [showAddLectureForm, setShowAddLectureForm] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [savedAudioLectures, setSavedAudioLectures] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [audio, setAudio] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [savedLecture, setSavedLecture] = useState(null);
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch('/subjects')
      .then((response) => {
        if (active) setSubjects(Array.isArray(response.data) ? response.data : []);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Unable to load subjects.');
      })
      .finally(() => {
        if (active) setSubjectsLoading(false);
      });
    apiFetch('/lectures/audio')
      .then((response) => {
        if (active) setSavedAudioLectures(Array.isArray(response.data) ? response.data : []);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const resetLectureForm = () => {
    setTitle('');
    setTopic('');
    setDescription('');
    setSubjectId('');
    setAudio(null);
    setAnalysis(null);
    setSavedLecture(null);
    setError('');
  };

  const handleAudioChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    setError('');
    setAnalysis(null);
    setSavedLecture(null);
    if (selectedFile && selectedFile.size > MAX_AUDIO_SIZE) {
      setAudio(null);
      setError('Audio file must be 25 MB or smaller.');
      event.target.value = '';
      return;
    }
    setAudio(selectedFile);
  };

  const handleLectureSubmit = async (event) => {
    event.preventDefault();
    if (isAnalyzing) return;
    setError('');
    setAnalysis(null);
    setSavedLecture(null);
    setIsAnalyzing(true);

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('topic', topic.trim());
    formData.append('description', description.trim());
    formData.append('subjectId', subjectId);
    formData.append('audio', audio);

    try {
      const response = await apiFetch('/lectures/analyze-audio', { method: 'POST', body: formData });
      if (!response?.success || !response?.data) throw new Error(response?.error || 'The server returned an invalid analysis.');
      setAnalysis(response.data);
      setSavedLecture(response.lecture || null);
      if (response.lecture) {
        setSavedAudioLectures((current) => [response.lecture, ...current.filter((lecture) => lecture._id !== response.lecture._id)]);
      }
    } catch (requestError) {
      setError(requestError.message || 'Unable to analyze this lecture. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openSavedLecture = (lecture) => {
    setTitle(lecture.title || '');
    setTopic(lecture.topic || '');
    setDescription(lecture.description || '');
    setSubjectId(lecture.subjectId || '');
    setAudio(null);
    setSavedLecture(lecture);
    setAnalysis(lecture.audioAnalysis ? { ...lecture.audioAnalysis, transcript: lecture.transcript || '' } : null);
    setShowAddLectureForm(false);
    setError('');
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-gutter py-space-xl">
      <header className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Padhai AI</p>
          <h1 className="mt-1 text-3xl font-bold text-on-surface">Study materials</h1>
          <p className="mt-2 max-w-2xl text-on-surface-variant">Add a topic, choose its subject, and upload a recording to create an AI study guide.</p>
        </div>
      </header>

      <div className="flex flex-col gap-6">
          {materialId && <div role="alert" className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">Material {materialId} is not available. Study material records are not configured in this workspace yet.</div>}

          {savedAudioLectures.length > 0 && (
            <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-on-surface">Saved study materials</h2>
              <ul className="flex flex-col divide-y divide-outline-variant/30">
                {savedAudioLectures.map((lecture) => (
                  <li key={lecture._id}>
                    <button type="button" onClick={() => openSavedLecture(lecture)} className="flex w-full items-center justify-between gap-4 py-3 text-left hover:text-primary">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-on-surface">{lecture.title}</span>
                        <span className="mt-1 block truncate text-xs text-on-surface-variant">{lecture.subject} · {lecture.topic || 'Audio lecture'} · {lecture.filename || 'Audio recording'}</span>
                      </span>
                      <span className="material-symbols-outlined shrink-0 text-primary" aria-hidden="true">chevron_right</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!showAddLectureForm && !analysis && (
            <section className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center">
              <span className="material-symbols-outlined text-4xl text-outline" aria-hidden="true">upload_file</span>
              <h2 className="mt-3 text-lg font-semibold text-on-surface">Add a recorded lecture</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-on-surface-variant">Enter its title, description, and subject, then upload an audio recording. Padhai AI will transcribe it and create a summary, key points, mind map, and quiz.</p>
              <button type="button" onClick={() => { resetLectureForm(); setShowAddLectureForm(true); }} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary-container px-4 py-2.5 font-semibold text-on-primary hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">add</span>Add a lecture
              </button>
            </section>
          )}

          {showAddLectureForm && !analysis && (
            <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm sm:p-8">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-on-surface">Add study material</h2>
                  <p className="mt-1 text-sm text-on-surface-variant">Add a topic and course details, then upload an audio recording for analysis.</p>
                </div>
                <button type="button" onClick={() => { setShowAddLectureForm(false); resetLectureForm(); }} disabled={isAnalyzing} className="rounded-lg px-3 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50">Cancel</button>
              </div>

              <form onSubmit={handleLectureSubmit} className="flex flex-col gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-medium text-on-surface">
                  Lecture title
                    <input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} disabled={isAnalyzing} placeholder="e.g. Introduction to database normalization" className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-normal outline-none focus:border-primary" />
                  </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-on-surface">
                  Topic
                  <input required maxLength={160} value={topic} onChange={(event) => setTopic(event.target.value)} disabled={isAnalyzing} placeholder="e.g. Normal forms" className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-normal outline-none focus:border-primary" />
                </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-on-surface">
                    Subject
                    <select required value={subjectId} onChange={(event) => setSubjectId(event.target.value)} disabled={isAnalyzing || subjectsLoading || subjects.length === 0} className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-normal outline-none focus:border-primary disabled:opacity-60">
                      <option value="">{subjectsLoading ? 'Loading subjects…' : 'Select a subject'}</option>
                      {subjects.map((subject) => <option key={subject._id} value={subject._id}>{subject.title}{subject.code ? ` (${subject.code})` : ''}</option>)}
                    </select>
                    {!subjectsLoading && subjects.length === 0 && <span className="text-xs font-normal text-on-surface-variant">Create a subject first in <Link className="text-primary underline" to="/my-subjects">My Subjects</Link>.</span>}
                  </label>
                </div>

                <label className="flex flex-col gap-2 text-sm font-medium text-on-surface">
                  Description
                  <textarea maxLength={2000} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} disabled={isAnalyzing} placeholder="Add a short description or notes about this lecture" className="resize-y rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-normal outline-none focus:border-primary" />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-on-surface">
                  Audio recording
                  <input required type="file" accept={AUDIO_ACCEPT} onChange={handleAudioChange} disabled={isAnalyzing} className="block w-full text-sm text-on-surface-variant file:mr-4 file:rounded-lg file:border-0 file:bg-primary-container file:px-4 file:py-2 file:font-medium file:text-on-primary disabled:opacity-60" />
                  <span className="text-xs font-normal text-on-surface-variant">MP3, MP4, MPEG, M4A, WAV, WEBM, FLAC, or OGG. Maximum 25 MB.{audio ? ` Selected: ${audio.name} (${(audio.size / (1024 * 1024)).toFixed(1)} MB)` : ''}</span>
                </label>

                {error && <div role="alert" className="rounded-lg border border-error/30 bg-error-container/40 p-3 text-sm text-error">{error}</div>}
                <button type="submit" disabled={!title.trim() || !topic.trim() || !subjectId || !audio || isAnalyzing || subjectsLoading} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-container px-5 py-3 text-sm font-semibold text-on-primary shadow-sm hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit">
                  <span className={`material-symbols-outlined text-[18px] ${isAnalyzing ? 'animate-spin' : ''}`}>{isAnalyzing ? 'progress_activity' : 'auto_awesome'}</span>
                  {isAnalyzing ? 'Transcribing and analyzing…' : 'Analyze and save lecture'}
                </button>
                {isAnalyzing && <p role="status" className="text-sm text-on-surface-variant">This can take a few minutes depending on the recording length.</p>}
              </form>
            </section>
          )}

          {analysis && (
            <>
              <div className="flex flex-col gap-3 rounded-xl border border-tertiary/30 bg-tertiary-fixed/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-on-surface">Lecture analyzed and saved</p>
                  <p className="text-sm text-on-surface-variant">{savedLecture?.title || title} · {savedLecture?.topic || topic} · {savedLecture?.subject || subjects.find((subject) => subject._id === subjectId)?.title}</p>
                </div>
                <button type="button" onClick={() => { resetLectureForm(); setShowAddLectureForm(true); }} className="rounded-lg border border-outline-variant px-3 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-low">Add another lecture</button>
              </div>
              <AudioAnalysisResults analysis={analysis} />
            </>
          )}
      </div>
    </div>
  );
}
