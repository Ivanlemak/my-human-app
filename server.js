const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// --- ІНТЕРФЕЙС (HTML) ---
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
        body { background-color: #0f172a; color: white; font-family: sans-serif; }
    </style>
</head>
<body class="p-6 min-h-screen flex flex-col justify-center">
    <div id="auth-screen" class="max-w-sm mx-auto w-full">
        <h1 class="text-3xl font-black text-blue-500 mb-8 text-center uppercase tracking-widest">Human</h1>
        <div class="space-y-4">
            <input type="email" id="email" placeholder="Email" class="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700 focus:border-blue-500 outline-none transition-all">
            <input type="password" id="password" placeholder="Пароль" class="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700 focus:border-blue-500 outline-none transition-all">
            <button onclick="login()" id="btn" class="w-full bg-blue-600 p-4 rounded-2xl font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-lg">Увійти</button>
        </div>
        <div id="err-box" class="hidden mt-6 p-4 bg-red-500/20 border border-red-500 rounded-2xl text-red-400 text-sm text-center">
            <p id="err-text"></p>
        </div>
    </div>

    <div id="main-screen" class="hidden max-w-sm mx-auto w-full">
        <div class="text-center mb-8">
            <h2 id="user-name" class="text-2xl font-bold text-white">Вітаємо!</h2>
            <p class="text-slate-400">Твої результати</p>
        </div>
        <div class="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-2xl">
            <div id="stats" class="space-y-4 text-center text-slate-400 font-medium">
                Завантаження успішності...
            </div>
        </div>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();

        async function login() {
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const btn = document.getElementById('btn');
            const errBox = document.getElementById('err-box');
            
            if(!email || !password) return;

            btn.disabled = true;
            btn.innerText = 'Входимо...';
            errBox.classList.add('hidden');

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email, password })
                });
                const data = await response.json();

                if(data.success) {
                    document.getElementById('auth-screen').classList.add('hidden');
                    document.getElementById('main-screen').classList.remove('hidden');
                    document.getElementById('user-name').innerText = "Привіт, " + data.user.first_name + "!";
                    loadStats(data.token);
                } else {
                    document.getElementById('err-text').innerText = data.error;
                    errBox.classList.remove('hidden');
                    btn.disabled = false;
                    btn.innerText = 'Увійти';
                }
            } catch(e) {
                document.getElementById('err-text').innerText = "Помилка мережі";
                errBox.classList.remove('hidden');
                btn.disabled = false;
            }
        }

        async function loadStats(token) {
            try {
                const r = await fetch('/api/stats', { headers: {'Authorization': token} });
                const stats = await r.json();
                const list = document.getElementById('stats');
                
                if(stats.length === 0) {
                    list.innerHTML = "Даних поки немає";
                    return;
                }

                list.innerHTML = stats.map(s => \`
                    <div class="flex justify-between items-center bg-slate-700/50 p-4 rounded-2xl">
                        <span class="capitalize text-slate-200">\${s.level} рівень</span>
                        <span class="text-blue-400 font-black text-xl">\${s.count}</span>
                    </div>
                \`).join('');
            } catch(e) {
                document.getElementById('stats').innerText = "Помилка завантаження балів";
            }
        }
    </script>
</body>
</html>
    `);
});

// --- API ---

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const response = await axios.post('https://api.human.ua/v1/auth', {
            email,
            password
        }, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            }
        });

        if (response.data && response.data.token) {
            res.json({ success: true, token: response.data.token, user: response.data.user });
        } else {
            res.status(401).json({ success: false, error: "Не вдалося отримати токен" });
        }
    } catch (e) {
        const status = e.response?.status || 500;
        const msg = e.response?.data?.message || "Невірний логін або пароль";
        res.status(status).json({ success: false, error: \`[\${status}] \${msg}\` });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const token = req.headers.authorization;
        const response = await axios.get('https://api.human.ua/v1/student/421680/performance/average', {
            headers: { 'Authorization': \`Bearer \${token}\` }
        });
        res.json(response.data);
    } catch (e) {
        res.status(500).json([]);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server is running on ' + PORT));
