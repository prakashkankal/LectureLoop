import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center animate-pulse mb-3">
          <span className="material-symbols-outlined text-[22px]">all_inclusive</span>
        </div>
        <p className="text-sm text-on-surface-variant font-medium">Loading LectureLoop...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
