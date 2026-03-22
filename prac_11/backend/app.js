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

// Обработка preflight запросов
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3001');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.sendStatus(200);
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

// ============= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =============

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

// Аутентификация
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

// Проверка ролей
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

// ============= ПУБЛИЧНЫЕ МАРШРУТЫ (Гость) =============

// Регистрация
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

        // ✅ ИСПОЛЬЗУЕМ ФУНКЦИИ
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

// ============= МАРШРУТЫ ДЛЯ АВТОРИЗОВАННЫХ ПОЛЬЗОВАТЕЛЕЙ =============

// Получение информации о текущем пользователе
app.get('/api/auth/me', authMiddleware, roleMiddleware(['user', 'seller', 'admin']), (req, res) => {
    const userId = req.user.sub;
    const user = users.find(u => u.id === userId);
    
    if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const { hashedPassword, ...userWithoutPassword } = user;
    
    res.json(userWithoutPassword);
});

// ============= МАРШРУТЫ ДЛЯ ТОВАРОВ С РАЗГРАНИЧЕНИЕМ ПРАВ =============

// Получение списка товаров (доступно всем авторизованным)
app.get('/api/products', authMiddleware, roleMiddleware(['user', 'seller', 'admin']), (req, res) => {
    res.json(products);
});

// Получение товара по ID (доступно всем авторизованным)
app.get('/api/products/:id', authMiddleware, roleMiddleware(['user', 'seller', 'admin']), (req, res) => {
    const product = products.find(p => p.id == req.params.id);
    
    if (!product) {
        return res.status(404).json({ error: 'Товар не найден' });
    }
    
    res.json(product);
});

// Создание товара (только для seller и admin)
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
        price: Number(price),
        createdBy: req.user.sub,
        createdAt: new Date().toISOString()
    };

    products.push(newProduct);
    res.status(201).json(newProduct);
});

// Обновление товара (только для seller и admin)
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
        price: price !== undefined ? Number(price) : products[productIndex].price,
        updatedBy: req.user.sub,
        updatedAt: new Date().toISOString()
    };

    res.json(products[productIndex]);
});

// Удаление товара (только для admin)
app.delete('/api/products/:id', authMiddleware, roleMiddleware(['admin']), (req, res) => {
    const productIndex = products.findIndex(p => p.id == req.params.id);

    if (productIndex === -1) {
        return res.status(404).json({ error: 'Товар не найден' });
    }

    const deletedProduct = products[productIndex];
    products.splice(productIndex, 1);
    res.json({ message: 'Товар удален', deletedProduct });
});

// ============= МАРШРУТЫ ДЛЯ АДМИНИСТРАТОРА (управление пользователями) =============

// Получение списка всех пользователей
app.get('/api/users', authMiddleware, roleMiddleware(['admin']), (req, res) => {
    const usersWithoutPasswords = users.map(({ hashedPassword, ...user }) => user);
    res.json(usersWithoutPasswords);
});

// Получение пользователя по ID
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

    // Нельзя изменить роль последнего админа
    const isLastAdmin = users.filter(u => u.role === 'admin').length === 1 && users[userIndex].role === 'admin';
    if (isLastAdmin && role !== 'admin') {
        return res.status(400).json({ error: 'Нельзя изменить роль последнего администратора' });
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

// Удаление/блокировка пользователя
app.delete('/api/users/:id', authMiddleware, roleMiddleware(['admin']), (req, res) => {
    const userIndex = users.findIndex(u => u.id === req.params.id);

    if (userIndex === -1) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Не даем удалить самого себя
    if (users[userIndex].id === req.user.sub) {
        return res.status(400).json({ error: 'Нельзя удалить самого себя' });
    }

    // Не даем удалить последнего админа
    const isLastAdmin = users.filter(u => u.role === 'admin').length === 1 && users[userIndex].role === 'admin';
    if (isLastAdmin) {
        return res.status(400).json({ error: 'Нельзя удалить последнего администратора' });
    }

    const deletedUser = users[userIndex];
    users.splice(userIndex, 1);
    
    res.json({ 
        message: 'Пользователь удален', 
        deletedUser: { id: deletedUser.id, email: deletedUser.email, role: deletedUser.role }
    });
});

// ============= СОЗДАНИЕ ТЕСТОВЫХ ПОЛЬЗОВАТЕЛЕЙ =============

async function createTestUsers() {
    console.log('\n🔧 Создание тестовых пользователей...');
    
    try {
        // Администратор
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
        
        // Продавец
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
        
        // Обычный пользователь
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
        
        console.log(`📊 Всего пользователей: ${users.length}`);
    } catch (err) {
        console.error('❌ Ошибка при создании тестовых пользователей:', err);
    }
}

// Запускаем создание тестовых пользователей
createTestUsers();

// ============= ЗАПУСК СЕРВЕРА =============

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
    console.log('\n📌 МАРШРУТЫ:');
    console.log('   Гость:');
    console.log('     POST   /api/auth/register');
    console.log('     POST   /api/auth/login');
    console.log('     POST   /api/auth/refresh');
    console.log('   Пользователь (user):');
    console.log('     GET    /api/auth/me');
    console.log('     GET    /api/products');
    console.log('     GET    /api/products/:id');
    console.log('   Продавец (seller):');
    console.log('     POST   /api/products');
    console.log('     PUT    /api/products/:id');
    console.log('   Администратор (admin):');
    console.log('     DELETE /api/products/:id');
    console.log('     GET    /api/users');
    console.log('     GET    /api/users/:id');
    console.log('     PUT    /api/users/:id');
    console.log('     DELETE /api/users/:id');
    console.log('========================================\n');
});