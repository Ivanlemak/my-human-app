const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// ГОЛОВНА СТОРІНКА (HTML)
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Human App</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background-color: #0f172a; color: white; }
        .nav-btn { color: #94a3b8; transition: 0.3s; }
        .nav-btn.active { color: #3b82f6; font-weight: bold; }
    </style>
</head>
<body class="min-h-screen flex flex-col">

    <div id="auth-screen" class="flex-grow flex flex-col justify-center p-6">
        <h1 class="text-4xl font-black text-blue-500 text-center mb-10">HUMAN</h1>
        <div class="space-y-4 max-w-sm mx-auto w-full">
            <input type="email" id="email" placeholder="Email" class="w-full p-4 rounded-xl bg-slate-800 border border-slate-700 outline-none">
            <input type="password" id="password" placeholder="Пароль" class="w-full p-4 rounded-xl bg-slate-800 border border-slate-700 outline-none">
            <button onclick="handleLogin()" id="login-btn" class="w-full bg-blue-600 p-4 rounded-xl font-bold">Увійти</button>
            <p id="error" class="text-red-500 text-center text-sm hidden"></p>
        </div>
    </div>

    <div id="main-screen" class="hidden flex flex-col h-screen">
        <div class="p-6">
            <h2 id="user-name" class="text-2xl font-bold">Привіт!</h2>
            <p id="page-title" class="text-slate-400">Оцінки</p>
        </div>

        <div id="content" class="flex-grow p-6 overflow-y-auto space-y-4">
            <p class="text-center text-slate-500">Завантаження...</p>
        </div>

        <div class="p-4 bg-slate-900 border-t border-slate-800 flex justify-around">
            <button onclick="changeTab('grades')" class="nav-btn active">📊 Оцінки</button>
            <button onclick="changeTab('schedule')" class="nav-btn">📅 Розклад</button>
            <button onclick="changeTab('homework')" class="nav-btn">📝 Домашка</button>
        </div>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();
        let token = '';
        let uid = '';

        async function handleLogin() {
            const e = document.getElementById('email').value;
            const p = document.getElementById('password').value;
            const btn = document.getElementById('login-btn');
            const err = document.getElementById('error');

            btn.disabled = true;
            btn.innerText = 'Входимо...';

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email: e, password: p })
                });
                const data = await res.json();

                if (data.success) {
                    token = data.token;
                    uid = data.user.id;
                    document.getElementById('auth-screen').style.display = 'none';
                    document.getElementById('main-screen').style.display = 'flex';
                    document.getElementById('user-name').innerText = 'Привіт, ' + data.user.first_name;
                    changeTab('grades');
                } else {
                    err.innerText = data.error;
                    err.classList.remove('hidden');
                    btn.disabled = false;
                    btn.innerText = 'Увійти';
                }
            } catch(ex) { alert('Помилка сервера'); }
        }

        async function changeTab(type) {
            const cont = document.getElementById('content');
            const tit = document.getElementById('page-title');
            tit.innerText = type === 'grades' ? 'Оцінки' : (type === 'schedule' ? 'Розклад' : 'Домашка');
            cont.innerHTML = 'Завантаження...';

            if (type === 'grades') {
                try {
                    const r = await fetch('/api/stats', { headers: { 'auth': token, 'uid': uid } });
                    const stats = await r.json();
                    cont.innerHTML = stats.map(s => '<div class="p-4 bg-slate-800 rounded-xl border border-slate-700 flex justify-between"><span>'+s.level+' рівень</span><span class="text-blue-400 font-bold">'+s.count+'</span></div>').join('');
                } catch(e) { cont.innerHTML = 'Помилка завантаження'; }
            } else {
                cont.innerHTML = '<div class="text-center text-slate-500 mt-10">Цей розділ скоро запрацює!</div>';
            }
        }
    </script>
</body>
</html>
    `);
});

// API ДЛЯ ВХОДУ
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const response = await axios.post('https://api.human.ua/v1/auth', { email, password });
        res.json({ success: true, token: response.data.token, user: response.data.user });
    } catch (e) {
        res.status(401).json({ success: false, error: 'Помилка входу' });
    }
});

// API ДЛЯ ОЦІНОК
app.get('/api/stats', async (req, res) => {
    try {
        const { auth, uid } = req.headers;
        const response = await axios.get('https://api.human.ua/v1/student/' + uid + '/performance/average', {
            headers: { 'Authorization': 'Bearer ' + auth }
        });
        res.json(response.data);
    } catch (e) {
        res.json([]);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server is running'));
