// ============================================
// LIU CHATBOT – FRONTEND AUTH + API INTEGRATION
// Handles login/register, JWT token, and Gemini API calls
// ============================================

const API_BASE = window.location.origin + '/api';
let AUTH_TOKEN = localStorage.getItem('liu_token') || '';
let CURRENT_USER = null;

// ── AUTH: Check token on page load ──
(async function initAuth() {
    if (AUTH_TOKEN) {
        try {
            const res = await fetch(API_BASE + '/auth/me', {
                headers: { 'Authorization': 'Bearer ' + AUTH_TOKEN }
            });
            if (res.ok) {
                const data = await res.json();
                CURRENT_USER = data.user;
                showApp();
            } else {
                clearAuth();
            }
        } catch (e) {
            clearAuth();
        }
    }
})();

function showApp() {
    document.getElementById('authOverlay').classList.add('hidden');
    document.getElementById('userPanel').style.display = 'flex';
    document.getElementById('userName').textContent = CURRENT_USER.full_name;
    document.getElementById('userEmail').textContent = CURRENT_USER.email;
    document.getElementById('userAvatar').textContent = CURRENT_USER.full_name.charAt(0).toUpperCase();
}

function clearAuth() {
    AUTH_TOKEN = '';
    CURRENT_USER = null;
    localStorage.removeItem('liu_token');
}

function showAuthError(msg) {
    const el = document.getElementById('authError');
    el.textContent = msg;
    el.classList.add('show');
}

function hideAuthError() {
    document.getElementById('authError').classList.remove('show');
}

function toggleAuthForm(e) {
    e.preventDefault();
    hideAuthError();
    const login = document.getElementById('loginForm');
    const reg = document.getElementById('registerForm');
    if (login.style.display === 'none') {
        login.style.display = 'block';
        reg.style.display = 'none';
    } else {
        login.style.display = 'none';
        reg.style.display = 'block';
    }
}

async function handleLogin() {
    hideAuthError();
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    if (!email || !password) return showAuthError('Please enter email and password.');

    try {
        document.getElementById('loginBtn').textContent = 'Signing in...';
        const res = await fetch(API_BASE + '/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) { showAuthError(data.error); document.getElementById('loginBtn').textContent = 'Sign In'; return; }

        AUTH_TOKEN = data.token;
        CURRENT_USER = data.user;
        localStorage.setItem('liu_token', AUTH_TOKEN);
        showApp();
    } catch (e) {
        showAuthError('Connection failed. Is the server running?');
        document.getElementById('loginBtn').textContent = 'Sign In';
    }
}

async function handleRegister() {
    hideAuthError();
    const full_name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    if (!full_name || !email || !password) return showAuthError('All fields are required.');
    if (password.length < 6) return showAuthError('Password must be at least 6 characters.');

    try {
        document.getElementById('regBtn').textContent = 'Creating...';
        const res = await fetch(API_BASE + '/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name, email, password })
        });
        const data = await res.json();
        if (!res.ok) { showAuthError(data.error); document.getElementById('regBtn').textContent = 'Create Account'; return; }

        AUTH_TOKEN = data.token;
        CURRENT_USER = data.user;
        localStorage.setItem('liu_token', AUTH_TOKEN);
        showApp();
    } catch (e) {
        showAuthError('Connection failed. Is the server running?');
        document.getElementById('regBtn').textContent = 'Create Account';
    }
}

function handleLogout() {
    clearAuth();
    location.reload();
}

// ── API: Send question to Gemini backend ──
async function askAPI(question, language) {
    try {
        const res = await fetch(API_BASE + '/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + AUTH_TOKEN
            },
            body: JSON.stringify({ question, language })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'API error');
        return data;
    } catch (e) {
        console.error('API error:', e);
        return null;
    }
}

// Expose to app.js
window.askAPI = askAPI;
window.AUTH_TOKEN = AUTH_TOKEN;
window.CURRENT_USER = CURRENT_USER;
