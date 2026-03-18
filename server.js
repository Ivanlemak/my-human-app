const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');

const app = express();

// Дозволяємо JSON та CORS для роботи з фронтендом
app.use(express.json());
app.use(cors());

// --- МАРШРУТИ ДЛЯ API ---

// 1. Авторизація (вхід у Human)
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const response = await axios.post('https://api.human.ua/v1/account/auth', {
            email,
            password
        });

        if (response.data && response.data.token) {
            // Відправляємо токен та дані про користувача назад у Telegram
            res.json({ 
                success: true, 
                token: response.data.token, 
                user: response.data.user 
            });
        } else {
            res.status(401).json({ success: false, error: 'Невірні дані' });
        }
    } catch (e) {
        console.error('Помилка Human API Login:', e.message);
        res.status(401).json({ success: false, error: 'Помилка авторизації' });
    }
});

// 2. Отримання статистики (ID учня 421680)
app.get('/api/stats', async (req, res) => {
    try {
        const token = req.headers.authorization;
        const response = await axios.get('https://api.human.ua/v1/student/421680/performance/average', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        res.json(response.data);
    } catch (e) {
        console.error('Помилка отримання статистики:', e.message);
        res.status(500).json({ error: 'Не вдалося завантажити дані' });
    }
});

// --- ОБСЛУГОВУВАННЯ ІНТЕРФЕЙСУ ---

// Цей код каже серверу показувати форму входу, коли ти відкриваєш посилання
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
    <style>
        body { background-color: #0f172a; color: white; }
    </style>
</head>
<body class="p-6 font-sans">
    <div id="auth-form" class="max-w-md mx-auto">
        <h1 class="text-3xl font-bold mb-8 text-center text-blue-400">Human Mini App</h1>
        
        <div class="space-y-4">
            <input type="email" id="email" placeholder="Твій Email" class="w-full p-4 rounded-xl bg-slate-800 border border-slate-700 focus:outline-none focus:border-blue-500">
            <input type="password" id="password" placeholder="Пароль" class="w-full p-4 rounded-xl bg-slate-800 border border-slate-700 focus:outline-none focus:border-blue-500">
            <button onclick="handleLogin()" id="login-btn" class="w-full bg-blue-600 hover:bg-blue-700 p-4 rounded-xl font-bold transition-all">Увійти</button>
        </div>
        <p id="error-msg" class="text-red-500 mt-4 text-center hidden">Невірний логін або пароль</p>
    </div>

    <div id="dashboard" class="hidden max-w-md mx-auto">
        <h2 id="welcome" class="text-2xl font-bold mb-6 text-center">Привіт!</h2>
        <div class="bg-slate-800 p-6 rounded-2xl shadow-xl">
            <h3 class="text-slate-400 text-sm uppercase mb-4 tracking-wider text-center">Твоя успішність</h3>
            <div id="stats-list" class="space-y-3">
                </div>
        </div>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();
        tg.ready();

        async function handleLogin() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const btn = document.getElementById('login-btn');
            
            btn.innerText = 'Входимо...';
            btn.disabled = true;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (data.success) {
                    document.getElementById('auth-form').classList.add('hidden');
                    document.getElementById('dashboard').classList.remove('hidden');
                    document.getElementById('welcome').innerText = "Вітаю, " + data.user.first_name + "!";
                    fetchStats(data.token);
                } else {
                    showError();
                }
            } catch (err) {
                showError();
            } finally {
                btn.innerText = 'Увійти';
                btn.disabled = false;
            }
        }

        async function fetchStats(token) {
            const res = await fetch('/api/stats', {
                headers: { 'Authorization': token }
            });
            const stats = await res.json();
            const list = document.getElementById('stats-list');
            
            list.innerHTML = stats.map(s => \`
                <div class="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
                    <span class="font-medium text-slate-200">\${s.level} рівень</span>
                    <span class="bg-blue-500 px-3 py-1 rounded-full text-sm font-bold">\${s.count} оцінок</span>
                </div>
            \`).join('');
        }

        function showError() {
            const msg = document.getElementById('error-msg');
            msg.classList.remove('hidden');
            setTimeout(() => msg.classList.add('hidden'), 3000);
        }
    </script>
</body>
</html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Сервер запущено на порту " + PORT);
});