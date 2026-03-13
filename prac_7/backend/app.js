const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Хранилища данных
let users = [];
let products = [
    { id: 1, title: 'Телефон', category: 'Электроника', description: 'Смартфон с отличной камерой', price: 30000 },
    { id: 2, title: 'Ноутбук', category: 'Электроника', description: 'Мощный ноутбук для работы', price: 80000 },
    { id: 3, title: 'Наушники', category: 'Аксессуары', description: 'Беспроводные наушники', price: 5000 }
];

// Middleware
app.use(express.json());

// ============= АУТЕНТИФИКАЦИЯ =============

async function hashPassword(password) {
    const rounds = 10;
    return bcrypt.hash(password, rounds);
}

async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}

// РЕГИСТРАЦИЯ
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
            hashedPassword
        };

        users.push(newUser);

        const { hashedPassword: _, ...userWithoutPassword } = newUser;
        
        const token = jwt.sign(
            { id: newUser.id, email: newUser.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            user: userWithoutPassword,
            token
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при регистрации' });
    }
});

// ВХОД
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

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        const { hashedPassword: _, ...userWithoutPassword } = user;

        res.json({
            user: userWithoutPassword,
            token
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при входе' });
    }
});

// ============= Middleware для проверки токена =============
const authMiddleware = require('./middleware/auth');

// ============= ТОВАРЫ (защищенные маршруты) =============

// Создание товара
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

// Получение всех товаров
app.get('/api/products', authMiddleware, (req, res) => {
    res.json(products);
});

// Получение товара по id
app.get('/api/products/:id', authMiddleware, (req, res) => {
    const product = products.find(p => p.id == req.params.id);
    
    if (!product) {
        return res.status(404).json({ error: 'Товар не найден' });
    }
    
    res.json(product);
});

// Обновление товара
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

// Удаление товара
app.delete('/api/products/:id', authMiddleware, (req, res) => {
    const productIndex = products.findIndex(p => p.id == req.params.id);

    if (productIndex === -1) {
        return res.status(404).json({ error: 'Товар не найден' });
    }

    products.splice(productIndex, 1);
    res.json({ message: 'Товар удален' });
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});