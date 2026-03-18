const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Твоя пряма адреса на Render
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
        body { background-color: #0f172a; color: white; font-family: sans-serif; -webkit-tap-highlight-color: transparent; }
        .input-style { background: #1e293b; border: 1px solid #334155; outline: none; transition: 0.2s; }
        .input-style:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
    </style>
</head>
<body class="min-h-screen flex flex-col p-6">

    <div id="auth-screen" class="flex-grow flex flex-col justify-center max-w-sm mx-auto w-full">
        <div class="text-center mb-10">
            <h1 class="text-4xl font-black text-blue-500 tracking-tighter">HUMAN</h1>
            <p class="text-slate-400 text-sm mt-2">Твій успіх у твоїх руках</p>
        </div>

        <div class="space-y-4">
            <input type="email" id="email" placeholder="Email" class="input-style w-full p-4 rounded-2xl">
            <input type="password" id="password" placeholder="Пароль" class="input-style w-full p-4 rounded-2xl">
            <button onclick="login()" id="btn" class="w-full bg-blue-600 hover:bg-blue-700 p-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-all">Увійти</button>
            <p id="msg" class="text-center text-red-400 text-sm hidden font-medium"></p>
        </div>
    </div>

    <div id="main-screen" class="hidden flex-grow max-w-sm mx-auto w-full">
        <div class="py-8 text-center">
            <h2 id="user-hi" class="text-2xl font-bold text-white">Вітаємо!</h2>
            <p class="text-slate-400">Твоя середня успішність</p>
        </div>

        <div id="grades-list" class="space-y-4">
            <div class="animate-pulse flex flex-col space-y-3">
                <div class="h-16 bg-slate-800 rounded-2xl"></div>
                <div class="h-16 bg-slate-800 rounded-2xl"></div>
            </div>
        </div>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();
        tg.ready();

        async function login() {
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const btn = document.getElementById('btn');
            const msg = document.getElementById('msg');
            const baseUrl = "${SERVER_URL}";

            if(!email || !password) return;

            btn.disabled = true;
            btn.innerText = 'Входимо...';
            msg.classList.add('hidden');

            try {
                const response = await fetch(baseUrl + '/api/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (data.success) {
                    document.getElementById('auth-screen').classList.add('hidden');
                    document.getElementById('main-screen').classList.remove('hidden');
                    document.getElementById('user-hi').innerText = "Привіт, " + data.user.first_name + "!";
                    
                    fetchGrades(data.token, data.user.id);
                } else {
                    msg.innerText = data.error || "Невірні дані";
                    msg.classList.remove('hidden');
                    btn.disabled = false;
                    btn.innerText = 'Увійти';
                }
            } catch(e) {
                msg.innerText = "Сервер не відповідає. Спробуй пізніше.";
                msg.classList.remove('hidden');
                btn.disabled = false;
                btn.innerText = 'Увійти';
            }
        }

        async function fetchGrades(token, uid) {
            const baseUrl = "${SERVER_URL}";
            try {
                const res = await fetch(baseUrl + '/api/stats', {
                    headers: { 'auth': token, 'uid': uid }
                });
                const stats = await res.json();
                const list = document.getElementById('grades-list');
                
                if (stats.length === 0) {
                    list.innerHTML = '<div class="text-center text-slate-500 mt-10">Оцінок поки немає</div>';
                    return;
                }

                list.innerHTML = stats.map(s => \`
                    <div class="flex justify-between items-center p-5 bg-slate-800 rounded-3xl border border-slate-700 shadow-md">
                        <span class="capitalize text-slate-200 font-medium">\${s.level} рівень</span>
                        <span class="text-blue-400 font-black text-xl">\${s.count}</span>
                    </div>
                \`).join('');
            } catch(e) {
                document.getElementById('grades-list').innerText = "Помилка завантаження балів";
            }
        }
    </script>
</body>
</html>
    `);
});

// --- API НА СЕРВЕРІ ---

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const response = await axios.post('https://api.human.ua/v1/auth', { email, password });
        res.json({ success: true, token: response.data.token, user: response.data.user });
    } catch (e) {
        res.status(401).json({ success: false, error: "Невірний логін або пароль" });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const { auth, uid } = req.headers;
        const response = await axios.get('https://api.human.ua/v1/student/' + uid + '/performance/average', {
            headers: { 'Authorization': 'Bearer ' + auth }
        });
        res.json(response.data);
    } catch (e) {
        res.status(500).json([]);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Work!'));
