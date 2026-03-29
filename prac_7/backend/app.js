const express = require('express')
const { nanoid } = require('nanoid')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cors = require('cors')

const swaggerJSDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')

const app = express()
const port = 3000

console.log('PRAC_7 BACKEND WITH AUTHENTICATION')

// ===== JWT Configuration =====
const JWT_SECRET = 'sport-shop-super-secret-key-change-in-production-2026'
const ACCESS_EXPIRES_IN = '15m'
const REFRESH_EXPIRES_IN = '7d'

// ===== In-memory storage =====
// Users: id, email, first_name, last_name, passwordHash, refreshToken
let users = []

// Products: id, name, category, description, price, stock, image, ownerId
let products = [
  {
    id: nanoid(8),
    name: 'Футбольный мяч',
    category: 'Футбол',
    description: 'Размер 5, термосклейка панелей, для тренировок и игр',
    price: 2499,
    stock: 18,
    image: '/images/ball.jpg',
    ownerId: null  // Will be assigned to first user
  },
  {
    id: nanoid(8),
    name: 'Бутсы',
    category: 'Футбол',
    description: 'Лёгкие бутсы для искусственного газона, хорошее сцепление',
    price: 5999,
    stock: 9,
    image: '/images/buts.jpg',
    ownerId: null
  },
  {
    id: nanoid(8),
    name: 'Бинты боксерские',
    category: 'Единоборства',
    description: 'Хлопок, фиксируют кисть и запястье, 2 шт в комплекте',
    price: 499,
    stock: 45,
    image: '/images/binti.jpg',
    ownerId: null
  },
  {
    id: nanoid(8),
    name: 'Перчатки боксерские',
    category: 'Единоборства',
    description: 'Подойдут для спаррингов, плотная набивка, фиксация липучкой',
    price: 3999,
    stock: 14,
    image: '/images/perchatki.jpg',
    ownerId: null
  },
  {
    id: nanoid(8),
    name: 'Коврик для йоги',
    category: 'Йога',
    description: 'Нескользящий, 183×61 см, комфортная толщина для суставов',
    price: 1299,
    stock: 30,
    image: '/images/kovrik.jpg',
    ownerId: null
  },
  {
    id: nanoid(8),
    name: 'Резинки для фитнеса (набор)',
    category: 'Фитнес',
    description: '5 уровней сопротивления, для тренировок дома и в зале',
    price: 799,
    stock: 60,
    image: '/images/rezinki.jpg',
    ownerId: null
  },
  {
    id: nanoid(8),
    name: 'Гантели разборные',
    category: 'Силовые тренировки',
    description: 'Набор блинов + гриф, регулировка веса под упражнения',
    price: 7499,
    stock: 7,
    image: '/images/ganteli.jpg',
    ownerId: null
  },
  {
    id: nanoid(8),
    name: 'Скакалка',
    category: 'Кардио',
    description: 'Подшипники, регулируемая длина, для интенсивных тренировок',
    price: 699,
    stock: 35,
    image: '/images/skak.jpg',
    ownerId: null
  },
  {
    id: nanoid(8),
    name: 'Фляга спортивная 750 мл',
    category: 'Аксессуары',
    description: 'Без BPA, удобный клапан, подходит для велосипеда и зала',
    price: 599,
    stock: 80,
    image: '/images/bottle.jpg',
    ownerId: null
  },
  {
    id: nanoid(8),
    name: 'Ракетка для тенниса',
    category: 'Теннис',
    description: 'Для начинающих, лёгкая, чехол в комплекте',
    price: 4999,
    stock: 11,
    image: '/images/raketka.jpg',
    ownerId: null
  }
]

// ===== Helper functions =====
const hashPassword = async (password) => {
  const saltRounds = 10
  return bcrypt.hash(password, saltRounds)
}

const verifyPassword = async (password, hash) => {
  return bcrypt.compare(password, hash)
}

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name
    },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  )
}

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      type: 'refresh'
    },
    JWT_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  )
}

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (err) {
    return null
  }
}

// ===== Auth Middleware =====
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || ''

  const [scheme, token] = authHeader.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' })
  }

  const payload = verifyToken(token)
  if (!payload || payload.type === 'refresh') {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  req.user = payload
  next()
}

// Find helpers
const findUserByEmail = (email) => {
  return users.find(u => u.email === email)
}

const findUserById = (id) => {
  return users.find(u => u.id === id)
}

const findProductOr403 = (id, userId, res) => {
  const product = products.find(p => p.id === id)
  if (!product) {
    res.status(404).json({ error: 'Product not found' })
    return null
  }
  if (product.ownerId !== userId) {
    res.status(403).json({ error: 'You do not have permission to access this product' })
    return null
  }
  return product
}

// ===== Swagger config =====
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Sport Shop API with Authentication',
    version: '1.0.0',
    description:
      'CRUD API для товаров с JWT-аутентификацией (Практика №7-8)'
  },
  servers: [{ url: 'http://127.0.0.1:3000' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      Product: {
        type: 'object',
        required: ['name', 'category', 'description', 'price', 'stock'],
        properties: {
          id: { type: 'string', description: 'ID товара', example: 'a1b2c3d4' },
          name: { type: 'string', description: 'Название товара', example: 'Футбольный мяч Pro Match' },
          category: { type: 'string', description: 'Категория', example: 'Футбол' },
          description: { type: 'string', description: 'Описание товара', example: 'Размер 5, термосклейка панелей' },
          price: { type: 'number', description: 'Цена товара', example: 2499 },
          stock: { type: 'number', description: 'Количество на складе', example: 18 },
          image: { type: 'string', description: 'URL изображения товара', example: 'https://images.unsplash.com/...' }
        }
      },
      User: {
        type: 'object',
        required: ['email', 'first_name', 'last_name', 'password'],
        properties: {
          id: { type: 'string', description: 'ID пользователя', example: 'a1b2c3d4' },
          email: { type: 'string', format: 'email', description: 'Email пользователя', example: 'ivan@example.com' },
          first_name: { type: 'string', description: 'Имя', example: 'Иван' },
          last_name: { type: 'string', description: 'Фамилия', example: 'Иванов' }
        }
      }
    }
  },
  security: [{ bearerAuth: [] }]
}

const swaggerOptions = {
  swaggerDefinition,
  apis: ['./app.js']
}

const swaggerSpec = swaggerJSDoc(swaggerOptions)

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Аутентификация и управление пользователями
 *   - name: Products
 *     description: Управление товарами (требует JWT)
 */

// ===== Middleware =====
app.use(express.json())
app.use(
  cors({
    origin: ['http://127.0.0.1:3001', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
)

// Swagger UI (public)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.get('/__check', (req, res) => {
  res.send('OK: Authentication API is running')
})

// Request logging
app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(
      `[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`
    )
    if (['POST', 'PUT'].includes(req.method) && req.body) {
      const logBody = { ...req.body }
      if (logBody.password) logBody.password = '***'
      console.log('Body:', logBody)
    }
  })
  next()
})

// ===== AUTH ROUTES =====

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Регистрация нового пользователя
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - first_name
 *               - last_name
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: ivan@example.com
 *               first_name:
 *                 type: string
 *                 example: Иван
 *               last_name:
 *                 type: string
 *                 example: Иванов
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: qwerty123
 *     responses:
 *       201:
 *         description: Пользователь успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Неверные данные или email уже существует
 */
app.post('/api/auth/register', async (req, res) => {
  const { email, first_name, last_name, password } = req.body

  if (!email || !first_name || !last_name || !password) {
    return res.status(400).json({ error: 'All fields are required: email, first_name, last_name, password' })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' })
  }

  if (findUserByEmail(email)) {
    return res.status(400).json({ error: 'User with this email already exists' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' })
  }

  const passwordHash = await hashPassword(password)
  const newUser = {
    id: nanoid(8),
    email: email.toLowerCase().trim(),
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    passwordHash,
    refreshToken: null
  }

  users.push(newUser)

  // Assign existing products to this user (for demo purposes)
  products.forEach(product => {
    if (product.ownerId === null) {
      product.ownerId = newUser.id
    }
  })

  const { passwordHash: _, ...userWithoutHash } = newUser
  res.status(201).json(userWithoutHash)
})

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Вход в систему (получение access и refresh токенов)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: ivan@example.com
 *               password:
 *                 type: string
 *                 example: qwerty123
 *     responses:
 *       200:
 *         description: Успешная авторизация
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Неверные учетные данные
 *       404:
 *         description: Пользователь не найден
 */
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const user = findUserByEmail(email.toLowerCase().trim())
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  const isValid = await verifyPassword(password, user.passwordHash)
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const accessToken = generateAccessToken(user)
  const refreshToken = generateRefreshToken(user)

  user.refreshToken = refreshToken

  const { passwordHash: _, ...userWithoutHash } = user
  res.json({
    accessToken,
    refreshToken,
    user: userWithoutHash
  })
})

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Обновление access токена с помощью refresh токена
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Новый access токен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *       401:
 *         description: Недействительный refresh токен
 */
app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token is required' })
  }

  const payload = verifyToken(refreshToken)
  if (!payload || payload.type !== 'refresh') {
    return res.status(401).json({ error: 'Invalid refresh token' })
  }

  const user = findUserById(payload.sub)
  if (!user || user.refreshToken !== refreshToken) {
    return res.status(401).json({ error: 'Invalid refresh token' })
  }

  const newAccessToken = generateAccessToken(user)
  res.json({ accessToken: newAccessToken })
})

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Выход из системы (инвалидация refresh токена)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Успешный выход
 *       401:
 *         description: Недействительный refresh токен
 */
app.post('/api/auth/logout', async (req, res) => {
  const { refreshToken } = req.body

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token is required' })
  }

  const payload = verifyToken(refreshToken)
  if (!payload || payload.type !== 'refresh') {
    return res.status(401).json({ error: 'Invalid refresh token' })
  }

  const user = findUserById(payload.sub)
  if (user && user.refreshToken === refreshToken) {
    user.refreshToken = null
  }

  res.status(200).json({ message: 'Logged out successfully' })
})

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Получить информацию о текущем авторизованном пользователе
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Информация о пользователе
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Не авторизован
 *       404:
 *         description: Пользователь не найден
 */
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const userId = req.user.sub
  const user = findUserById(userId)

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  const { passwordHash: _, ...userWithoutHash } = user
  res.json(userWithoutHash)
})

// ===== PRODUCT ROUTES (Protected) =====

/**
 * @swagger
 * /api/products:
 *   post:
 *     tags: [Products]
 *     summary: Создать новый товар (требует JWT)
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Не авторизован
 */
app.post('/api/products', authMiddleware, (req, res) => {
  const { name, category, description, price, stock, image } = req.body
  const userId = req.user.sub

  const newProduct = {
    id: nanoid(8),
    name: String(name || '').trim(),
    category: String(category || '').trim(),
    description: String(description || '').trim(),
    price: Number(price),
    stock: Number(stock),
    image: String(image || '').trim(),
    ownerId: userId
  }

  if (!newProduct.name || !newProduct.category || !newProduct.description) {
    return res.status(400).json({ error: 'Name, category and description are required' })
  }
  if (isNaN(newProduct.price) || newProduct.price < 0) {
    return res.status(400).json({ error: 'Price must be a non-negative number' })
  }
  if (isNaN(newProduct.stock) || newProduct.stock < 0) {
    return res.status(400).json({ error: 'Stock must be a non-negative number' })
  }

  products.push(newProduct)
  const { ownerId, ...productWithoutOwner } = newProduct
  res.status(201).json(productWithoutOwner)
})

/**
 * @swagger
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: Получить список товаров текущего пользователя
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список товаров
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       401:
 *         description: Не авторизован
 */
app.get('/api/products', authMiddleware, (req, res) => {
  const userId = req.user.sub
  const userProducts = products
    .filter(p => p.ownerId === userId)
    .map(({ ownerId, ...product }) => product)

  res.json(userProducts)
})

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Получить товар по id (только свои)
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет доступа
 *       404:
 *         description: Товар не найден
 */
app.get('/api/products/:id', authMiddleware, (req, res) => {
  const userId = req.user.sub
  const product = findProductOr403(req.params.id, userId, res)
  if (!product) return

  const { ownerId, ...productWithoutOwner } = product
  res.json(productWithoutOwner)
})

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Полностью обновить товар (только свои)
 *     security:
 *       - bearerAuth: []
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
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Товар обновлён
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет доступа
 *       404:
 *         description: Товар не найден
 */
app.put('/api/products/:id', authMiddleware, (req, res) => {
  const userId = req.user.sub
  const product = findProductOr403(req.params.id, userId, res)
  if (!product) return

  const { name, category, description, price, stock, image } = req.body

  if (name === undefined && category === undefined && description === undefined &&
      price === undefined && stock === undefined && image === undefined) {
    return res.status(400).json({ error: 'At least one field to update is required' })
  }

  if (name !== undefined) product.name = String(name).trim()
  if (category !== undefined) product.category = String(category).trim()
  if (description !== undefined) product.description = String(description).trim()
  if (price !== undefined) {
    if (isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ error: 'Price must be a non-negative number' })
    }
    product.price = Number(price)
  }
  if (stock !== undefined) {
    if (isNaN(Number(stock)) || Number(stock) < 0) {
      return res.status(400).json({ error: 'Stock must be a non-negative number' })
    }
    product.stock = Number(stock)
  }
  if (image !== undefined) product.image = String(image).trim()

  const { ownerId, ...productWithoutOwner } = product
  res.json(productWithoutOwner)
})

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Удалить товар (только свои)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Товар удалён
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет доступа
 *       404:
 *         description: Товар не найден
 */
app.delete('/api/products/:id', authMiddleware, (req, res) => {
  const userId = req.user.sub
  const product = products.find(p => p.id === req.params.id)

  if (!product) {
    return res.status(404).json({ error: 'Product not found' })
  }

  if (product.ownerId !== userId) {
    return res.status(403).json({ error: 'You do not have permission to delete this product' })
  }

  products = products.filter(p => p.id !== req.params.id)
  res.status(204).send()
})

// ===== 404 handler =====
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// ===== Global error handler =====
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// ===== Start server =====
app.listen(port, () => {
  console.log(`Сервер запущен на http://127.0.0.1:${port}`)
  console.log(`Swagger UI: http://127.0.0.1:${port}/api-docs`)
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                 PRACTICE 7 & 8 - AUTHENTICATION API              ║
╠═══════════════════════════════════════════════════════════════════╣
║  🔓 PUBLIC ROUTES:                                               ║
║    POST   /api/auth/register  - Register new user                ║
║    POST   /api/auth/login     - Login (get tokens)               ║
║    POST   /api/auth/refresh   - Refresh access token             ║
║    POST   /api/auth/logout    - Logout                           ║
╠═══════════════════════════════════════════════════════════════════╣
║  🔒 PROTECTED ROUTES (Bearer Token required):                    ║
║    GET    /api/auth/me        - Get current user info            ║
║    POST   /api/products       - Create product                   ║
║    GET    /api/products       - List user's products             ║
║    GET    /api/products/:id   - Get product by ID                ║
║    PUT    /api/products/:id   - Update product                   ║
║    DELETE /api/products/:id   - Delete product                   ║
╚═══════════════════════════════════════════════════════════════════╝
  `)
})