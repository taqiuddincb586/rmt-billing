import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'

const fetchInvoices = () => api.get('/invoices').then(r => r.data)
const fetchClients = () => api.get('/clients').then(r => r.data)

export default function InvoicesPage() {
  const queryClient = useQueryClient()
  const { data: invoices = [], isLoading } = useQuery({ queryKey: ['invoices'], queryFn: fetchInvoices })
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: fetchClients })
  const [showModal, setShowModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const due = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  const emptyForm = { client_id: '', issue_date: today, due_date: due, tax_rate: 0.13, discount: 0, notes: '', session_ids: [], line_items: [] }
  const [form, setForm] = useState(emptyForm)

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/invoices', data),
    onSuccess: () => { queryClient.invalidateQueries(['invoices']); toast.success('Invoice created!'); setShowModal(false); setForm(emptyForm) },
    onError: () => toast.error('Failed to create invoice')
  })

  const handleSubmit = () => {
    if (!form.client_id) return toast.error('Please select a client')
    const payload = { ...form, client_id: parseInt(form.client_id), tax_rate: parseFloat(form.tax_rate), discount: parseFloat(form.discount) || 0 }
    createMutation.mutate(payload)
  }

  const recordPayment = useMutation({
    mutationFn: ({ id, data }) => api.post(`/invoices/${id}/payments`, data),
    onSuccess: () => { queryClient.invalidateQueries(['invoices']); toast.success('Payment recorded!') },
    onError: () => toast.error('Failed to record payment')
  })

  const displayed = filterStatus ? invoices.filter(i => i.status === filterStatus) : invoices

  const statusColor = { draft: '#374151', sent: '#1d4ed8', paid: '#166534', overdue: '#dc2626', cancelled: '#6b7280' }
  const statusBg = { draft: '#f3f4f6', sent: '#eff6ff', paid: '#f0fdf4', overdue: '#fef2f2', cancelled: '#f9fafb' }

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0)
  const totalOutstanding = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + (i.balance_due || 0), 0)

  return (
    <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif', background: '#f8faf9', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1a2e1a', margin: 0 }}>Invoices</h1>
          <p style={{ color: '#6b7280', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>{invoices.length} total invoice{invoices.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setShowModal(true) }}
          style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.65rem 1.25rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}>
          + New Invoice
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[['Total Revenue', `$${totalRevenue.toFixed(2)}`, '#166534'], ['Outstanding', `$${totalOutstanding.toFixed(2)}`, '#dc2626'], ['Overdue', invoices.filter(i => i.status === 'overdue').length, '#92400e'], ['Unpaid', invoices.filter(i => i.status === 'sent').length, '#1d4ed8']].map(([label, value, color]) => (
          <div key={label} style={{ background: '#fff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e5e7eb' }}>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</p>
            <p style={{ margin: '0.5rem 0 0', fontSize: '1.4rem', fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['', 'draft', 'sent', 'paid', 'overdue', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{ background: filterStatus === s ? '#0d9488' : '#f3f4f6', color: filterStatus === s ? '#fff' : '#374151', border: 'none', borderRadius: '20px', padding: '0.4rem 1rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', textTransform: 'capitalize' }}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>Loading...</div>
      ) : displayed.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '16px', padding: '4rem', textAlign: 'center', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧾</div>
          <h3 style={{ color: '#374151' }}>No invoices found</h3>
          <button onClick={() => { setForm(emptyForm); setShowModal(true) }}
            style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.65rem 1.5rem', fontWeight: 600, cursor: 'pointer', marginTop: '1rem' }}>
            + New Invoice
          </button>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Invoice #', 'Client', 'Issue Date', 'Due Date', 'Total', 'Balance', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((inv, i) => (
                <tr key={inv.id} style={{ borderBottom: i < displayed.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#1a2e1a', fontSize: '0.875rem' }}>{inv.invoice_number}</td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.875rem', color: '#374151' }}>{inv.client?.full_name || `Client #${inv.client_id}`}</td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.875rem', color: '#374151' }}>{inv.issue_date}</td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.875rem', color: inv.status === 'overdue' ? '#dc2626' : '#374151', fontWeight: inv.status === 'overdue' ? 600 : 400 }}>{inv.due_date}</td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#1a2e1a', fontSize: '0.875rem' }}>${inv.total?.toFixed(2)}</td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: inv.balance_due > 0 ? '#dc2626' : '#166534', fontSize: '0.875rem' }}>${inv.balance_due?.toFixed(2)}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ background: statusBg[inv.status] || '#f3f4f6', color: statusColor[inv.status] || '#374151', borderRadius: '20px', padding: '0.2rem 0.65rem', fontSize: '0.78rem', fontWeight: 600, textTransform: 'capitalize' }}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {inv.status !== 'paid' && inv.balance_due > 0 && (
                      <button onClick={() => {
                        const amount = window.prompt(`Record payment for ${inv.invoice_number} (balance: $${inv.balance_due?.toFixed(2)}):`, inv.balance_due?.toFixed(2))
                        if (amount) recordPayment.mutate({ id: inv.id, data: { amount: parseFloat(amount), payment_date: today, payment_method: 'e_transfer' } })
                      }} style={{ background: '#f0fdf4', color: '#166534', border: 'none', borderRadius: '6px', padding: '0.3rem 0.65rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>
                        Pay
                      </button>
                    )}
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
              <h2 style={{ margin: 0, color: '#1a2e1a', fontWeight: 700 }}>New Invoice</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, color: '#374151', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client *</label>
                <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}>
                  <option value="">Select client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                </select>
              </div>
              {[['Issue Date *', 'issue_date', 'date'], ['Due Date *', 'due_date', 'date'], ['Tax Rate', 'tax_rate', 'number'], ['Discount ($)', 'discount', 'number']].map(([label, field, type]) => (
                <div key={field}>
                  <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, color: '#374151', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                  <input type={type} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} step={field === 'tax_rate' ? '0.01' : '0.01'}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, color: '#374151', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button onClick={handleSubmit} disabled={createMutation.isPending}
                style={{ flex: 1, background: 'linear-gradient(135deg, #0d9488, #0f766e)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.75rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}>
                {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
              </button>
              <button onClick={() => setShowModal(false)}
                style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '10px', padding: '0.75rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
