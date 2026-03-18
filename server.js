const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// --- ІНТЕРФЕЙС (HTML + CSS + JS) ---
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Human Mini App</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background-color: #0f172a; color: white; font-family: sans-serif; overflow-x: hidden; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .nav-btn.active { color: #3b82f6; border-top: 2px solid #3b82f6; }
    </style>
</head>
<body class="min-h-screen flex flex-col">

    <div id="auth-screen" class="flex-grow flex flex-col justify-center p-6">
        <div class="text-center mb-10">
            <h1 class="text-4xl font-black text-blue-500 tracking-widest">HUMAN</h1>
            <p class="text-slate-400 text-sm mt-2">Твій щоденник у Telegram</p>
        </div>
        <div class="space-y-4 max-w-sm mx-auto w-full">
            <input type="email" id="email" placeholder="Email" class="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700 outline-none focus:border-blue-500">
            <input type="password" id="password" placeholder="Пароль" class="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700 outline-none focus:border-blue-500">
            <button onclick="login()" id="login-btn" class="w-full bg-blue-600 p-4 rounded-2xl font-bold active:scale-95 transition-all shadow-lg">Увійти</button>
            <p id="err-text" class="text-red-400 text-center text-sm hidden"></p>
        </div>
    </div>

    <div id="main-screen" class="hidden flex flex-col h-screen">
        <header class="p-6 pb-2">
            <h2 id="user-name" class="text-2xl font-bold">Привіт!</h2>
            <p class="text-slate-400 text-sm" id="current-tab-title">Оцінки</p>
        </header>

        <main class="flex-grow overflow-y-auto p-6 pb-24">
            <div id="tab-grades" class="tab-content active">
                <div id="grades-list" class="space-y-3">
                    <p class="text-slate-500 text-center animate-pulse">Завантаження оцінок...</p>
                </div>
            </div>

            <div id="tab-schedule" class="tab-content">
                <div class="bg-slate-800 p-6 rounded-3xl border border-slate-700 text-center">
                    <p class="text-slate-400">Розклад на сьогодні порожній або завантажується...</p>
                </div>
            </div>

            <div id="tab-homework" class="tab-content">
                <div class="bg-slate-800 p-6 rounded-3xl border border-slate-700 text-center">
                    <p class="text-slate-400">Нових завдань не знайдено</p>
                </div>
            </div>
        </main>

        <nav class="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex justify-around p-3 pb-6">
            <button onclick="switchTab('grades')" class="nav-btn active flex flex-col items-center text-xs" id="btn-grades">
                <span class="text-xl">📊</span>
                <span>Оцінки</span>
            </button>
            <button onclick="switchTab('schedule')" class="nav-btn flex flex-col items-center text-xs" id="btn-schedule">
                <span class="text-xl">📅</span>
                <span>Розклад</span>
            </button>
            <button onclick="switchTab('homework')" class="nav-btn flex flex-col items-center text-xs" id="btn-homework">
                <span class="text-xl">📝</span>
                <span>Домашка</span>
            </button>
        </nav>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();
        
        let currentUser = null;
        let authToken = null;

        async function login() {
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const btn = document.getElementById('login-btn');
            const err = document.getElementById('err-text');

            btn.disabled = true;
            btn.innerText = 'Входимо...';

            try {
                const r = await fetch('/api/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email, password })
                });
                const d = await r.json();

                if (d.success) {
                    authToken = d.token;
                    currentUser = d.user;
                    document.getElementById('auth-screen').classList.add('hidden');
                    document.getElementById('main-screen').classList.remove('hidden');
                    document.getElementById('user-name').innerText = "Привіт, " + d.user.first_name + "!";
                    loadData('grades');
                } else {
                    err.innerText = d.error;
                    err.classList.remove('hidden');
                    btn.disabled = false;
                    btn.innerText = 'Увійти';
                }
            } catch(e) {
                err.innerText = "Помилка мережі";
                err.classList.remove('hidden');
                btn.disabled = false;
            }
        }

        function switchTab(tab) {
            // Перемикання контенту
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById('tab-' + tab).classList.add('active');

            // Перемикання кнопок
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('btn-' + tab).classList.add('active');

            const titles = { grades: 'Оцінки', schedule: 'Розклад', homework: 'Домашка' };
            document.getElementById('current-tab-title').innerText = titles[tab];

            loadData(tab);
        }

        async function loadData(type) {
            if (type === 'grades') {
                const list = document.getElementById('grades-list');
                try {
                    const r = await fetch('/api/stats', { 
                        headers: { 
                            'Authorization': authToken,
                            'User-ID': currentUser.id 
                        } 
                    });
                    const stats = await r.json();
                    
                    list.innerHTML = stats.map(s => \`
                        <div class="flex justify-between items-center bg-slate-800 p-5 rounded-3xl border border-slate-700 shadow-lg">
                            <span class="capitalize font-medium">\${s.level} рівень</span>
                            <span class="bg-blue-600 px-4 py-1 rounded-full font-bold">\${s.count}</span>
                        </div>
                    \`).join('');
                } catch(e) {
                    list.innerHTML = "Не вдалося завантажити оцінки.";
                }
            }
        }
    </script>
</body>
</html>
    `);
});

// --- API (СЕРВЕРНА ЛОГІКА) ---

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const response = await axios.post('https://api.human.ua/v1/auth', { email, password }, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        res.json({ success: true, token: response.data.token, user: response.data.user });
    } catch (e) {
        res.status(401).json({ success: false, error: "Невірний логін" });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const token = req.headers.authorization;
        const userId = req.headers['user-id']; // Беремо ID того, хто залогінився
        
        const response = await axios.get(\`https://api.human.ua/v1/student/\${userId}/performance/average\`, {
            headers: { 'Authorization': "Bearer " + token }
        });
        res.json(response.data);
    } catch (e) {
        res.json([{level: 'помилка', count: 0}]);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Бот запущено!"));
