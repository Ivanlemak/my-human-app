const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// Дозволяємо всі запити (важливо для Telegram)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'auth', 'uid']
}));
app.use(express.json());

// ПЕРЕВІРКА ПРИСУТНОСТІ (Щоб Render не спав)
app.get('/ping', (req, res) => res.send('ok'));

// ГОЛОВНА СТОРІНКА (ІНТЕРФЕЙС)
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>HumanConnect</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background: #030712; color: white; font-family: sans-serif; -webkit-tap-highlight-color: transparent; }
        .glass { background: rgba(17, 24, 39, 0.6); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.06); }
        .tab-active { color: #3b82f6; position: relative; font-weight: bold; }
        .tab-active::after { content: ''; position: absolute; bottom: -8px; left: 0; width: 100%; height: 2px; background: #3b82f6; border-radius: 10px; }
    </style>
</head>
<body class="min-h-screen flex flex-col">

    <div id="loader" class="fixed inset-0 z-50 bg-[#030712] flex items-center justify-center">
        <div class="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div id="auth-screen" class="hidden flex-grow flex flex-col items-center justify-center p-8 max-w-sm mx-auto w-full">
        <div class="mb-12 text-center">
            <h1 class="text-5xl font-black text-blue-500 tracking-tighter uppercase">Human</h1>
            <p class="text-slate-500 mt-2 text-xs font-bold uppercase tracking-widest">Професійний щоденник</p>
        </div>
        
        <div class="space-y-4 w-full">
            <input type="email" id="email" placeholder="Твій Email" class="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700 outline-none focus:ring-1 ring-blue-500 transition-all text-white">
            <input type="password" id="password" placeholder="Пароль" class="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700 outline-none focus:ring-1 ring-blue-500 transition-all text-white">
            <button onclick="handleLogin()" id="btn" class="w-full bg-blue-600 hover:bg-blue-500 p-4 rounded-2xl font-bold shadow-lg shadow-blue-900/10 active:scale-95 transition-all mt-4 text-white">Увійти в Human</button>
            <p id="msg" class="text-center text-red-400 text-sm hidden font-medium"></p>
        </div>
    </div>

    <div id="main-screen" class="hidden flex flex-col h-screen">
        <header class="p-6 pt-8 bg-[#030712]/50 backdrop-blur-md sticky top-0 z-10">
            <div class="flex justify-between items-center mb-6">
                <div>
                    <p class="text-slate-500 text-xs font-black uppercase tracking-widest">Вітаємо назад,</p>
                    <h2 id="user-hi" class="text-2xl font-bold text-white">Учень</h2>
                </div>
                <button onclick="logout()" class="p-2 bg-slate-800 rounded-xl border border-slate-700">
                    <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                </button>
            </div>
            
            <div class="flex justify-around text-xs font-black uppercase tracking-widest border-b border-slate-800">
                <button onclick="switchTab('grades')" id="t-grades" class="tab-active pb-3 text-sm transition-all">Оцінки</button>
                <button onclick="switchTab('schedule')" id="t-schedule" class="text-slate-500 pb-3 text-sm transition-all">Розклад</button>
                <button onclick="switchTab('hw')" id="t-hw" class="text-slate-500 pb-3 text-sm transition-all">ДЗ</button>
            </div>
        </header>

        <main id="content" class="flex-grow p-6 overflow-y-auto space-y-4 pb-28">
            </main>

        <nav class="fixed bottom-6 left-6 right-6 z-20">
            <div class="glass backdrop-blur-md rounded-full px-6 py-4 flex justify-around items-center border border-slate-700">
                <button onclick="switchTab('grades')" id="n-grades" class="text-slate-500 flex flex-col items-center gap-1 active:scale-90 transition-all">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                    <span class="text-[9px] font-black uppercase tracking-widest">Оцінки</span>
                </button>
                <button onclick="switchTab('schedule')" id="n-schedule" class="text-slate-500 flex flex-col items-center gap-1 active:scale-90 transition-all">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <span class="text-[9px] font-black uppercase tracking-widest">Розклад</span>
                </button>
                <button onclick="switchTab('hw')" id="n-hw" class="text-slate-500 flex flex-col items-center gap-1 active:scale-90 transition-all">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    <span class="text-[9px] font-black uppercase tracking-widest">ДЗ</span>
                </button>
            </div>
        </nav>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();
        let authData = { token: '', uid: '' };


