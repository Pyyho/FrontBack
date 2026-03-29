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
  GUEST: 'guest',
  USER: 'user',
  SELLER: 'seller',
  ADMIN: 'admin'
}

// ===== In-memory storage =====
let users = []
let products = []
let refreshTokens = new Set()

// Create default admin user if not exists
const createDefaultAdmin = async () => {
  const adminExists = users.find(u => u.role === ROLES.ADMIN)
  if (!adminExists) {
    const adminPassword = await bcrypt.hash('admin123', 10)
    users.push({
      id: nanoid(8),
      email: 'admin@example.com',
      first_name: 'Admin',
      last_name: 'User',
      passwordHash: adminPassword,
      role: ROLES.ADMIN,
      isActive: true
    })
    console.log('✅ Default admin created: admin@example.com / admin123')
  }
}

// Initial products
const initialProducts = [
  { id: nanoid(8), name: 'Футбольный мяч', category: 'Футбол', description: 'Размер 5, термосклейка панелей, для тренировок и игр', price: 2499, stock: 18, image: '/images/ball.jpg' },
  { id: nanoid(8), name: 'Бутсы', category: 'Футбол', description: 'Лёгкие бутсы для искусственного газона, хорошее сцепление', price: 5999, stock: 9, image: '/images/buts.jpg' },
  { id: nanoid(8), name: 'Бинты боксерские', category: 'Единоборства', description: 'Хлопок, фиксируют кисть и запястье, 2 шт в комплекте', price: 499, stock: 45, image: '/images/binti.jpg' },
  { id: nanoid(8), name: 'Перчатки боксерские', category: 'Единоборства', description: 'Подойдут для спаррингов, плотная набивка, фиксация липучкой', price: 3999, stock: 14, image: '/images/perchatki.jpg' },
  { id: nanoid(8), name: 'Коврик для йоги', category: 'Йога', description: 'Нескользящий, 183×61 см, комфортная толщина для суставов', price: 1299, stock: 30, image: '/images/kovrik.jpg' },
  { id: nanoid(8), name: 'Резинки для фитнеса (набор)', category: 'Фитнес', description: '5 уровней сопротивления, для тренировок дома и в зале', price: 799, stock: 60, image: '/images/rezinki.jpg' },
  { id: nanoid(8), name: 'Гантели разборные', category: 'Силовые тренировки', description: 'Набор блинов + гриф, регулировка веса под упражнения', price: 7499, stock: 7, image: '/images/ganteli.jpg' },
  { id: nanoid(8), name: 'Скакалка', category: 'Кардио', description: 'Подшипники, регулируемая длина, для интенсивных тренировок', price: 699, stock: 35, image: '/images/skak.jpg' },
  { id: nanoid(8), name: 'Фляга спортивная 750 мл', category: 'Аксессуары', description: 'Без BPA, удобный клапан, подходит для велосипеда и зала', price: 599, stock: 80, image: '/images/bottle.jpg' },
  { id: nanoid(8), name: 'Ракетка для тенниса', category: 'Теннис', description: 'Для начинающих, лёгкая, чехол в комплекте', price: 4999, stock: 11, image: '/images/raketka.jpg' }
]

// ===== Helper functions =====
const hashPassword = async (password) => bcrypt.hash(password, 10)
const verifyPassword = async (password, hash) => bcrypt.compare(password, hash)

const generateAccessToken = (user) => {
  return jwt.sign(
    { 
      sub: user.id, 
      email: user.email, 
      first_name: user.first_name, 
      last_name: user.last_name,
      role: user.role
    },
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

// ===== Middleware =====

// Auth middleware - checks if user is authenticated
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

// Role middleware - checks if user has required role
const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${req.user.role}` 
      })
    }
    
    next()
  }
}

// Optional auth - doesn't fail if no token, just sets user to null
const optionalAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || ''
  const [scheme, token] = authHeader.split(' ')

  if (scheme === 'Bearer' && token) {
    const payload = verifyAccessToken(token)
    if (payload) {
      req.user = payload
    }
  }
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
    title: 'Sport Shop API with RBAC',
    version: '1.0.0',
    description: 'CRUD API с системой ролей (RBAC) - Гость, Пользователь, Продавец, Администратор (Практика №11)'
  },
  servers: [{ url: 'http://127.0.0.1:3000' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
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
 * tags:
 *   - name: Auth
 *     description: Аутентификация
 *   - name: Users
 *     description: Управление пользователями (только админ)
 *   - name: Products
 *     description: Управление товарами
 */

// POST /api/auth/register - GUEST only
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
    role: ROLES.USER,  // Default role
    isActive: true
  }

  users.push(newUser)

  const { passwordHash: _, ...userWithoutHash } = newUser
  res.status(201).json(userWithoutHash)
})

// POST /api/auth/login - GUEST only
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
  res.json({ accessToken, refreshToken, user: userWithoutHash })
})

// POST /api/auth/refresh - GUEST only
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

// POST /api/auth/logout - USER, SELLER, ADMIN
app.post('/api/auth/logout', authMiddleware, (req, res) => {
  const { refreshToken } = req.body

  if (refreshToken && refreshTokens.has(refreshToken)) {
    refreshTokens.delete(refreshToken)
  }

  res.status(200).json({ message: 'Logged out successfully' })
})

// GET /api/auth/me - USER, SELLER, ADMIN
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = findUserById(req.user.sub)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  const { passwordHash: _, ...userWithoutHash } = user
  res.json(userWithoutHash)
})

// ===== USER MANAGEMENT ROUTES (ADMIN only) =====

// GET /api/users - ADMIN only
app.get('/api/users', authMiddleware, roleMiddleware([ROLES.ADMIN]), (req, res) => {
  const allUsers = users.map(({ passwordHash, ...user }) => user)
  res.json(allUsers)
})

// GET /api/users/:id - ADMIN only
app.get('/api/users/:id', authMiddleware, roleMiddleware([ROLES.ADMIN]), (req, res) => {
  const user = findUserById(req.params.id)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  const { passwordHash, ...userWithoutHash } = user
  res.json(userWithoutHash)
})

// PUT /api/users/:id - ADMIN only (update user)
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
  res.json(userWithoutHash)
})

// DELETE /api/users/:id - ADMIN only (block/delete user)
app.delete('/api/users/:id', authMiddleware, roleMiddleware([ROLES.ADMIN]), (req, res) => {
  const user = findUserById(req.params.id)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  // Soft delete - mark as inactive
  user.isActive = false
  res.status(200).json({ message: 'User blocked successfully', user: { id: user.id, email: user.email, isActive: user.isActive } })
})

// ===== PRODUCT ROUTES =====

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
    ownerId: userId,
    createdAt: new Date().toISOString()
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

// GET /api/products - USER, SELLER, ADMIN (all authenticated users)
app.get('/api/products', authMiddleware, (req, res) => {
  const userProducts = products.map(({ ownerId, ...product }) => product)
  res.json(userProducts)
})

// GET /api/products/:id - USER, SELLER, ADMIN
app.get('/api/products/:id', authMiddleware, (req, res) => {
  const product = products.find(p => p.id === req.params.id)
  if (!product) {
    return res.status(404).json({ error: 'Product not found' })
  }
  const { ownerId, ...productWithoutOwner } = product
  res.json(productWithoutOwner)
})

// PUT /api/products/:id - SELLER and ADMIN only
app.put('/api/products/:id', authMiddleware, roleMiddleware([ROLES.SELLER, ROLES.ADMIN]), (req, res) => {
  const product = products.find(p => p.id === req.params.id)
  if (!product) {
    return res.status(404).json({ error: 'Product not found' })
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

  product.updatedAt = new Date().toISOString()

  const { ownerId, ...productWithoutOwner } = product
  res.json(productWithoutOwner)
})

// DELETE /api/products/:id - ADMIN only
app.delete('/api/products/:id', authMiddleware, roleMiddleware([ROLES.ADMIN]), (req, res) => {
  const productIndex = products.findIndex(p => p.id === req.params.id)
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Product not found' })
  }

  products.splice(productIndex, 1)
  res.status(204).send()
})

// Initialize default admin and assign products
const initializeData = async () => {
  await createDefaultAdmin()
  
  // Assign initial products to default admin if no products exist
  if (products.length === 0) {
    const admin = users.find(u => u.role === ROLES.ADMIN)
    if (admin) {
      initialProducts.forEach(product => {
        products.push({ ...product, ownerId: admin.id, createdAt: new Date().toISOString() })
      })
      console.log(`📦 Initialized ${products.length} products for admin`)
    }
  }
}

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
const startServer = async () => {
  await initializeData()
  app.listen(port, () => {
    console.log(`\n🚀 Server running on http://127.0.0.1:${port}`)
    console.log(`📚 Swagger UI: http://127.0.0.1:${port}/api-docs`)
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                         PRACTICE 11 - RBAC (Role-Based Access Control)                 ║
╠═══════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                       ║
║  ROLES:                                                                               ║
║    👤 GUEST   - Not authenticated (can only register/login)                          ║
║    🧑 USER    - Can view products                                                    ║
║    🛒 SELLER  - Can create and edit products                                         ║
║    👑 ADMIN   - Full access (manage users and products)                              ║
║                                                                                       ║
╠═══════════════════════════════════════════════════════════════════════════════════════╣
║  🔓 PUBLIC ROUTES (GUEST):                                                           ║
║    POST   /api/auth/register  - Register new user                                    ║
║    POST   /api/auth/login     - Login                                                ║
║    POST   /api/auth/refresh   - Refresh tokens                                       ║
╠═══════════════════════════════════════════════════════════════════════════════════════╣
║  🔒 PROTECTED ROUTES:                                                                ║
║                                                                                       ║
║    USER + SELLER + ADMIN:                                                            ║
║      POST   /api/auth/logout   - Logout                                              ║
║      GET    /api/auth/me       - Get current user info                               ║
║      GET    /api/products      - List products                                       ║
║      GET    /api/products/:id  - Get product by ID                                   ║
║                                                                                       ║
║    SELLER + ADMIN:                                                                   ║
║      POST   /api/products      - Create product                                      ║
║      PUT    /api/products/:id  - Update product                                      ║
║                                                                                       ║
║    ADMIN ONLY:                                                                       ║
║      GET    /api/users         - List all users                                      ║
║      GET    /api/users/:id     - Get user by ID                                      ║
║      PUT    /api/users/:id     - Update user (role, status)                          ║
║      DELETE /api/users/:id     - Block user                                          ║
║      DELETE /api/products/:id  - Delete product                                      ║
║                                                                                       ║
╠═══════════════════════════════════════════════════════════════════════════════════════╣
║  👑 DEFAULT ADMIN: admin@example.com / admin123                                      ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
    `)
  })
}

startServer()