import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);

    try {
      await register(name, email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand */}
        <div className="inline-flex items-center gap-space-xs justify-center mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-on-primary shadow-sm">
            <span className="material-symbols-outlined text-[24px]">all_inclusive</span>
          </div>
          <span className="text-2xl font-bold tracking-tight text-on-surface">Lecture</span>
          <span className="text-2xl font-bold tracking-tight text-primary-container">Loop</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-on-surface">
          Create your Student Account
        </h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Start turning video lectures into active checkpoint study sessions.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-surface-container-lowest py-8 px-6 shadow-sm border border-outline-variant/30 rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-error-container/40 border border-error/30 text-error text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1" htmlFor="name">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Prakash Sharma"
                className="w-full h-11 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface text-sm focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
                className="w-full h-11 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface text-sm focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full h-11 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface text-sm focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 mt-2 flex items-center justify-center rounded-xl bg-primary-container text-on-primary font-medium text-sm hover:bg-primary transition-all shadow-md active:translate-y-px disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin text-lg">⏳</span> Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-on-surface-variant">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-container font-semibold hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
