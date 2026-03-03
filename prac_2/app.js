const express = require('express');
const app = express();
const port = 3000;  

// Массив товаров
let products = [
    { id: 1, name: 'Телефон', price: 30000 },
    { id: 2, name: 'Ноутбук', price: 80000 },
    { id: 3, name: 'Наушники', price: 5000 }
];

// Подключение middleware
app.use(express.json());

// Главная страница
app.get('/', (req, res) => {
    res.send('Главная страница');
});

// Создание нового товара
app.post('/products', (req, res) => {
    const { name, price } = req.body;

    const newProduct = {
        id: Date.now(),
        name,
        price
    };

    products.push(newProduct);

    res.status(201).json(newProduct);
});

// Получение всех товаров
app.get('/products', (req, res) => {
    res.json(products);
});

// Получение одного товара по id
app.get('/products/:id', (req, res) => {
    const product = products.find(p => p.id == req.params.id);
    res.json(product);
});

// Частичное обновление товара
app.patch('/products/:id', (req, res) => {

    const product = products.find(p => p.id == req.params.id);

    const { name, price } = req.body;

    if (name !== undefined) product.name = name;
    if (price !== undefined) product.price = price;

    res.json(product);
});

// Удаление товара
app.delete('/products/:id', (req, res) => {

    products = products.filter(p => p.id != req.params.id);

    res.send('Ok');
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});