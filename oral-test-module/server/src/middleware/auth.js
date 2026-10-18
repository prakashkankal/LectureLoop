import jwt from 'jsonwebtoken';

export function requireAuth(request, response, next) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) {
    const guestId = request.headers['x-practice-guest'];
    if (typeof guestId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(guestId)) {
      request.user = { id: `guest:${guestId}`, name: 'Guest learner' };
      return next();
    }
    return response.status(401).json({ error: 'A valid local practice session is required.' });
  }
  try {
    request.user = jwt.verify(token, process.env.JWT_SECRET || 'local-oral-test-development-secret');
    return next();
  } catch {
    return response.status(401).json({ error: 'Your session expired. Please sign in again.' });
  }
}