const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- БЕКЕНД: Логіка запитів до Human.ua ---

// Проксі для авторизації
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Робимо реальний запит до Human.ua
        const response = await axios.post('https://api.human.ua/v1/account/auth', {
            email: email,
            password: password
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        // Якщо Human повернув токен
        if (response.data && response.data.token) {
            console.log("Вхід успішний!");
            res.json({ success: true, token: response.data.token, user: response.data.user });
        } else {
            res.status(401).json({ error: "Не вдалося отримати токен" });
        }
    } catch (e) {
        console.error("Помилка Human API:", e.response?.data || e.message);
        res.status(e.response?.status || 500).json({ 
            error: "Помилка входу", 
            details: e.response?.data 
        });
    }
});

// Проксі для отримання даних (оцінки/дз)
app.get('/api/data', async (req, res) => {
    const token = req.headers.authorization;
    try {
        // Приклад отримання оцінок
        const response = await axios.get('https://api.human.ua/v1/student/grades', {
            headers: { 'Authorization': token }
        });
        res.json(response.data);
    } catch (e) {
        res.status(500).json({ error: "Не вдалося завантажити дані" });
    }
});

// --- ФРОНТЕНД: Візуальна частина (HTML/CSS/JS) ---

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
        body { background-color: #000; color: white; font-family: sans-serif; }
        .card { background: #1c1c1e; border-radius: 15px; padding: 15px; margin-bottom: 10px; }
        .btn-main { background: #007aff; border-radius: 10px; padding: 12px; width: 100%; font-weight: bold; }
    </style>
</head>
<body class="p-4">
    <div id="auth-screen">
        <h1 class="text-2xl font-bold mb-6 text-center">Вхід у Human</h1>
        <input id="email" type="email" placeholder="Email" class="w-full p-3 mb-3 rounded bg-gray-800 border-none text-white">
        <input id="pass" type="password" placeholder="Пароль" class="w-full p-3 mb-6 rounded bg-gray-800 border-none text-white">
        <button onclick="login()" class="btn-main">Увійти</button>
    </div>

    <div id="main-screen" class="hidden">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold">Привіт, <span id="user-name">Учень</span>!</h2>
            <div class="bg-blue-600 px-3 py-1 rounded-full text-sm">Ср. бал: <span id="avg-grade">0.0</span></div>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-6">
            <div class="card text-center">🗓️ Розклад</div>
            <div class="card text-center">📝 Домашка</div>
        </div>

        <h3 class="text-gray-400 text-sm mb-3">ОСТАННІ ОЦІНКИ</h3>
        <div id="grades-list">
            <p class="text-gray-600">Завантаження...</p>
        </div>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();

        async function login() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('pass').value;

            // Імітація запиту до нашого API
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ email, password })
            });

            if(res.ok) {
                document.getElementById('auth-screen').classList.add('hidden');
                document.getElementById('main-screen').classList.remove('hidden');
                loadData();
            } else {
                alert("Помилка авторизації!");
            }
        }

        function loadData() {
            // Тут ми мали б отримати реальні дані
            // Для прикладу імітуємо список
            const mockGrades = [11, 10, 12, 9, 12];
            const avg = (mockGrades.reduce((a,b) => a+b) / mockGrades.length).toFixed(1);
            document.getElementById('avg-grade').innerText = avg;

            const list = document.getElementById('grades-list');
            list.innerHTML = mockGrades.map(g => \`
                <div class="card flex justify-between items-center">
                    <span>Математика</span>
                    <span class="text-blue-400 font-bold">\${g}</span>
                </div>
            \`).join('');
        }
    </script>
</body>
</html>
    `);
});

app.listen(PORT, () => {
    console.log(\`Сервер працює на порту \${PORT}\`);
});