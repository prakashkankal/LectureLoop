import { useState } from 'react';
import { ArrowRight, BookOpen, LockKeyhole, Mail, Mic2, UserRound } from 'lucide-react';
import { api, saveSession } from '../services/api.js';

export default function AuthScreen({ onAuthenticated }) {
  const [isRegister, setIsRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const session = await api(`/auth/${isRegister ? 'register' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      saveSession(session);
      onAuthenticated(session.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-art" aria-label="Oral practice">
        <div className="auth-brand"><span className="brand-mark"><BookOpen size={19} /></span> LectureLoop</div>
        <div className="auth-art-copy">
          <p className="eyebrow">ORAL PRACTICE STUDIO</p>
          <h1>Know it.<br />Say it clearly.</h1>
          <p>Turn your lecture notes into a calmer, more thoughtful speaking practice.</p>
        </div>
        <div className="auth-art-note"><Mic2 size={17} /> Your voice stays yours. Recordings are not saved.</div>
      </section>
      <section className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit}>
          <p className="eyebrow">YOUR PRIVATE PRACTICE SPACE</p>
          <h2>{isRegister ? 'Create your account' : 'Welcome back'}</h2>
          <p className="muted">Your practice history is private to this account.</p>
          {isRegister && <label className="field-label">Name<span className="input-wrap"><UserRound size={17} /><input name="name" autoComplete="name" required maxLength="80" /></span></label>}
          <label className="field-label">Email<span className="input-wrap"><Mail size={17} /><input name="email" type="email" autoComplete="email" required maxLength="200" /></span></label>
          <label className="field-label">Password<span className="input-wrap"><LockKeyhole size={17} /><input name="password" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength="8" maxLength="128" /></span><small>At least 8 characters</small></label>
          {error && <p className="error-message" role="alert">{error}</p>}
          <button className="button button-primary button-wide" disabled={busy}>{busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'} <ArrowRight size={17} /></button>
          <p className="auth-switch">{isRegister ? 'Already have an account?' : 'New to oral practice?'} <button type="button" onClick={() => { setIsRegister(!isRegister); setError(''); }}>{isRegister ? 'Sign in' : 'Create account'}</button></p>
        </form>
      </section>
    </main>
  );
}