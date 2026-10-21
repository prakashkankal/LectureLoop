import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AddLectureDrawer } from './DashboardOverview.jsx';

export default function PadhaiAIPage() {
  const { materialId } = useParams();
  const [showAddLectureInfo, setShowAddLectureInfo] = useState(false);
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-gutter py-space-xl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Padhai AI</p>
          <h1 className="mt-1 text-3xl font-bold text-on-surface">Study material workspace</h1>
          <p className="mt-2 max-w-2xl text-on-surface-variant">Upload course material and create study resources. This workspace is waiting for a document extraction and material-processing service.</p>
        </div>
        <button type="button" onClick={() => setShowAddLectureInfo((visible) => !visible)} aria-expanded={showAddLectureInfo} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary-container px-4 py-2.5 font-semibold text-on-primary hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">add</span>
          Add a lecture
        </button>
      </header>
      <AddLectureDrawer isOpen={showAddLectureInfo} onClose={() => setShowAddLectureInfo(false)} />
      {materialId && <div role="alert" className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">Material {materialId} is not available. Study material records are not configured in this workspace yet.</div>}
      <section className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center">
        <span className="material-symbols-outlined text-4xl text-outline" aria-hidden="true">upload_file</span>
        <h2 className="mt-3 text-lg font-semibold text-on-surface">Material processing is not configured</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-on-surface-variant">The current server has no PDF or DOCX extraction pipeline and no StudyMaterial storage API. Uploads are disabled so files are not presented as processed or saved when they are not.</p>
        <Link className="mt-5 inline-flex rounded-lg bg-primary-container px-4 py-2 font-medium text-on-primary" to="/my-subjects">Choose a subject</Link>
      </section>
    </div>
  );
}
