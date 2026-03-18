const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const SERVER_URL = "https://my-human-app.onrender.com"; 

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Human Mini App</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background-color: #0f172a; color: white; font-family: sans-serif; }
        .tab-btn.active { color: #3b82f6; border-bottom: 2px solid #3b82f6; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 1.5rem; padding: 1rem; margin-bottom: 0.75rem; }
        .hidden { display: none !important; }
    </style>
</head>
<body class="min-h-screen flex flex-col">

    <div id="loader" class="flex-grow flex items-center justify-center">
        <p class="animate-bounce text-blue-500 font-bold">Вхід у систему...</p>
    </div>

    <div id="auth-screen" class="hidden flex-grow flex flex-col justify-center p-6 max-w-sm mx-auto w-full">
        <h1 class="text-4xl font-black text-blue-500 text-center mb-8 uppercase tracking-tighter">Human</h1>
        <input type="email" id="email" placeholder="Email" class="w-full p-4 rounded-2xl bg-slate-800 mb-4 border border-slate-700 outline-none">
        <input type="password" id="password" placeholder="Пароль" class="w-full p-4 rounded-2xl bg-slate-800 mb-6 border border-slate-700 outline-none">
        <button onclick="login()" id="btn" class="w-full bg-blue-600 p-4 rounded-2xl font-bold active:scale-95 transition-all">Увійти</button>
        <p id="msg" class="text-center text-red-400 mt-4 hidden"></p>
    </div>

    <div id="main-screen" class="hidden flex flex-col h-screen">
        <div class="p-6 pb-2">
            <div class="flex justify-between items-start">
                <h2 id="user-hi" class="text-2xl font-bold">Привіт!</h2>
                <button onclick="logout()" class="text-slate-500 text-xs uppercase font-bold">Вийти</button>
            </div>
            <div class="flex space-x-4 mt-4 border-b border-slate-800">
                <button onclick="switchTab('grades')" id="t-grades" class="tab-btn active pb-2">Оцінки</button>
                <button onclick="switchTab('schedule')" id="t-schedule" class="tab-btn pb-2">Розклад</button>
                <button onclick="switchTab('hw')" id="t-hw" class="tab-btn pb-2">ДЗ</button>
            </div>
        </div>
        <div id="content" class="flex-grow p-6 overflow-y-auto pb-20"></div>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();
        let authData = { token: '', uid: '' };

        // ПЕРЕВІРКА ПРИ ЗАПУСКУ
        window.onload = () => {
            const savedToken = localStorage.getItem('h_token');
            const savedUid = localStorage.getItem('h_uid');
            const savedName = localStorage.getItem('h_name');

            if (savedToken && savedUid) {
                authData = { token: savedToken, uid: savedUid };
                showMainScreen(savedName);
            } else {
                document.getElementById('loader').classList.add('hidden');
                document.getElementById('auth-screen').classList.remove('hidden');
            }
        };

        async function login() {
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const btn = document.getElementById('btn');
            
            btn.disabled = true;
            btn.innerText = 'Входимо...';

            try {
                const r = await fetch('${SERVER_URL}/api/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email, password })
                });
                const d = await r.json();

                if (d.success) {
                    // ЗБЕРІГАЄМО ДАНІ
                    localStorage.setItem('h_token', d.token);
                    localStorage.setItem('h_uid', d.user.id);
                    localStorage.setItem('h_name', d.user.first_name);
                    
                    authData = { token: d.token, uid: d.user.id };
                    showMainScreen(d.user.first_name);
                } else {
                    document.getElementById('msg').innerText = "Помилка входу";
                    document.getElementById('msg').classList.remove('hidden');
                    btn.disabled = false;
                    btn.innerText = 'Увійти';
                }
            } catch(e) { alert("Помилка підключення"); btn.disabled = false; }
        }

        function showMainScreen(name) {
            document.getElementById('loader').classList.add('hidden');
            document.getElementById('auth-screen').classList.add('hidden');
            document.getElementById('main-screen').classList.remove('hidden');
            document.getElementById('user-hi').innerText = "Привіт, " + name + "!";
            switchTab('grades');
        }

        function logout() {
            localStorage.clear();
            location.reload();
        }

        async function switchTab(tab) {
            const cont = document.getElementById('content');
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('t-' + tab).classList.add('active');
            cont.innerHTML = '<p class="text-center animate-pulse mt-10">Завантаження...</p>';

            try {
                const r = await fetch('${SERVER_URL}/api/data?type=' + tab, {
                    headers: { 'auth': authData.token, 'uid': authData.uid }
                });
                const data = await r.json();
                
                if (!data || data.length === 0) {
                    cont.innerHTML = '<p class="text-center text-slate-500 mt-10">Даних поки немає</p>';
                    return;
                }

                if (tab === 'grades') {
                    cont.innerHTML = data.map(s => \`
                        <div class="card flex justify-between items-center">
                            <span class="capitalize">\${s.level} рівень</span>
                            <span class="text-blue-400 font-bold">\${s.count}</span>
                        </div>
                    \`).join('');
                } else if (tab === 'schedule') {
                    cont.innerHTML = data.map(i => \`
                        <div class="card">
                            <div class="text-blue-400 text-xs font-bold mb-1">\${i.time || 'Урок'}</div>
                            <div class="font-medium">\${i.subject || i.title || 'Предмет'}</div>
                        </div>
                    \`).join('');
                } else {
                    cont.innerHTML = data.map(i => \`
                        <div class="card">
                            <div class="font-bold">\${i.title || 'Завдання'}</div>
                            <div class="text-xs text-slate-400 mt-2">Дедлайн: \${i.deadline || 'не вказано'}</div>
                        </div>
                    \`).join('');
                }
            } catch(e) { cont.innerHTML = "Помилка завантаження"; }
        }
    </script>
</body>
</html>
    `);
});

// --- СЕРВЕРНА ЧАСТИНА ---

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const r = await axios.post('https://api.human.ua/v1/auth', { email, password });
        res.json({ success: true, token: r.data.token, user: r.data.user });
    } catch (e) { res.status(401).json({ success: false }); }
});

app.get('/api/data', async (req, res) => {
    const { auth, uid } = req.headers;
    const { type } = req.query;
    const config = { headers: { 'Authorization': 'Bearer ' + auth } };

    try {
        let url = '';
        if (type === 'grades') url = "https://api.human.ua/v1/student/" + uid + "/performance/average";
        if (type === 'schedule') url = "https://api.human.ua/v1/student/" + uid + "/lessons?date=" + new Date().toISOString().split('T')[0];
        if (type === 'hw') url = "https://api.human.ua/v1/student/" + uid + "/assignments?status=active";

        const r = await axios.get(url, config);
        res.json(r.data);
    } catch (e) { res.json([]); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Ready'));
