import React, { useEffect, useState } from 'react'
import './UsersPage.scss'
import ProductsList from '../../components/ProductsList'
import ProductModal from '../../components/ProductModal'
import { api, auth, setTokens, getAccessToken, clearTokens } from '../../api'

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  const [editingProduct, setEditingProduct] = useState(null)
  const [user, setUser] = useState(null)
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: ''
  })

  // Check for existing token on mount
  useEffect(() => {
    const token = getAccessToken()
    if (token) {
      checkAuth()
    } else {
      setLoading(false)
    }
  }, [])

  const checkAuth = async () => {
    try {
      const userData = await auth.getMe()
      setUser(userData)
      loadProducts()
    } catch (err) {
      console.error('Auth check failed:', err)
      clearTokens()
      setLoading(false)
    }
  }

  const loadProducts = async () => {
    try {
      setLoading(true)
      const data = await api.getProducts()
      setProducts(data)
    } catch (err) {
      console.error(err)
      alert('Ошибка загрузки товаров')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      const userData = await auth.login(loginForm)
      setUser(userData)
      await loadProducts()
      setLoginForm({ email: '', password: '' })
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.error || 'Ошибка входа')
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    try {
      await auth.register(registerForm)
      // Auto login after registration
      await auth.login({ email: registerForm.email, password: registerForm.password })
      const userData = await auth.getMe()
      setUser(userData)
      await loadProducts()
      setRegisterForm({ email: '', first_name: '', last_name: '', password: '' })
      setIsLoginMode(true)
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.error || 'Ошибка регистрации')
    }
  }

  const handleLogout = async () => {
    await auth.logout()
    setUser(null)
    setProducts([])
  }

  const openCreate = () => {
    setModalMode('create')
    setEditingProduct(null)
    setModalOpen(true)
  }

  const openEdit = product => {
    setModalMode('edit')
    setEditingProduct(product)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingProduct(null)
  }

  const handleDelete = async id => {
    const ok = window.confirm('Удалить товар?')
    if (!ok) return

    try {
      await api.deleteProduct(id)
      setProducts(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      console.error(err)
      alert('Ошибка удаления товара')
    }
  }

  const handleSubmitModal = async payload => {
    try {
      if (modalMode === 'create') {
        const newProduct = await api.createProduct(payload)
        setProducts(prev => [...prev, newProduct])
      } else {
        const updatedProduct = await api.updateProduct(payload.id, payload)
        setProducts(prev =>
          prev.map(p => (p.id === payload.id ? updatedProduct : p))
        )
      }
      closeModal()
    } catch (err) {
      console.error(err)
      alert('Ошибка сохранения товара')
    }
  }

  // Login/Register screen
  if (!user) {
    return (
      <div className="page">
        <header className="header">
          <div className="header__inner">
            <div className="brand">Sport Shop</div>
            <div className="header__right">React + Express + JWT</div>
          </div>
        </header>
        <main className="main">
          <div className="container">
            <div className="auth-container">
              <div className="auth-tabs">
                <button
                  className={`auth-tab ${isLoginMode ? 'active' : ''}`}
                  onClick={() => setIsLoginMode(true)}
                >
                  Вход
                </button>
                <button
                  className={`auth-tab ${!isLoginMode ? 'active' : ''}`}
                  onClick={() => setIsLoginMode(false)}
                >
                  Регистрация
                </button>
              </div>

              {isLoginMode ? (
                <form onSubmit={handleLogin} className="auth-form">
                  <label className="label">
                    Email
                    <input
                      className="input"
                      type="email"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      required
                    />
                  </label>
                  <label className="label">
                    Пароль
                    <input
                      className="input"
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                    />
                  </label>
                  <button type="submit" className="btn btn--primary">Войти</button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="auth-form">
                  <label className="label">
                    Email
                    <input
                      className="input"
                      type="email"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      required
                    />
                  </label>
                  <label className="label">
                    Имя
                    <input
                      className="input"
                      type="text"
                      value={registerForm.first_name}
                      onChange={(e) => setRegisterForm({ ...registerForm, first_name: e.target.value })}
                      required
                    />
                  </label>
                  <label className="label">
                    Фамилия
                    <input
                      className="input"
                      type="text"
                      value={registerForm.last_name}
                      onChange={(e) => setRegisterForm({ ...registerForm, last_name: e.target.value })}
                      required
                    />
                  </label>
                  <label className="label">
                    Пароль (мин. 6 символов)
                    <input
                      className="input"
                      type="password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      required
                      minLength={6}
                    />
                  </label>
                  <button type="submit" className="btn btn--primary">Зарегистрироваться</button>
                </form>
              )}
            </div>
          </div>
        </main>
        <footer className="footer">
          <div className="footer__inner">© {new Date().getFullYear()} Sport Shop</div>
        </footer>
      </div>
    )
  }

  // Products screen (authenticated)
  return (
    <div className='page'>
      <header className='header'>
        <div className='header__inner'>
          <div className='brand'>Sport Shop</div>
          <div className='header__right'>
            {user.first_name} {user.last_name} ({user.email})
            <button onClick={handleLogout} className="btn btn--ghost" style={{ marginLeft: '12px' }}>
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className='main'>
        <div className='container'>
          <div className='toolbar'>
            <h1 className='title'>Мои товары</h1>
            <button className='btn btn--primary' onClick={openCreate}>
              + Добавить товар
            </button>
          </div>

          {loading ? (
            <div className='empty'>Загрузка...</div>
          ) : (
            <ProductsList
              products={products}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          )}
        </div>
      </main>

      <footer className='footer'>
        <div className='footer__inner'>
          © {new Date().getFullYear()} Sport Shop
        </div>
      </footer>

      <ProductModal
        open={modalOpen}
        mode={modalMode}
        initialProduct={editingProduct}
        onClose={closeModal}
        onSubmit={handleSubmitModal}
      />
    </div>
  )
}