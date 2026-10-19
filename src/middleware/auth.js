const jwt = require('jsonwebtoken');

const ROLES = ['Citizen', 'CaseWorker', 'Supervisor', 'Administrator', 'Auditor'];

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || !process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const claims = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!ROLES.includes(claims.role)) return res.status(403).json({ error: 'Invalid role' });
    req.user = { id: claims.sub, role: claims.role };
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

const requireRole = (...allowed) => (req, res, next) =>
  allowed.includes(req.user && req.user.role)
    ? next()
    : res.status(403).json({ error: 'Insufficient permissions' });

module.exports = { authenticate, requireRole, ROLES };
