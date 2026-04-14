const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Ця функція — наш "робот", який заходить на сайт
async function scrapeHuman(email, password) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // Важливо для Render
    });
    const page = await browser.newPage();
    
    try {
        await page.goto('https://human.ua/login', { waitUntil: 'networkidle2' });
        
        // Вводимо логін і пароль
        await page.type('input[type="email"]', email);
        await page.type('input[type="password"]', password);
        
        // Тиснемо кнопку входу
        await Promise.all([
            page.click('button[type="submit"]'),
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
        ]);

        // Після входу сайт зазвичай зберігає токен у LocalStorage
        // Ми його "крадемо" для нашого бота
        const authData = await page.evaluate(() => {
            return {
                token: localStorage.getItem('token'), // Перевір точну назву ключа в консолі браузера
                user: JSON.parse(localStorage.getItem('user'))
            };
        });

        await browser.close();
        return { success: true, ...authData };
    } catch (e) {
        await browser.close();
        return { success: false, error: e.message };
    }
}

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await scrapeHuman(email, password);
    res.json(result);
});

// Решта коду для виводу інтерфейсу залишається такою ж...
app.get('/', (req, res) => {
    res.send(`<h1>Система переведена на браузерний вхід</h1>`); // Тут твій старий HTML
});

app.listen(process.env.PORT || 3000);

   



