const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// ========== VAPID КЛЮЧИ (Сгенерируйте свои через: npx web-push generate-vapid-keys) ==========
// Замените на свои ключи!
const vapidKeys = {
    publicKey: 'BCsx5YSYIFOKTKtNc_1Zv0BQl4Ei7t7gF-mLF3_MUb0XThZwieXu-Lt-mdjge2j1Iu6vuAI0xo8VLxsI4ZB4leY',
    privateKey: 'RItiMJSE0Nh8gbU6d4uZh-QDtafc-24_VCOH0gkkR5s'
};

webpush.setVapidDetails(
    'mailto:your-email@example.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Раздача статических файлов
app.use(express.static(path.join(__dirname, './')));

// Хранилище push-подписок
let subscriptions = [];

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// WebSocket соединение
io.on('connection', (socket) => {
    console.log('📡 Клиент подключён:', socket.id);

    socket.on('newTask', (task) => {
        console.log('📝 Новая задача от клиента:', task);
        
        // Рассылаем всем подключённым клиентам
        io.emit('taskAdded', task);
        
        // Отправляем push-уведомления всем подписанным клиентам
        const payload = JSON.stringify({
            title: '📝 Новая заметка',
            body: task.text.length > 50 ? task.text.substring(0, 50) + '...' : task.text,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-96x96.png'
        });
        
        subscriptions.forEach(sub => {
            webpush.sendNotification(sub, payload).catch(err => {
                console.error('Push error:', err);
                // Удаляем невалидную подписку
                if (err.statusCode === 410) {
                    subscriptions = subscriptions.filter(s => s.endpoint !== sub.endpoint);
                }
            });
        });
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 Клиент отключён:', socket.id);
    });
});

// Эндпоинты для push-подписок
app.post('/subscribe', (req, res) => {
    const subscription = req.body;
    // Проверяем, нет ли уже такой подписки
    if (!subscriptions.find(sub => sub.endpoint === subscription.endpoint)) {
        subscriptions.push(subscription);
    }
    console.log('✅ Push-подписка сохранена. Всего подписок:', subscriptions.length);
    res.status(201).json({ message: 'Подписка сохранена' });
});

app.post('/unsubscribe', (req, res) => {
    const { endpoint } = req.body;
    subscriptions = subscriptions.filter(sub => sub.endpoint !== endpoint);
    console.log('❌ Push-подписка удалена. Всего подписок:', subscriptions.length);
    res.status(200).json({ message: 'Подписка удалена' });
});

app.get('/public-key', (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════════════════╗
    ║     🚀 Сервер запущен!                               ║
    ║     📡 WebSocket + Push уведомления                  ║
    ║     🌐 http://localhost:${PORT}                        ║
    ║     🔒 HTTPS: https://localhost:3000 (через npm run https) ║
    ╚══════════════════════════════════════════════════════╝
    `);
});