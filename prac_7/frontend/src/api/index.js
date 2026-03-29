import axios from 'axios'

const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:3000/api',
  headers: {
    'Content-Type': 'application/json',
    accept: 'application/json'
  }
})

// Token management
let accessToken = null
let refreshToken = null

export const setTokens = (access, refresh) => {
  accessToken = access
  refreshToken = refresh
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

export const getAccessToken = () => {
  return accessToken || localStorage.getItem('accessToken')
}

export const getRefreshToken = () => {
  return refreshToken || localStorage.getItem('refreshToken')
}

export const clearTokens = () => {
  accessToken = null
  refreshToken = null
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

// Request interceptor to add token
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

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refresh = getRefreshToken()
      if (refresh) {
        try {
          const response = await axios.post('http://127.0.0.1:3000/api/auth/refresh', {
            refreshToken: refresh
          })
          const { accessToken: newAccessToken } = response.data
          setTokens(newAccessToken, null)
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          return apiClient(originalRequest)
        } catch (refreshError) {
          clearTokens()
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      }
    }
    return Promise.reject(error)
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
    const refresh = getRefreshToken()
    if (refresh) {
      await apiClient.post('/auth/logout', { refreshToken: refresh }).catch(() => {})
    }
    clearTokens()
  },
  getMe: async () => {
    const response = await apiClient.get('/auth/me')
    return response.data
  },
  refreshAccess: async () => {
    const refresh = getRefreshToken()
    if (!refresh) throw new Error('No refresh token')
    const response = await axios.post('http://127.0.0.1:3000/api/auth/refresh', {
      refreshToken: refresh
    })
    const { accessToken: newAccessToken } = response.data
    setTokens(newAccessToken, null)
    return newAccessToken
  },
  isAuthenticated: () => {
    return !!getAccessToken()
  }
}

// Products API (protected)
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