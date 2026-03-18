const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(express.json());
app.use(cors());

// --- 1. АВТОРИЗАЦІЯ (LOGGING IN) ---
app.post('/api/login', async (req, res) => {
    try {
        // Очищаємо пошту від зайвих пробілів і робимо літери маленькими
        const email = req.body.email.trim().toLowerCase();
        const password = req.body.password.trim();

        console.log(`Спроба входу для: ${email}`);

        const response = await axios.post('https://api.human.ua/v1/account/auth', 
            { email, password },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/plain, */*',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Origin': 'https://id.human.ua',
                    'Referer': 'https://id.human.ua/'
                }
            }
        );

        if (response.data && response.data.token) {
            res.json({ 
                success: true, 
                token: response.data.token, 
                user: response.data.user 
            });
        } else {
            res.json({ success: false, error: 'Сервер Human не повернув токен.' });
        }
    } catch (e) {
        const statusCode = e.response?.status || 'Error';
        const errorMessage = e.response?.data?.message || e.message;
        console.error(`Помилка входу [${statusCode}]:`, errorMessage);
        
        // Повертаємо детальну помилку, щоб ти бачив код (401, 403 і т.д.)
        res.json({ 
            success: false, 
            error: `Код: ${statusCode}. Помилка: ${errorMessage}` 
        });
    }
});

// --- 2. ОТРИМАННЯ СТАТИСТИКИ (GRADES) ---
app.get('/api/stats', async (req, res) => {
    try {
        const token = req.headers.authorization;
        // Використовуємо твій ID, який ми знайшли раніше: 421680
        const response = await axios.get('https://api.human.ua/v1/student/421680/performance/average', {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            }
        });
        res.json(response.data);
    } catch (e) {
        res.status(500).json({ error: 'Не вдалося завантажити оцінки' });
    }
});

// --- 3. ІНТЕРФЕЙС (FRONTEND) ---
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Human Mini App</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background-color: #0f172a; color: white; -webkit-tap-highlight-color: transparent; }
        input:focus { outline: none; border-color: #3b82f6; }
    </style>
</head>
<body class="p-5 font-sans min-h-screen flex flex-col justify-center">
    <div id="auth-screen" class="max-w-sm mx-auto w-full">
        <div class="text-center mb-10">
            <h1 class="text-4xl font-black text-blue-500 mb-2">HUMAN</h1>
            <p class="text-slate-400 text-sm">Увійдіть у свій профіль учня</p>
        </div>
        
        <div class="space-y-4">
            <input type="email" id="email" placeholder="Email" class="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700 text-white transition-all">
            <input type="password" id="password" placeholder="Пароль" class="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700 text-white transition-all">
            <button onclick="doLogin()" id="btn" class="w-full bg-blue-600 hover:bg-blue-700 p-4 rounded-2xl font-bold shadow-lg shadow-blue-900/20 active:scale-95 transition-all">Увійти</button>
        </div>
        
        <div id="err-box" class="hidden mt-6 p-4 bg-red-500/10 border border-red-500/50 rounded-2xl text-red-400 text-sm text-center">
            <p id="err-text"></p>
        </div>
    </div>

    <div id="main-screen" class="hidden max-w-sm mx-auto w-full">
        <header class="text-center mb-8">
            <h2 id="user-title" class="text-2xl font-bold">Вітаємо!</h2>
            <p class="text-slate-400 text-sm">Твоя поточна успішність</p>
        </header>

        <div class="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-2xl">
            <div id="grades-list" class="space-y-4 text-center text-slate-400">
                Завантажуємо бали...
            </div>
        </div>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();
        tg.ready();

        async function doLogin() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const btn = document.getElementById('btn');
            const errBox = document.getElementById('err-box');
            
            btn.disabled = true;
            btn.innerText = 'Перевірка...';
            errBox.classList.add('hidden');

            try {
                const r = await fetch('/api/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email, password })
                });
                const d = await r.json();

                if(d.success) {
                    document.getElementById('auth-screen').classList.add('hidden');
                    document.getElementById('main-screen').classList.remove('hidden');
                    document.getElementById('user-title').innerText = "Привіт, " + d.user.first_name + "!";
                    loadGrades(d.token);
                } else {
                    document.getElementById('err-text').innerText = d.error;
                    errBox.classList.remove('hidden');
                    btn.disabled = false;
                    btn.innerText = 'Увійти';
                }
            } catch(e) {
                document.getElementById('err-text').innerText = "Помилка мережі";
                errBox.classList.remove('hidden');
                btn.disabled = false;
                btn.innerText = 'Увійти';
            }
        }

        async function loadGrades(token) {
            try {
                const r = await fetch('/api/stats', { headers: {'Authorization': token} });
                const data = await r.json();
                const list = document.getElementById('grades-list');
                
                if(!data || data.length === 0) {
                    list.innerHTML = "Оцінок не знайдено";
                    return;
                }

                list.innerHTML = data.map(i => \`
                    <div class="flex justify-between items-center bg-slate-700/50 p-4 rounded-2xl">
                        <span class="capitalize text-slate-200">\${i.level} рівень</span>
                        <span class="text-blue-400 font-black text-xl">\${i.count}</span>
                    </div>
                \`).join('');
            } catch(e) {
                document.getElementById('grades-list').innerText = "Помилка завантаження";
            }
        }
    </script>
</body>
</html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server is running!'));
