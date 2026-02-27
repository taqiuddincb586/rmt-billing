import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://rmt-billing-backend-production.up.railway.app'

// Force HTTPS - never allow HTTP in production
const baseURL = API_URL.replace('http://', 'https://') + '/api/v1'

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API instance (no token needed for login/register)
export const authApi = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

export default api
