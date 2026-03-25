// src/services/api.js
import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  login:    (data) => api.post('/auth/login',    data),
  register: (data) => api.post('/auth/register', data),
  me:       ()     => api.get('/auth/me'),
}
export const expensesApi = {
  list:   (p)    => api.get('/expenses',        { params: p }),
  create: (d)    => api.post('/expenses',       d),
  update: (id,d) => api.put(`/expenses/${id}`,  d),
  remove: (id)   => api.delete(`/expenses/${id}`),
}
export const incomesApi = {
  list:   (p)    => api.get('/incomes',         { params: p }),
  create: (d)    => api.post('/incomes',        d),
  update: (id,d) => api.put(`/incomes/${id}`,   d),
  remove: (id)   => api.delete(`/incomes/${id}`),
}
export const budgetsApi = {
  list:   (p)  => api.get('/budgets',         { params: p }),
  create: (d)  => api.post('/budgets',        d),
  remove: (id) => api.delete(`/budgets/${id}`),
}
export const categoriesApi = {
  list:   ()     => api.get('/categories'),
  create: (d)    => api.post('/categories',        d),
  update: (id,d) => api.put(`/categories/${id}`,   d),
  remove: (id)   => api.delete(`/categories/${id}`),
}
export const recurringExpensesApi = {
  list:     ()     => api.get('/recurring'),
  create:   (d)    => api.post('/recurring',           d),
  update:   (id,d) => api.put(`/recurring/${id}`,      d),
  toggle:   (id)   => api.patch(`/recurring/${id}/toggle`),
  remove:   (id)   => api.delete(`/recurring/${id}`),
  generate: ()     => api.post('/recurring/generate'),
  holidays: (p)    => api.get('/recurring/holidays',   { params: p }),
}
export const recurringIncomesApi = {
  list:     ()     => api.get('/recurring-income'),
  create:   (d)    => api.post('/recurring-income',           d),
  update:   (id,d) => api.put(`/recurring-income/${id}`,      d),
  toggle:   (id)   => api.patch(`/recurring-income/${id}/toggle`),
  remove:   (id)   => api.delete(`/recurring-income/${id}`),
  generate: ()     => api.post('/recurring-income/generate'),
}
export const reportsApi = {
  summary:   (p) => api.get('/reports/summary',            { params: p }),
  monthly:   (p) => api.get('/reports/monthly',            { params: p }),
  pdf:       (p) => api.get('/reports/export/pdf',         { params: p, responseType: 'blob' }),
  excel:     (p) => api.get('/reports/export/excel',       { params: p, responseType: 'blob' }),
  annual:    (p) => api.get('/reports/annual',             { params: p, responseType: 'blob' }),
  evolution: (p) => api.get('/reports/evolution',          { params: p, responseType: 'blob' }),
  annualPdf: (p) => api.get('/reports/export/annual/pdf',  { params: p, responseType: 'blob' }),
}

export default api