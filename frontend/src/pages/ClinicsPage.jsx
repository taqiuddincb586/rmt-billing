import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clinicsApi } from '../services/api'
import Modal from '../components/common/Modal'
import toast from 'react-hot-toast'
import { Plus, Building2 } from 'lucide-react'

const EMPTY = { name: '', address: '', city: '', province: '', postal_code: '', phone: '', email: '', contact_person: '', commission_rate: 0, notes: '' }

function ClinicForm({ initial = EMPTY, onSubmit, loading }) {
  const [form, setForm] = useState(initial)
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ ...form, commission_rate: Number(form.commission_rate) }) }} className="space-y-4">
      <div><label className="label">Clinic Name *</label><input required className="input" value={form.name} onChange={set('name')} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={set('phone')} /></div>
        <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={set('email')} /></div>
      </div>
      <div><label className="label">Address</label><input className="input" value={form.address} onChange={set('address')} /></div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="label">City</label><input className="input" value={form.city} onChange={set('city')} /></div>
        <div><label className="label">Province</label><input className="input" placeholder="ON" value={form.province} onChange={set('province')} /></div>
        <div><label className="label">Postal</label><input className="input" value={form.postal_code} onChange={set('postal_code')} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Contact Person</label><input className="input" value={form.contact_person} onChange={set('contact_person')} /></div>
        <div><label className="label">Commission Rate (%)</label><input type="number" min="0" max="100" step="0.1" className="input" value={form.commission_rate} onChange={set('commission_rate')} /></div>
      </div>
      <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={set('notes')} /></div>
      <div className="flex justify-end">
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving…' : 'Save Clinic'}</button>
      </div>
    </form>
  )
}

export default function ClinicsPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)

  const { data: clinics = [], isLoading } = useQuery({
    queryKey: ['clinics'],
    queryFn: () => clinicsApi.list().then(r => r.data),
  })

  const create = useMutation({
    mutationFn: clinicsApi.create,
    onSuccess: () => { qc.invalidateQueries(['clinics']); setModal(null); toast.success('Clinic added!') },
    onError: e => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const update = useMutation({
    mutationFn: ({ id, data }) => clinicsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['clinics']); setModal(null); toast.success('Clinic updated!') },
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clinics</h1>
          <p className="text-slate-500 text-sm">{clinics.length} locations</p>
        </div>
        <button className="btn-primary" onClick={() => setModal('create')}><Plus size={16} /> Add Clinic</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? <p className="text-slate-400">Loading…</p> :
          clinics.length === 0 ? (
            <div className="col-span-3 card p-12 text-center">
              <Building2 size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No clinics added yet</p>
            </div>
          ) : clinics.map(c => (
            <div key={c.id} className="card p-5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setModal(c)}>
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-blue-50 rounded-xl"><Building2 size={18} className="text-blue-600" /></div>
                {c.commission_rate > 0 && (
                  <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-lg font-medium">{c.commission_rate}% commission</span>
                )}
              </div>
              <h3 className="font-semibold text-slate-900">{c.name}</h3>
              {c.city && <p className="text-sm text-slate-400 mt-1">{c.city}, {c.province}</p>}
              {c.phone && <p className="text-sm text-slate-500 mt-1">{c.phone}</p>}
              {c.contact_person && <p className="text-xs text-slate-400 mt-2">Contact: {c.contact_person}</p>}
            </div>
          ))
        }
      </div>

      <Modal isOpen={modal === 'create'} onClose={() => setModal(null)} title="Add Clinic">
        <ClinicForm onSubmit={data => create.mutate(data)} loading={create.isPending} />
      </Modal>

      {modal && typeof modal === 'object' && (
        <Modal isOpen onClose={() => setModal(null)} title={`Edit — ${modal.name}`}>
          <ClinicForm
            initial={{ ...EMPTY, ...modal }}
            onSubmit={data => update.mutate({ id: modal.id, data })}
            loading={update.isPending}
          />
        </Modal>
      )}
    </div>
  )
}
