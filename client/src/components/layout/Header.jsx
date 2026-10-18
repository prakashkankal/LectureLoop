import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { searchLearningMaterials } from '../../services/api.js';

export default function Header({ sidebarCollapsed = false, onOpenMenu }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searchLectures, setSearchLectures] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return undefined;
    let active = true;
    const timer = window.setTimeout(async () => {
      setSearchBusy(true);
      try {
        const results = await searchLearningMaterials(term);
        if (active) { setSearchLectures(results); setSearchError(''); }
      } catch (error) {
        if (active) { setSearchLectures([]); setSearchError(error.message); }
      } finally {
        if (active) setSearchBusy(false);
      }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query]);

  const searchResults = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];
    return searchLectures.flatMap((lecture) => {
      const hits = [];
      if (`${lecture.title} ${lecture.subject}`.toLowerCase().includes(term)) {
        hits.push({ lecture, label: lecture.title, detail: lecture.subject, type: 'Lecture' });
      }
      (lecture.topics || []).filter((topic) => `${topic.title} ${topic.summary} ${(topic.keyTerms || []).join(' ')}`.toLowerCase().includes(term))
        .forEach((topic) => hits.push({ lecture, topicIndex: topic.index, label: topic.title, detail: `Topic in ${lecture.title}`, type: 'Topic', seek: topic.startSec || 0 }));
      (lecture.notes || []).filter((note) => note.content?.toLowerCase().includes(term))
        .forEach((note) => {
          const topic = lecture.topics?.find((item) => item.index === note.topicIndex);
          hits.push({ lecture, topicIndex: note.topicIndex, label: topic?.title || 'Lecture note', detail: note.content.slice(0, 90), type: 'Note', seek: note.timestampSec || topic?.startSec || 0 });
        });
      return hits;
    }).slice(0, 7);
  }, [query, searchLectures]);

  const openSearchResult = (result) => {
    const params = new URLSearchParams({ lectureId: result.lecture._id });
    if (result.topicIndex != null) params.set('topicIndex', result.topicIndex);
    if (result.seek != null) params.set('seek', result.seek);
    setSearchOpen(false);
    setMobileSearchOpen(false);
    setQuery('');
    navigate(`/interactive/session?${params.toString()}`);
  };
  return (
    <header className={`fixed top-0 left-0 ${sidebarCollapsed ? 'md:left-[72px]' : 'md:left-[250px]'} right-0 h-16 bg-surface/95 backdrop-blur-xl shadow-sm border-b border-outline-variant/30 z-40 flex items-center justify-between px-3 md:px-gutter gap-3`}>
      {/* Breadcrumb Context */}
      <div className="flex min-w-0 items-center gap-space-sm text-sm">
        <button onClick={onOpenMenu} aria-label="Open navigation" className="md:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><span className="material-symbols-outlined">menu</span></button>
        <div className="hidden sm:flex items-center gap-space-sm">
        <span className="font-label-md text-on-surface-variant">Workspace</span>
        <span className="material-symbols-outlined text-outline text-[16px]">chevron_right</span>
        <span className="font-label-md text-on-surface font-semibold">Computer Science</span>
        </div>
      </div>

      {/* Global Search and Notifications */}
        <div className="flex items-center gap-2 md:gap-space-md">
          <div className="relative hidden sm:flex items-center">
          <div className="flex items-center bg-surface-container-lowest px-space-md py-space-xs rounded-lg shadow-sm gap-space-sm w-52 lg:w-72 border border-outline-variant/40">
            <span className="material-symbols-outlined text-outline text-[18px]">search</span>
            <input
              className="w-full bg-transparent font-body-sm text-sm text-on-surface placeholder:text-outline focus:outline-none"
              placeholder="Search lectures, notes, terms..."
              type="search"
              aria-label="Search lectures, notes, and topics"
              aria-expanded={searchOpen}
              aria-controls="learning-search-results"
              value={query}
              onFocus={() => setSearchOpen(true)}
              onChange={(event) => {
                const nextQuery = event.target.value;
                setQuery(nextQuery);
                setSearchOpen(true);
                if (nextQuery.trim().length < 2) { setSearchLectures([]); setSearchError(''); setSearchBusy(false); }
              }}
              onKeyDown={(event) => { if (event.key === 'Escape') setSearchOpen(false); }}
            />
            <kbd className="font-code-sm text-[11px] bg-surface-container px-space-xs py-0.5 rounded text-outline">
              ⌘K
            </kbd>
          </div>
          {searchOpen && query.trim().length >= 2 && <div id="learning-search-results" role="listbox" aria-label="Search results" className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-2 shadow-xl">
            {searchBusy ? <p className="p-3 text-xs text-on-surface-variant">Searching your lectures and notes…</p>
              : searchError ? <p role="alert" className="p-3 text-xs text-error">{searchError}</p>
                : searchResults.length ? searchResults.map((item, index) => <button key={`${item.lecture._id}-${item.type}-${item.topicIndex ?? 'lecture'}-${index}`} role="option" aria-selected="false" onClick={() => openSearchResult(item)} className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">{item.type}</span><span className="line-clamp-1 text-sm font-medium text-on-surface">{item.label}</span><span className="line-clamp-2 text-xs text-on-surface-variant">{item.detail}</span>
                </button>) : <p className="p-3 text-xs text-on-surface-variant">No matching lectures, topics, or notes.</p>}
          </div>}
        </div>

        <div className="flex items-center gap-space-sm">
          <button type="button" aria-label="Search lectures, notes, and topics" aria-expanded={mobileSearchOpen} onClick={() => { setMobileSearchOpen((open) => !open); setSearchOpen(true); }} className="sm:hidden flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><span className="material-symbols-outlined text-[20px]">search</span></button>
          <button
            aria-label="Notifications"
            className="relative w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-error ring-2 ring-surface"></span>
          </button>
          <div title={user?.name || 'Profile'} className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0 text-on-primary text-sm font-semibold">
            {(user?.name || 'S').slice(0, 1).toUpperCase()}
          </div>
        </div>
      </div>
      {mobileSearchOpen && <div className="sm:hidden absolute left-0 right-0 top-full border-b border-outline-variant/40 bg-surface p-3 shadow-lg">
        <label className="flex items-center gap-2 rounded-lg border border-outline-variant/50 bg-surface-container-lowest px-3 py-2">
          <span className="material-symbols-outlined text-outline text-[18px]">search</span>
          <input autoFocus className="w-full bg-transparent text-sm text-on-surface placeholder:text-outline focus:outline-none" placeholder="Search lectures, notes, topics…" type="search" aria-label="Search lectures, notes, and topics" value={query} onFocus={() => setSearchOpen(true)} onChange={(event) => { const nextQuery = event.target.value; setQuery(nextQuery); setSearchOpen(true); if (nextQuery.trim().length < 2) { setSearchLectures([]); setSearchError(''); setSearchBusy(false); } }} onKeyDown={(event) => { if (event.key === 'Escape') { setMobileSearchOpen(false); setSearchOpen(false); } }} />
          <button type="button" onClick={() => { setMobileSearchOpen(false); setSearchOpen(false); }} aria-label="Close search" className="text-on-surface-variant"><span className="material-symbols-outlined">close</span></button>
        </label>
        {searchOpen && query.trim().length >= 2 && <div role="listbox" aria-label="Search results" className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-2 shadow-xl">
          {searchBusy ? <p className="p-3 text-xs text-on-surface-variant">Searching your lectures and notes…</p> : searchError ? <p role="alert" className="p-3 text-xs text-error">{searchError}</p> : searchResults.length ? searchResults.map((item, index) => <button key={`mobile-${item.lecture._id}-${item.type}-${item.topicIndex ?? 'lecture'}-${index}`} role="option" aria-selected="false" onClick={() => openSearchResult(item)} className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><span className="text-[10px] font-semibold uppercase tracking-wide text-primary">{item.type}</span><span className="line-clamp-1 text-sm font-medium text-on-surface">{item.label}</span><span className="line-clamp-2 text-xs text-on-surface-variant">{item.detail}</span></button>) : <p className="p-3 text-xs text-on-surface-variant">No matching lectures, topics, or notes.</p>}
        </div>}
      </div>}
    </header>
  );
}
