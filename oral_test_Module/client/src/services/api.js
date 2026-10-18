const TOKEN_KEY = 'oral-practice-token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveSession(session) {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem('oral-practice-user', JSON.stringify(session.user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('oral-practice-user');
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (getToken()) headers.set('Authorization', `Bearer ${getToken()}`);
  const response = await fetch(`/api${path}`, { ...options, headers });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'The request could not be completed.');
  return payload;
}