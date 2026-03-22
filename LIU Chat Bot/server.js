// ============================================
// LIU CHATBOT – EXPRESS SERVER v3.0
// Groq AI + MongoDB + JWT Auth
// ============================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { initDB, closeDB } = require('./database/init');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security Middleware ──
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ── Rate Limiting ──
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// ── Static Files ──
app.use(express.static(path.join(__dirname), {
    index: 'index.html',
    extensions: ['html', 'css', 'js']
}));

async function startServer() {
    const db = await initDB();

    // ── API Routes ──
    app.use('/api/auth', authRoutes(db));
    app.use('/api/chat', chatRoutes(db));
    app.use('/api/admin', adminRoutes(db));

    // ── Health Check ──
    app.get('/api/health', async (req, res) => {
        const totalQ = await db.collection('questions_log').countDocuments({});
        const totalU = await db.collection('users').countDocuments({});
        const kbCount = await db.collection('knowledge_base').countDocuments({});
        res.json({
            status: 'online', version: '3.0', ai: 'Groq Llama 3.3 70B',
            database: 'MongoDB Atlas', uptime: Math.floor(process.uptime()),
            totalQuestions: totalQ, totalUsers: totalU, knowledgeEntries: kbCount,
            timestamp: new Date().toISOString()
        });
    });

    // ── Admin page ──
    app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

    app.listen(PORT, () => {
        console.log(`
╔═══════════════════════════════════════════════════╗
║   🎓 LIU CHATBOT SERVER v3.0                     ║
║   🤖 AI Engine: Groq Llama 3.3 70B                ║
║   🍃 Database: MongoDB Atlas                      ║
║   🔐 Auth: JWT + Role-Based Access                ║
║   🌐 http://localhost:${PORT}                        ║
║   📊 Admin: http://localhost:${PORT}/admin.html       ║
║   🔑 Default: admin@liu.edu.lb / admin123          ║
╚═══════════════════════════════════════════════════╝
    `);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => { await closeDB(); process.exit(0); });
    process.on('SIGTERM', async () => { await closeDB(); process.exit(0); });
}

startServer().catch(err => { console.error('❌ Server failed:', err); process.exit(1); });
