/**
 * Authentication Middleware
 * Protects routes with session-based authentication
 */

/**
 * Check if user is authenticated
 */
function isAuthenticated(req, res, next) {
  console.log('[Auth] Checking authentication for:', req.path, 'Session:', req.session?.authenticated);

  if (req.session && req.session.authenticated) {
    return next();
  }

  // For API routes, return 401
  if (req.path.startsWith('/api/')) {
    console.log('[Auth] API route - returning 401');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // For page routes, redirect to login
  console.log('[Auth] Not authenticated - redirecting to /login');
  res.redirect('/login');
}

/**
 * Redirect to dashboard if already authenticated
 */
function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.authenticated) {
    return res.redirect('/');
  }
  next();
}

module.exports = {
  isAuthenticated,
  redirectIfAuthenticated
};
