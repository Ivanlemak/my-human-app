const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// 1. НАЛАШТУВАННЯ БЕЗПЕКИ (Щоб Telegram не блокував запити)
app.use(cors());
app.use(express.json());

// 2. ГОЛОВНИЙ ІНТЕРФЕЙС
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
        body { background: #0f172a; color: white; font-family: -apple-system, system-ui, sans-serif; overflow-x: hidden; }
        .tab-active { color: #3b82f6; border-bottom: 2px solid #3b82f6; }
        .glass { background: rgba(30, 41, 59, 0.6); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); }
        input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3); }
    </style>
</head>
<body class="min-h-screen flex flex-col">

    <div id="loader" class="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center">
        <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-slate-400 text-sm mt-4 font-medium tracking-wide">З'єднання з Human...</p>
    </div>

    <div id="auth-screen" class="hidden flex-grow flex flex-col justify-center p-8 max-w-sm mx-auto w-full">
        <div class="text-center mb-10">
            <h1 class="text-5xl font-black text-blue-500 tracking-tighter">HUMAN</h1>
            <p class="text-slate-400 mt-2 text-sm">Твій персональний щоденник</p>
        </div>
        <div class="space-y-4">
            <input type="email" id="email" placeholder="Твій Email" class="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700 outline-none transition-all">
            <input type="password" id="password" placeholder="Пароль" class="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700 outline-none transition-all">
            <button onclick="handleLogin()" id="login-btn" class="w-full bg-blue-600 hover:bg-blue-500 p-4 rounded-2xl font-bold shadow-lg shadow-blue-900/20 active:scale-95 transition-all">Увійти</button>
            <p id="error-msg" class="text-center text-red-400 text-sm font-medium hidden"></p>
        </div>
    </div>

    <div id="main-screen" class="hidden flex flex-col h-screen">
        <header class="p-6 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
            <div class="flex justify-between items-center mb-6">
                <h2 id="user-name" class="text-xl font-bold truncate pr-4 text-blue-400">Вітаємо!</h2>
                <button onclick="doLogout()" class="text-[10px] text-slate-500 font-black uppercase border border-slate-800 px-3 py-2 rounded-xl">Вийти</button>
            </div>
            <div class="flex justify-around text-xs font-bold uppercase tracking-widest border-b border-slate-800">
                <button onclick="changeTab('grades')" id="t-grades" class="tab-active pb-3">Оцінки</button>
                <button onclick="changeTab('schedule')" id="t-schedule" class="text-slate-500 pb-3">Розклад</button>
                <button onclick="changeTab('hw')" id="t-hw" class="text-slate-500 pb-3">Завдання</button>
            </div>
        </header>

        <main id="main-content" class="flex-grow p-6 overflow-y-auto space-y-4 pb-24">
            </main>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();

        // Функція для запитів, яка працює на будь-якому домені
        async function apiRequest(path, method = 'GET', body = null) {
            const headers = {
                'Content-Type': 'application/json',
                'auth': localStorage.getItem('h_token'),
                'uid': localStorage.getItem('h_uid')
            };
            const config = { method, headers };
            if (body) config.body = JSON.stringify(body);
            
            const response = await fetch(window.location.origin + path, config);
            if (!response.ok) throw new Error('Network error');
            return response.json();
        }

        window.onload = async () => {
            const token = localStorage.getItem('h_token');
            const name = localStorage.getItem('h_name');

            if (token) {
                renderMain(name);
            } else {
                document.getElementById('loader').style.display = 'none';
                document.getElementById('auth-screen').classList.remove('hidden');
            }
        };

        async function handleLogin() {
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const btn = document.getElementById('login-btn');
            const err = document.getElementById('error-msg');

            if(!email || !password) return;

            btn.disabled = true;
            btn.innerText = 'Зачекайте...';
            err.classList.add('hidden');

            try {
                const data = await apiRequest('/api/login', 'POST', { email, password });
                if (data.success) {
                    localStorage.setItem('h_token', data.token);
                    localStorage.setItem('h_uid', data.user.id);
                    localStorage.setItem('h_name', data.user.first_name);
                    renderMain(data.user.first_name);
                } else {
                    throw new Error();
                }
            } catch (e) {
                err.innerText = "Неправильний логін або пароль";
                err.classList.remove('hidden');
                btn.disabled = false;
                btn.innerText = 'Увійти';
            }
        }

        function renderMain(name) {
            document.getElementById('loader').style.display = 'none';
            document.getElementById('auth-screen').style.display = 'none';
            document.getElementById('main-screen').classList.remove('hidden');
            document.getElementById('user-name').innerText = "Привіт, " + name + "!";
            changeTab('grades');
        }

        function doLogout() {
            localStorage.clear();
            location.reload();
        }

        async function changeTab(tab) {
            const container = document.getElementById('main-content');
            
            // Оновлюємо кнопки
            document.querySelectorAll('header button[id]').forEach(b => {
                b.classList.remove('tab-active', 'text-white');
                b.classList.add('text-slate-500');
            });
            document.getElementById('t-' + tab).classList.add('tab-active', 'text-white');
            
            container.innerHTML = '<div class="flex justify-center py-10"><div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>';

            try {
                const data = await apiRequest('/api/data?type=' + tab);
                
                if (!data || data.length === 0) {
                    container.innerHTML = '<div class="glass p-10 rounded-3xl text-center text-slate-500">Тут порожньо</div>';
                    return;
                }

                container.innerHTML = data.map(item => \`
                    <div class="glass p-5 rounded-2xl flex justify-between items-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div class="pr-4">
                            <div class="font-bold text-slate-100">\${item.subject || item.title || item.level + ' рівень'}</div>
                            <div class="text-[10px] text-slate-500 mt-1 uppercase font-black">\${item.time || item.deadline || ''}</div>
                        </div>
                        \${item.count ? \`<div class="text-2xl font-black text-blue-500">\${item.count}</div>\` : ''}
                    </div>
                \`).join('');
            } catch(e) {
                container.innerHTML = '<div class="text-center text-red-400 py-10">Помилка завантаження даних</div>';
            }
        }
    </script>
</body>
</html>
    `);
});

// 3. БЕКЕНД ЛОГІКА
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const response = await axios.post('https://api.human.ua/v1/auth', { email, password }, { timeout: 10000 });
        res.json({ success: true, token: response.data.token, user: response.data.user });
    } catch (e) {
        res.status(401).json({ success: false });
    }
});

app.get('/api/data', async (req, res) => {
    const { auth, uid } = req.headers;
    const { type } = req.query;
    const config = { headers: { 'Authorization': 'Bearer ' + auth }, timeout: 10000 };
    const today = new Date().toISOString().split('T')[0];

    try {
        let url = '';
        if (type === 'grades') url = "https://api.human.ua/v1/student/" + uid + "/performance/average";
        if (type === 'schedule') url = "https://api.human.ua/v1/student/" + uid + "/lessons?date=" + today;
        if (type === 'hw') url = "https://api.human.ua/v1/student/" + uid + "/assignments?status=active";

        const response = await axios.get(url, config);
        let result = response.data;
        
        // Виправляємо структуру для розкладу
        if (type === 'schedule' && response.data.lessons) result = response.data.lessons;
        
        res.json(result);
    } catch (e) {
        res.json([]);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server is running on port ' + PORT));
