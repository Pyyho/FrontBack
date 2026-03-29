const express = require('express')
const { nanoid } = require('nanoid')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cors = require('cors')

const swaggerJSDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')

const app = express()
const port = 3000

console.log('PRAC_9 BACKEND WITH REFRESH TOKEN ROTATION')

// ===== JWT Configuration =====
const ACCESS_SECRET = 'sport-shop-access-secret-key-2026'
const REFRESH_SECRET = 'sport-shop-refresh-secret-key-2026'

const ACCESS_EXPIRES_IN = '15m'
const REFRESH_EXPIRES_IN = '7d'

// ===== In-memory storage =====
let users = []
let products = []
let refreshTokens = new Set()

// Initial products
const initialProducts = [
  { id: nanoid(8), name: 'Футбольный мяч', category: 'Футбол', description: 'Размер 5, термосклейка панелей, для тренировок и игр', price: 2499, stock: 18, image: '/images/ball.jpg', ownerId: null },
  { id: nanoid(8), name: 'Бутсы', category: 'Футбол', description: 'Лёгкие бутсы для искусственного газона, хорошее сцепление', price: 5999, stock: 9, image: '/images/buts.jpg', ownerId: null },
  { id: nanoid(8), name: 'Бинты боксерские', category: 'Единоборства', description: 'Хлопок, фиксируют кисть и запястье, 2 шт в комплекте', price: 499, stock: 45, image: '/images/binti.jpg', ownerId: null },
  { id: nanoid(8), name: 'Перчатки боксерские', category: 'Единоборства', description: 'Подойдут для спаррингов, плотная набивка, фиксация липучкой', price: 3999, stock: 14, image: '/images/perchatki.jpg', ownerId: null },
  { id: nanoid(8), name: 'Коврик для йоги', category: 'Йога', description: 'Нескользящий, 183×61 см, комфортная толщина для суставов', price: 1299, stock: 30, image: '/images/kovrik.jpg', ownerId: null },
  { id: nanoid(8), name: 'Резинки для фитнеса (набор)', category: 'Фитнес', description: '5 уровней сопротивления, для тренировок дома и в зале', price: 799, stock: 60, image: '/images/rezinki.jpg', ownerId: null },
  { id: nanoid(8), name: 'Гантели разборные', category: 'Силовые тренировки', description: 'Набор блинов + гриф, регулировка веса под упражнения', price: 7499, stock: 7, image: '/images/ganteli.jpg', ownerId: null },
  { id: nanoid(8), name: 'Скакалка', category: 'Кардио', description: 'Подшипники, регулируемая длина, для интенсивных тренировок', price: 699, stock: 35, image: '/images/skak.jpg', ownerId: null },
  { id: nanoid(8), name: 'Фляга спортивная 750 мл', category: 'Аксессуары', description: 'Без BPA, удобный клапан, подходит для велосипеда и зала', price: 599, stock: 80, image: '/images/bottle.jpg', ownerId: null },
  { id: nanoid(8), name: 'Ракетка для тенниса', category: 'Теннис', description: 'Для начинающих, лёгкая, чехол в комплекте', price: 4999, stock: 11, image: '/images/raketka.jpg', ownerId: null }
]

// ===== Helper functions =====
const hashPassword = async (password) => bcrypt.hash(password, 10)
const verifyPassword = async (password, hash) => bcrypt.compare(password, hash)

const generateAccessToken = (user) => {
  return jwt.sign(
    { sub: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  )
}

const generateRefreshToken = (user) => {
  return jwt.sign(
    { sub: user.id, type: 'refresh' },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  )
}

const verifyAccessToken = (token) => {
  try {
    const payload = jwt.verify(token, ACCESS_SECRET)
    if (payload.type === 'refresh') return null
    return payload
  } catch {
    return null
  }
}

const verifyRefreshToken = (token) => {
  try {
    const payload = jwt.verify(token, REFRESH_SECRET)
    if (payload.type !== 'refresh') return null
    return payload
  } catch {
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

  const payload = verifyAccessToken(token)
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  req.user = payload
  next()
}

// Find helpers
const findUserByEmail = (email) => users.find(u => u.email === email)
const findUserById = (id) => users.find(u => u.id === id)

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
    title: 'Sport Shop API with JWT Authentication',
    version: '1.0.0',
    description: 'CRUD API для товаров с JWT-аутентификацией и refresh-токенами (Практика №9-10)'
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
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'a1b2c3d4' },
          email: { type: 'string', example: 'ivan@example.com' },
          first_name: { type: 'string', example: 'Иван' },
          last_name: { type: 'string', example: 'Иванов' }
        }
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'a1b2c3d4' },
          name: { type: 'string', example: 'Футбольный мяч' },
          category: { type: 'string', example: 'Футбол' },
          description: { type: 'string', example: 'Описание товара' },
          price: { type: 'number', example: 2499 },
          stock: { type: 'number', example: 18 },
          image: { type: 'string', example: 'https://example.com/image.jpg' }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'ivan@example.com' },
          password: { type: 'string', example: 'qwerty123' }
        }
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'first_name', 'last_name', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'ivan@example.com' },
          first_name: { type: 'string', example: 'Иван' },
          last_name: { type: 'string', example: 'Иванов' },
          password: { type: 'string', minLength: 6, example: 'qwerty123' }
        }
      },
      RefreshRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' }
        }
      },
      AuthResponse: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          user: { $ref: '#/components/schemas/User' }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' }
        }
      }
    }
  }
}

const swaggerOptions = {
  swaggerDefinition,
  apis: ['./app.js']
}

const swaggerSpec = swaggerJSDoc(swaggerOptions)

// ===== Middleware =====
app.use(express.json())
app.use(cors({
  origin: ['http://127.0.0.1:3001', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
app.get('/__check', (req, res) => res.send('OK: Authentication API is running'))

// Request logging
app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`)
  })
  next()
})

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Аутентификация и управление пользователями
 *   - name: Products
 *     description: Управление товарами (требует JWT)
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация нового пользователя
 *     description: Создаёт нового пользователя с хешированием пароля
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Пользователь успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Неверные данные или email уже существует
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post('/api/auth/register', async (req, res) => {
  const { email, first_name, last_name, password } = req.body

  if (!email || !first_name || !last_name || !password) {
    return res.status(400).json({ error: 'All fields are required' })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' })
  }

  if (findUserByEmail(email)) {
    return res.status(400).json({ error: 'User with this email already exists' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  const passwordHash = await hashPassword(password)
  const newUser = {
    id: nanoid(8),
    email: email.toLowerCase().trim(),
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    passwordHash
  }

  users.push(newUser)

  initialProducts.forEach(product => {
    if (product.ownerId === null) {
      products.push({ ...product, ownerId: newUser.id })
    }
  })

  const { passwordHash: _, ...userWithoutHash } = newUser
  res.status(201).json(userWithoutHash)
})

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход в систему
 *     description: Аутентификация пользователя и получение access и refresh токенов
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Успешная авторизация
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Отсутствуют обязательные поля
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
  refreshTokens.add(refreshToken)

  const { passwordHash: _, ...userWithoutHash } = user
  res.json({ accessToken, refreshToken, user: userWithoutHash })
})

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Обновление токенов
 *     description: Получение новой пары access и refresh токенов с ротацией
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshRequest'
 *     responses:
 *       200:
 *         description: Токены успешно обновлены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         description: Отсутствует refreshToken
 *       401:
 *         description: Недействительный refresh токен
 */
app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body

  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken is required' })
  }

  if (!refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: 'Invalid refresh token' })
  }

  try {
    const payload = verifyRefreshToken(refreshToken)
    if (!payload) {
      refreshTokens.delete(refreshToken)
      return res.status(401).json({ error: 'Invalid or expired refresh token' })
    }

    const user = findUserById(payload.sub)
    if (!user) {
      refreshTokens.delete(refreshToken)
      return res.status(401).json({ error: 'User not found' })
    }

    refreshTokens.delete(refreshToken)

    const newAccessToken = generateAccessToken(user)
    const newRefreshToken = generateRefreshToken(user)
    refreshTokens.add(newRefreshToken)

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken })
  } catch (err) {
    refreshTokens.delete(refreshToken)
    return res.status(401).json({ error: 'Invalid or expired refresh token' })
  }
})

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Выход из системы
 *     description: Инвалидация refresh токена
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshRequest'
 *     responses:
 *       200:
 *         description: Успешный выход
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Недействительный refresh токен
 */
app.post('/api/auth/logout', (req, res) => {
  const { refreshToken } = req.body

  if (refreshToken && refreshTokens.has(refreshToken)) {
    refreshTokens.delete(refreshToken)
  }

  res.status(200).json({ message: 'Logged out successfully' })
})

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Получить информацию о текущем пользователе
 *     description: Возвращает данные авторизованного пользователя
 *     tags: [Auth]
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
  const user = findUserById(req.user.sub)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  const { passwordHash: _, ...userWithoutHash } = user
  res.json(userWithoutHash)
})

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать новый товар
 *     description: Создаёт товар для авторизованного пользователя
 *     tags: [Products]
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
 *       400:
 *         description: Неверные данные
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
 *     summary: Получить список товаров
 *     description: Возвращает все товары текущего пользователя
 *     tags: [Products]
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
 *     summary: Получить товар по ID
 *     description: Возвращает конкретный товар текущего пользователя
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
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
 *     summary: Обновить товар
 *     description: Полностью обновляет товар текущего пользователя
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
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
 *       400:
 *         description: Неверные данные
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
 *     summary: Удалить товар
 *     description: Удаляет товар текущего пользователя
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// Start server
app.listen(port, () => {
  console.log(`\n🚀 Server running on http://127.0.0.1:${port}`)
  console.log(`📚 Swagger UI: http://127.0.0.1:${port}/api-docs`)
})