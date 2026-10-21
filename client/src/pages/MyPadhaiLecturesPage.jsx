import React from 'react';
import { Link, useParams } from 'react-router-dom';

export default function MyPadhaiLecturesPage() {
  const { lectureId } = useParams();
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-gutter py-space-xl">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Library</p>
        <h1 className="mt-1 text-3xl font-bold text-on-surface">My Lectures</h1>
        <p className="mt-2 text-on-surface-variant">This library contains lectures and study sessions created from Padhai AI materials.</p>
      </header>
      <section className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center">
        <span className="material-symbols-outlined text-4xl text-outline" aria-hidden="true">video_library</span>
        <h2 className="mt-3 text-lg font-semibold text-on-surface">{lectureId ? 'Lecture not found' : 'No Padhai AI lectures yet'}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-on-surface-variant">{lectureId ? 'This lecture is unavailable or does not belong to the Padhai AI library.' : 'Interactive YouTube sessions are listed in Interactive. Padhai AI lecture storage is not configured yet, so no Interactive lectures are mixed into this library.'}</p>
        <Link className="mt-5 inline-flex rounded-lg bg-primary-container px-4 py-2 font-medium text-on-primary" to={lectureId ? '/my-lectures' : '/padhai-ai'}>{lectureId ? 'Back to My Lectures' : 'Open Padhai AI'}</Link>
      </section>
    </div>
  );
}
