// ============================================
// JWT AUTH MIDDLEWARE
// ============================================
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'liu_bot_secret_key_2026';

function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    try {
        const token = header.split(' ')[1];
        req.user = jwt.verify(token, SECRET);
        next();
    } catch (e) {
        res.status(401).json({ error: 'Invalid or expired token.' });
    }
}

function adminOnly(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
}

function generateToken(user) {
    return jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET, { expiresIn: '24h' });
}

module.exports = { authMiddleware, adminOnly, generateToken, SECRET };
