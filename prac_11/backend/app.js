const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Настройка CORS
app.use(cors({
    origin: 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ Убираем app.options('*') и добавляем обработку OPTIONS
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Origin', 'http://localhost:3001');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.sendStatus(200);
    } else {
        next();
    }
});

// Хранилища данных
let users = [];
let products = [
    { id: 1, title: 'Телефон', category: 'Электроника', description: 'Смартфон с отличной камерой', price: 30000 },
    { id: 2, title: 'Ноутбук', category: 'Электроника', description: 'Мощный ноутбук для работы', price: 80000 },
    { id: 3, title: 'Наушники', category: 'Аксессуары', description: 'Беспроводные наушники', price: 5000 }
];

// Хранилище refresh токенов
const refreshTokens = new Set();

// ============= ФУНКЦИИ ДЛЯ ГЕНЕРАЦИИ ТОКЕНОВ =============
async function hashPassword(password) {
    const rounds = 10;
    return bcrypt.hash(password, rounds);
}

async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}

function generateAccessToken(user) {
    return jwt.sign(
        { 
            sub: user.id, 
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role || 'user'
        },
        process.env.JWT_SECRET || 'access_secret',
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRES || '15m' }
    );
}

function generateRefreshToken(user) {
    return jwt.sign(
        { sub: user.id },
        process.env.JWT_REFRESH_SECRET || 'refresh_secret',
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRES || '7d' }
    );
}

// ============= MIDDLEWARE =============
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization || '';
    
    const [scheme, token] = authHeader.split(' ');
    
    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'access_secret');
        req.user = payload;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Токен истек' });
        }
        return res.status(401).json({ error: 'Недействительный токен' });
    }
}

const roleMiddleware = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Не авторизован' });
        }

        const userRole = req.user.role;
        
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ 
                error: 'Доступ запрещен. Недостаточно прав.',
                required: allowedRoles,
                current: userRole
            });
        }

        next();
    };
};

// ============= ПУБЛИЧНЫЕ МАРШРУТЫ =============

// Регистрация
app.post('/api/auth/register', async (req, res) => {
    const { email, first_name, last_name, password } = req.body;

    if (!email || !password || !first_name || !last_name) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }

    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        return res.status(400).json({ error: 'Пользователь уже существует' });
    }

    try {
        const hashedPassword = await hashPassword(password);
        
        const newUser = {
            id: Date.now().toString(),
            email,
            first_name,
            last_name,
            role: 'user',
            hashedPassword
        };

        users.push(newUser);

        const accessToken = generateAccessToken(newUser);
        const refreshToken = generateRefreshToken(newUser);
        
        refreshTokens.add(refreshToken);

        const { hashedPassword: _, ...userWithoutPassword } = newUser;

        res.status(201).json({
            user: userWithoutPassword,
            accessToken,
            refreshToken
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при регистрации' });
    }
});

// Вход
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const user = users.find(u => u.email === email);
    if (!user) {
        return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    try {
        const isValid = await verifyPassword(password, user.hashedPassword);
        
        if (!isValid) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        
        refreshTokens.add(refreshToken);

        const { hashedPassword: _, ...userWithoutPassword } = user;

        res.json({
            user: userWithoutPassword,
            accessToken,
            refreshToken
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при входе' });
    }
});

// Обновление токенов
app.post('/api/auth/refresh', (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token обязателен' });
    }

    if (!refreshTokens.has(refreshToken)) {
        return res.status(401).json({ error: 'Недействительный refresh token' });
    }

    try {
        const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh_secret');
        const user = users.find(u => u.id === payload.sub);

        if (!user) {
            return res.status(401).json({ error: 'Пользователь не найден' });
        }

        refreshTokens.delete(refreshToken);
        
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);
        
        refreshTokens.add(newRefreshToken);

        res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        });
    } catch (err) {
        return res.status(401).json({ error: 'Недействительный или просроченный refresh token' });
    }
});

// Выход
app.post('/api/auth/logout', (req, res) => {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
        refreshTokens.delete(refreshToken);
    }

    res.json({ message: 'Выход выполнен успешно' });
});

// ============= МАРШРУТЫ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ =============

// Информация о себе
app.get('/api/auth/me', authMiddleware, roleMiddleware(['user', 'seller', 'admin']), (req, res) => {
    const userId = req.user.sub;
    const user = users.find(u => u.id === userId);
    
    if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const { hashedPassword, ...userWithoutPassword } = user;
    
    res.json(userWithoutPassword);
});

// Получение списка товаров
app.get('/api/products', authMiddleware, roleMiddleware(['user', 'seller', 'admin']), (req, res) => {
    res.json(products);
});

// Получение товара по id
app.get('/api/products/:id', authMiddleware, roleMiddleware(['user', 'seller', 'admin']), (req, res) => {
    const product = products.find(p => p.id == req.params.id);
    
    if (!product) {
        return res.status(404).json({ error: 'Товар не найден' });
    }
    
    res.json(product);
});

// ============= МАРШРУТЫ ДЛЯ ПРОДАВЦОВ =============

// Создание товара
app.post('/api/products', authMiddleware, roleMiddleware(['seller', 'admin']), (req, res) => {
    const { title, category, description, price } = req.body;

    if (!title || !category || !price) {
        return res.status(400).json({ error: 'Название, категория и цена обязательны' });
    }

    const newProduct = {
        id: Date.now(),
        title,
        category,
        description: description || '',
        price: Number(price)
    };

    products.push(newProduct);
    res.status(201).json(newProduct);
});

// Обновление товара
app.put('/api/products/:id', authMiddleware, roleMiddleware(['seller', 'admin']), (req, res) => {
    const { title, category, description, price } = req.body;
    const productIndex = products.findIndex(p => p.id == req.params.id);

    if (productIndex === -1) {
        return res.status(404).json({ error: 'Товар не найден' });
    }

    products[productIndex] = {
        ...products[productIndex],
        title: title || products[productIndex].title,
        category: category || products[productIndex].category,
        description: description !== undefined ? description : products[productIndex].description,
        price: price !== undefined ? Number(price) : products[productIndex].price
    };

    res.json(products[productIndex]);
});

// ============= МАРШРУТЫ ДЛЯ АДМИНИСТРАТОРОВ =============

// Удаление товара
app.delete('/api/products/:id', authMiddleware, roleMiddleware(['admin']), (req, res) => {
    const productIndex = products.findIndex(p => p.id == req.params.id);

    if (productIndex === -1) {
        return res.status(404).json({ error: 'Товар не найден' });
    }

    products.splice(productIndex, 1);
    res.json({ message: 'Товар удален' });
});

// Получение списка пользователей
app.get('/api/users', authMiddleware, roleMiddleware(['admin']), (req, res) => {
    const usersWithoutPasswords = users.map(({ hashedPassword, ...user }) => user);
    res.json(usersWithoutPasswords);
});

// Получение пользователя по id
app.get('/api/users/:id', authMiddleware, roleMiddleware(['admin']), (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    
    if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const { hashedPassword, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
});

// Обновление пользователя
app.put('/api/users/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    const { email, first_name, last_name, role } = req.body;
    const userIndex = users.findIndex(u => u.id === req.params.id);

    if (userIndex === -1) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }

    users[userIndex] = {
        ...users[userIndex],
        email: email || users[userIndex].email,
        first_name: first_name || users[userIndex].first_name,
        last_name: last_name || users[userIndex].last_name,
        role: role || users[userIndex].role
    };

    const { hashedPassword, ...userWithoutPassword } = users[userIndex];
    res.json(userWithoutPassword);
});

// Удаление пользователя
app.delete('/api/users/:id', authMiddleware, roleMiddleware(['admin']), (req, res) => {
    const userIndex = users.findIndex(u => u.id === req.params.id);

    if (userIndex === -1) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (users[userIndex].id === req.user.sub) {
        return res.status(400).json({ error: 'Нельзя удалить самого себя' });
    }

    users.splice(userIndex, 1);
    res.json({ message: 'Пользователь удален' });
});

// ============= СОЗДАНИЕ ТЕСТОВЫХ ПОЛЬЗОВАТЕЛЕЙ =============

async function createTestUsers() {
    console.log('\n🔧 Создание тестовых пользователей...');
    
    if (!users.find(u => u.email === 'admin@example.com')) {
        const adminHash = await bcrypt.hash('admin123', 10);
        users.push({
            id: 'admin_1',
            email: 'admin@example.com',
            first_name: 'Admin',
            last_name: 'User',
            role: 'admin',
            hashedPassword: adminHash
        });
        console.log('✅ Администратор: admin@example.com / admin123');
    }
    
    if (!users.find(u => u.email === 'seller@example.com')) {
        const sellerHash = await bcrypt.hash('seller123', 10);
        users.push({
            id: 'seller_1',
            email: 'seller@example.com',
            first_name: 'Seller',
            last_name: 'User',
            role: 'seller',
            hashedPassword: sellerHash
        });
        console.log('✅ Продавец: seller@example.com / seller123');
    }
    
    if (!users.find(u => u.email === 'user@example.com')) {
        const userHash = await bcrypt.hash('user123', 10);
        users.push({
            id: 'user_1',
            email: 'user@example.com',
            first_name: 'Regular',
            last_name: 'User',
            role: 'user',
            hashedPassword: userHash
        });
        console.log('✅ Пользователь: user@example.com / user123');
    }
    
    console.log(`📊 Всего пользователей: ${users.length}\n`);
}

// Запускаем создание тестовых пользователей
createTestUsers();

// Запуск сервера
app.listen(port, () => {
    console.log('\n========================================');
    console.log('🚀 СЕРВЕР ЗАПУЩЕН');
    console.log('========================================');
    console.log(`📍 URL: http://localhost:${port}`);
    console.log(`📱 Фронтенд: http://localhost:3001`);
    console.log('\n🔐 ТЕСТОВЫЕ УЧЕТНЫЕ ЗАПИСИ:');
    console.log('   👑 Администратор: admin@example.com / admin123');
    console.log('   🛒 Продавец:      seller@example.com / seller123');
    console.log('   👤 Пользователь:  user@example.com / user123');
    console.log('\n📋 РОЛИ И ПРАВА:');
    console.log('   👤 user    - просмотр товаров');
    console.log('   🛒 seller  - создание и редактирование товаров');
    console.log('   👑 admin   - полный доступ + управление пользователями');
    console.log('========================================\n');
});