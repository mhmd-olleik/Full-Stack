// ============================================
// AUTH ROUTES - Register / Login / Me (MongoDB)
// ============================================
const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware, generateToken } = require('../middleware/auth');

function authRoutes(db) {
    const router = express.Router();
    const users = db.collection('users');

    router.post('/register', async (req, res) => {
        try {
            const { full_name, email, password } = req.body;
            if (!full_name || !email || !password) return res.status(400).json({ error: 'Full name, email, and password are required.' });
            if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

            const existing = await users.findOne({ email });
            if (existing) return res.status(409).json({ error: 'Email already registered.' });

            const id = uuidv4();
            const hash = bcrypt.hashSync(password, 10);
            await users.insertOne({
                _id: id, full_name, email, password_hash: hash,
                role: 'student', created_at: new Date().toISOString()
            });

            const token = generateToken({ id, email, role: 'student' });
            res.status(201).json({ token, user: { id, full_name, email, role: 'student' } });
        } catch (e) {
            console.error('Register error:', e);
            res.status(500).json({ error: 'Registration failed.' });
        }
    });

    router.post('/login', async (req, res) => {
        try {
            const { email, password } = req.body;
            if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

            const user = await users.findOne({ email });
            if (!user || !bcrypt.compareSync(password, user.password_hash))
                return res.status(401).json({ error: 'Invalid email or password.' });

            const token = generateToken({ id: user._id, email: user.email, role: user.role });
            res.json({ token, user: { id: user._id, full_name: user.full_name, email: user.email, role: user.role } });
        } catch (e) {
            console.error('Login error:', e);
            res.status(500).json({ error: 'Login failed.' });
        }
    });

    router.get('/me', authMiddleware, async (req, res) => {
        try {
            const user = await users.findOne({ _id: req.user.id });
            if (!user) return res.status(404).json({ error: 'User not found.' });
            res.json({ user: { id: user._id, full_name: user.full_name, email: user.email, role: user.role, created_at: user.created_at } });
        } catch (e) { res.status(500).json({ error: 'Failed to fetch user.' }); }
    });

    return router;
}

module.exports = authRoutes;
