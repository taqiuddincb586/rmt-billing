import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'

const fetchClinics = () => api.get('/clinics/').then(r => r.data)

export default function ClinicsPage() {
  const queryClient = useQueryClient()
  const { data: clinics = [], isLoading } = useQuery({ queryKey: ['clinics'], queryFn: fetchClinics })
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', address: '', city: '', province: '', postal_code: '', phone: '', email: '', contact_person: '', commission_rate: 0, notes: '' })

  const resetForm = () => setForm({ name: '', address: '', city: '', province: '', postal_code: '', phone: '', email: '', contact_person: '', commission_rate: 0, notes: '' })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/clinics/', data),
    onSuccess: () => { queryClient.invalidateQueries(['clinics']); toast.success('Clinic added!'); setShowModal(false); resetForm() },
    onError: () => toast.error('Failed to save clinic')
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/clinics/${id}/`, data),
    onSuccess: () => { queryClient.invalidateQueries(['clinics']); toast.success('Clinic updated!'); setShowModal(false); setEditing(null); resetForm() },
    onError: () => toast.error('Failed to update clinic')
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/clinics/${id}/`),
    onSuccess: () => { queryClient.invalidateQueries(['clinics']); toast.success('Clinic removed') },
    onError: () => toast.error('Failed to remove clinic')
  })

  const openEdit = (clinic) => {
    setEditing(clinic)
    setForm({ name: clinic.name || '', address: clinic.address || '', city: clinic.city || '', province: clinic.province || '', postal_code: clinic.postal_code || '', phone: clinic.phone || '', email: clinic.email || '', contact_person: clinic.contact_person || '', commission_rate: clinic.commission_rate || 0, notes: clinic.notes || '' })
    setShowModal(true)
  }

  const handleSubmit = () => {
    if (!form.name.trim()) return toast.error('Clinic name is required')
    const payload = { ...form, commission_rate: parseFloat(form.commission_rate) || 0 }
    if (editing) updateMutation.mutate({ id: editing.id, data: payload })
    else createMutation.mutate(payload)
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif', background: '#f8faf9', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1a2e1a', margin: 0 }}>Clinics</h1>
          <p style={{ color: '#6b7280', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>{clinics.length} location{clinics.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setEditing(null); resetForm(); setShowModal(true) }}
          style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.65rem 1.25rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
          + Add Clinic
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>Loading...</div>
      ) : clinics.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '16px', padding: '4rem', textAlign: 'center', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏥</div>
          <h3 style={{ color: '#374151', marginBottom: '0.5rem' }}>No clinics yet</h3>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Add the clinics or locations where you practice</p>
          <button onClick={() => { setEditing(null); resetForm(); setShowModal(true) }}
            style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.65rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>
            + Add Clinic
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {clinics.map(clinic => (
            <div key={clinic.id} style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#1a2e1a', fontWeight: 700, fontSize: '1.05rem' }}>{clinic.name}</h3>
                  {clinic.city && <p style={{ margin: '0.2rem 0 0', color: '#6b7280', fontSize: '0.85rem' }}>{clinic.city}{clinic.province ? `, ${clinic.province}` : ''}</p>}
                </div>
                <span style={{ background: '#f0fdf4', color: '#166534', borderRadius: '20px', padding: '0.2rem 0.75rem', fontSize: '0.8rem', fontWeight: 600 }}>
                  {clinic.commission_rate}% commission
                </span>
              </div>
              {clinic.phone && <p style={{ margin: '0.3rem 0', color: '#374151', fontSize: '0.875rem' }}>📞 {clinic.phone}</p>}
              {clinic.email && <p style={{ margin: '0.3rem 0', color: '#374151', fontSize: '0.875rem' }}>✉️ {clinic.email}</p>}
              {clinic.contact_person && <p style={{ margin: '0.3rem 0', color: '#374151', fontSize: '0.875rem' }}>👤 {clinic.contact_person}</p>}
              {clinic.notes && <p style={{ margin: '0.75rem 0 0', color: '#6b7280', fontSize: '0.8rem', fontStyle: 'italic' }}>{clinic.notes}</p>}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f3f4f6' }}>
                <button onClick={() => openEdit(clinic)} style={{ flex: 1, background: '#f0fdf4', color: '#166534', border: 'none', borderRadius: '8px', padding: '0.5rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>Edit</button>
                <button onClick={() => { if (window.confirm('Remove this clinic?')) deleteMutation.mutate(clinic.id) }} style={{ flex: 1, background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '0.5rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: '#1a2e1a', fontWeight: 700 }}>{editing ? 'Edit Clinic' : 'Add Clinic'}</h2>
              <button onClick={() => { setShowModal(false); setEditing(null); resetForm() }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {[['Clinic Name *', 'name', 'text'], ['Address', 'address', 'text'], ['City', 'city', 'text'], ['Province', 'province', 'text'], ['Postal Code', 'postal_code', 'text'], ['Phone', 'phone', 'text'], ['Email', 'email', 'email'], ['Contact Person', 'contact_person', 'text']].map(([label, field, type]) => (
                <div key={field}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#374151', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                  <input type={type} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#374151', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Commission Rate (%)</label>
                <input type="number" min="0" max="100" step="0.1" value={form.commission_rate} onChange={e => setForm(f => ({ ...f, commission_rate: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#374151', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}
                style={{ flex: 1, background: 'linear-gradient(135deg, #0d9488, #0f766e)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.75rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}>
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Clinic'}
              </button>
              <button onClick={() => { setShowModal(false); setEditing(null); resetForm() }}
                style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '10px', padding: '0.75rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
