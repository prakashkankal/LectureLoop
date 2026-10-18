import jwt from 'jsonwebtoken';

export function requireAuth(request, response, next) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return response.status(401).json({ error: 'Sign in to continue.' });
  try {
    request.user = jwt.verify(token, process.env.JWT_SECRET || 'local-oral-test-development-secret');
    return next();
  } catch {
    return response.status(401).json({ error: 'Your session expired. Please sign in again.' });
  }
}