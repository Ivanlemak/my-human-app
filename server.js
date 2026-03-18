const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Головна сторінка з інтерфейсом
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Human Connect</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#0f172a] text-white min-h-screen flex flex-col">

    <div id="login-screen" class="flex-grow flex flex-col justify-center p-8 max-w-md mx-auto w-full">
        <h1 class="text-4xl font-black text-blue-500 text-center mb-8">HUMAN</h1>
        <div class="space-y-4">
            <input type="email" id="email" placeholder="Email" class="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700 outline-none focus:border-blue-500">
            <input type="password" id="password" placeholder="Пароль" class="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700 outline-none focus:border-blue-500">
            <button onclick="handleAuth()" id="auth-btn" class="w-full bg-blue-600 p-4 rounded-2xl font-bold active:scale-95 transition-all">Увійти</button>
            <p id="err" class="text-red-400 text-center text-sm hidden"></p>
        </div>
    </div>

    <div id="app-screen" class="hidden flex flex-col h-screen">
        <header class="p-6 border-b border-slate-800">
            <div class="flex justify-between items-center mb-4">
                <h2 id="user-name" class="text-xl font-bold text-blue-400">Вітаємо!</h2>
                <button onclick="logout()" class="text-xs text-slate-500 font-bold uppercase">Вийти</button>
            </div>
            <div class="flex gap-4 text-sm font-bold">
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

        window.onload = () => {
            const token = localStorage.getItem('h_token');
            if (token) showApp(localStorage.getItem('h_name'));
        };

        async function handleAuth() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const btn = document.getElementById('auth-btn');
            const err = document.getElementById('err');

            btn.disabled = true;
            btn.innerText = "Перевірка...";

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
                    err.innerText = "Невірні дані";
                    err.classList.remove('hidden');
                    btn.disabled = false;
                    btn.innerText = "Увійти";
                }
            } catch (e) {
                err.innerText = "Помилка сервера";
                err.classList.remove('hidden');
                btn.disabled = false;
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
            list.innerHTML = 'Завантаження...';
            try {
                const res = await fetch('/api/data?type=' + type, {
                    headers: {
                        'auth': localStorage.getItem('h_token'),
                        'uid': localStorage.getItem('h_uid')
                    }
                });
                const data = await res.json();
                if (data.length === 0) {
                    list.innerHTML = 'Нічого не знайдено';
                    return;
                }
                list.innerHTML = data.map(item => {
                    const title = item.subject || item.title || (item.level ? item.level + ' рівень' : 'Дані');
                    const subtitle = item.time || item.deadline || '';
                    const val = item.count ? '<div class="text-2xl font-black text-blue-500">' + item.count + '</div>' : '';
                    return '<div class="p-5 bg-slate-800 rounded-2xl flex justify-between items-center"><div><div class="font-bold">' + title + '</div><div class="text-xs text-slate-500">' + subtitle + '</div></div>' + val + '</div>';
                }).join('');
            } catch (e) { list.innerHTML = 'Помилка'; }
        }

        function logout() { localStorage.clear(); location.reload(); }
    </script>
</body>
</html>
    `);
});

// Роути API
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const response = await axios.post('https://api.human.ua/v1/auth', { email, password });
        res.json({ success: true, token: response.data.token, user: response.data.user });
    } catch (e) { res.status(401).json({ success: false }); }
});

app.get('/api/data', async (req, res) => {
    const { auth, uid } = req.headers;
    const { type } = req.query;
    const date = new Date().toISOString().split('T')[0];
    try {
        let url = '';
        if (type === 'grades') url = 'https://api.human.ua/v1/student/' + uid + '/performance/average';
        if (type === 'schedule') url = 'https://api.human.ua/v1/student/' + uid + '/lessons?date=' + date;
        if (type === 'hw') url = 'https://api.human.ua/v1/student/' + uid + '/assignments?status=active';
        const r = await axios.get(url, { headers: { 'Authorization': 'Bearer ' + auth } });
        res.json(r.data.lessons || r.data);
    } catch (e) { res.json([]); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server OK'));
