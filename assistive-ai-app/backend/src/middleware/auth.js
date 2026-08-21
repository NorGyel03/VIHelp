const { verifyToken } = require('../services/authService');
const sessionModel = require('../models/sessionModel');

const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = header.slice(7);

  try {
    const payload = verifyToken(token);

    const session = await sessionModel.findByToken(token);
    if (!session) {
      return res.status(401).json({ error: 'Session expired or revoked' });
    }

    req.userId = payload.userId;
    req.token = token;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { authenticate };
