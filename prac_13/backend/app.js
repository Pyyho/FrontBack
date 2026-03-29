const express = require('express')
const { nanoid } = require('nanoid')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cors = require('cors')

const swaggerJSDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')

const app = express()
const port = 3000

console.log('PRAC_11 BACKEND WITH RBAC (Role-Based Access Control)')

// ===== JWT Configuration =====
const ACCESS_SECRET = 'sport-shop-access-secret-key-2026'
const REFRESH_SECRET = 'sport-shop-refresh-secret-key-2026'

const ACCESS_EXPIRES_IN = '15m'
const REFRESH_EXPIRES_IN = '7d'

// ===== Roles =====
const ROLES = {
  USER: 'user',
  SELLER: 'seller',
  ADMIN: 'admin'
}

// ===== In-memory storage =====
let users = []
let products = []
let refreshTokens = new Set()

// Initial products template
const getInitialProducts = (ownerId) => [
  { id: nanoid(8), name: 'Футбольный мяч', category: 'Футбол', description: 'Размер 5, термосклейка панелей, для тренировок и игр', price: 2499, stock: 18, image: '/images/ball.jpg', ownerId },
  { id: nanoid(8), name: 'Бутсы', category: 'Футбол', description: 'Лёгкие бутсы для искусственного газона, хорошее сцепление', price: 5999, stock: 9, image: '/images/buts.jpg', ownerId },
  { id: nanoid(8), name: 'Бинты боксерские', category: 'Единоборства', description: 'Хлопок, фиксируют кисть и запястье, 2 шт в комплекте', price: 499, stock: 45, image: '/images/binti.jpg', ownerId },
  { id: nanoid(8), name: 'Перчатки боксерские', category: 'Единоборства', description: 'Подойдут для спаррингов, плотная набивка, фиксация липучкой', price: 3999, stock: 14, image: '/images/perchatki.jpg', ownerId },
  { id: nanoid(8), name: 'Коврик для йоги', category: 'Йога', description: 'Нескользящий, 183×61 см, комфортная толщина для суставов', price: 1299, stock: 30, image: '/images/kovrik.jpg', ownerId },
  { id: nanoid(8), name: 'Резинки для фитнеса (набор)', category: 'Фитнес', description: '5 уровней сопротивления, для тренировок дома и в зале', price: 799, stock: 60, image: '/images/rezinki.jpg', ownerId },
  { id: nanoid(8), name: 'Гантели разборные', category: 'Силовые тренировки', description: 'Набор блинов + гриф, регулировка веса под упражнения', price: 7499, stock: 7, image: '/images/ganteli.jpg', ownerId },
  { id: nanoid(8), name: 'Скакалка', category: 'Кардио', description: 'Подшипники, регулируемая длина, для интенсивных тренировок', price: 699, stock: 35, image: '/images/skak.jpg', ownerId },
  { id: nanoid(8), name: 'Фляга спортивная 750 мл', category: 'Аксессуары', description: 'Без BPA, удобный клапан, подходит для велосипеда и зала', price: 599, stock: 80, image: '/images/bottle.jpg', ownerId },
  { id: nanoid(8), name: 'Ракетка для тенниса', category: 'Теннис', description: 'Для начинающих, лёгкая, чехол в комплекте', price: 4999, stock: 11, image: '/images/raketka.jpg', ownerId }
]

// ===== Helper functions =====
const hashPassword = async (password) => bcrypt.hash(password, 10)
const verifyPassword = async (password, hash) => bcrypt.compare(password, hash)

const generateAccessToken = (user) => {
  return jwt.sign(
    { sub: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  )
}

const generateRefreshToken = (user) => {
  return jwt.sign(
    { sub: user.id, role: user.role, type: 'refresh' },
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

// ===== Role Middleware =====
const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}` 
      })
    }
    next()
  }
}

// Find helpers
const findUserByEmail = (email) => users.find(u => u.email === email)
const findUserById = (id) => users.find(u => u.id === id)

// ===== Initialize default admin =====
const initializeDefaultAdmin = async () => {
  // Check if admin already exists
  const adminExists = users.find(u => u.role === ROLES.ADMIN)
  if (!adminExists) {
    const adminPasswordHash = await hashPassword('admin123')
    const adminUser = {
      id: nanoid(8),
      email: 'admin@example.com',
      first_name: 'Admin',
      last_name: 'User',
      passwordHash: adminPasswordHash,
      role: ROLES.ADMIN,
      isActive: true
    }
    users.push(adminUser)
    
    // Create products for admin
    const adminProducts = getInitialProducts(adminUser.id)
    products.push(...adminProducts)
    
    console.log('✅ Default admin created: admin@example.com / admin123')
    console.log(`✅ Created ${adminProducts.length} products for admin`)
  }
}

// ===== Swagger config =====
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Sport Shop API with RBAC',
    version: '1.0.0',
    description: 'CRUD API с системой ролей (RBAC) - Практика №11'
  },
  servers: [{ url: 'http://127.0.0.1:3000' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
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
app.get('/__check', (req, res) => res.send('OK: RBAC API is running'))

// Request logging
app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`)
  })
  next()
})

// ===== AUTH ROUTES =====

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация нового пользователя
 *     tags: [Auth]
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
 *                 example: user@example.com
 *               first_name:
 *                 type: string
 *                 example: Иван
 *               last_name:
 *                 type: string
 *                 example: Иванов
 *               password:
 *                 type: string
 *                 example: qwerty123
 *     responses:
 *       201:
 *         description: Пользователь успешно создан
 *       400:
 *         description: Ошибка валидации
 */

// POST /api/auth/register - PUBLIC
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
    passwordHash,
    role: ROLES.USER,
    isActive: true
  }

  users.push(newUser)
  
  // Create products for new user
  const userProducts = getInitialProducts(newUser.id)
  products.push(...userProducts)

  const { passwordHash: _, ...userWithoutHash } = newUser
  console.log(`✅ New user registered: ${email} as ${newUser.role}`)
  res.status(201).json(userWithoutHash)
})


/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход в систему
 *     tags: [Auth]
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
 *                 example: admin@example.com
 *               password:
 *                 type: string
 *                 example: admin123
 *     responses:
 *       200:
 *         description: Успешный вход
 *       401:
 *         description: Неверные учетные данные
 */

// POST /api/auth/login - PUBLIC
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const user = findUserByEmail(email.toLowerCase().trim())
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  if (!user.isActive) {
    return res.status(403).json({ error: 'Account is blocked. Contact administrator.' })
  }

  const isValid = await verifyPassword(password, user.passwordHash)
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const accessToken = generateAccessToken(user)
  const refreshToken = generateRefreshToken(user)
  refreshTokens.add(refreshToken)

  const { passwordHash: _, ...userWithoutHash } = user
  console.log(`✅ User logged in: ${email} (${user.role})`)
  res.json({ accessToken, refreshToken, user: userWithoutHash })
})


/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Обновление токенов
 *     tags: [Auth]
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
 *         description: Новые токены
 *       401:
 *         description: Недействительный refresh токен
 */

// POST /api/auth/refresh - PUBLIC
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
    if (!user || !user.isActive) {
      refreshTokens.delete(refreshToken)
      return res.status(401).json({ error: 'User not found or blocked' })
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
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Успешный выход
 */

// POST /api/auth/logout - AUTHENTICATED USERS
app.post('/api/auth/logout', authMiddleware, (req, res) => {
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
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Информация о пользователе
 *       401:
 *         description: Не авторизован
 */

// GET /api/auth/me - AUTHENTICATED USERS
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = findUserById(req.user.sub)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  const { passwordHash, ...userWithoutHash } = user
  res.json(userWithoutHash)
})

// ===== USER MANAGEMENT ROUTES (ADMIN only) =====


/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Получить список всех пользователей
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список пользователей
 *       403:
 *         description: Доступ только для администратора
 */

// GET /api/users - ADMIN only
app.get('/api/users', authMiddleware, roleMiddleware([ROLES.ADMIN]), (req, res) => {
  const allUsers = users.map(({ passwordHash, ...user }) => user)
  res.json(allUsers)
})


/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Получить пользователя по ID
 *     tags: [Users]
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
 *         description: Информация о пользователе
 *       403:
 *         description: Доступ только для администратора
 *       404:
 *         description: Пользователь не найден
 */

// GET /api/users/:id - ADMIN only
app.get('/api/users/:id', authMiddleware, roleMiddleware([ROLES.ADMIN]), (req, res) => {
  const user = findUserById(req.params.id)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  const { passwordHash, ...userWithoutHash } = user
  res.json(userWithoutHash)
})


/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Обновить пользователя
 *     tags: [Users]
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
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, seller, admin]
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Пользователь обновлён
 *       403:
 *         description: Доступ только для администратора
 */

// PUT /api/users/:id - ADMIN only
app.put('/api/users/:id', authMiddleware, roleMiddleware([ROLES.ADMIN]), async (req, res) => {
  const user = findUserById(req.params.id)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  const { first_name, last_name, role, isActive } = req.body

  if (first_name !== undefined) user.first_name = first_name.trim()
  if (last_name !== undefined) user.last_name = last_name.trim()
  if (role !== undefined && [ROLES.USER, ROLES.SELLER, ROLES.ADMIN].includes(role)) {
    user.role = role
  }
  if (isActive !== undefined) user.isActive = isActive

  const { passwordHash, ...userWithoutHash } = user
  console.log(`✅ User updated: ${user.email} - role: ${user.role}, active: ${user.isActive}`)
  res.json(userWithoutHash)
})


/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Заблокировать пользователя
 *     tags: [Users]
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
 *         description: Пользователь заблокирован
 *       403:
 *         description: Доступ только для администратора
 *       404:
 *         description: Пользователь не найден
 */

// DELETE /api/users/:id (soft delete - block) - ADMIN only
app.delete('/api/users/:id', authMiddleware, roleMiddleware([ROLES.ADMIN]), (req, res) => {
  const user = findUserById(req.params.id)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  user.isActive = false
  console.log(`✅ User blocked: ${user.email}`)
  res.status(200).json({ message: 'User blocked successfully', user: { id: user.id, email: user.email, isActive: user.isActive } })
})

// ===== PRODUCT ROUTES =====


/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать новый товар
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *               - description
 *               - price
 *               - stock
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: number
 *               image:
 *                 type: string
 *     responses:
 *       201:
 *         description: Товар создан
 *       403:
 *         description: Доступ только для продавцов и администраторов
 */

// POST /api/products - SELLER and ADMIN only
app.post('/api/products', authMiddleware, roleMiddleware([ROLES.SELLER, ROLES.ADMIN]), (req, res) => {
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
  console.log(`✅ Product created: ${newProduct.name} by ${req.user.email}`)
  res.status(201).json(productWithoutOwner)
})


/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить список своих товаров
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список товаров
 */

// GET /api/products - AUTHENTICATED USERS (view their own products)
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
 *     tags: [Products]
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
 *         description: Информация о товаре
 *       404:
 *         description: Товар не найден
 */

// GET /api/products/:id - AUTHENTICATED USERS
app.get('/api/products/:id', authMiddleware, (req, res) => {
  const userId = req.user.sub
  const product = products.find(p => p.id === req.params.id)
  
  if (!product) {
    return res.status(404).json({ error: 'Product not found' })
  }
  
  // Only owner or admin can view
  if (product.ownerId !== userId && req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({ error: 'Access denied' })
  }
  
  const { ownerId, ...productWithoutOwner } = product
  res.json(productWithoutOwner)
})


/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Обновить товар
 *     tags: [Products]
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
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: number
 *               image:
 *                 type: string
 *     responses:
 *       200:
 *         description: Товар обновлён
 *       403:
 *         description: Доступ только для продавцов и администраторов
 */

// PUT /api/products/:id - SELLER and ADMIN only
app.put('/api/products/:id', authMiddleware, roleMiddleware([ROLES.SELLER, ROLES.ADMIN]), (req, res) => {
  const userId = req.user.sub
  const product = products.find(p => p.id === req.params.id)
  
  if (!product) {
    return res.status(404).json({ error: 'Product not found' })
  }
  
  // Seller can only edit their own products, admin can edit any
  if (product.ownerId !== userId && req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({ error: 'You can only edit your own products' })
  }

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
  console.log(`✅ Product updated: ${product.name} by ${req.user.email}`)
  res.json(productWithoutOwner)
})


/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар
 *     tags: [Products]
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
 *       403:
 *         description: Доступ только для администратора
 */

// DELETE /api/products/:id - ADMIN only
app.delete('/api/products/:id', authMiddleware, roleMiddleware([ROLES.ADMIN]), (req, res) => {
  const productIndex = products.findIndex(p => p.id === req.params.id)
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Product not found' })
  }

  const deletedProduct = products[productIndex]
  products.splice(productIndex, 1)
  console.log(`✅ Product deleted: ${deletedProduct.name} by admin`)
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

// ===== Start server =====
const startServer = async () => {
  await initializeDefaultAdmin()
  app.listen(port, () => {
    console.log(`\n🚀 Server running on http://127.0.0.1:${port}`)
    console.log(`📚 Swagger UI: http://127.0.0.1:${port}/api-docs`)
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                         PRACTICE 11 - RBAC (Role-Based Access Control)                 ║
╠═══════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                       ║
║  ROLES:                                                                               ║
║    👤 USER   - Can view products                                                      ║
║    🛒 SELLER - Can view, create and edit products                                     ║
║    👑 ADMIN  - Full access (manage users and delete products)                         ║
║                                                                                       ║
╠═══════════════════════════════════════════════════════════════════════════════════════╣
║  🔓 PUBLIC ROUTES:                                                                    ║
║    POST   /api/auth/register  - Register new user                                     ║
║    POST   /api/auth/login     - Login                                                 ║
║    POST   /api/auth/refresh   - Refresh tokens                                        ║
╠═══════════════════════════════════════════════════════════════════════════════════════╣
║  🔒 PROTECTED ROUTES:                                                                 ║
║                                                                                       ║
║    ALL AUTHENTICATED USERS:                                                           ║
║      POST   /api/auth/logout   - Logout                                               ║
║      GET    /api/auth/me       - Get current user info                                ║
║      GET    /api/products      - List your products                                   ║
║      GET    /api/products/:id  - Get product by ID                                    ║
║                                                                                       ║
║    SELLER + ADMIN:                                                                    ║
║      POST   /api/products      - Create product                                       ║
║      PUT    /api/products/:id  - Update product                                       ║
║                                                                                       ║
║    ADMIN ONLY:                                                                        ║
║      GET    /api/users         - List all users                                       ║
║      GET    /api/users/:id     - Get user by ID                                       ║
║      PUT    /api/users/:id     - Update user (role, status)                           ║
║      DELETE /api/users/:id     - Block user                                           ║
║      DELETE /api/products/:id  - Delete any product                                   ║
║                                                                                       ║
╠═══════════════════════════════════════════════════════════════════════════════════════╣
║  👑 DEFAULT ADMIN: admin@example.com / admin123                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
    `)
  })
}

startServer()