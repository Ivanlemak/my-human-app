const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Human App</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-white min-h-screen flex flex-col justify-center p-6">
    <div class="max-w-sm mx-auto w-full">
        <h1 class="text-4xl font-bold text-center text-blue-500 mb-8">HUMAN</h1>
        <div class="space-y-4">
            <input type="email" id="email" placeholder="Email" class="w-full p-4 rounded-xl bg-slate-800 border border-slate-700 outline-none text-white">
            <input type="password" id="password" placeholder="Пароль" class="w-full p-4 rounded-xl bg-slate-800 border border-slate-700 outline-none text-white">
            <button onclick="login()" id="btn" class="w-full bg-blue-600 p-4 rounded-xl font-bold">Увійти</button>
            <p id="msg" class="text-red-400 text-center text-sm hidden"></p>
        </div>
    </div>

    <script>
        async function login() {
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const btn = document.getElementById('btn');
            const msg = document.getElementById('msg');

            if (!email || !password) return;
            
            btn.innerText = 'Відправка запиту...';
            btn.disabled = true;
            msg.classList.add('hidden');

            try {
                // Використовуємо поточну адресу сайту
                const res = await fetch(window.location.origin + '/api/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email, password })
                });
                
                const data = await res.json();
                
                if (data.success) {
                    msg.innerText = "Успіх! Токен отримано.";
                    msg.classList.remove('hidden', 'text-red-400');
                    msg.classList.add('text-green-400');
                } else {
                    msg.innerText = "Помилка: " + (data.error || "Невірно");
                    msg.classList.remove('hidden');
                }
            } catch (err) {
                msg.innerText = "Фронтенд: Помилка з'єднання (" + err.message + ")";
                msg.classList.remove('hidden');
            }
            btn.innerText = 'Увійти';
            btn.disabled = false;
        }
    </script>
</body>
</html>
    `);
});

app.post('/api/login', async (req, res) => {
    console.log("--- НОВИЙ ЗАПИТ НА ВХІД ---");
    console.log("Email:", req.body.email);
    
    try {
        const { email, password } = req.body;
        console.log("Відправляю запит на api.human.ua...");
        
        const response = await axios.post('https://api.human.ua/v1/auth', { email, password }, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 15000 // Чекаємо 15 секунд
        });
        
        console.log("ВІДПОВІДЬ HUMAN: Успіх!");
        res.json({ success: true, token: response.data.token, user: response.data.user });
    } catch (error) {
        console.log("!!! ПОМИЛКА HUMAN API !!!");
        let errorText = "Невідома помилка";
        
        if (error.response) {
            console.log("Статус:", error.response.status);
            console.log("Дані помилки:", error.response.data);
            errorText = "Human відхилив запит (Код " + error.response.status + ")";
        } else if (error.request) {
            console.log("Human не відповів (Timeout або блокування IP)");
            errorText = "Сайт Human не відповідає серверу Render";
        } else {
            console.log("Помилка коду:", error.message);
            errorText = error.message;
        }
        
        res.status(400).json({ success: false, error: errorText });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Сервер запущено на порту', PORT));
