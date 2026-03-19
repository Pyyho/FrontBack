import axios from 'axios'

const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:3000/api',
  headers: {
    'Content-Type': 'application/json',
    accept: 'application/json'
  }
})

export const api = {
  createProduct: async product => (await apiClient.post('/products', product)).data,
  getProducts: async () => (await apiClient.get('/products')).data,
  getProductById: async id => (await apiClient.get(`/products/${id}`)).data,
  updateProduct: async (id, product) => (await apiClient.patch(`/products/${id}`, product)).data,
  deleteProduct: async id => (await apiClient.delete(`/products/${id}`)).data
}