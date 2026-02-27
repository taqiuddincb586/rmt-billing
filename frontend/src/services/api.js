import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor - attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor - handle errors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    } else if (err.response?.status >= 500) {
      toast.error('Server error. Please try again.')
    }
    return Promise.reject(err)
  }
)

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
}

// ─── Clinics ──────────────────────────────────────────────────────────────────
export const clinicsApi = {
  list: () => api.get('/clinics'),
  create: (data) => api.post('/clinics', data),
  get: (id) => api.get(`/clinics/${id}`),
  update: (id, data) => api.put(`/clinics/${id}`, data),
  delete: (id) => api.delete(`/clinics/${id}`),
}

// ─── Clients ──────────────────────────────────────────────────────────────────
export const clientsApi = {
  list: (params) => api.get('/clients', { params }),
  create: (data) => api.post('/clients', data),
  get: (id) => api.get(`/clients/${id}`),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
}

// ─── Sessions ─────────────────────────────────────────────────────────────────
export const sessionsApi = {
  list: (params) => api.get('/sessions', { params }),
  create: (data) => api.post('/sessions', data),
  get: (id) => api.get(`/sessions/${id}`),
  update: (id, data) => api.put(`/sessions/${id}`, data),
  delete: (id) => api.delete(`/sessions/${id}`),
}

// ─── Invoices ─────────────────────────────────────────────────────────────────
export const invoicesApi = {
  list: (params) => api.get('/invoices', { params }),
  create: (data) => api.post('/invoices', data),
  get: (id) => api.get(`/invoices/${id}`),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
  generatePdf: (id) => api.post(`/invoices/${id}/generate-pdf`),
  sendEmail: (id) => api.post(`/invoices/${id}/send-email`),
  recordPayment: (id, data) => api.post(`/invoices/${id}/payments`, data),
}

// ─── Expenses ─────────────────────────────────────────────────────────────────
export const expensesApi = {
  list: (params) => api.get('/expenses', { params }),
  create: (data) => api.post('/expenses', data),
  get: (id) => api.get(`/expenses/${id}`),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
}

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  me: () => api.get('/users/me'),
  updateMe: (data) => api.put('/users/me', data),
}

export default api
