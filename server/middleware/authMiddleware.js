/**
 * Authentication Middleware
 * Protects routes with session-based authentication
 */

/**
 * Get session timeout from environment variable (in minutes)
 * Default: 480 minutes (8 hours)
 */
function getSessionTimeout() {
  const timeoutMinutes = parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 480;
  return timeoutMinutes * 60 * 1000; // Convert to milliseconds
}

/**
 * Check if user is authenticated
 */
function isAuthenticated(req, res, next) {
  console.log('[Auth] Checking authentication for:', req.path, 'Session:', req.session?.authenticated);

  if (req.session && req.session.authenticated) {
    // Update last activity timestamp for auto-logout
    req.session.lastActivity = Date.now();
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

/**
 * Auto-logout middleware - checks for session inactivity
 * Timeout configured via SESSION_TIMEOUT_MINUTES env var (default: 480 minutes / 8 hours)
 */
function checkSessionTimeout(req, res, next) {
  const TIMEOUT_MS = getSessionTimeout();

  if (req.session && req.session.authenticated && req.session.lastActivity) {
    const now = Date.now();
    const inactiveTime = now - req.session.lastActivity;

    if (inactiveTime > TIMEOUT_MS) {
      console.log('[Auth] Session timeout - auto logout');
      return req.session.destroy((err) => {
        if (err) {
          console.error('[Auth] Error destroying session:', err);
        }
        res.clearCookie('connect.sid');

        // For API requests, return 401
        if (req.path.startsWith('/api/')) {
          return res.status(401).json({ error: 'Session expired' });
        }

        // For page requests, redirect to login
        return res.redirect('/login?expired=true');
      });
    }
  }

  next();
}

/**
 * Check if user has admin role
 */
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.authenticated) {
    console.log('[Auth] Not authenticated - cannot check admin role');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.session.user && req.session.user.role === 'admin') {
    console.log('[Auth] Admin access granted for:', req.session.user.username);
    return next();
  }

  console.log('[Auth] Admin access denied - insufficient permissions');
  res.status(403).json({ error: 'Admin access required' });
}

/**
 * Check if user has editor or admin role (can configure notifications/licenses)
 */
function requireEditor(req, res, next) {
  if (!req.session || !req.session.authenticated) {
    console.log('[Auth] Not authenticated - cannot check editor role');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const role = req.session.user?.role;
  if (role === 'admin' || role === 'editor') {
    console.log(`[Auth] Editor/Admin access granted for: ${req.session.user.username} (${role})`);
    return next();
  }

  console.log('[Auth] Editor access denied - insufficient permissions (role:', role, ')');
  res.status(403).json({ error: 'Editor or Admin access required' });
}

module.exports = {
  isAuthenticated,
  redirectIfAuthenticated,
  checkSessionTimeout,
  requireAdmin,
  requireEditor,
  getSessionTimeout
};
