const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Раздача статических файлов из папки frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Все остальные маршруты возвращают index.html (для SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
    console.log('\n========================================');
    console.log('🚀 СЕРВЕР ЗАПУЩЕН');
    console.log('========================================');
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log('\n📝 Приложение для заметок (PWA)');
    console.log('   - Service Worker активен');
    console.log('   - Web App Manifest подключен');
    console.log('   - Поддерживает офлайн-режим');
    console.log('\n🔧 Для проверки:');
    console.log('   1. Откройте Chrome DevTools (F12)');
    console.log('   2. Перейдите на вкладку Application');
    console.log('   3. Проверьте Service Workers и Manifest');
    console.log('   4. Выключите сеть и обновите страницу');
    console.log('========================================\n');
});