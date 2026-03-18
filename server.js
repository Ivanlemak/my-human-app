const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// Повний дозвіл для CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'auth', 'uid']
}));
app.use(express.json());

app.get('/', (req, res) => {
    // Отримуємо актуальний домен для фронтенда
    const host = req.get('host');
    const protocol = req.protocol === 'http' && host.includes('onrender.com') ? 'https' : req.protocol;
    const fullUrl = protocol + '://' + host;

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
        .tab-active { color: #3b82f6; border-bottom: 2px solid #3b82f6; }
        .glass { background: rgba(30, 41, 59, 0.5); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); }
    </style>
</head>
<body class="min-h-screen flex flex-col">

    <div id="loader" class="fixed inset-0 z-50 bg-slate-900 flex items-center justify-center">
        <div class="flex flex-col items-center">
            <div class="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-slate-500 text-xs mt-4">Запуск сервера...</p>
        </div>
    </div>

    <div id="auth-screen" class="hidden flex-grow flex flex-col justify-center p-8 max-w-sm mx-auto w-full">
        <h1 class="text-4xl font-black text-center mb-8 text-blue-500 tracking-tighter">HUMAN</h1>
        <div class="space-y-4">
            <input type="email" id="email" placeholder="Email" class="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700 outline-none">
            <input type="password" id="password" placeholder="Пароль" class="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700 outline-none">
            <button onclick="login()" id="btn" class="w-full bg-blue-600 p-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-all">Увійти</button>
            <p id="msg" class="text-center text-red-400 text-sm hidden"></p>
        </div>
    </div>

    <div id="main-screen" class="hidden flex flex-col h-screen">
        <header class="p-6">
            <div class="flex justify-between items-center mb-6">
                <h2 id="user-hi" class="text-xl font-bold truncate text-blue-400">Привіт!</h2>
                <button onclick="logout()" class="text-[10px] text-slate-500 font-bold border border-slate-800 px-3 py-1 rounded-lg uppercase">Вийти</button>
            </div>
            <div class="flex justify-around text-xs font-black uppercase tracking-widest border-b border-slate-800">
                <button onclick="switchTab('grades')" id="t-grades" class="tab-active pb-3">Оцінки</button>
                <button onclick="switchTab('schedule')" id="t-schedule" class="text-slate-500 pb-3">Розклад</button>
                <button onclick="switchTab('hw')" id="t-hw" class="text-slate-500 pb-3">Завдання</button>
            </div>
        </header>
        <main id="content" class="flex-grow p-6 overflow-y-auto space-y-3 pb-24"></main>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();
        const API_URL = "${fullUrl}"; 

        window.onload = async () => {
            const token = localStorage.getItem('h_token');
            const uid = localStorage.getItem('h_uid');
            const name = localStorage.getItem('h_name');

            // Перевіряємо чи сервер живий
            try {
                await fetch(API_URL + '/ping');
                if (token && uid) {
                    showMain(name);
                } else {
                    hideLoader();
                    document.getElementById('auth-screen').classList.remove('hidden');
                }
            } catch(e) {
                setTimeout(window.onload, 2000); // Пробуємо ще раз якщо сервер спить
            }
        };

        async function login() {
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const btn = document.getElementById('btn');
            const msg = document.getElementById('msg');

            btn.disabled = true;
            btn.innerText = 'Обробка...';
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
                    msg.innerText = "Невірні дані входу";
                    msg.classList.remove('hidden');
                    btn.disabled = false;
                    btn.innerText = 'Увійти';
                }
            } catch(e) {
                msg.innerText = "Помилка зв'язку. Спробуйте ще раз.";
                msg.classList.remove('hidden');
                btn.disabled = false;
            }
        }

        function showMain(name) {
            hideLoader();
            document.getElementById('auth-screen').style.display = 'none';
            document.getElementById('main-screen').classList.remove('hidden');
            document.getElementById('user-hi').innerText = "Привіт, " + name + "!";
            switchTab('grades');
        }

        function hideLoader() {
            document.getElementById('loader').style.display = 'none';
        }

        function logout() { localStorage.clear(); location.reload(); }

        async function switchTab(tab) {
            const cont = document.getElementById('content');
            document.querySelectorAll('header button').forEach(b => {
                if(b.id) b.classList.remove('tab-active', 'text-white');
                if(b.id) b.classList.add('text-slate-500');
            });
            document.getElementById('t-' + tab).classList.add('tab-active', 'text-white');
            cont.innerHTML = '<div class="text-center py-20 animate-pulse text-slate-600 text-sm">Оновлення даних...</div>';

            try {
                const r = await fetch(API_URL + '/api/data?type=' + tab, {
                    headers: { 
                        'auth': localStorage.getItem('h_token'), 
                        'uid': localStorage.getItem('h_uid') 
                    }
                });
                const data = await r.json();
                
                if (!data || data.length === 0) {
                    cont.innerHTML = '<div class="glass p-8 rounded-3xl text-center text-slate-500">Тут поки порожньо</div>';
                    return;
                }

                cont.innerHTML = data.map(i => \`
                    <div class="glass p-5 rounded-2xl flex justify-between items-center shadow-sm">
                        <div class="pr-4">
                            <div class="font-bold text-slate-200">\${i.subject || i.title || i.level + ' рівень'}</div>
                            <div class="text-[10px] text-slate-500 mt-1 uppercase font-black tracking-tighter">\${i.time || i.deadline || ''}</div>
                        </div>
                        \${i.count ? \`<div class="text-2xl font-black text-blue-500">\${i.count}</div>\` : ''}
                    </div>
                \`).join('');
            } catch(e) { cont.innerHTML = '<p class="text-center text-red-500 text-xs">Помилка завантаження</p>'; }
        }
    </script>
</body>
</html>
    `);
});

// ПЕРЕВІРКА ПРИСУТНОСТІ
app.get('/ping', (req, res) => res.send('ok'));

// API
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const r = await axios.post('https://api.human.ua/v1/auth', { email, password }, { timeout: 8000 });
        res.json({ success: true, token: r.data.token, user: r.data.user });
    } catch (e) {
        res.status(401).json({ success: false });
    }
});

app.get('/api/data', async (req, res) => {
    const { auth, uid } = req.headers;
    const { type } = req.query;
    const config = { headers: { 'Authorization': 'Bearer ' + auth }, timeout: 8000 };
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
app.listen(PORT, () => console.log('Live'));
