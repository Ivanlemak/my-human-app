const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Головна сторінка
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Human Mini App</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-white min-h-screen flex flex-col p-6">
    <div id="auth-box" class="flex-grow flex flex-col justify-center">
        <h1 class="text-3xl font-bold text-center text-blue-500 mb-8">HUMAN</h1>
        <input type="email" id="e" placeholder="Email" class="w-full p-4 mb-4 rounded-xl bg-slate-800 border border-slate-700">
        <input type="password" id="p" placeholder="Пароль" class="w-full p-4 mb-6 rounded-xl bg-slate-800 border border-slate-700">
        <button onclick="doLogin()" id="btn" class="w-full bg-blue-600 p-4 rounded-xl font-bold">Увійти</button>
        <p id="msg" class="mt-4 text-center text-red-400"></p>
    </div>

    <div id="main-box" class="hidden">
        <h2 id="hi" class="text-2xl font-bold mb-4">Привіт!</h2>
        <div id="list" class="space-y-3 text-slate-400">Завантаження...</div>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();
        let myToken = '';
        let myId = '';

        async function doLogin() {
            const email = document.getElementById('e').value;
            const password = document.getElementById('p').value;
            const btn = document.getElementById('btn');
            const msg = document.getElementById('msg');

            if(!email || !password) return;
            btn.innerText = 'Входимо...';
            btn.disabled = true;

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();

                if(data.success) {
                    myToken = data.token;
                    myId = data.user.id;
                    document.getElementById('auth-box').classList.add('hidden');
                    document.getElementById('main-box').classList.remove('hidden');
                    document.getElementById('hi').innerText = "Привіт, " + data.user.first_name;
                    loadStats();
                } else {
                    msg.innerText = data.error;
                    btn.innerText = 'Увійти';
                    btn.disabled = false;
                }
            } catch(err) {
                msg.innerText = "Помилка сервера";
                btn.disabled = false;
            }
        }

        async function loadStats() {
            try {
                const res = await fetch('/api/stats', {
                    headers: { 'auth': myToken, 'uid': myId }
                });
                const data = await res.json();
                const list = document.getElementById('list');
                if(data.length === 0) { list.innerText = "Оцінок немає"; return; }
                
                list.innerHTML = data.map(s => '<div class="p-4 bg-slate-800 rounded-xl border border-slate-700 flex justify-between"><span>' + s.level + ' рівень</span><span class="text-blue-400 font-bold">' + s.count + '</span></div>').join('');
            } catch(e) { 
                document.getElementById('list').innerText = "Помилка завантаження";
            }
        }
    </script>
</body>
</html>
    `);
});

// API Логін
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const response = await axios.post('https://api.human.ua/v1/auth', { email, password });
        res.json({ success: true, token: response.data.token, user: response.data.user });
    } catch (e) {
        res.status(401).json({ success: false, error: "Невірні дані" });
    }
});

// API Статистика
app.get('/api/stats', async (req, res) => {
    try {
        const token = req.headers.auth;
        const uid = req.headers.uid;
        const response = await axios.get('https://api.human.ua/v1/student/' + uid + '/performance/average', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        res.json(response.data);
    } catch (e) {
        res.json([]);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server started'));
