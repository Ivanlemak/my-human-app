const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// Дозволяємо запити з будь-яких джерел (важливо для Telegram)
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Human Pro</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background: #0f172a; color: white; font-family: sans-serif; }
        .glass { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); }
        .tab-active { color: #3b82f6; border-bottom: 2px solid #3b82f6; }
    </style>
</head>
<body class="min-h-screen flex flex-col">

    <div id="loader" class="fixed inset-0 z-50 bg-slate-900 flex items-center justify-center">
        <div class="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div id="auth-screen" class="hidden flex-grow flex flex-col justify-center p-8 max-w-sm mx-auto w-full">
        <h1 class="text-4xl font-black text-center mb-8 text-blue-500">HUMAN</h1>
        <div class="space-y-4">
            <input type="email" id="email" placeholder="Email" class="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700 outline-none focus:ring-2 ring-blue-500">
            <input type="password" id="password" placeholder="Пароль" class="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700 outline-none focus:ring-2 ring-blue-500">
            <button onclick="login()" id="btn" class="w-full bg-blue-600 p-4 rounded-2xl font-bold active:scale-95 transition-all">Увійти</button>
            <p id="msg" class="text-center text-red-400 text-sm hidden"></p>
        </div>
    </div>

    <div id="main-screen" class="hidden flex flex-col h-screen">
        <header class="p-6">
            <div class="flex justify-between items-center mb-6">
                <h2 id="user-hi" class="text-xl font-bold truncate">Привіт!</h2>
                <button onclick="logout()" class="text-xs text-slate-500 font-bold uppercase">Вийти</button>
            </div>
            <div class="flex justify-around text-sm font-bold border-b border-slate-800">
                <button onclick="switchTab('grades')" id="t-grades" class="tab-active pb-2 px-2">Оцінки</button>
                <button onclick="switchTab('schedule')" id="t-schedule" class="text-slate-500 pb-2 px-2">Розклад</button>
                <button onclick="switchTab('hw')" id="t-hw" class="text-slate-500 pb-2 px-2">ДЗ</button>
            </div>
        </header>
        <main id="content" class="flex-grow p-6 overflow-y-auto space-y-4 pb-20"></main>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();
        
        // Авто-визначення поточної адреси сервера
        const API_URL = window.location.origin;

        window.onload = () => {
            const token = localStorage.getItem('h_token');
            const uid = localStorage.getItem('h_uid');
            const name = localStorage.getItem('h_name');

            if (token && uid) {
                showMain(name);
            } else {
                document.getElementById('loader').style.display = 'none';
                document.getElementById('auth-screen').classList.remove('hidden');
            }
        };

        async function login() {
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const btn = document.getElementById('btn');
            const msg = document.getElementById('msg');

            btn.disabled = true;
            btn.innerText = 'Вхід...';
            msg.classList.add('hidden');

            try {
                const r = await fetch(API_URL + '/api/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email, password })
                });
                
                const d = await r.json();

                if (d.success) {
                    localStorage.setItem('h_token', d.token);
                    localStorage.setItem('h_uid', d.user.id);
                    localStorage.setItem('h_name', d.user.first_name);
                    showMain(d.user.first_name);
                } else {
                    msg.innerText = d.error || "Невірні дані";
                    msg.classList.remove('hidden');
                    btn.disabled = false;
                    btn.innerText = 'Увійти';
                }
            } catch(e) {
                msg.innerText = "Помилка зв'язку з сервером";
                msg.classList.remove('hidden');
                btn.disabled = false;
                btn.innerText = 'Увійти';
            }
        }

        function showMain(name) {
            document.getElementById('loader').style.display = 'none';
            document.getElementById('auth-screen').style.display = 'none';
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
            document.querySelectorAll('header button').forEach(b => b.classList.remove('tab-active', 'text-white'));
            document.getElementById('t-' + tab).classList.add('tab-active', 'text-white');
            
            cont.innerHTML = '<div class="text-center py-10 animate-pulse text-slate-500">Завантаження...</div>';

            try {
                const r = await fetch(API_URL + '/api/data?type=' + tab, {
                    headers: { 
                        'auth': localStorage.getItem('h_token'), 
                        'uid': localStorage.getItem('h_uid') 
                    }
                });
                const data = await r.json();
                
                if (!data || data.length === 0) {
                    cont.innerHTML = '<p class="text-center text-slate-600 mt-10">Поки що порожньо</p>';
                    return;
                }

                cont.innerHTML = data.map(i => \`
                    <div class="glass p-4 rounded-2xl">
                        \${tab === 'grades' ? \`
                            <div class="flex justify-between items-center">
                                <span class="capitalize text-slate-300">\${i.level} рівень</span>
                                <span class="text-xl font-bold text-blue-500">\${i.count}</span>
                            </div>
                        \` : \`
                            <div class="font-bold">\${i.subject || i.title || 'Предмет'}</div>
                            <div class="text-xs text-slate-500 mt-1">\${i.time || i.deadline || ''}</div>
                        \`}
                    </div>
                \`).join('');
            } catch(e) { cont.innerHTML = '<p class="text-center text-red-500">Помилка даних</p>'; }
        }
    </script>
</body>
</html>
    `);
});

// API БЕКЕНД
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const r = await axios.post('https://api.human.ua/v1/auth', { email, password });
        res.json({ success: true, token: r.data.token, user: r.data.user });
    } catch (e) {
        res.status(401).json({ success: false, error: "Логін або пароль невірні" });
    }
});

app.get('/api/data', async (req, res) => {
    const { auth, uid } = req.headers;
    const { type } = req.query;
    const config = { headers: { 'Authorization': 'Bearer ' + auth } };
    const today = new Date().toISOString().split('T')[0];

    try {
        let url = '';
        if (type === 'grades') url = "https://api.human.ua/v1/student/" + uid + "/performance/average";
        if (type === 'schedule') url = "https://api.human.ua/v1/student/" + uid + "/lessons?date=" + today;
        if (type === 'hw') url = "https://api.human.ua/v1/student/" + uid + "/assignments?status=active";

        const r = await axios.get(url, config);
        let result = r.data;
        if (type === 'schedule' && r.data.lessons) result = r.data.lessons;
        res.json(result);
    } catch (e) { res.json([]); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running'));
