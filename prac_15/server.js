const express = require('express');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// Проверяем наличие сертификатов
let httpsOptions;
try {
    httpsOptions = {
        key: fs.readFileSync(path.join(__dirname, 'localhost-key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'localhost.pem'))
    };
    console.log('✅ Сертификаты загружены');
} catch (error) {
    console.error('❌ Сертификаты не найдены. Создайте их с помощью OpenSSL:');
    console.error('openssl req -x509 -newkey rsa:2048 -nodes -keyout localhost-key.pem -out localhost.pem -days 365 -subj "/CN=localhost"');
    process.exit(1);
}

// VAPID-ключи (замените на свои после генерации)
// Сгенерируйте с помощью: npx web-push generate-vapid-keys
const vapidKeys = {
    publicKey: 'BGpXqKx3qNx7qX8qX9qX0qX1qX2qX3qX4qX5qX6qX7qX8qX9qX0qX1qX2qX3',
    privateKey: 'qX4qX5qX6qX7qX8qX9qX0qX1qX2qX3qX4qX5qX6qX7qX8qX9qX0qX1qX2'
};

webpush.setVapidDetails(
    'mailto:your-email@example.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, './')));

let subscriptions = [];

const server = https.createServer(httpsOptions, app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('✅ Клиент подключён:', socket.id);
    
    socket.on('newTask', (task) => {
        console.log('📝 Новая задача:', task);
        io.emit('taskAdded', task);
        
        const payload = JSON.stringify({
            title: '📝 Новая задача',
            body: task.text
        });
        
        subscriptions.forEach(sub => {
            webpush.sendNotification(sub, payload).catch(err => {
                console.error('Push error:', err);
                if (err.statusCode === 410) {
                    subscriptions = subscriptions.filter(s => s.endpoint !== sub.endpoint);
                }
            });
        });
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Клиент отключён:', socket.id);
    });
});

app.post('/subscribe', (req, res) => {
    const subscription = req.body;
    const exists = subscriptions.some(sub => sub.endpoint === subscription.endpoint);
    if (!exists) {
        subscriptions.push(subscription);
        console.log('📌 Подписка сохранена, всего подписок:', subscriptions.length);
    }
    res.status(201).json({ message: 'Подписка сохранена' });
});

app.post('/unsubscribe', (req, res) => {
    const { endpoint } = req.body;
    subscriptions = subscriptions.filter(sub => sub.endpoint !== endpoint);
    console.log('🔕 Подписка удалена, осталось подписок:', subscriptions.length);
    res.status(200).json({ message: 'Подписка удалена' });
});

app.get('/status', (req, res) => {
    res.json({ 
        subscriptions: subscriptions.length,
        vapidPublicKey: vapidKeys.publicKey
    });
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`
    🚀 Сервер запущен!
    📱 Откройте: https://localhost:${PORT}/prac_15/
    🔔 VAPID Public Key: ${vapidKeys.publicKey.substring(0, 30)}...
    
    ⚠️ Если браузер показывает предупреждение, нажмите:
    "Advanced" -> "Proceed to localhost (unsafe)"
    `);
});