import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardOverview from './pages/DashboardOverview';
import Login from './pages/Login';
import Register from './pages/Register';
import InteractiveLearningHub from './pages/InteractiveLearningHub';
import MyLecturesPage from './pages/MyLecturesPage';
import LearningSessionPage from './pages/LearningSessionPage';
import SessionResultsPage from './pages/SessionResultsPage';
import SubjectsPage from './pages/SubjectsPage';
import LearningAnalysisHub from './pages/LearningAnalysisHub';

function PlaceholderPage({ title, icon, description }) {
  return (
    <div className="px-gutter py-space-xl max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center text-primary-container mb-4">
        <span className="material-symbols-outlined text-[32px]">{icon}</span>
      </div>
      <h2 className="text-2xl font-bold text-on-surface mb-2">{title}</h2>
      <p className="text-sm text-on-surface-variant max-w-md">{description}</p>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Workspace Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardOverview />} />
            <Route path="interactive" element={<InteractiveLearningHub />} />
            <Route path="interactive/analysis" element={<LearningAnalysisHub />} />
            <Route path="interactive/session" element={<LearningSessionPage />} />
            <Route path="lectures" element={<MyLecturesPage />} />
            <Route path="session-results" element={<SessionResultsPage />} />
            <Route path="subjects" element={<SubjectsPage />} />
            <Route
              path="notes"
              element={
                <PlaceholderPage
                  title="Notes & Summaries"
                  icon="description"
                  description="Topic notes and synced invariant cheat-sheets."
                />
              }
            />
            <Route
              path="revision"
              element={
                <PlaceholderPage
                  title="Spaced Revision"
                  icon="cached"
                  description="Targeted review drills for weak topics."
                />
              }
            />
            <Route
              path="settings"
              element={
                <PlaceholderPage
                  title="Preferences & Settings"
                  icon="settings"
                  description="Manage workspace preferences, notifications, and AI model settings."
                />
              }
            />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
