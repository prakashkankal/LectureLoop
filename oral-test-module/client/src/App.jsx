import { useCallback, useEffect, useState } from 'react';
import { BookOpenText, ChartNoAxesCombined, Headphones, Infinity, Mic2, RefreshCw, Search, Settings, Sparkles } from 'lucide-react';
import Dashboard from './pages/Dashboard.jsx';
import PracticeSession from './pages/PracticeSession.jsx';
import ProgressPage from './pages/ProgressPage.jsx';
import { api } from './services/api.js';

const navItems = [
  { id: 'dashboard', label: 'Practice setup', icon: BookOpenText },
  { id: 'progress', label: 'Progress & history', icon: ChartNoAxesCombined },
];

export default function App() {
  const user = { name: 'Guest learner' };
  const [view, setView] = useState('dashboard');
  const [materials, setMaterials] = useState([]);
  const [material, setMaterial] = useState(null);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [attempts, setAttempts] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [mode, setMode] = useState('english-assessment');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [incomingMaterial, setIncomingMaterial] = useState(null);
  const [learningLibraryWindow, setLearningLibraryWindow] = useState(null);

  const startPractice = useCallback(async (selectedMaterial, selectedMode) => {
    setBusy(true);
    setMessage('');
    try {
      const response = await api('/questions', {
        method: 'POST',
        body: JSON.stringify({ material: selectedMaterial, count: 5 }),
      });
      setMaterial(response.material);
      setQuestions(response.questions);
      setMode(selectedMode);
      setView('session');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }, []);

  const loadWorkspace = useCallback(async () => {
    setMaterialsLoading(true);
    setMessage('');
    const [materialResult, attemptResult] = await Promise.allSettled([
      api('/materials'),
      api('/attempts'),
    ]);

    if (materialResult.status === 'fulfilled') {
      setMaterials(materialResult.value.materials);
      setMaterial((current) => current || materialResult.value.materials[0] || null);
    } else {
      setMessage(`Could not load sample materials: ${materialResult.reason.message}`);
    }

    if (attemptResult.status === 'fulfilled') {
      setAttempts(attemptResult.value.attempts);
    } else if (materialResult.status === 'fulfilled') {
      setMessage(`Practice history could not be loaded: ${attemptResult.reason.message}`);
    }
    setMaterialsLoading(false);
  }, []);

  useEffect(() => {
    const receiveMaterial = (event) => {
      const trustedLearningOrigin = ['http://localhost:5173', 'http://127.0.0.1:5173'].includes(event.origin);
      const fromOpener = Boolean(window.opener) && event.source === window.opener;
      const fromLearningLibrary = event.source === learningLibraryWindow;
      if (
        !trustedLearningOrigin ||
        (!fromOpener && !fromLearningLibrary) ||
        event.data?.type !== 'lectureloop:import-material' ||
        event.data.schemaVersion !== 1
      ) return;

      const { subject, lecture, topic, notes, keyTerms } = event.data.material || {};
      if (
        typeof subject !== 'string' ||
        typeof lecture !== 'string' ||
        typeof topic !== 'string' ||
        typeof notes !== 'string' ||
        notes.trim().length < 20 ||
        notes.length > 30000 ||
        !Array.isArray(keyTerms)
      ) return;

      const imported = {
        id: `lectureloop-${Date.now()}`,
        subject,
        lecture,
        topic,
        notes,
        keyTerms: keyTerms.filter((term) => typeof term === 'string').slice(0, 80),
      };
      setIncomingMaterial(imported);
      event.source?.postMessage(
        { type: 'lectureloop:material-imported', requestId: event.data.requestId },
        event.origin,
      );
    };

    window.addEventListener('message', receiveMaterial);
    if (window.opener) {
      window.opener.postMessage({ type: 'lectureloop:oral-practice-ready' }, '*');
    }
    return () => window.removeEventListener('message', receiveMaterial);
  }, [learningLibraryWindow]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    if (!incomingMaterial) return;
    setMaterial(incomingMaterial);
    setView('dashboard');
    setMessage(`"${incomingMaterial.lecture}" is ready. Review the imported lecture notes, then choose Begin oral practice.`);
    setIncomingMaterial(null);
  }, [incomingMaterial]);

  function chooseLectureFromLibrary() {
    const libraryWindow = window.open('http://localhost:5173/lectures', '_blank');
    if (!libraryWindow) {
      setMessage('Allow pop-ups to choose a lecture from your LectureLoop library.');
      return;
    }
    setLearningLibraryWindow(libraryWindow);
    setMessage('Choose a lecture in the LectureLoop tab, then select Practice orally to import its notes here.');
  }
  async function refreshAttempts() {
    try {
      const response = await api('/attempts');
      setAttempts(response.attempts);
    } catch (error) {
      setMessage(error.message);
    }
  }

  function retryAttempt(attempt) {
    setMaterial(attempt.material);
    setQuestions([attempt.questionData]);
    setMode(attempt.mode === 'practice' ? 'practice' : 'english-assessment');
    setView('session');
  }

  async function deleteAttempt(id) {
    try {
      await api(`/attempts/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setAttempts((current) => current.filter((attempt) => attempt.id !== id));
    } catch (error) {
      setMessage(error.message);
    }
  }

  const activeLabel = navItems.find((item) => item.id === view)?.label || 'Oral practice';
  return <div className="app-frame">
    <aside className="side-rail">
      <a className="brand-lockup" href="#dashboard" onClick={(event) => { event.preventDefault(); setView('dashboard'); }}><span className="brand-mark"><Infinity size={21} strokeWidth={2.3} /></span><span className="brand-name"><b>Lecture</b><b>Loop</b></span></a>
      <div className="rail-label">STUDY WORKSPACE</div>
      <nav className="main-nav" aria-label="Main navigation">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'nav-item active' : 'nav-item'} onClick={() => { setView(id); setMessage(''); }}><Icon size={19} /><span>{label}</span>{id === 'progress' && attempts.length > 0 && <b>{attempts.length}</b>}</button>)}</nav>
      <div className="rail-divider" />
      <div className="rail-label">PREFERENCES</div>
      <div className="nav-item nav-item-static"><Settings size={19} /><span>Oral practice settings</span></div>
      <div className="rail-spacer" />
      <div className="rail-support"><div className="support-mark"><Headphones size={17} /></div><strong>Practice at your pace</strong><p>Your original answer stays visible, even after you edit it.</p><span><Sparkles size={13} /> NOTES-GROUNDED FEEDBACK</span></div>
      <div className="profile-panel"><div className="profile-row"><span className="avatar">{user.name[0]}</span><div className="profile-copy"><strong>{user.name}</strong><small>This browser only</small></div></div></div>
    </aside>
    <main className="main-column">
      <header className="topbar"><div className="breadcrumb"><span>WORKSPACE</span><b>/</b><strong>{activeLabel}</strong></div><div className="topbar-right"><label className="workspace-search"><Search size={17} /><input type="search" aria-label="Search oral practice" placeholder="Search practice history..." /></label><span className="privacy-indicator"><span /> Private history</span><span className="topbar-avatar">{user.name?.trim()?.[0]?.toUpperCase() || 'S'}</span></div></header>
      <div className="mobile-nav" aria-label="Main navigation">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'mobile-nav-item active' : 'mobile-nav-item'} onClick={() => setView(id)}><Icon size={17} /><span>{label}</span></button>)}</div>
      <div className="content-area">
        {message && <div className="global-message" role="alert"><span>{message}</span><button onClick={() => setMessage('')} aria-label="Dismiss message">×</button></div>}
        {view === 'dashboard' && material && <Dashboard materials={materials} material={material} onMaterialChange={setMaterial} attempts={attempts} onStart={startPractice} onChooseLecture={chooseLectureFromLibrary} loading={busy} />}
        {view === 'dashboard' && !material && <div className="empty-note">{materialsLoading ? 'Loading sample materials…' : <><p>Sample materials are unavailable. Make sure the Oral Practice API is running, then retry.</p><button className="button button-secondary" type="button" onClick={loadWorkspace}><RefreshCw size={15} /> Retry loading materials</button></>}</div>}
        {view === 'progress' && <ProgressPage attempts={attempts} onRetry={retryAttempt} onDelete={deleteAttempt} />}
        {view === 'session' && questions.length > 0 && <PracticeSession key={questions[0].id} material={material} questions={questions} mode={mode} onExit={() => { setView('dashboard'); refreshAttempts(); }} onAttemptSaved={refreshAttempts} />}
      </div>
      <footer className="app-footer"><span>LECTURELOOP ORAL PRACTICE</span><span>Lecture notes import from your learning library · Separate practice account</span></footer>
    </main>
  </div>;
}