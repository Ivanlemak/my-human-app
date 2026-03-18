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
    <title>Human Pro</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background: #0f172a; color: white; font-family: 'Inter', sans-serif; }
        .glass { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); }
        .tab-active { color: #3b82f6; position: relative; }
        .tab-active::after { content: ''; position: absolute; bottom: -8px; left: 0; width: 100%; height: 3px; background: #3b82f6; border-radius: 10px; }
        .card-anim { animation: slideUp 0.4s ease-out forwards; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body class="min-h-screen flex flex-col">

    <div id="loader" class="fixed inset-0 z-50 bg-slate-900 flex items-center justify-center">
        <div class="flex flex-col items-center">
            <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p class="mt-4 text-slate-400 text-sm font-medium">Синхронізація...</p>
        </div>
    </div>

    <div id="auth-screen" class="hidden flex-grow flex flex-col justify-center p-8 max-w-sm mx-auto w-full">
        <div class="mb-12 text-center">
            <div class="inline-block p-4 bg-blue-600 rounded-3xl shadow-2xl shadow-blue-500/20 mb-6">
                <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 14l9-5-9-5-9 5 9 5z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 14l9-5-9-5-9 5 9 5zm0 0l-9 5 9 5 9-5-9-5z"/></svg>
            </div>
            <h1 class="text-4xl font-black tracking-tight text-white">HUMAN<span class="text-blue-500">.</span></h1>
            <p class="text-slate-400 mt-2 text-sm font-medium">Твій освітній простір</p>
        </div>
        
        <div class="space-y-4">
            <input type="email" id="email" placeholder="Твій Email" class="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700 outline-none focus:ring-2 ring-blue-500/50 transition-all">
            <input type="password" id="password" placeholder="Пароль" class="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700 outline-none focus:ring-2 ring-blue-500/50 transition-all">
            <button onclick="login()" id="btn" class="w-full bg-blue-600 hover:bg-blue-500 p-4 rounded-2xl font-bold shadow-xl active:scale-[0.98] transition-all mt-4">Увійти в систему</button>
            <p id="msg" class="text-center text-red-400 text-sm font-medium hidden"></p>
        </div>
    </div>

    <div id="main-screen" class="hidden flex flex-col h-screen">
        <header class="p-6 pt-8">
            <div class="flex justify-between items-center mb-6">
                <div>
                    <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Вітаємо назад,</p>
                    <h2 id="user-hi" class="text-2xl font-bold">Учень</h2>
                </div>
                <button onclick="logout()" class="p-2 bg-slate-800 rounded-xl border border-slate-700">
                    <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                </button>
            </div>
            
            <div class="flex justify-around border-b border-slate-800">
                <button onclick="switchTab('grades')" id="t-grades" class="tab-btn tab-active pb-3 text-sm font-bold transition-all">Оцінки</button>
                <button onclick="switchTab('schedule')" id="t-schedule" class="tab-btn pb-3 text-sm font-bold transition-all text-slate-500">Розклад</button>
                <button onclick="switchTab('hw')" id="t-hw" class="tab-btn pb-3 text-sm font-bold transition-all text-slate-500">Завдання</button>
            </div>
        </header>

        <main id="content" class="flex-grow p-6 overflow-y-auto space-y-4 pb-24">
            </main>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();
        let authData = { token: '', uid: '' };

        window.onload = () => {
            const t = localStorage.getItem('h_token');
            const u = localStorage.getItem('h_uid');
            const n = localStorage.getItem('h_name');
            if (t && u) {
                authData = { token: t, uid: u };
                initMain(n);
            } else {
                document.getElementById('loader').classList.add('hidden');
                document.getElementById('auth-screen').classList.remove('hidden');
            }
        };

        async function login() {
            const e = document.getElementById('email').value.trim();
            const p = document.getElementById('password').value.trim();
            const btn = document.getElementById('btn');
            if(!e || !p) return;

            btn.disabled = true;
            btn.innerHTML = '<span class="animate-pulse">Авторизація...</span>';

            try {
                const r = await fetch('${SERVER_URL}/api/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email: e, password: p })
                });
                const d = await r.json();

                if (d.success) {
                    localStorage.setItem('h_token', d.token);
                    localStorage.setItem('h_uid', d.user.id);
                    localStorage.setItem('h_name', d.user.first_name);
                    authData = { token: d.token, uid: d.user.id };
                    initMain(d.user.first_name);
                } else {
                    document.getElementById('msg').innerText = "Невірний email або пароль";
                    document.getElementById('msg').classList.remove('hidden');
                    btn.disabled = false;
                    btn.innerText = 'Увійти в систему';
                }
            } catch(e) { alert("Помилка підключення"); btn.disabled = false; }
        }

        function initMain(name) {
            document.getElementById('loader').classList.add('hidden');
            document.getElementById('auth-screen').classList.add('hidden');
            document.getElementById('main-screen').classList.remove('hidden');
            document.getElementById('user-hi').innerText = name;
            switchTab('grades');
        }

        function logout() {
            localStorage.clear();
            location.reload();
        }

        async function switchTab(tab) {
            const cont = document.getElementById('content');
            document.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.remove('tab-active', 'text-white');
                b.classList.add('text-slate-500');
            });
            document.getElementById('t-' + tab).classList.add('tab-active', 'text-white');
            
            cont.innerHTML = '<div class="flex justify-center mt-12"><div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>';

            try {
                const r = await fetch('${SERVER_URL}/api/data?type=' + tab, {
                    headers: { 'auth': authData.token, 'uid': authData.uid }
                });
                const data = await r.json();
                
                if (!data || data.length === 0) {
                    cont.innerHTML = '<div class="text-center mt-12"><p class="text-slate-500">Тут поки порожньо 👻</p></div>';
                    return;
                }

                cont.innerHTML = '';
                data.forEach((item, index) => {
                    const div = document.createElement('div');
                    div.className = 'glass p-5 rounded-3xl card-anim';
                    div.style.animationDelay = (index * 0.1) + 's';

                    if (tab === 'grades') {
                        div.innerHTML = \`<div class="flex justify-between items-center"><span class="text-slate-300 font-medium capitalize">\${item.level} рівень</span><span class="text-2xl font-black text-blue-500">\${item.count}</span></div>\`;
                    } else if (tab === 'schedule') {
                        div.innerHTML = \`<div class="flex items-start gap-4"><div class="bg-blue-600/20 text-blue-500 p-2 rounded-xl text-xs font-bold">\${item.number || '•'}</div><div><div class="font-bold text-white">\${item.subject || item.title || 'Предмет'}</div><div class="text-xs text-slate-500 mt-1">\${item.time || 'Час не вказано'}</div></div></div>\`;
                    } else {
                        div.innerHTML = \`<div><div class="font-bold text-white mb-2">\${item.title || 'Завдання'}</div><div class="flex items-center text-[10px] font-bold uppercase tracking-wider text-slate-500"><svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Дедлайн: \${item.deadline || 'Без терміну'}</div></div>\`;
                    }
                    cont.appendChild(div);
                });
            } catch(e) { cont.innerHTML = '<p class="text-center text-red-400">Помилка завантаження</p>'; }
        }
    </script>
</body>
</html>
    `);
});

// --- СЕРВЕР ---

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
        const today = new Date().toISOString().split('T')[0];
        
        if (type === 'grades') url = "https://api.human.ua/v1/student/" + uid + "/performance/average";
        if (type === 'schedule') url = "https://api.human.ua/v1/student/" + uid + "/lessons?date=" + today;
        if (type === 'hw') url = "https://api.human.ua/v1/student/" + uid + "/assignments?status=active";

        const r = await axios.get(url, config);
        
        // Спеціальна обробка для розкладу (якщо приходить об'єкт, а не масив)
        let result = r.data;
        if (type === 'schedule' && r.data.lessons) result = r.data.lessons;
        
        res.json(result);
    } catch (e) { 
        console.log("Error fetching " + type + ":", e.message);
        res.json([]); 
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Human Pro Online'));
