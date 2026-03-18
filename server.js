const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// --- ІНТЕРФЕЙС (HTML + JS) ---
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Human App</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-white p-6 font-sans flex flex-col justify-center min-h-screen">
    <div id="auth-screen" class="max-w-sm mx-auto w-full">
        <h1 class="text-3xl font-black text-blue-500 mb-8 text-center uppercase">Human</h1>
        <div class="space-y-4">
            <input type="email" id="email" placeholder="Email" class="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700 outline-none focus:border-blue-500">
            <input type="password" id="password" placeholder="Пароль" class="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700 outline-none focus:border-blue-500">
            <button onclick="login()" id="btn" class="w-full bg-blue-600 p-4 rounded-2xl font-bold active:scale-95 transition-all">Увійти</button>
        </div>
        <div id="err-box" class="hidden mt-4 p-3 bg-red-500/20 border border-red-500 rounded-xl text-red-400 text-sm text-center">
            <p id="err-text"></p>
        </div>
    </div>

    <div id="dashboard" class="hidden max-w-sm mx-auto w-full">
        <h2 id="user-name" class="text-2xl font-bold mb-6 text-center text-blue-400">Вітаємо!</h2>
        <div class="bg-slate-800 rounded-3xl p-6 border border-slate-700">
            <div id="stats" class="space-y-4">Завантаження...</div>
        </div>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();

        async function login() {
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const btn = document.getElementById('btn');
            
            btn.disabled = true;
            btn.innerText = 'Перевірка...';

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email, password })
                });
                const data = await response.json();

                if (data.success) {
                    document.getElementById('auth-screen').classList.add('hidden');
                    document.getElementById('dashboard').classList.remove('hidden');
                    document.getElementById('user-name').innerText = "Привіт, " + data.user.first_name + "!";
                    loadStats(data.token);
                } else {
                    document.getElementById('err-text').innerText = data.error;
                    document.getElementById('err-box').classList.remove('hidden');
                    btn.disabled = false;
                    btn.innerText = 'Увійти';
                }
            } catch(e) {
                alert("Помилка з'єднання");
                btn.disabled = false;
            }
        }

        async function loadStats(token) {
            const res = await fetch('/api/stats', { headers: {'Authorization': token} });
            const stats = await res.json();
            const list = document.getElementById('stats');
            
            if (stats.length === 0) {
                list.innerHTML = "Дані відсутні";
                return;
            }

            list.innerHTML = stats.map(s => \`
                <div class="flex justify-between p-3 bg-slate-700/50 rounded-xl">
                    <span class="capitalize">\${s.level} рівень</span>
                    <span class="font-bold text-blue-400">\${s.count}</span>
                </div>
            \`).join('');
        }
    </script>
</body>
</html>
    `);
});

// --- СЕРВЕРНА ЛОГІКА (API) ---

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const response = await axios.post('https://api.human.ua/v1/auth', { email, password }, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36'
            }
        });

        res.json({ success: true, token: response.data.token, user: response.data.user });
    } catch (e) {
        const status = e.response?.status || 500;
        const msg = e.response?.data?.message || "Помилка входу";
        res.status(status).json({ success: false, error: "[" + status + "] " + msg });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const token = req.headers.authorization;
        const response = await axios.get('https://api.human.ua/v1/student/421680/performance/average', {
            headers: { 
                'Authorization': "Bearer " + token,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36'
            }
        });
        res.json(response.data);
    } catch (e) {
        res.status(500).json([]);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server started on port " + PORT));
