const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// ГОЛОВНА СТОРІНКА (ІНТЕРФЕЙС)
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Human Connect</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#0f172a] text-white font-sans min-h-screen flex flex-col">

    <div id="loader" class="fixed inset-0 z-50 bg-[#0f172a] flex items-center justify-center hidden">
        <div class="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div id="login-screen" class="flex-grow flex flex-col justify-center p-8 max-w-md mx-auto w-full">
        <div class="text-center mb-8">
            <h1 class="text-4xl font-black text-blue-500 tracking-tight">HUMAN</h1>
            <p class="text-slate-400 text-sm mt-2">Миттєвий доступ до навчання</p>
        </div>
        
        <div class="space-y-4">
            <input type="email" id="email" placeholder="Email від Human" class="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700 outline-none focus:border-blue-500 transition-all">
            <input type="password" id="password" placeholder="Пароль" class="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700 outline-none focus:border-blue-500 transition-all">
            <button onclick="handleAuth()" id="auth-btn" class="w-full bg-blue-600 p-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-all">Перевірити та увійти</button>
            <p id="err" class="text-red-400 text-center text-sm hidden"></p>
        </div>
    </div>

    <div id="app-screen" class="hidden flex flex-col h-screen">
        <header class="p-6 border-b border-slate-800">
            <div class="flex justify-between items-center">
                <h2 id="user-name" class="text-xl font-bold text-blue-400">Вітаємо!</h2>
                <button onclick="logout()" class="text-xs text-slate-500 font-bold uppercase tracking-wider">Вийти</button>
            </div>
            <div class="flex mt-6 gap-4 text-sm font-bold">
                <button onclick="loadTab('grades')" class="pb-2 border-b-2 border-blue-500">Оцінки</button>
                <button onclick="loadTab('schedule')" class="pb-2 text-slate-500">Розклад</button>
                <button onclick="loadTab('hw')" class="pb-2 text-slate-500">ДЗ</button>
            </div>
        </header>
        <div id="list" class="flex-grow p-6 overflow-y-auto space-y-4"></div>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();

        // Авто-вхід, якщо токен вже є
        window.onload = () => {
            const token = localStorage.getItem('h_token');
            if (token) showApp(localStorage.getItem('h_name'));
        };

        async function handleAuth() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const btn = document.getElementById('auth-btn');
            const err = document.getElementById('err');

            if (!email || !password) return;

            btn.disabled = true;
            btn.innerText = "Перевірка в Human.ua...";
            err.classList.add('hidden');

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email, password })
                });
                
                const data = await res.json();

                if (data.success) {
                    localStorage.setItem('h_token', data.token);
                    localStorage.setItem('h_uid', data.user.id);
                    localStorage.setItem('h_name', data.user.first_name);
                    showApp(data.user.first_name);
                } else {
                    throw new Error(data.message || "Помилка аккаунта");
                }
            } catch (e) {
                err.innerText = "Акаунт не знайдено або дані невірні";
                err.classList.remove('hidden');
                btn.disabled = false;
                btn.innerText = "Спробувати знову";
            }
        }

        function showApp(name) {
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('app-screen').classList.remove('hidden');
            document.getElementById('user-name').innerText = "Привіт, " + name;
            loadTab('grades');
        }

        async function loadTab(type) {
            const list = document.getElementById('list');
            list.innerHTML = '<p class="text-center animate-pulse text-slate-500">Отримання даних...</p>';

            try {
                const res = await fetch('/api/data?type=' + type, {
                    headers: {
                        'auth': localStorage.getItem('h_token'),
                        'uid': localStorage.getItem('h_uid')
                    }
                });
                const data = await res.json();
                
                if (data.length === 0) {
                    list.innerHTML = '<p class="text-center text-slate-500 py-10">Даних не знайдено</p>';
                    return;
                }

                list.innerHTML = data.map(item => \`
                    <div class="p-5 bg-slate-800/50 rounded-2xl border border-slate-700 flex justify-between items-center">
                        <div>
                            <div class="font-bold text-slate-100">\${item.subject || item.title || item.level + ' рівень'}</div>
                            <div class="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">\${item.time || item.deadline || ''}</div>
                        </div>
                        \${item.count ? \`<div class="text-2xl font-black text-blue-500">\${item.count}</div>\` : ''}
                    </div>
                \`).join('');
            } catch (e) {
                list.innerHTML = '<p class="text-red-400 text-center text-xs">Помилка завантаження</p>';
            }
        }

        function logout() {
            localStorage.clear();
            location.reload();
        }
    </script>
</body>
</html>
    `);
});

// СЕРВЕРНИЙ ЛОГІН (ПРОКСІ ДО HUMAN.UA)
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Відправляємо форму на офіційний API Human
        const response = await axios.post('https://api.human.ua/v1/auth', {
            email, password
        }, { timeout: 15000 });

        res.json({ 
            success: true, 
            token: response.data.token, 
            user: response.data.user 
        });
    } catch (e) {
        res.status(401).json({ success: false, message: "Невірні дані" });
    }
});

// ОТРИМАННЯ ДАНИХ (ПРОКСІ)
app.get('/api/data', async (req, res) => {
    const { auth, uid } = req.headers;
    const { type } = req.query;
    const config = { headers: { 'Authorization': 'Bearer ' + auth } };
    const date = new Date().toISOString().split('T')[0];

    try {
        let url = '';
        if (type === 'grades') url = \`https://api.human.ua/v1/student/\${uid}/performance/average\`;
        if (type === 'schedule') url = \`https://api.human.ua/v1/student/\${uid}/lessons?date=\${date}\`;
        if (type === 'hw') url = \`https://api.human.ua/v1/student/\${uid}/assignments?status=active\`;

        const r = await axios.get(url, config);
        let result = r.data;
        if (type === 'schedule' && r.data.lessons) result = r.data.lessons;
        res.json(result);
    } catch (e) {
        res.json([]);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('🚀 Human Server Ready'));
