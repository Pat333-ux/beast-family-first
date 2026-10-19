const jwt = require('jsonwebtoken');

function authenticateToken(secret = process.env.JWT_SECRET) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 bytes');
  }

  return (req, res, next) => {
    const authorization = req.get('authorization') || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      req.user = jwt.verify(match[1], secret, { algorithms: ['HS256'] });
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    return next();
  };
}

module.exports = { authenticateToken, authorizeRoles };
