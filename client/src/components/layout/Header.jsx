import React from 'react';

export default function Header() {
  return (
    <header className="fixed top-0 left-[250px] right-0 h-16 bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-outline-variant/30 z-40 flex items-center justify-between px-gutter">
      {/* Breadcrumb Context */}
      <div className="flex items-center gap-space-sm text-sm">
        <span className="font-label-md text-on-surface-variant">Workspace</span>
        <span className="material-symbols-outlined text-outline text-[16px]">chevron_right</span>
        <span className="font-label-md text-on-surface font-semibold">Computer Science</span>
      </div>

      {/* Global Search and Notifications */}
      <div className="flex items-center gap-gutter">
        <div className="relative flex items-center">
          <div className="flex items-center bg-surface-container-lowest px-space-md py-space-xs rounded-lg shadow-sm gap-space-sm w-72 border border-outline-variant/40">
            <span className="material-symbols-outlined text-outline text-[18px]">search</span>
            <input
              className="w-full bg-transparent font-body-sm text-sm text-on-surface placeholder:text-outline focus:outline-none"
              placeholder="Search lectures, notes, terms..."
              type="text"
            />
            <kbd className="font-code-sm text-[11px] bg-surface-container px-space-xs py-0.5 rounded text-outline">
              ⌘K
            </kbd>
          </div>
        </div>

        <div className="flex items-center gap-space-sm">
          <button
            aria-label="Notifications"
            className="relative w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-error ring-2 ring-surface"></span>
          </button>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
          </div>
        </div>
      </div>
    </header>
  );
}
