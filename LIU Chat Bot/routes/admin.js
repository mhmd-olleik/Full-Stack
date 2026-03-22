// ============================================
// ADMIN ROUTES - Analytics + CRUD (MongoDB)
// ============================================
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware, adminOnly } = require('../middleware/auth');

function adminRoutes(db) {
    const router = express.Router();
    router.use(authMiddleware);
    router.use(adminOnly);

    const questionsLog = db.collection('questions_log');
    const users = db.collection('users');
    const knowledgeBase = db.collection('knowledge_base');

    router.get('/analytics', async (req, res) => {
        try {
            const totalQuestions = await questionsLog.countDocuments({});
            const totalUsers = await users.countDocuments({});
            const kbCount = await knowledgeBase.countDocuments({});

            // Average confidence
            const avgPipeline = await questionsLog.aggregate([
                { $group: { _id: null, avg: { $avg: '$confidence_score' } } }
            ]).toArray();
            const avgConfidence = avgPipeline.length > 0 ? Math.round(avgPipeline[0].avg) : 0;

            // Top intents
            const topIntents = await questionsLog.aggregate([
                { $group: { _id: '$detected_intent', count: { $sum: 1 } } },
                { $sort: { count: -1 } }, { $limit: 10 },
                { $project: { detected_intent: '$_id', count: 1, _id: 0 } }
            ]).toArray();

            // Top questions
            const topQuestions = await questionsLog.aggregate([
                { $group: { _id: '$question', count: { $sum: 1 } } },
                { $sort: { count: -1 } }, { $limit: 10 },
                { $project: { question: '$_id', count: 1, _id: 0 } }
            ]).toArray();

            // Low confidence
            const lowConfidence = await questionsLog.find({ confidence_score: { $lt: 70 } })
                .sort({ created_at: -1 }).limit(20).toArray();

            // Daily stats
            const dailyStats = await questionsLog.aggregate([
                { $group: { _id: { $substr: ['$created_at', 0, 10] }, count: { $sum: 1 } } },
                { $sort: { _id: -1 } }, { $limit: 30 },
                { $project: { date: '$_id', count: 1, _id: 0 } }
            ]).toArray();

            // Source stats (gemini vs fallback)
            const sourceStats = await questionsLog.aggregate([
                { $group: { _id: '$source', count: { $sum: 1 } } },
                { $project: { source: '$_id', count: 1, _id: 0 } }
            ]).toArray();

            res.json({
                overview: { totalQuestions, totalUsers, avgConfidence, kbCount },
                topIntents, topQuestions, lowConfidence, dailyStats, sourceStats
            });
        } catch (e) {
            console.error('Analytics error:', e);
            res.status(500).json({ error: 'Failed to load analytics.' });
        }
    });

    router.get('/questions', async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        const questions = await questionsLog.find({}).sort({ created_at: -1 }).skip(skip).limit(limit).toArray();
        const total = await questionsLog.countDocuments({});
        res.json({ questions, total, page, pages: Math.ceil(total / limit) });
    });

    router.get('/users', async (req, res) => {
        const allUsers = await users.find({}).sort({ created_at: -1 }).toArray();
        res.json({
            users: allUsers.map(u => ({
                id: u._id, full_name: u.full_name, email: u.email,
                role: u.role, created_at: u.created_at
            }))
        });
    });

    router.get('/knowledge', async (req, res) => {
        const entries = await knowledgeBase.find({}).sort({ updated_at: -1 }).toArray();
        res.json({ entries });
    });

    router.post('/knowledge', async (req, res) => {
        const { title, title_ar, content, content_ar, category, source } = req.body;
        if (!title || !content) return res.status(400).json({ error: 'Title and content required.' });
        const id = uuidv4();
        await knowledgeBase.insertOne({
            _id: id, title, title_ar: title_ar || '', content, content_ar: content_ar || '',
            category: category || '', source: source || '', updated_at: new Date().toISOString()
        });
        res.status(201).json({ id, message: 'Entry added.' });
    });

    router.put('/knowledge/:id', async (req, res) => {
        const { title, title_ar, content, content_ar, category, source } = req.body;
        await knowledgeBase.updateOne({ _id: req.params.id }, { $set: { title, title_ar, content, content_ar, category, source, updated_at: new Date().toISOString() } });
        res.json({ message: 'Updated.' });
    });

    router.delete('/knowledge/:id', async (req, res) => {
        await knowledgeBase.deleteOne({ _id: req.params.id });
        res.json({ message: 'Deleted.' });
    });

    return router;
}

module.exports = adminRoutes;
