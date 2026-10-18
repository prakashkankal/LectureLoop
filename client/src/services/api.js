// Use Vite's /api proxy in development and same-origin API routing in production.
// Set VITE_API_BASE_URL only when the API is hosted on a separate origin.
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

/**
 * Auth-aware fetch wrapper.
 * Reads token from localStorage and injects Authorization header automatically.
 *
 * Usage:
 *   const data = await apiFetch('/lectures/analyze', { method: 'POST', body: { youtubeUrl } });
 */
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('lectureloop_token');

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const body = options.body && typeof options.body === 'object'
    ? JSON.stringify(options.body)
    : options.body;

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    body,
  });

  const contentType = response.headers.get('content-type') || '';
  const responseText = await response.text();
  let data;
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    const returnedHtml = contentType.includes('text/html') || /^\s*<!doctype\s+html|^\s*<html/i.test(responseText);
    const error = new Error(returnedHtml
      ? `The API request ${path} returned an HTML page instead of JSON. Check that the backend is running and VITE_API_BASE_URL points to the API server.`
      : `The API request ${path} returned an invalid response (HTTP ${response.status}).`);
    error.status = response.status;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(data.error || `Request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return data;
}

// ─── Lecture API helpers ──────────────────────────────────────────────────────

/**
 * POST /api/lectures/analyze
 * Starts async AI analysis. Returns { _id, analysisStatus: 'processing' }
 */
export async function startLectureAnalysis({ youtubeUrl, title = 'Lecture', subject = 'General' }) {
  const res = await apiFetch('/lectures/analyze', {
    method: 'POST',
    body: { youtubeUrl, title, subject },
  });
  return res.data; // { _id, analysisStatus }
}

/**
 * GET /api/lectures/:id/status
 * Poll this until analysisStatus === 'complete' or 'failed'
 */
export async function fetchLectureStatus(lectureId) {
  const res = await apiFetch(`/lectures/${lectureId}/status`);
  return res.data; // { _id, analysisStatus, topics, quizzes, ... }
}

/**
 * GET /api/lectures/:id
 * Fetch full lecture data for the session page
 */
export async function fetchLecture(lectureId) {
  const res = await apiFetch(`/lectures/${lectureId}`);
  return res.data;
}

/** Fetch all lectures belonging to the logged-in user. */
export async function fetchUserLectures() {
  const res = await apiFetch('/lectures');
  return res.data || [];
}

/** Fetch dashboard metrics and recent user activity. */
export async function fetchDashboardStats() {
  const res = await apiFetch('/dashboard/stats');
  if (!res.success || !res.data) {
    throw new Error(res.error || 'Could not load dashboard data.');
  }
  return res.data;
}

export async function searchLearningMaterials(query) {
  const res = await apiFetch(`/lectures/search?q=${encodeURIComponent(query)}`);
  return res.data || [];
}

/** Persist a completed topic checkpoint for a lecture. */
export async function markLectureTopicComplete(lectureId, topicIndex) {
  const res = await apiFetch(`/lectures/${lectureId}/topics/${topicIndex}/complete`, {
    method: 'PATCH',
  });
  return res.data;
}

/** Persist a topic review flag after a learner needs remediation. */
export async function flagLectureTopicForReview(lectureId, topicIndex) {
  const res = await apiFetch(`/lectures/${lectureId}/topics/${topicIndex}/review`, {
    method: 'PATCH',
  });
  return res.data;
}

export async function fetchLectureSession(lectureId) {
  const res = await apiFetch(`/lectures/${lectureId}/session`);
  return res.data;
}

export async function saveLectureSession(lectureId, session) {
  const res = await apiFetch(`/lectures/${lectureId}/session`, { method: 'PATCH', body: session });
  return res.data;
}

export async function saveLectureNote(lectureId, note) {
  const res = await apiFetch(`/lectures/${lectureId}/notes`, { method: 'PUT', body: note });
  return res.data;
}

export async function createLectureBookmark(lectureId, bookmark) {
  const res = await apiFetch(`/lectures/${lectureId}/bookmarks`, { method: 'POST', body: bookmark });
  return res.data;
}

export async function submitLectureQuizAttempt(lectureId, attempt) {
  const res = await apiFetch(`/lectures/${lectureId}/quiz-attempts`, { method: 'POST', body: attempt });
  return res.data;
}

/** Delete one lecture owned by the logged-in user. */
export async function deleteLecture(lectureId) {
  const res = await apiFetch(`/lectures/${lectureId}`, { method: 'DELETE' });
  return res.data;
}

// ─── AI Handwritten Infographic Notes Helpers ─────────────────────────────────

/**
 * GET /api/lectures/:lectureId/notes
 * Fetch all topic-wise notes for the lecture.
 */
export async function fetchLectureTopicNotes(lectureId) {
  const res = await apiFetch(`/lectures/${lectureId}/notes`);
  return res.data;
}

/**
 * POST /api/lectures/:lectureId/topics/:topicId/notes/generate
 * Generate or retrieve notes for a single topic.
 */
export async function generateTopicNote(lectureId, topicId, options = {}) {
  const res = await apiFetch(`/lectures/${lectureId}/topics/${topicId}/notes/generate`, {
    method: 'POST',
    body: options,
  });
  return res.data;
}

/**
 * POST /api/lectures/:lectureId/topics/:topicId/notes/regenerate
 * Force regeneration of notes for a single topic while preserving previous version on failure.
 */
export async function regenerateTopicNote(lectureId, topicId) {
  const res = await apiFetch(`/lectures/${lectureId}/topics/${topicId}/notes/regenerate`, {
    method: 'POST',
  });
  return res.data;
}

/**
 * POST /api/lectures/:lectureId/notes/generate-all
 * Queue bulk generation of notes for all ungenerated topics in the lecture.
 */
export async function generateAllTopicNotes(lectureId) {
  const res = await apiFetch(`/lectures/${lectureId}/notes/generate-all`, {
    method: 'POST',
  });
  return res.data;
}

/**
 * GET /api/lectures/:lectureId/notes/generation-status
 * Poll bulk generation progress and topic statuses.
 */
export async function fetchNotesGenerationStatus(lectureId) {
  const res = await apiFetch(`/lectures/${lectureId}/notes/generation-status`);
  return res.data;
}

/**
 * Authenticated download helper for images and ZIP archives.
 * Streams blob with auth header, preserving suggested filename.
 */
export async function downloadAuthenticatedFile(path, defaultFilename = 'download') {
  const token = localStorage.getItem('lectureloop_token');
  const fullUrl = `${BASE_URL}${path}`;

  const response = await fetch(fullUrl, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    let errorMsg = `Download failed (HTTP ${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson?.error) errorMsg = errJson.error;
    } catch {}
    throw new Error(errorMsg);
  }

  // Extract filename from Content-Disposition header if available
  const disposition = response.headers.get('content-disposition');
  let filename = defaultFilename;
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (match && match[1]) {
      filename = match[1].replace(/['"]/g, '').trim();
    }
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(blobUrl);
}
