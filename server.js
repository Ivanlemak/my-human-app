const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ====== FRONTEND (ІНТЕРФЕЙС) ======
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Human App</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background: #030712; color: white; font-family: sans-serif; }
        .glass { background: rgba(17, 24, 39, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.05); }
    </style>
</head>
<body class="min-h-screen flex flex-col">

    <div id="auth-screen" class="flex-grow flex flex-col items-center justify-center p-8 w-full max-w-sm mx-auto">
        <h1 class="text-5xl font-black text-blue-600 mb-8 tracking-tighter">HUMAN</h1>
        <div class="space-y-4 w-full">
            <input type="email" id="email" placeholder="Email" class="w-full p-4 rounded-2xl bg-slate-800 border-none text-white outline-none focus:ring-2 ring-blue-500">
            <input type="password" id="password" placeholder="Пароль" class="w-full p-4 rounded-2xl bg-slate-800 border-none text-white outline-none focus:ring-2 ring-blue-500">
            <button onclick="login()" id="btn" class="w-full bg-blue-600 hover:bg-blue-500 p-4 rounded-2xl font-bold transition-all active:scale-95">Увійти</button>
            <p id="msg" class="text-center text-red-400 text-sm hidden bg-red-400/10 p-3 rounded-xl"></p>
        </div>
    </div>

    <div id="main-screen" class="hidden flex flex-col h-screen">
        <header class="p-6 sticky top-0 bg-[#030712]/80 backdrop-blur-md z-10">
            <div class="flex justify-between items-center mb-6">
                <h2 id="u-name" class="text-xl font-bold text-blue-400">Привіт</h2>
                <button onclick="localStorage.clear();location.reload()" class="text-[10px] text-slate-500 uppercase tracking-widest border border-slate-800 px-2 py-1 rounded">Вийти</button>
            </div>
            <div class="flex justify-around border-b border-slate-800 text-xs font-bold uppercase tracking-widest">
                <button onclick="load('grades')" id="t-grades" class="pb-3 text-blue-500 border-b-2 border-blue-500 w-full">Оцінки</button>
                <button onclick="load('schedule')" id="t-schedule" class="pb-3 text-slate-500 w-full">Розклад</button>
                <button onclick="load('hw')" id="t-hw" class="pb-3 text-slate-500 w-full">ДЗ</button>
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
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const btn = document.getElementById('btn');
            const msg = document.getElementById('msg');

            if(!email || !password) return;
            
            btn.innerText = 'Перевірка...';
            btn.disabled = true;
            msg.classList.add('hidden');

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();

                if(data.success) {
                    localStorage.setItem('h_token', data.token);
                    localStorage.setItem('h_uid', data.user.id);
                    localStorage.setItem('h_name', data.user.first_name);
                    show(data.user.first_name);
                } else {
                    msg.innerText = data.error || "Помилка входу";
                    msg.classList.remove('hidden');
                    btn.innerText = 'Увійти';
                    btn.disabled = false;
                }
            } catch(e) {
                msg.innerText = "Сервер не відповідає. Спробуйте ще раз.";
                msg.classList.remove('hidden');
                btn.innerText = 'Увійти';
                btn.disabled = false;
            }
        }

        function show(name) {
            document.getElementById('auth-screen').classList.add('hidden');
            document.getElementById('main-screen').classList.remove('hidden');
            document.getElementById('u-name').innerText = "Привіт, " + name + "!";
            load('grades');
        }

        async function load(type) {
            const list = document.getElementById('list');
            list.innerHTML = '<div class="text-center py-10 animate-pulse text-slate-500">Завантаження...</div>';

            // Перемикання стилів табів
            ['grades', 'schedule', 'hw'].forEach(t => {
                const b = document.getElementById('t-'+t);
                if(t === type) {
                    b.classList.add('text-blue-500', 'border-b-2', 'border-blue-500');
                    b.classList.remove('text-slate-500');
                } else {
                    b.classList.remove('text-blue-500', 'border-b-2', 'border-blue-500');
                    b.classList.add('text-slate-500');
                }
            });

            try {
                const res = await fetch('/api/data?type=' + type, {
                    headers: {
                        'auth': localStorage.getItem('h_token'),
                        'uid': localStorage.getItem('h_uid')
                    }
                });
                const data = await res.json();

                if(!data || data.length === 0) {
                    list.innerHTML = '<div class="text-center text-slate-600 py-10">Даних не знайдено</div>';
                    return;
                }

                list.innerHTML = data.map(i => \`
                    <div class="glass p-5 rounded-2xl flex justify-between items-center shadow-lg">
                        <div>
                            <div class="font-bold text-slate-100">\${i.subject || i.title || 'Предмет'}</div>
                            <div class="text-[10px] text-slate-500 mt-1 uppercase font-black tracking-widest">\${i.time || i.deadline || ''}</div>
                        </div>
                        <div class="text-2xl font-black text-blue-500">\${i.value || i.count || ''}</div>
                    </div>
                \`).join('');
            } catch(e) {
                list.innerHTML = '<div class="text-center text-red-400 py-10">Помилка завантаження</div>';
            }
        }
    </script>
</body>
</html>
    `);
});

// ====== BACKEND (ЛОГІКА СЕРВЕРА) ======

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const r = await axios.post('https://api.human.ua/v1/auth', { email, password }, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        res.json({ success: true, token: r.data.token, user: r.data.user });
    } catch (e) {
        let errorMsg = "Помилка входу";
        if (e.response?.status === 401) errorMsg = "Невірний логін або пароль";
        if (e.response?.status === 403) errorMsg = "Доступ заблоковано (403)";
        res.status(200).json({ success: false, error: errorMsg });
    }
});

app.get('/api/data', async (req, res) => {
    const { auth, uid } = req.headers;
    const { type } = req.query;
    if(!auth || !uid) return res.json([]);

    const config = { headers: { 'Authorization': 'Bearer ' + auth }, timeout: 10000 };
    const date = new Date().toISOString().split('T')[0];

    try {
        let url = '';
        if (type === 'grades') url = \`https://api.human.ua/v1/student/\${uid}/performance/average\`;
        else if (type === 'schedule') url = \`https://api.human.ua/v1/student/\${uid}/lessons?date=\${date}\`;
        else url = \`https://api.human.ua/v1/student/\${uid}/assignments?status=active\`;

        const r = await axios.get(url, config);
        let data = r.data;
        
        // Маленьке виправлення для різних типів даних
        if (type === 'schedule' && data.lessons) data = data.lessons;
        
        res.json(Array.isArray(data) ? data : (data.data || []));
    } catch (e) {
        res.json([]);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server is running on port', PORT));



