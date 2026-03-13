import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const getToken = () => localStorage.getItem('token');

const apiClient = axios.create({
    baseURL: API_URL
});

apiClient.interceptors.request.use(
    config => {
        const token = getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    error => Promise.reject(error)
);

export const api = {
    // Аутентификация
    async register(userData) {
        const response = await axios.post(`${API_URL}/auth/register`, userData);
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    async login(credentials) {
        const response = await axios.post(`${API_URL}/auth/login`, credentials);
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    // Товары
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