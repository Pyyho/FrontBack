const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// ✅ CORS настройка
app.use(cors({
    origin: 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Хранилища данных
let users = [];
let products = [
    { id: 1, title: 'Телефон', category: 'Электроника', description: 'Смартфон с отличной камерой', price: 30000 },
    { id: 2, title: 'Ноутбук', category: 'Электроника', description: 'Мощный ноутбук для работы', price: 80000 },
    { id: 3, title: 'Наушники', category: 'Аксессуары', description: 'Беспроводные наушники', price: 5000 }
];

// Хранилище refresh токенов
const refreshTokens = new Set();

// ============= АУТЕНТИФИКАЦИЯ =============

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
            last_name: user.last_name
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

// Регистрация
app.post('/api/auth/register', async (req, res) => {
    console.log('📝 Регистрация:', req.body);
    
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
            hashedPassword
        };

        users.push(newUser);
        console.log('✅ Пользователь создан:', email);

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
        console.error('❌ Ошибка:', err);
        res.status(500).json({ error: 'Ошибка при регистрации' });
    }
});

// Вход
app.post('/api/auth/login', async (req, res) => {
    console.log('🔐 Вход:', req.body.email);
    
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
        console.error('❌ Ошибка входа:', err);
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

// Middleware для проверки токена
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

// Информация о пользователе
app.get('/api/auth/me', authMiddleware, (req, res) => {
    const userId = req.user.sub;
    const user = users.find(u => u.id === userId);
    
    if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const { hashedPassword: _, ...userWithoutPassword } = user;
    
    res.json(userWithoutPassword);
});

// ============= ТОВАРЫ =============

app.post('/api/products', authMiddleware, (req, res) => {
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

app.get('/api/products', authMiddleware, (req, res) => {
    res.json(products);
});

app.get('/api/products/:id', authMiddleware, (req, res) => {
    const product = products.find(p => p.id == req.params.id);
    
    if (!product) {
        return res.status(404).json({ error: 'Товар не найден' });
    }
    
    res.json(product);
});

app.put('/api/products/:id', authMiddleware, (req, res) => {
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

app.delete('/api/products/:id', authMiddleware, (req, res) => {
    const productIndex = products.findIndex(p => p.id == req.params.id);

    if (productIndex === -1) {
        return res.status(404).json({ error: 'Товар не найден' });
    }

    products.splice(productIndex, 1);
    res.json({ message: 'Товар удален' });
});

app.listen(port, () => {
    console.log(`\n🚀 Сервер запущен на http://localhost:${port}`);
    console.log(`📱 Фронтенд ожидается на http://localhost:3001\n`);
});