import React, { useEffect, useState } from 'react'
import './UsersPage.scss'
import ProductsList from '../../components/ProductsList'
import UsersList from '../../components/UsersList'
import ProductModal from '../../components/ProductModal'
import UserEditModal from '../../components/UserEditModal'
import { api, auth, usersApi, getAccessToken, clearTokens, getUserRole } from '../../api'

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  const [editingProduct, setEditingProduct] = useState(null)
  const [editingUser, setEditingUser] = useState(null)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [activeTab, setActiveTab] = useState('products')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: ''
  })

  useEffect(() => {
    const token = getAccessToken()
    const role = getUserRole()
    setUserRole(role)
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
      setUserRole(userData.role)
      await loadProducts()
      if (userData.role === 'admin') {
        await loadUsers()
      }
    } catch (err) {
      console.error('Auth check failed:', err)
      clearTokens()
      setLoading(false)
    }
  }

  const loadProducts = async () => {
    try {
      const data = await api.getProducts()
      setProducts(data)
    } catch (err) {
      console.error(err)
      alert('Ошибка загрузки товаров')
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const data = await usersApi.getAll()
      setUsers(data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      const userData = await auth.login(loginForm)
      setUser(userData)
      setUserRole(userData.role)
      await loadProducts()
      if (userData.role === 'admin') {
        await loadUsers()
      }
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
      await auth.login({ email: registerForm.email, password: registerForm.password })
      const userData = await auth.getMe()
      setUser(userData)
      setUserRole(userData.role)
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
    setUserRole(null)
    setProducts([])
    setUsers([])
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

  const openUserEdit = user => {
    setEditingUser(user)
    setUserModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingProduct(null)
  }

  const closeUserModal = () => {
    setUserModalOpen(false)
    setEditingUser(null)
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

  const handleUserBlock = async id => {
    const userToBlock = users.find(u => u.id === id)
    const action = userToBlock?.isActive !== false ? 'заблокировать' : 'разблокировать'
    const ok = window.confirm(`Вы уверены, что хотите ${action} этого пользователя?`)
    if (!ok) return

    try {
      await usersApi.update(id, { isActive: userToBlock?.isActive === false })
      await loadUsers()
    } catch (err) {
      console.error(err)
      alert('Ошибка при изменении статуса пользователя')
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

  const handleUserUpdate = async (userId, userData) => {
    try {
      await usersApi.update(userId, userData)
      await loadUsers()
      closeUserModal()
    } catch (err) {
      console.error(err)
      alert('Ошибка обновления пользователя')
    }
  }

  // Login/Register screen
  if (!user) {
    return (
      <div className="page">
        <header className="header">
          <div className="header__inner">
            <div className="brand">Sport Shop</div>
            <div className="header__right">RBAC (Role-Based Access Control)</div>
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
                  <div className="admin-hint">
                    <small>👑 Admin: admin@example.com / admin123</small>
                  </div>
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
  const isAdmin = userRole === 'admin'
  const isSeller = userRole === 'seller'
  const canCreateProduct = isSeller || isAdmin

  return (
    <div className='page'>
      <header className='header'>
        <div className='header__inner'>
          <div className='brand'>Sport Shop</div>
          <div className='header__right'>
            <span className={`role-badge role-${userRole}`}>
              {userRole === 'admin' && '👑'}
              {userRole === 'seller' && '🛒'}
              {userRole === 'user' && '🧑'}
              {userRole === 'admin' ? ' Администратор' : userRole === 'seller' ? ' Продавец' : ' Пользователь'}
            </span>
            {user.first_name} {user.last_name} ({user.email})
            <button onClick={handleLogout} className="btn btn--ghost" style={{ marginLeft: '12px' }}>
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className='main'>
        <div className='container'>
          {isAdmin && (
            <div className="tabs">
              <button
                className={`tab ${activeTab === 'products' ? 'active' : ''}`}
                onClick={() => setActiveTab('products')}
              >
                Товары
              </button>
              <button
                className={`tab ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => { setActiveTab('users'); loadUsers(); }}
              >
                Пользователи
              </button>
            </div>
          )}

          {activeTab === 'products' && (
            <>
              <div className='toolbar'>
                <h1 className='title'>Товары</h1>
                {canCreateProduct && (
                  <button className='btn btn--primary' onClick={openCreate}>
                    + Добавить товар
                  </button>
                )}
              </div>

              {loading ? (
                <div className='empty'>Загрузка...</div>
              ) : (
                <ProductsList
                  products={products}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  userRole={userRole}
                />
              )}
            </>
          )}

          {activeTab === 'users' && isAdmin && (
            <>
              <div className='toolbar'>
                <h1 className='title'>Пользователи</h1>
              </div>
              <UsersList
                users={users}
                onEdit={openUserEdit}
                onDelete={handleUserBlock}
                currentUserRole={userRole}
              />
            </>
          )}
        </div>
      </main>

      <footer className='footer'>
        <div className='footer__inner'>
          © {new Date().getFullYear()} Sport Shop | RBAC System
        </div>
      </footer>

      <ProductModal
        open={modalOpen}
        mode={modalMode}
        initialProduct={editingProduct}
        onClose={closeModal}
        onSubmit={handleSubmitModal}
      />

      <UserEditModal
        open={userModalOpen}
        user={editingUser}
        onClose={closeUserModal}
        onSubmit={handleUserUpdate}
      />
    </div>
  )
}