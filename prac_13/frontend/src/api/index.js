import axios from 'axios'

const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:3000/api',
  headers: {
    'Content-Type': 'application/json',
    accept: 'application/json'
  }
})

// Token management with localStorage
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

export const setTokens = (access, refresh) => {
  if (access) {
    localStorage.setItem('accessToken', access)
  } else {
    localStorage.removeItem('accessToken')
  }
  if (refresh) {
    localStorage.setItem('refreshToken', refresh)
  } else {
    localStorage.removeItem('refreshToken')
  }
}

export const getAccessToken = () => localStorage.getItem('accessToken')
export const getRefreshToken = () => localStorage.getItem('refreshToken')
export const getUserRole = () => {
  const token = getAccessToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.role
  } catch {
    return null
  }
}

export const clearTokens = () => {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

// Request interceptor - add access token to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle token refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return apiClient(originalRequest)
        })
        .catch(err => Promise.reject(err))
    }

    isRefreshing = true
    const refreshToken = getRefreshToken()

    if (!refreshToken) {
      clearTokens()
      isRefreshing = false
      window.location.href = '/'
      return Promise.reject(error)
    }

    try {
      const response = await axios.post('http://127.0.0.1:3000/api/auth/refresh', {
        refreshToken
      })

      const { accessToken, refreshToken: newRefreshToken } = response.data
      setTokens(accessToken, newRefreshToken)

      processQueue(null, accessToken)

      originalRequest.headers.Authorization = `Bearer ${accessToken}`
      return apiClient(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      clearTokens()
      isRefreshing = false
      window.location.href = '/'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

// Auth API
export const auth = {
  register: async (userData) => {
    const response = await apiClient.post('/auth/register', userData)
    return response.data
  },
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials)
    const { accessToken, refreshToken, user } = response.data
    setTokens(accessToken, refreshToken)
    return user
  },
  logout: async () => {
    const refreshToken = getRefreshToken()
    if (refreshToken) {
      await apiClient.post('/auth/logout', { refreshToken }).catch(() => {})
    }
    clearTokens()
  },
  getMe: async () => {
    const response = await apiClient.get('/auth/me')
    return response.data
  },
  isAuthenticated: () => {
    return !!getAccessToken()
  },
  getRole: () => getUserRole()
}

// Users API (ADMIN only)
export const usersApi = {
  getAll: async () => {
    const response = await apiClient.get('/users')
    return response.data
  },
  getById: async (id) => {
    const response = await apiClient.get(`/users/${id}`)
    return response.data
  },
  update: async (id, userData) => {
    const response = await apiClient.put(`/users/${id}`, userData)
    return response.data
  },
  delete: async (id) => {
    const response = await apiClient.delete(`/users/${id}`)
    return response.data
  }
}

// Products API
export const api = {
  createProduct: async (product) => {
    const response = await apiClient.post('/products', product)
    return response.data
  },
  getProducts: async () => {
    const response = await apiClient.get('/products')
    return response.data
  },
  getProductById: async (id) => {
    const response = await apiClient.get(`/products/${id}`)
    return response.data
  },
  updateProduct: async (id, product) => {
    const response = await apiClient.put(`/products/${id}`, product)
    return response.data
  },
  deleteProduct: async (id) => {
    const response = await apiClient.delete(`/products/${id}`)
    return response.data
  }
}