const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Головний інтерфейс додатку
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
</head>
<body class="bg-slate-900 text-white min-h-screen flex flex-col">

    <div id="login-screen" class="flex-grow flex flex-col justify-center p-6 max-w-sm mx-auto w-full">
        <h1 class="text-4xl font-bold text-center text-blue-500 mb-8 tracking-wider">HUMAN</h1>
        <div class="space-y-4">
            <input type="email" id="email" placeholder="Email" class="w-full p-4 rounded-xl bg-slate-800 border border-slate-700 outline-none focus:border-blue-500 transition-colors">
            <input type="password" id="password" placeholder="Пароль" class="w-full p-4 rounded-xl bg-slate-800 border border-slate-700 outline-none focus:border-blue-500 transition-colors">
            <button onclick="login()" id="btn" class="w-full bg-blue-600 hover:bg-blue-500 p-4 rounded-xl font-bold transition-colors">Увійти</button>
            <p id="msg" class="text-red-400 text-center text-sm hidden"></p>
        </div>
    </div>

    <div id="app-screen" class="hidden flex flex-col h-screen">
        <header class="p-6 border-b border-slate-800 bg-slate-900 sticky top-0">
            <div class="flex justify-between items-center mb-6">
                <h2 id="user-name" class="text-xl font-bold text-blue-400 truncate pr-4">Вітаємо!</h2>
                <button onclick="logout()" class="text-[10px] text-slate-400 uppercase tracking-widest border border-slate-700 px-3 py-1 rounded-lg">Вийти</button>
            </div>
            <div class="flex justify-around text-xs font-bold uppercase tracking-widest">
                <button onclick="loadTab('grades')" id="tab-grades" class="pb-3 text-blue-500 border-b-2 border-blue-500 w-full transition-colors">Оцінки</button>
                <button onclick="loadTab('schedule')" id="tab-schedule" class="pb-3 text-slate-500 border-b-2 border-transparent w-full transition-colors">Розклад</button>
                <button onclick="loadTab('hw')" id="tab-hw" class="pb-3 text-slate-500 border-b-2 border-transparent w-full transition-colors">ДЗ</button>
            </div>
        </header>
        
        <main id="content" class="flex-grow p-6 overflow-y-auto pb-24 space-y-3">
            </main>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();

        // Автоматичний вхід, якщо вже авторизувались раніше
        window.onload = () => {
            const token = localStorage.getItem('h_token');
            const name = localStorage.getItem('h_name');
            if (token && name) {
                showApp(name);
            }
        };

        async function login() {
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const btn = document.getElementById('btn');
            const msg = document.getElementById('msg');

            if (!email || !password) return;
            
            btn.innerText = 'Вхід у систему...';
            btn.disabled = true;
            msg.classList.add('hidden');

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email, password })
                });
                
                const data = await res.json();
                
                if (data.success) {
                    // Зберігаємо токен у пам'ять телефону
                    localStorage.setItem('h_token', data.token);
                    localStorage.setItem('h_uid', data.user.id);
                    localStorage.setItem('h_name', data.user.first_name);
                    showApp(data.user.first_name);
                } else {
                    msg.innerText = "Невірний логін або пароль";
                    msg.classList.remove('hidden');
                    btn.disabled = false;
                    btn.innerText = 'Увійти';
                }
            } catch (err) {
                msg.innerText = "Помилка зв'язку. Спробуйте ще раз.";
                msg.classList.remove('hidden');
                btn.disabled = false;
                btn.innerText = 'Увійти';
            }
        }

        function showApp(name) {
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-screen').classList.remove('hidden');
            document.getElementById('user-name').innerText = "Привіт, " + name + "!";
            loadTab('grades'); // Одразу вантажимо оцінки
        }

        function logout() {
            localStorage.clear();
            location.reload();
        }

        async function loadTab(type) {
            const content = document.getElementById('content');
            
            // Зміна кольору активної кнопки
            ['grades', 'schedule', 'hw'].forEach(t => {
                const btn = document.getElementById('tab-' + t);
                if(t === type) {
                    btn.classList.replace('text-slate-500', 'text-blue-500');
                    btn.classList.replace('border-transparent', 'border-blue-500');
                } else {
                    btn.classList.replace('text-blue-500', 'text-slate-500');
                    btn.classList.replace('border-blue-500', 'border-transparent');
                }
            });

            content.innerHTML = '<div class="text-center text-slate-500 py-10 animate-pulse">Отримання даних...</div>';

            try {
                const res = await fetch('/api/data?type=' + type, {
                    headers: {
                        'auth': localStorage.getItem('h_token'),
                        'uid': localStorage.getItem('h_uid')
                    }
                });
                const data = await res.json();
                
                if (!data || data.length === 0) {
                    content.innerHTML = '<div class="bg-slate-800/50 p-6 rounded-2xl text-center text-slate-500">Тут поки порожньо</div>';
                    return;
                }

                // Вивід даних списком
                content.innerHTML = data.map(item => {
                    const title = item.subject || item.title || (item.level ? item.level + ' рівень' : 'Дані');
                    const subtitle = item.time || item.deadline || '';
                    const badge = item.count ? '<div class="text-xl font-black text-blue-500 bg-blue-500/10 px-3 py-1 rounded-lg">' + item.count + '</div>' : '';
                    
                    return '<div class="bg-slate-800 p-5 rounded-2xl flex justify-between items-center border border-slate-700/50 shadow-sm"><div class="pr-4"><div class="font-bold text-slate-200">' + title + '</div><div class="text-[11px] text-slate-500 mt-1 uppercase tracking-wider font-bold">' + subtitle + '</div></div>' + badge + '</div>';
                }).join('');

            } catch (e) {
                content.innerHTML = '<div class="text-center text-red-400 py-10">Помилка завантаження даних</div>';
            }
        }
    </script>
</body>
</html>
    `);
});

// БЕКЕНД

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const response = await axios.post('https://api.human.ua/v1/auth', { email, password }, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000
        });
        res.json({ success: true, token: response.data.token, user: response.data.user });
    } catch (e) {
        res.status(401).json({ success: false });
    }
});

app.get('/api/data', async (req, res) => {
    const { auth, uid } = req.headers;
    const { type } = req.query;
    const config = { headers: { 'Authorization': 'Bearer ' + auth } };
    
    // Отримуємо сьогоднішню дату для розкладу
    const date = new Date().toISOString().split('T')[0];

    try {
        let url = '';
        if (type === 'grades') url = 'https://api.human.ua/v1/student/' + uid + '/performance/average';
        if (type === 'schedule') url = 'https://api.human.ua/v1/student/' + uid + '/lessons?date=' + date;
        if (type === 'hw') url = 'https://api.human.ua/v1/student/' + uid + '/assignments?status=active';

        const r = await axios.get(url, config);
        let result = r.data;
        
        // Витягуємо масив уроків, якщо це розклад
        if (type === 'schedule' && r.data.lessons) result = r.data.lessons;
        
        res.json(result);
    } catch (e) {
        res.json([]);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('App running on port', PORT));
