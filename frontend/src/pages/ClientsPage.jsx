import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'

const fetchClients = () => api.get('/clients/').then(r => r.data)

export default function ClientsPage() {
  const queryClient = useQueryClient()
  const { data: clients = [], isLoading } = useQuery({ queryKey: ['clients'], queryFn: fetchClients })
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const emptyForm = { first_name: '', last_name: '', email: '', phone: '', date_of_birth: '', address: '', city: '', province: '', postal_code: '', billing_frequency: 'per_session', default_rate: '', insurance_provider: '', insurance_policy_number: '', insurance_member_id: '', notes: '' }
  const [form, setForm] = useState(emptyForm)

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/clients/', data),
    onSuccess: () => { queryClient.invalidateQueries(['clients']); toast.success('Client added!'); setShowModal(false); setForm(emptyForm) },
    onError: () => toast.error('Failed to save client')
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/clients/${id}/`, data),
    onSuccess: () => { queryClient.invalidateQueries(['clients']); toast.success('Client updated!'); setShowModal(false); setEditing(null); setForm(emptyForm) },
    onError: () => toast.error('Failed to update client')
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/clients/${id}/`),
    onSuccess: () => { queryClient.invalidateQueries(['clients']); toast.success('Client removed') },
  })

  const openEdit = (client) => {
    setEditing(client)
    setForm({ first_name: client.first_name || '', last_name: client.last_name || '', email: client.email || '', phone: client.phone || '', date_of_birth: client.date_of_birth || '', address: client.address || '', city: client.city || '', province: client.province || '', postal_code: client.postal_code || '', billing_frequency: client.billing_frequency || 'per_session', default_rate: client.default_rate || '', insurance_provider: client.insurance_provider || '', insurance_policy_number: client.insurance_policy_number || '', insurance_member_id: client.insurance_member_id || '', notes: client.notes || '' })
    setShowModal(true)
  }

  const handleSubmit = () => {
    if (!form.first_name.trim() || !form.last_name.trim()) return toast.error('First and last name are required')
    const payload = { ...form, default_rate: form.default_rate ? parseFloat(form.default_rate) : null, date_of_birth: form.date_of_birth || null }
    if (editing) updateMutation.mutate({ id: editing.id, data: payload })
    else createMutation.mutate(payload)
  }

  const filtered = clients.filter(c => `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(search.toLowerCase()))

  const initials = (c) => `${c.first_name?.[0] || ''}${c.last_name?.[0] || ''}`.toUpperCase()

  return (
    <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif', background: '#f8faf9', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1a2e1a', margin: 0 }}>Clients</h1>
          <p style={{ color: '#6b7280', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setEditing(null); setForm(emptyForm); setShowModal(true) }}
          style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.65rem 1.25rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}>
          + Add Client
        </button>
      </div>

      <input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', padding: '0.65rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '0.95rem', marginBottom: '1.5rem', outline: 'none', boxSizing: 'border-box' }} />

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '16px', padding: '4rem', textAlign: 'center', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👤</div>
          <h3 style={{ color: '#374151' }}>No clients found</h3>
          {!search && <button onClick={() => { setEditing(null); setForm(emptyForm); setShowModal(true) }}
            style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.65rem 1.5rem', fontWeight: 600, cursor: 'pointer', marginTop: '1rem' }}>
            + Add Client
          </button>}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Client', 'Contact', 'Billing', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((client, i) => (
                <tr key={client.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #0d9488, #0f766e)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>{initials(client)}</div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1a2e1a' }}>{client.first_name} {client.last_name}</div>
                        {client.city && <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{client.city}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ fontSize: '0.875rem', color: '#374151' }}>{client.email || '—'}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{client.phone || ''}</div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ background: '#f0fdf4', color: '#166534', borderRadius: '20px', padding: '0.2rem 0.65rem', fontSize: '0.78rem', fontWeight: 600 }}>
                      {client.billing_frequency?.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => openEdit(client)} style={{ background: '#f0fdf4', color: '#166534', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>Edit</button>
                      <button onClick={() => { if (window.confirm('Remove client?')) deleteMutation.mutate(client.id) }} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>Remove</button>
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
              <h2 style={{ margin: 0, color: '#1a2e1a', fontWeight: 700 }}>{editing ? 'Edit Client' : 'Add Client'}</h2>
              <button onClick={() => { setShowModal(false); setEditing(null) }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {[['First Name *', 'first_name'], ['Last Name *', 'last_name'], ['Email', 'email'], ['Phone', 'phone'], ['Date of Birth', 'date_of_birth'], ['City', 'city'], ['Province', 'province'], ['Postal Code', 'postal_code']].map(([label, field]) => (
                <div key={field}>
                  <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, color: '#374151', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                  <input type={field === 'date_of_birth' ? 'date' : 'text'} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, color: '#374151', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Default Rate ($)</label>
                <input type="number" value={form.default_rate} onChange={e => setForm(f => ({ ...f, default_rate: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, color: '#374151', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Billing Frequency</label>
                <select value={form.billing_frequency} onChange={e => setForm(f => ({ ...f, billing_frequency: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}>
                  <option value="per_session">Per Session</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, color: '#374151', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Insurance Provider</label>
              <input value={form.insurance_provider} onChange={e => setForm(f => ({ ...f, insurance_provider: e.target.value }))}
                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, color: '#374151', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}
                style={{ flex: 1, background: 'linear-gradient(135deg, #0d9488, #0f766e)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.75rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}>
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Client'}
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
