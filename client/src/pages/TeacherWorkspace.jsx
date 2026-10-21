import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function TeacherWorkspace() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <main className="min-h-screen bg-background px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-on-primary"><span className="material-symbols-outlined">all_inclusive</span></div>
          <div><p className="font-bold text-on-surface">LectureLoop</p><p className="text-xs text-on-surface-variant">Teacher workspace</p></div>
        </div>
        <button type="button" onClick={signOut} className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-low">Sign out</button>
      </div>
      <section className="mx-auto mt-20 max-w-2xl rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary-fixed text-secondary"><span className="material-symbols-outlined text-3xl">school</span></div>
        <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-primary">Teacher account</p>
        <h1 className="mt-2 text-3xl font-bold text-on-surface">Welcome{user?.name ? `, ${user.name}` : ''}</h1>
        <p className="mx-auto mt-3 max-w-lg text-on-surface-variant">Your teacher workspace is set up. Teaching tools and course management will be added here next.</p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-surface-container-low px-4 py-2 text-sm text-on-surface-variant"><span className="material-symbols-outlined text-[18px]">construction</span>Teacher features are coming soon</div>
      </section>
    </main>
  );
}
