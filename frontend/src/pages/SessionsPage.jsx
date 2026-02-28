import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'

const fetchSessions = () => api.get('/sessions/').then(r => r.data)
const fetchClients = () => api.get('/clients/').then(r => r.data)
const fetchClinics = () => api.get('/clinics/').then(r => r.data)

export default function SessionsPage() {
  const queryClient = useQueryClient()
  const { data: sessions = [], isLoading } = useQuery({ queryKey: ['sessions'], queryFn: fetchSessions })
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: fetchClients })
  const { data: clinics = [] } = useQuery({ queryKey: ['clinics'], queryFn: fetchClinics })
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [unbilledOnly, setUnbilledOnly] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const emptyForm = { client_id: '', clinic_id: '', date: today, start_time: '', duration_minutes: 60, status: 'completed', rate: '', taxes: 0, discount: 0, treatment_type: '', soap_notes: '', is_billable: true }
  const [form, setForm] = useState(emptyForm)

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/sessions/', data),
    onSuccess: () => { queryClient.invalidateQueries(['sessions']); toast.success('Session added!'); setShowModal(false); setForm(emptyForm) },
    onError: () => toast.error('Failed to save session')
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/sessions/${id}/`, data),
    onSuccess: () => { queryClient.invalidateQueries(['sessions']); toast.success('Session updated!'); setShowModal(false); setEditing(null); setForm(emptyForm) },
    onError: () => toast.error('Failed to update session')
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/sessions/${id}/`),
    onSuccess: () => { queryClient.invalidateQueries(['sessions']); toast.success('Session removed') }
  })

  const openEdit = (s) => {
    setEditing(s)
    setForm({ client_id: s.client_id, clinic_id: s.clinic_id || '', date: s.date, start_time: s.start_time || '', duration_minutes: s.duration_minutes, status: s.status, rate: s.rate, taxes: s.taxes, discount: s.discount, treatment_type: s.treatment_type || '', soap_notes: s.soap_notes || '', is_billable: s.is_billable })
    setShowModal(true)
  }

  const handleSubmit = () => {
    if (!form.client_id) return toast.error('Please select a client')
    if (!form.rate) return toast.error('Rate is required')
    const payload = { ...form, client_id: parseInt(form.client_id), clinic_id: form.clinic_id ? parseInt(form.clinic_id) : null, duration_minutes: parseInt(form.duration_minutes), rate: parseFloat(form.rate), taxes: parseFloat(form.taxes) || 0, discount: parseFloat(form.discount) || 0 }
    if (editing) updateMutation.mutate({ id: editing.id, data: payload })
    else createMutation.mutate(payload)
  }

  const displayed = unbilledOnly ? sessions.filter(s => !s.invoice_id && s.is_billable) : sessions

  const statusColor = (status) => ({ completed: '#166534', scheduled: '#1d4ed8', cancelled: '#dc2626', no_show: '#92400e' }[status] || '#374151')
  const statusBg = (status) => ({ completed: '#f0fdf4', scheduled: '#eff6ff', cancelled: '#fef2f2', no_show: '#fffbeb' }[status] || '#f3f4f6')

  return (
    <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif', background: '#f8faf9', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1a2e1a', margin: 0 }}>Sessions</h1>
          <p style={{ color: '#6b7280', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>{sessions.length} total session{sessions.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem', color: '#374151' }}>
            <input type="checkbox" checked={unbilledOnly} onChange={e => setUnbilledOnly(e.target.checked)} />
            Unbilled only
          </label>
          <button onClick={() => { setEditing(null); setForm(emptyForm); setShowModal(true) }}
            style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.65rem 1.25rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}>
            + Add Session
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>Loading...</div>
      ) : displayed.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '16px', padding: '4rem', textAlign: 'center', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <h3 style={{ color: '#374151' }}>No sessions found</h3>
          <button onClick={() => { setEditing(null); setForm(emptyForm); setShowModal(true) }}
            style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.65rem 1.5rem', fontWeight: 600, cursor: 'pointer', marginTop: '1rem' }}>
            + Add Session
          </button>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Date', 'Client', 'Duration', 'Treatment', 'Rate', 'Status', 'Billed', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((s, i) => (
                <tr key={s.id} style={{ borderBottom: i < displayed.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#1a2e1a', fontSize: '0.875rem' }}>{s.date}</td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.875rem', color: '#374151' }}>{s.client?.full_name || `Client #${s.client_id}`}</td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.875rem', color: '#374151' }}>{s.duration_minutes} min</td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.875rem', color: '#374151' }}>{s.treatment_type || '—'}</td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#1a2e1a', fontSize: '0.875rem' }}>${s.total?.toFixed(2)}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ background: statusBg(s.status), color: statusColor(s.status), borderRadius: '20px', padding: '0.2rem 0.65rem', fontSize: '0.78rem', fontWeight: 600 }}>
                      {s.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ background: s.invoice_id ? '#f0fdf4' : '#fef9c3', color: s.invoice_id ? '#166534' : '#92400e', borderRadius: '20px', padding: '0.2rem 0.65rem', fontSize: '0.78rem', fontWeight: 600 }}>
                      {s.invoice_id ? 'Billed' : 'Unbilled'}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button onClick={() => openEdit(s)} style={{ background: '#f0fdf4', color: '#166534', border: 'none', borderRadius: '6px', padding: '0.3rem 0.65rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>Edit</button>
                      <button onClick={() => { if (window.confirm('Delete session?')) deleteMutation.mutate(s.id) }} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '0.3rem 0.65rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>Del</button>
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
          <div style={{ background: '#fff', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: '#1a2e1a', fontWeight: 700 }}>{editing ? 'Edit Session' : 'Add Session'}</h2>
              <button onClick={() => { setShowModal(false); setEditing(null) }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, color: '#374151', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client *</label>
                <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}>
                  <option value="">Select client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, color: '#374151', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Clinic</label>
                <select value={form.clinic_id} onChange={e => setForm(f => ({ ...f, clinic_id: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}>
                  <option value="">No clinic</option>
                  {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {[['Date *', 'date', 'date'], ['Start Time', 'start_time', 'time'], ['Rate ($) *', 'rate', 'number'], ['Duration (min)', 'duration_minutes', 'number'], ['Tax Rate', 'taxes', 'number'], ['Discount ($)', 'discount', 'number']].map(([label, field, type]) => (
                <div key={field}>
                  <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, color: '#374151', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                  <input type={type} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, color: '#374151', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}>
                  <option value="completed">Completed</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no_show">No Show</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, color: '#374151', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Treatment Type</label>
                <input value={form.treatment_type} onChange={e => setForm(f => ({ ...f, treatment_type: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, color: '#374151', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SOAP Notes</label>
                <textarea value={form.soap_notes} onChange={e => setForm(f => ({ ...f, soap_notes: e.target.value }))} rows={3}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, color: '#374151', fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={form.is_billable} onChange={e => setForm(f => ({ ...f, is_billable: e.target.checked }))} />
                  Billable session
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}
                style={{ flex: 1, background: 'linear-gradient(135deg, #0d9488, #0f766e)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.75rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}>
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Session'}
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
