import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'

const fetchExpenses = () => api.get('/expenses/').then(r => r.data)

const CATEGORIES = ['supplies', 'equipment', 'rent', 'insurance', 'education', 'marketing', 'software', 'utilities', 'other']

export default function ExpensesPage() {
  const queryClient = useQueryClient()
  const { data: expenses = [], isLoading } = useQuery({ queryKey: ['expenses'], queryFn: fetchExpenses })
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filterCat, setFilterCat] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const emptyForm = { category: 'supplies', description: '', amount: '', tax_amount: 0, date: today, vendor: '', is_tax_deductible: true, notes: '' }
  const [form, setForm] = useState(emptyForm)

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/expenses/', data),
    onSuccess: () => { queryClient.invalidateQueries(['expenses']); toast.success('Expense added!'); setShowModal(false); setForm(emptyForm) },
    onError: () => toast.error('Failed to save expense')
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/expenses/${id}/`, data),
    onSuccess: () => { queryClient.invalidateQueries(['expenses']); toast.success('Expense updated!'); setShowModal(false); setEditing(null); setForm(emptyForm) },
    onError: () => toast.error('Failed to update expense')
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/expenses/${id}/`),
    onSuccess: () => { queryClient.invalidateQueries(['expenses']); toast.success('Expense deleted') }
  })

  const openEdit = (e) => {
    setEditing(e)
    setForm({ category: e.category, description: e.description, amount: e.amount, tax_amount: e.tax_amount, date: e.date, vendor: e.vendor || '', is_tax_deductible: e.is_tax_deductible, notes: e.notes || '' })
    setShowModal(true)
  }

  const handleSubmit = () => {
    if (!form.description.trim()) return toast.error('Description is required')
    if (!form.amount) return toast.error('Amount is required')
    const payload = { ...form, amount: parseFloat(form.amount), tax_amount: parseFloat(form.tax_amount) || 0 }
    if (editing) updateMutation.mutate({ id: editing.id, data: payload })
    else createMutation.mutate(payload)
  }

  const displayed = filterCat ? expenses.filter(e => e.category === filterCat) : expenses
  const total = displayed.reduce((sum, e) => sum + (e.amount || 0), 0)
  const deductible = displayed.filter(e => e.is_tax_deductible).reduce((sum, e) => sum + (e.amount || 0), 0)

  return (
    <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif', background: '#f8faf9', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1a2e1a', margin: 0 }}>Expenses</h1>
          <p style={{ color: '#6b7280', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setEditing(null); setForm(emptyForm); setShowModal(true) }}
          style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.65rem 1.25rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}>
          + Add Expense
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[['Total Expenses', `$${total.toFixed(2)}`, '#dc2626', '#fef2f2'], ['Tax Deductible', `$${deductible.toFixed(2)}`, '#166534', '#f0fdf4'], ['This Period', displayed.length + ' items', '#1d4ed8', '#eff6ff']].map(([label, value, color, bg]) => (
          <div key={label} style={{ background: '#fff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e5e7eb' }}>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</p>
            <p style={{ margin: '0.5rem 0 0', fontSize: '1.5rem', fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button onClick={() => setFilterCat('')} style={{ background: !filterCat ? '#0d9488' : '#f3f4f6', color: !filterCat ? '#fff' : '#374151', border: 'none', borderRadius: '20px', padding: '0.4rem 1rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>All</button>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setFilterCat(cat)} style={{ background: filterCat === cat ? '#0d9488' : '#f3f4f6', color: filterCat === cat ? '#fff' : '#374151', border: 'none', borderRadius: '20px', padding: '0.4rem 1rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', textTransform: 'capitalize' }}>{cat}</button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>Loading...</div>
      ) : displayed.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '16px', padding: '4rem', textAlign: 'center', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💰</div>
          <h3 style={{ color: '#374151' }}>No expenses found</h3>
          <button onClick={() => { setEditing(null); setForm(emptyForm); setShowModal(true) }}
            style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.65rem 1.5rem', fontWeight: 600, cursor: 'pointer', marginTop: '1rem' }}>
            + Add Expense
          </button>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Date', 'Description', 'Category', 'Vendor', 'Amount', 'Tax Ded.', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((e, i) => (
                <tr key={e.id} style={{ borderBottom: i < displayed.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.875rem', color: '#374151' }}>{e.date}</td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#1a2e1a', fontSize: '0.875rem' }}>{e.description}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ background: '#f3f4f6', color: '#374151', borderRadius: '20px', padding: '0.2rem 0.65rem', fontSize: '0.78rem', fontWeight: 600, textTransform: 'capitalize' }}>{e.category}</span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.875rem', color: '#374151' }}>{e.vendor || '—'}</td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#dc2626', fontSize: '0.875rem' }}>${e.amount?.toFixed(2)}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ background: e.is_tax_deductible ? '#f0fdf4' : '#f3f4f6', color: e.is_tax_deductible ? '#166534' : '#6b7280', borderRadius: '20px', padding: '0.2rem 0.65rem', fontSize: '0.78rem', fontWeight: 600 }}>
                      {e.is_tax_deductible ? '✓ Yes' : 'No'}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button onClick={() => openEdit(e)} style={{ background: '#f0fdf4', color: '#166534', border: 'none', borderRadius: '6px', padding: '0.3rem 0.65rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>Edit</button>
                      <button onClick={() => { if (window.confirm('Delete expense?')) deleteMutation.mutate(e.id) }} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '0.3rem 0.65rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: '#1a2e1a', fontWeight: 700 }}>{editing ? 'Edit Expense' : 'Add Expense'}</h2>
              <button onClick={() => { setShowModal(false); setEditing(null) }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, color: '#374151', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', textTransform: 'capitalize' }}>
                  {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
                </select>
              </div>
              {[['Description *', 'description', 'text'], ['Amount ($) *', 'amount', 'number'], ['Tax Amount ($)', 'tax_amount', 'number'], ['Date *', 'date', 'date'], ['Vendor', 'vendor', 'text']].map(([label, field, type]) => (
                <div key={field}>
                  <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, color: '#374151', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                  <input type={type} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, color: '#374151', fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={form.is_tax_deductible} onChange={e => setForm(f => ({ ...f, is_tax_deductible: e.target.checked }))} />
                  Tax deductible
                </label>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, color: '#374151', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}
                style={{ flex: 1, background: 'linear-gradient(135deg, #0d9488, #0f766e)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.75rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}>
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Expense'}
              </button>
              <button onClick={() => { setShowModal(false); setEditing(null) }}
                style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '10px', padding: '0.75rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
