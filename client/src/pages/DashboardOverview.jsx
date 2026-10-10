import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DashboardOverview() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col w-full">
      <div className="px-gutter py-space-xl flex flex-col gap-space-xl max-w-7xl mx-auto w-full">
        {/* Top Greeting & Key Call-to-Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-space-lg">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-xs text-xs">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-primary-fixed text-primary">
                {user?.semester || 'Semester 5 Workspace'}
              </span>
              <span className="text-outline">• Active Term</span>
            </div>
            <h1 className="text-3xl font-bold text-on-surface tracking-tight">
              Good morning, {user?.name || 'Student'}
            </h1>
            <p className="text-sm text-on-surface-variant max-w-xl">
              Keep your classroom lectures organized and your learning on track with interactive checkpoints.
            </p>
          </div>
          <div className="flex items-center gap-space-sm shrink-0">
            <Link
              to="/subjects"
              className="h-10 px-space-lg rounded-xl bg-surface-container-lowest text-on-surface hover:bg-surface-container-low transition-all text-sm font-medium shadow-sm flex items-center gap-space-xs border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[18px] text-outline">folder_open</span>
              <span>Browse Subjects</span>
            </Link>
            <Link
              to="/interactive"
              className="h-10 px-space-lg rounded-xl bg-primary-container text-on-primary hover:bg-primary transition-all text-sm font-medium shadow-sm flex items-center gap-space-xs"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>Add Lecture</span>
            </Link>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {/* Total Lectures */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm text-on-surface-variant font-medium">Total Lectures</span>
              <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">play_circle</span>
              </div>
            </div>
            <div className="mt-space-md">
              <div className="text-2xl font-bold text-on-surface tracking-tight">12</div>
              <div className="flex items-center gap-space-xs mt-space-xs text-xs text-tertiary font-medium">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                <span>+2 added this week</span>
              </div>
            </div>
          </div>

          {/* Subjects */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm text-on-surface-variant font-medium">Subjects</span>
              <div className="w-10 h-10 rounded-xl bg-secondary-fixed text-secondary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">layers</span>
              </div>
            </div>
            <div className="mt-space-md">
              <div className="text-2xl font-bold text-on-surface tracking-tight">4</div>
              <div className="flex items-center gap-space-xs mt-space-xs text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-[14px] text-outline">history_edu</span>
                <span>Across 2 semesters</span>
              </div>
            </div>
          </div>

          {/* Notes Saved */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm text-on-surface-variant font-medium">Notes Saved</span>
              <div className="w-10 h-10 rounded-xl bg-surface-container-low text-tertiary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">description</span>
              </div>
            </div>
            <div className="mt-space-md">
              <div className="text-2xl font-bold text-on-surface tracking-tight">8</div>
              <div className="flex items-center gap-space-xs mt-space-xs text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-[14px] text-outline">auto_awesome</span>
                <span>Structured summaries</span>
              </div>
            </div>
          </div>

          {/* Pending Revision */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm text-on-surface-variant font-medium">Pending Revision</span>
              <div className="w-10 h-10 rounded-xl bg-surface-variant text-on-surface-variant flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">update</span>
              </div>
            </div>
            <div className="mt-space-md">
              <div className="text-2xl font-bold text-on-surface tracking-tight">3</div>
              <div className="flex items-center gap-space-xs mt-space-xs text-xs text-error font-medium">
                <span className="material-symbols-outlined text-[14px]">alarm</span>
                <span>Scheduled for review</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section: Quick Interactive Banner */}
        <div className="bg-surface-container-lowest p-space-xl rounded-2xl border border-outline-variant/30 flex flex-col md:flex-row items-center justify-between gap-space-lg shadow-sm">
          <div className="flex flex-col gap-1 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/30 text-on-secondary-container text-xs font-semibold w-fit">
              <span className="material-symbols-outlined text-[16px]">psychology</span>
              Active Synthesis Ready
            </div>
            <h2 className="text-xl font-bold text-on-surface mt-2">
              Transform Any YouTube Lecture into Topic Checkpoints
            </h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Paste a link, get automatic topic timestamps, and test your comprehension at each checkpoint with targeted remediation notes.
            </p>
          </div>
          <Link
            to="/interactive"
            className="px-space-xl py-3 rounded-xl bg-primary-container text-on-primary hover:bg-primary font-medium text-sm shadow-md transition-all shrink-0 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">smart_display</span>
            <span>Launch Interactive Hub</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
