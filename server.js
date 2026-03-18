const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors());

// --- 1. АВТОРИЗАЦІЯ (З МАСКУВАННЯМ ПІД БРАУЗЕР) ---
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`Спроба входу для пошти: ${email}`);

        const response = await axios.post('https://api.human.ua/v1/account/auth', 
            { 
                email: email, 
                password: password 
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/plain, */*',
                    // Маскуємо сервер під звичайний комп'ютер на Windows з Chrome
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Origin': 'https://id.human.ua',
                    'Referer': 'https://id.human.ua/'
                }
            }
        );

        if (response.data && response.data.token) {
            console.log("✅ Успішний вхід!");
            res.json({ 
                success: true, 
                token: response.data.token, 
                user: response.data.user 
            });
        } else {
            res.json({ success: false, error: 'Сервер Human не видав ключ доступу' });
        }
    } catch (e) {
        // Якщо Human видає помилку, ми її перехоплюємо і читаємо
        const humanError = e.response?.data?.message || e.message;
        console.error('❌ Помилка входу:', humanError);
        res.json({ success: false, error: `Помилка Human: ${humanError}` });
    }
});

// --- 2. ОТРИМАННЯ ОЦІНОК ---
app.get('/api/stats', async (req, res) => {
    try {
        const token = req.headers.authorization;
        const response = await axios.get('https://api.human.ua/v1/student/421680/performance/average', {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            }
        });
        res.json(response.data);
    } catch (e) {
        console.error('Помилка отримання статистики:', e.message);
        res.status(500).json({ error: 'Не вдалося завантажити бали' });
    }
});

// --- 3. ІНТЕРФЕЙС (HTML) ---
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
        <h1 class="text-3xl font-bold mb-8 text-center text-blue-400">Вхід у Human</h1>
        
        <div class="space-y-4">
            <input type="email" id="email" placeholder="Твій Email" class="w-full p-4 rounded-xl bg-slate-800 border border-slate-700 focus:outline-none focus:border-blue-500">
            <input type="password" id="password" placeholder="Пароль" class="w-full p-4 rounded-xl bg-slate-800 border border-slate-700 focus:outline-none focus:border-blue-500">
            <button onclick="handleLogin()" id="login-btn" class="w-full bg-blue-600 hover:bg-blue-700 p-4 rounded-xl font-bold transition-all">Увійти</button>
        </div>
        <div id="error-box" class="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-xl mt-4 text-center hidden">
            <p id="error-msg" class="text-sm font-medium">Помилка</p>
        </div>
    </div>

    <div id="dashboard" class="hidden max-w-md mx-auto">
        <h2 id="welcome" class="text-2xl font-bold mb-6 text-center">Привіт!</h2>
        <div class="bg-slate-800 p-6 rounded-2xl shadow-xl">
            <h3 class="text-slate-400 text-sm uppercase mb-4 tracking-wider text-center">Твоя успішність</h3>
            <div id="stats-list" class="space-y-3">
                <p class="text-center text-slate-400 animate-pulse">Завантажуємо оцінки...</p>
            </div>
        </div>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();
        tg.ready();

        async function handleLogin() {
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const btn = document.getElementById('login-btn');
            const errorBox = document.getElementById('error-box');
            
            if(!email || !password) {
                showError("Введи пошту та пароль!");
                return;
            }

            btn.innerText = 'З'єднуємось із сервером...';
            btn.disabled = true;
            errorBox.classList.add('hidden');

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
                    showError(data.error || "Невірний логін або пароль");
                }
            } catch (err) {
                showError("Помилка з'єднання з нашим сервером Render.");
            } finally {
                btn.innerText = 'Увійти';
                btn.disabled = false;
            }
        }

        async function fetchStats(token) {
            try {
                const res = await fetch('/api/stats', {
                    headers: { 'Authorization': token }
                });
                const stats = await res.json();
                const list = document.getElementById('stats-list');
                
                if (stats.length === 0) {
                    list.innerHTML = '<p class="text-center text-slate-400">Оцінок поки немає</p>';
                    return;
                }

                list.innerHTML = stats.map(s => \`
                    <div class="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
                        <span class="font-medium text-slate-200 capitalize">\${s.level} рівень</span>
                        <span class="bg-blue-500 px-3 py-1 rounded-full text-sm font-bold">\${s.count} оцінок</span>
                    </div>
                \`).join('');
            } catch (err) {
                document.getElementById('stats-list').innerHTML = '<p class="text-center text-red-400">Не вдалося завантажити оцінки</p>';
            }
        }

        function showError(text) {
            const box = document.getElementById('error-box');
            document.getElementById('error-msg').innerText = text;
            box.classList.remove('hidden');
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