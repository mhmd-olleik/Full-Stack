// ============================================
// CHAT ROUTES - Gemini AI + KB RAG (MongoDB)
// ============================================
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { askGemini } = require('../services/gemini');
const { authMiddleware } = require('../middleware/auth');

function chatRoutes(db) {
    const router = express.Router();
    const questionsLog = db.collection('questions_log');
    const knowledgeBase = db.collection('knowledge_base');

    // Main chat endpoint - requires auth
    router.post('/', authMiddleware, async (req, res) => {
        try {
            const { question, language } = req.body;
            if (!question || !question.trim()) return res.status(400).json({ error: 'Question is required.' });

            const lang = language || 'en';
            const userId = req.user.id;

            // ── RAG: Fetch all knowledge base for full context ──
            const allKB = await knowledgeBase.find({}).toArray();

            // Score entries for relevance (used for confidence calculation)
            const q = question.toLowerCase();
            const scored = allKB.map(entry => {
                let score = 0;
                const words = q.split(/\s+/);
                for (const w of words) {
                    if (w.length < 2) continue;
                    if (entry.content && entry.content.toLowerCase().includes(w)) score += 2;
                    if (entry.title && entry.title.toLowerCase().includes(w)) score += 3;
                    if (entry.content_ar && entry.content_ar.includes(w)) score += 2;
                    if (entry.title_ar && entry.title_ar.includes(w)) score += 3;
                    if (entry.category && q.includes(entry.category)) score += 5;
                }
                return { ...entry, score };
            }).sort((a, b) => b.score - a.score);

            // Send ALL KB to AI so it has complete info, prioritized by relevance
            const contextForAI = scored;

            // ── Ask AI with full knowledge context ──
            const geminiResult = await askGemini(question, contextForAI, lang);

            let response;
            let confidence = 85;
            let intent = scored[0]?.score > 0 ? scored[0].category : 'general';

            if (geminiResult.success) {
                confidence = scored.length > 0 ? Math.min(95, 70 + scored[0].score * 3) : 75;
                response = {
                    answer: geminiResult.answer,
                    confidence,
                    intent,
                    source: 'gemini_rag',
                    context_used: scored.length
                };
            } else {
                // Fallback to local KB if Gemini fails
                if (scored.length > 0) {
                    const best = scored[0];
                    const content = lang === 'ar' ? (best.content_ar || best.content) : best.content;
                    confidence = Math.min(90, 60 + best.score * 5);
                    response = { answer: content, confidence, intent: best.category, source: 'knowledge_base' };
                } else {
                    confidence = 40;
                    response = {
                        answer: lang === 'ar'
                            ? 'عذراً، لم أجد إجابة دقيقة. يرجى التواصل مع مكتب التسجيل أو إعادة صياغة سؤالك.'
                            : 'I could not find an exact answer. Please contact the Registration Office or rephrase your question.',
                        confidence, intent: 'unknown', source: 'fallback'
                    };
                }
            }

            // ── Log the question ──
            await questionsLog.insertOne({
                _id: uuidv4(), user_id: userId, question,
                detected_intent: intent, confidence_score: confidence,
                response_snippet: response.answer.substring(0, 300),
                source: response.source, language: lang,
                created_at: new Date().toISOString()
            });

            res.json(response);
        } catch (e) {
            console.error('Chat error:', e);
            res.status(500).json({ error: 'Failed to process question.' });
        }
    });

    // Chat history
    router.get('/history', authMiddleware, async (req, res) => {
        try {
            const logs = await questionsLog.find({ user_id: req.user.id })
                .sort({ created_at: -1 }).limit(50).toArray();
            res.json({ history: logs });
        } catch (e) { res.status(500).json({ error: 'Failed to fetch history.' }); }
    });

    return router;
}

module.exports = chatRoutes;
