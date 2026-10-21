import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { fetchUserLectures } from '../services/api.js';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export default function SubjectFolderPage() {
  const { subjectKey, subjectId } = useParams();
  const resolvedSubjectId = subjectId || subjectKey;
  const navigate = useNavigate();
  const [subject, setSubject] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadFolder = async () => {
      setLoading(true);
      setError('');
      try {
        const [subjectResponse, userLectures] = await Promise.all([
          axios.get(`${API_BASE}/subjects/${resolvedSubjectId}`),
          fetchUserLectures(),
        ]);
        if (!isMounted) return;

        const selectedSubject = subjectResponse.data?.data;

        if (!selectedSubject) {
          setError('This subject could not be found.');
          return;
        }

        setSubject(selectedSubject);
        setLectures((userLectures || []).filter((lecture) => String(lecture.subjectId || '') === String(selectedSubject._id)));
      } catch (err) {
        if (!isMounted) return;
        console.error('Could not load subject folder:', err);
        setError(err.response?.data?.error || err.message || 'Could not load this subject folder.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadFolder();
    return () => {
      isMounted = false;
    };
  }, [resolvedSubjectId]);

  return (
    <div className="px-gutter py-space-xl max-w-7xl mx-auto w-full">
      <button
        type="button"
        onClick={() => navigate('/subjects')}
        className="mb-space-lg inline-flex items-center gap-space-xs text-sm text-primary hover:underline"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        All Subjects
      </button>

      {loading ? (
        <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-space-xl text-center text-on-surface-variant">
          Opening subject folder…
        </div>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-error/30 bg-error-container/30 p-space-lg text-error">
          {error}
        </div>
      ) : subject && (
        <div className="flex flex-col gap-space-xl">
          <header className="rounded-2xl bg-surface-container-lowest p-space-xl shadow-sm border border-outline-variant/20">
            <div className="flex items-center gap-space-md">
              <div className="w-14 h-14 rounded-xl bg-primary-container/10 text-primary-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[30px]">{subject.icon || 'folder'}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">{subject.code}</p>
                <h1 className="mt-1 text-2xl font-bold text-on-surface">{subject.title}</h1>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {subject.instructor} · {subject.term}
                </p>
              </div>
            </div>
            <button type="button" onClick={() => navigate('/padhai-ai')} className="mt-5 rounded-lg bg-primary-container px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90">Add material with Padhai AI</button>
          </header>

          <section className="flex flex-col gap-space-md">
            <div className="flex items-end justify-between gap-space-md">
              <div>
                <h2 className="text-lg font-semibold text-on-surface">Interactive lectures</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {lectures.length} {lectures.length === 1 ? 'lecture' : 'lectures'} in this subject
                </p>
              </div>
            </div>

            {lectures.length === 0 ? (
              <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-space-xl text-center">
                <span className="material-symbols-outlined text-3xl text-outline">video_library</span>
                <p className="mt-space-sm font-medium text-on-surface">No lectures in this folder yet</p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Interactive lectures explicitly linked to this subject will appear here. Material and notes sections will be available when their processing pipeline is configured.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                {lectures.map((lecture) => (
                  <button
                    key={lecture._id || lecture.id}
                    type="button"
                  onClick={() => navigate(`/interactive/${lecture._id || lecture.id}`)}
                    className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-space-lg text-left shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-space-md">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-on-surface">{lecture.title || 'Untitled Lecture'}</h3>
                        <p className="mt-1 text-xs text-on-surface-variant">
                          {lecture.createdAt ? new Date(lecture.createdAt).toLocaleDateString() : 'Recently added'}
                          {lecture.duration ? ` · ${lecture.duration}` : ''}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-primary" aria-hidden="true">play_circle</span>
                    </div>
                    <p className="mt-space-md text-sm text-on-surface-variant">
                      {lecture.analysisStatus === 'complete' ? 'Analysis ready' : lecture.analysisStatus || 'Lecture saved'}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
