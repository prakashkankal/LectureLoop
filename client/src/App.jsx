import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardOverview from './pages/DashboardOverview';
import Login from './pages/Login';
import Register from './pages/Register';
import InteractiveLearningHub from './pages/InteractiveLearningHub';
import LearningSessionPage from './pages/LearningSessionPage';
import SessionResultsPage from './pages/SessionResultsPage';
import SubjectsPage from './pages/SubjectsPage';
import SubjectFolderPage from './pages/SubjectFolderPage';
import LearningAnalysisHub from './pages/LearningAnalysisHub';
import NotesPage from './pages/NotesPage';
import OralPracticePage from './pages/OralPracticePage';
import PadhaiAIPage from './pages/PadhaiAIPage';
import MyPadhaiLecturesPage from './pages/MyPadhaiLecturesPage';
import TeacherWorkspace from './pages/TeacherWorkspace';
import { useAuth } from './context/AuthContext';

function RoleWorkspace({ children }) {
  const { user } = useAuth();
  if (user?.role === 'teacher') return <TeacherWorkspace />;
  return children;
}

function TeacherRoute() {
  const { user } = useAuth();
  return user?.role === 'teacher' ? <TeacherWorkspace /> : <Navigate to="/dashboard" replace />;
}

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
                <RoleWorkspace><AppShell /></RoleWorkspace>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardOverview />} />
            <Route path="teacher" element={<TeacherRoute />} />
            <Route path="interactive" element={<InteractiveLearningHub />} />
            <Route path="interactive/:lectureId" element={<LearningSessionPage />} />
            <Route path="interactive/analysis" element={<LearningAnalysisHub />} />
            <Route path="interactive/session" element={<LearningSessionPage />} />
            <Route path="lectures" element={<Navigate to="/my-lectures" replace />} />
            <Route path="my-lectures" element={<MyPadhaiLecturesPage />} />
            <Route path="my-lectures/:lectureId" element={<MyPadhaiLecturesPage />} />
            <Route path="padhai-ai" element={<PadhaiAIPage />} />
            <Route path="padhai-ai/material/:materialId" element={<PadhaiAIPage />} />
            <Route path="session-results" element={<SessionResultsPage />} />
            <Route path="oral-practice" element={<Navigate to="/oral-test" replace />} />
            <Route path="oral-test" element={<OralPracticePage />} />
            <Route path="oral-test/:testId" element={<OralPracticePage />} />
            <Route path="subjects" element={<SubjectsPage />} />
            <Route path="my-subjects" element={<SubjectsPage />} />
            <Route path="subjects/:subjectKey" element={<SubjectFolderPage />} />
            <Route path="my-subjects/:subjectId" element={<SubjectFolderPage />} />
            <Route path="notes" element={<NotesPage />} />
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
            <Route path="help" element={<PlaceholderPage title="Help & Support" icon="help" description="Find guidance for managing lectures, notes, and interactive learning sessions." />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
