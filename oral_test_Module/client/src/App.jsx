import { useEffect, useState } from 'react';
import { Activity, BookOpen, BookOpenText, DoorOpen, Headphones, Languages, LoaderCircle, Mic2, Sparkles } from 'lucide-react';
import AuthScreen from './components/AuthScreen.jsx';
import Dashboard from './pages/Dashboard.jsx';
import LanguageCoach from './pages/LanguageCoach.jsx';
import PracticeSession from './pages/PracticeSession.jsx';
import ProgressPage from './pages/ProgressPage.jsx';
import { api, clearSession, getToken } from './services/api.js';

const navItems = [
  { id: 'dashboard', label: 'Practice setup', icon: BookOpenText },
  { id: 'language', label: 'Language helper', icon: Languages },
  { id: 'progress', label: 'Progress & history', icon: Activity },
];

function cachedUser() {
  try { return JSON.parse(localStorage.getItem('oral-practice-user') || 'null'); } catch { return null; }
}

export default function App() {
  const [user, setUser] = useState(cachedUser);
  const [booting, setBooting] = useState(Boolean(getToken()));
  const [view, setView] = useState('dashboard');
  const [materials, setMaterials] = useState([]);
  const [material, setMaterial] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [difficulty, setDifficulty] = useState('intermediate');
  const [mode, setMode] = useState('english-assessment');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!getToken()) return undefined;
    let active = true;
    api('/auth/me').then((response) => {
      if (active) setUser(response.user);
    }).catch(() => {
      clearSession();
      if (active) setUser(null);
    }).finally(() => { if (active) setBooting(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    Promise.all([api('/materials'), api('/attempts')]).then(([materialResponse, attemptResponse]) => {
      if (!active) return;
      setMaterials(materialResponse.materials);
      setMaterial((current) => current || materialResponse.materials[0] || null);
      setAttempts(attemptResponse.attempts);
    }).catch((error) => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [user]);

  async function refreshAttempts() {
    try {
      const response = await api('/attempts');
      setAttempts(response.attempts);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function startPractice(selectedMaterial, selectedDifficulty, selectedMode) {
    setBusy(true);
    setMessage('');
    try {
      const response = await api('/questions', {
        method: 'POST',
        body: JSON.stringify({ material: selectedMaterial, difficulty: selectedDifficulty, count: 5 }),
      });
      setMaterial(response.material);
      setQuestions(response.questions);
      setDifficulty(selectedDifficulty);
      setMode(selectedMode);
      setView('session');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  function retryAttempt(attempt) {
    setMaterial(attempt.material);
    setQuestions([attempt.questionData]);
    setDifficulty(attempt.difficulty);
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

  function signOut() {
    clearSession();
    setUser(null);
    setMaterials([]);
    setAttempts([]);
    setMaterial(null);
    setView('dashboard');
  }

  if (booting) return <main className="boot-screen"><LoaderCircle className="spin" /><span>Opening your practice space…</span></main>;
  if (!user) return <AuthScreen onAuthenticated={setUser} />;

  const activeLabel = navItems.find((item) => item.id === view)?.label || 'Oral practice';
  return <div className="app-frame">
    <aside className="side-rail">
      <a className="brand-lockup" href="#dashboard" onClick={(event) => { event.preventDefault(); setView('dashboard'); }}><span className="brand-mark"><BookOpen size={18} /></span><span>LectureLoop<small>ORAL PRACTICE</small></span></a>
      <div className="rail-label">WORKSPACE</div>
      <nav className="main-nav" aria-label="Main navigation">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'nav-item active' : 'nav-item'} onClick={() => { setView(id); setMessage(''); }}><Icon size={18} /><span>{label}</span>{id === 'progress' && attempts.length > 0 && <b>{attempts.length}</b>}</button>)}</nav>
      <div className="rail-spacer" />
      <div className="rail-support"><div className="support-mark"><Headphones size={17} /></div><strong>Practice at your pace</strong><p>Your original answer stays visible, even after you edit it.</p><span><Sparkles size={13} /> NOTES-GROUNDED FEEDBACK</span></div>
      <div className="profile-row"><span className="avatar">{user.name?.trim()?.[0]?.toUpperCase() || 'S'}</span><div className="profile-copy"><strong>{user.name}</strong><small>Student account</small></div><button className="icon-button" title="Sign out" aria-label="Sign out" onClick={signOut}><DoorOpen size={17} /></button></div>
    </aside>
    <main className="main-column">
      <header className="topbar"><div className="breadcrumb"><span>ORAL PRACTICE</span><b>/</b><strong>{activeLabel}</strong></div><div className="topbar-right"><span className="privacy-indicator"><span /> Private history</span><span className="topbar-avatar">{user.name?.trim()?.[0]?.toUpperCase() || 'S'}</span></div></header>
      <div className="mobile-nav" aria-label="Main navigation">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'mobile-nav-item active' : 'mobile-nav-item'} onClick={() => setView(id)}><Icon size={17} /><span>{label}</span></button>)}</div>
      <div className="content-area">
        {message && <div className="global-message" role="alert"><span>{message}</span><button onClick={() => setMessage('')} aria-label="Dismiss message">×</button></div>}
        {view === 'dashboard' && material && <Dashboard materials={materials} material={material} onMaterialChange={setMaterial} attempts={attempts} onStart={startPractice} onNavigate={setView} loading={busy} />}
        {view === 'dashboard' && !material && <div className="empty-note">Loading sample materials…</div>}
        {view === 'language' && <LanguageCoach />}
        {view === 'progress' && <ProgressPage attempts={attempts} onRetry={retryAttempt} onDelete={deleteAttempt} />}
        {view === 'session' && questions.length > 0 && <PracticeSession key={questions[0].id} material={material} questions={questions} difficulty={difficulty} mode={mode} onExit={() => { setView('dashboard'); refreshAttempts(); }} onAttemptSaved={refreshAttempts} />}
      </div>
      <footer className="app-footer"><span>LECTURELOOP ORAL PRACTICE</span><span>Independent from the LectureLoop learning app</span></footer>
    </main>
  </div>;
}