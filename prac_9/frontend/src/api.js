import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const getAccessToken = () => localStorage.getItem('accessToken');
const getRefreshToken = () => localStorage.getItem('refreshToken');
const setTokens = (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
    }
};
const clearTokens = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
};

const apiClient = axios.create({
    baseURL: API_URL
});

// Перехватчик запросов - добавляем токен
apiClient.interceptors.request.use(
    config => {
        const token = getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    error => Promise.reject(error)
);

// Перехватчик ответов - автоматическое обновление токена
apiClient.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && 
            !originalRequest._retry && 
            !originalRequest.url.includes('/auth/refresh')) {
            
            originalRequest._retry = true;

            try {
                const refreshToken = getRefreshToken();
                if (!refreshToken) {
                    throw new Error('Нет refresh token');
                }

                const response = await axios.post(`${API_URL}/auth/refresh`, {
                    refreshToken
                });

                const { accessToken, refreshToken: newRefreshToken } = response.data;
                setTokens(accessToken, newRefreshToken);

                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return apiClient(originalRequest);
            } catch (refreshError) {
                clearTokens();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export const api = {
    async register(userData) {
        const response = await axios.post(`${API_URL}/auth/register`, userData);
        if (response.data.accessToken) {
            setTokens(response.data.accessToken, response.data.refreshToken);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    async login(credentials) {
        const response = await axios.post(`${API_URL}/auth/login`, credentials);
        if (response.data.accessToken) {
            setTokens(response.data.accessToken, response.data.refreshToken);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    async logout() {
        const refreshToken = getRefreshToken();
        if (refreshToken) {
            try {
                await axios.post(`${API_URL}/auth/logout`, { refreshToken });
            } catch (err) {
                console.error('Ошибка при выходе:', err);
            }
        }
        clearTokens();
    },

    async getCurrentUserInfo() {
        const response = await apiClient.get('/auth/me');
        return response.data;
    },

    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    async getProducts() {
        const response = await apiClient.get('/products');
        return response.data;
    },

    async getProduct(id) {
        const response = await apiClient.get(`/products/${id}`);
        return response.data;
    },

    async createProduct(product) {
        const response = await apiClient.post('/products', product);
        return response.data;
    },

    async updateProduct(id, product) {
        const response = await apiClient.put(`/products/${id}`, product);
        return response.data;
    },

    async deleteProduct(id) {
        const response = await apiClient.delete(`/products/${id}`);
        return response.data;
    }
};