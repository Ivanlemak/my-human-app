const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Головна сторінка
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Human</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background: #030712; color: white; font-family: sans-serif; }
        .glass { background: rgba(17, 24, 39, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.05); }
    </style>
</head>
<body class="min-h-screen flex flex-col">

    <div id="auth-screen" class="flex-grow flex flex-col items-center justify-center p-8 w-full">
        <h1 class="text-5xl font-black text-blue-600 mb-8 tracking-tighter">HUMAN</h1>
        <div class="space-y-4 w-full max-w-xs">
            <input type="email" id="email" placeholder="Email" class="w-full p-4 rounded-2xl bg-slate-800 border-none text-white outline-none">
            <input type="password" id="password" placeholder="Паро King" class="w-full p-4 rounded-2xl bg-slate-800 border-none text-white outline-none">
            <button onclick="login()" id="btn" class="w-full bg-blue-600 p-4 rounded-2xl font-bold active:scale-95 transition-all">Увійти</button>
            <p id="msg" class="text-center text-red-400 text-sm hidden"></p>
        </div>
    </div>

    <div id="main-screen" class="hidden flex flex-col h-screen">
        <header class="p-6 sticky top-0 bg-[#030712]/80 backdrop-blur-md">
            <div class="flex justify-between items-center mb-6">
                <h2 id="u-name" class="text-xl font-bold">Вітаємо!</h2>
                <button onclick="localStorage.clear();location.reload()" class="text-xs text-slate-500 uppercase">Вийти</button>
            </div>
            <div class="flex justify-around border-b border-slate-800 text-xs font-bold uppercase tracking-widest">
                <button onclick="load('grades')" class="pb-3 text-blue-500 border-b-2 border-blue-500 w-full">Оцінки</button>
                <button onclick="load('schedule')" class="pb-3 text-slate-500 w-full">Розклад</button>
                <button onclick="load('hw')" class="pb-3 text-slate-500 w-full">ДЗ</button>
            </div>
        </header>
        <main id="list" class="p-6 space-y-4 overflow-y-auto pb-24"></main>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();

        window.onload = () => {
            if(localStorage.getItem('h_token')) show(localStorage.getItem('h_name'));
        };

        async function login() {
            const e = document.getElementById('email').value;
            const p = document.getElementById('password').value;
            const btn = document.getElementById('btn');
            if(!e || !p) return;
            btn.innerText = 'Вхід...';
            try {
                const r = await fetch('/api/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({email:e, password:p})
                });
                const d = await r.json();
                if(d.success) {
                    localStorage.setItem('h_token', d.token);
                    localStorage.setItem('h_uid', d.user.id);
                    localStorage.setItem('h_name', d.user.first_name);
                    show(d.user.first_name);
                } else { 
                    document.getElementById('msg').innerText = "Помилка входу";
                    document.getElementById('msg').classList.remove('hidden');
                    btn.innerText = 'Увійти';
                }
            } catch(err) { btn.innerText = 'Помилка'; }
        }

        function show(name) {
            document.getElementById('auth-screen').classList.add('hidden');
            document.getElementById('main-screen').classList.remove('hidden');
            document.getElementById('u-name').innerText = "Привіт, " + name;
            load('grades');
        }

        async function load(t) {
            const l = document.getElementById('list');
            l.innerHTML = 'Завантаження...';
            try {
                const r = await fetch('/api/data?type='+t, {
                    headers: {
                        'auth': localStorage.getItem('h_token'),
                        'uid': localStorage.getItem('h_uid')
                    }
                });
                const d = await r.json();
                l.innerHTML = d.map(i => \`
                    <div class="glass p-5 rounded-2xl flex justify-between items-center">
                        <div>
                            <div class="font-bold text-slate-100">\${i.subject || i.title || 'Предмет'}</div>
                            <div class="text-[10px] text-slate-500 mt-1 uppercase font-bold">\${i.time || i.deadline || ''}</div>
                        </div>
                        \${i.count ? '<div class="text-2xl font-black text-blue-500">' + i.count + '</div>' : ''}
                    </div>
                \`).join('');
            } catch(e) { l.innerHTML = 'Помилка'; }
        }
    </script>
</body>
</html>
    `);
});

// Бекенд логіка
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
    const date = new Date().toISOString().split('T')[0];
    try {
        let url = 'https://api.human.ua/v1/student/' + uid + (type === 'grades' ? '/performance/average' : type === 'schedule' ? '/lessons?date=' + date : '/assignments?status=active');
        const r = await axios.get(url, config);
        res.json(r.data.lessons || r.data);
    } catch (e) { res.json([]); }
});

app.listen(process.env.PORT || 3000);


