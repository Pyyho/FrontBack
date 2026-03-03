const express = require('express')
const { nanoid } = require('nanoid')
const cors = require('cors')

const swaggerJSDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')

const app = express()
const port = 3000

console.log('THIS IS PRAC_4 BACKEND')

// ===== Swagger config =====
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Sport Shop API',
    version: '1.0.0',
    description:
      'CRUD API для товаров спортивного интернет-магазина (Практика №5)'
  },
  servers: [{ url: 'http://127.0.0.1:3000' }]
}

const swaggerOptions = {
  swaggerDefinition,
  apis: ['./app.js'] // JSDoc-описания лежат в этом файле
}

const swaggerSpec = swaggerJSDoc(swaggerOptions)

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - category
 *         - description
 *         - price
 *         - stock
 *       properties:
 *         id:
 *           type: string
 *           description: ID товара
 *           example: a1b2c3
 *         name:
 *           type: string
 *           description: Название товара
 *           example: Футбольный мяч Pro Match
 *         category:
 *           type: string
 *           description: Категория
 *           example: Футбол
 *         description:
 *           type: string
 *           description: Описание товара
 *           example: Размер 5, термосклейка панелей, для тренировок и игр
 *         price:
 *           type: number
 *           description: Цена товара
 *           example: 2499
 *         stock:
 *           type: number
 *           description: Количество на складе
 *           example: 18
 *         image:
 *           type: string
 *           description: URL изображения товара
 *           example: https://images.unsplash.com/photo-1521412644187-c49fa049e84d
 */

/**
 * @swagger
 * tags:
 *   - name: Products
 *     description: Управление товарами
 */

// ====== Данные (10 товаров) ======
let products = [
  {
    id: nanoid(6),
    name: 'Футбольный мяч',
    category: 'Футбол',
    description: 'Размер 5, термосклейка панелей, для тренировок и игр',
    price: 2499,
    stock: 18,
    image:
      '/images/ball.jpg'
  },
  {
    id: nanoid(6),
    name: 'Бутсы',
    category: 'Футбол',
    description: 'Лёгкие бутсы для искусственного газона, хорошее сцепление',
    price: 5999,
    stock: 9,
    image:
      '/images/buts.jpg'
  },
  {
    id: nanoid(6),
    name: 'Бинты боксерские',
    category: 'Единоборства',
    description: 'Хлопок, фиксируют кисть и запястье, 2 шт в комплекте',
    price: 499,
    stock: 45,
    image:
      '/images/binti.jpg'
  },
  {
    id: nanoid(6),
    name: 'Перчатки боксерские',
    category: 'Единоборства',
    description: 'Подойдут для спаррингов, плотная набивка, фиксация липучкой',
    price: 3999,
    stock: 14,
    image:
      '/images/perchatki.jpg'
  },
  {
    id: nanoid(6),
    name: 'Коврик для йоги',
    category: 'Йога',
    description: 'Нескользящий, 183×61 см, комфортная толщина для суставов',
    price: 1299,
    stock: 30,
    image:
      '/images/kovrik.jpg'
  },
  {
    id: nanoid(6),
    name: 'Резинки для фитнеса (набор)',
    category: 'Фитнес',
    description: '5 уровней сопротивления, для тренировок дома и в зале',
    price: 799,
    stock: 60,
    image:
      '/images/rezinki.jpg'
  },
  {
    id: nanoid(6),
    name: 'Гантели разборные',
    category: 'Силовые тренировки',
    description: 'Набор блинов + гриф, регулировка веса под упражнения',
    price: 7499,
    stock: 7,
    image:
      '/images/ganteli.jpg'
  },
  {
    id: nanoid(6),
    name: 'Скакалка',
    category: 'Кардио',
    description: 'Подшипники, регулируемая длина, для интенсивных тренировок',
    price: 699,
    stock: 35,
    image:
      '/images/skak.jpg'
  },
  {
    id: nanoid(6),
    name: 'Фляга спортивная 750 мл',
    category: 'Аксессуары',
    description: 'Без BPA, удобный клапан, подходит для велосипеда и зала',
    price: 599,
    stock: 80,
    image:
      '/images/bottle.jpg'
  },
  {
    id: nanoid(6),
    name: 'Ракетка для тенниса',
    category: 'Теннис',
    description: 'Для начинающих, лёгкая, чехол в комплекте',
    price: 4999,
    stock: 11,
    image:
      '/images/raketka.jpg'
  }
]

// ====== Middleware ======
app.use(express.json())

app.use(
  cors({
    origin: ['http://127.0.0.1:3001', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
)

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.get('/__check', (req, res) => {
  res.send('OK: swagger build is running')
})

// Логирование
app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(
      `[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${
        req.path
      }`
    )
    if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
      console.log('Body:', req.body)
    }
  })
  next()
})

// ====== Helper ======
function findProductOr404 (id, res) {
  const product = products.find(p => p.id == id)
  if (!product) {
    res.status(404).json({ error: 'Product not found' })
    return null
  }
  return product
}

// ====== CRUD ======

/**
 * @swagger
 * /api/products:
 *   post:
 *     tags: [Products]
 *     summary: Создать новый товар
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       201:
 *         description: Товар создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 */
app.post('/api/products', (req, res) => {
  const { name, category, description, price, stock, image } = req.body

  const newProduct = {
    id: nanoid(6),
    name: String(name).trim(),
    category: String(category).trim(),
    description: String(description).trim(),
    price: Number(price),
    stock: Number(stock),
    image: String(image || '').trim()
  }

  products.push(newProduct)
  res.status(201).json(newProduct)
})

/**
 * @swagger
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: Получить список товаров
 *     responses:
 *       200:
 *         description: Список товаров
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
app.get('/api/products', (req, res) => {
  res.json(products)
})

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Получить товар по id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Товар найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Товар не найден
 */
app.get('/api/products/:id', (req, res) => {
  const product = findProductOr404(req.params.id, res)
  if (!product) return
  res.json(product)
})

/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     tags: [Products]
 *     summary: Частично обновить товар
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               category: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               stock: { type: number }
 *               image: { type: string }
 *     responses:
 *       200:
 *         description: Товар обновлён
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Нечего обновлять
 *       404:
 *         description: Товар не найден
 */
app.patch('/api/products/:id', (req, res) => {
  const product = findProductOr404(req.params.id, res)
  if (!product) return

  const { name, category, description, price, stock, image } = req.body

  if (
    name === undefined &&
    category === undefined &&
    description === undefined &&
    price === undefined &&
    stock === undefined &&
    image === undefined
  ) {
    return res.status(400).json({ error: 'Nothing to update' })
  }

  if (name !== undefined) product.name = String(name).trim()
  if (category !== undefined) product.category = String(category).trim()
  if (description !== undefined)
    product.description = String(description).trim()
  if (price !== undefined) product.price = Number(price)
  if (stock !== undefined) product.stock = Number(stock)
  if (image !== undefined) product.image = String(image).trim()

  res.json(product)
})

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Удалить товар
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Товар удалён
 *       404:
 *         description: Товар не найден
 */
app.delete('/api/products/:id', (req, res) => {
  const exists = products.some(p => p.id === req.params.id)
  if (!exists) {
    return res.status(404).json({ error: 'Product not found' })
  }

  products = products.filter(p => p.id !== req.params.id)
  res.status(204).send()
})

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// ====== Start ======
app.listen(port, () => {
  console.log(`Сервер запущен на http://127.0.0.1:${port}`)
  console.log(`Swagger: http://127.0.0.1:${port}/api-docs`)
})
