import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientsApi } from '../services/api'
import Modal from '../components/common/Modal'
import toast from 'react-hot-toast'
import { Plus, Search, Users, AlertCircle } from 'lucide-react'
import clsx from 'clsx'

const BILLING_OPTIONS = [
  { value: 'per_session', label: 'Per Session' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

const EMPTY = {
  first_name: '', last_name: '', email: '', phone: '',
  billing_frequency: 'per_session', default_rate: '',
  address: '', city: '', province: '', postal_code: '',
  insurance_provider: '', insurance_policy_number: '',
  insurance_member_id: '', notes: '',
}

function ClientForm({ initial = EMPTY, onSubmit, loading }) {
  const [form, setForm] = useState(initial)
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">First Name *</label><input required className="input" value={form.first_name} onChange={set('first_name')} /></div>
        <div><label className="label">Last Name *</label><input required className="input" value={form.last_name} onChange={set('last_name')} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={set('email')} /></div>
        <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={set('phone')} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Billing Frequency</label>
          <select className="input" value={form.billing_frequency} onChange={set('billing_frequency')}>
            {BILLING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div><label className="label">Default Rate ($/hr)</label><input type="number" min="0" className="input" placeholder="Leave blank for therapist default" value={form.default_rate} onChange={set('default_rate')} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2"><label className="label">Address</label><input className="input" value={form.address} onChange={set('address')} /></div>
        <div><label className="label">City</label><input className="input" value={form.city} onChange={set('city')} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Province</label><input className="input" placeholder="ON" value={form.province} onChange={set('province')} /></div>
        <div><label className="label">Postal Code</label><input className="input" value={form.postal_code} onChange={set('postal_code')} /></div>
      </div>
      <hr className="border-slate-100" />
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Insurance (Optional)</p>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Provider</label><input className="input" value={form.insurance_provider} onChange={set('insurance_provider')} /></div>
        <div><label className="label">Policy #</label><input className="input" value={form.insurance_policy_number} onChange={set('insurance_policy_number')} /></div>
      </div>
      <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={set('notes')} /></div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving…' : 'Save Client'}</button>
      </div>
    </form>
  )
}

export default function ClientsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | 'create' | client object

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: () => clientsApi.list({ search: search || undefined }).then(r => r.data),
  })

  const create = useMutation({
    mutationFn: (data) => clientsApi.create(data),
    onSuccess: () => { qc.invalidateQueries(['clients']); setModal(null); toast.success('Client added!') },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const update = useMutation({
    mutationFn: ({ id, data }) => clientsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['clients']); setModal(null); toast.success('Client updated!') },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-500 text-sm">{clients.length} active clients</p>
        </div>
        <button className="btn-primary" onClick={() => setModal('create')}>
          <Plus size={16} /> Add Client
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input pl-9" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="table-auto w-full">
          <thead>
            <tr>
              <th>Client</th>
              <th>Contact</th>
              <th>Billing</th>
              <th>Sessions</th>
              <th>Outstanding</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400">Loading…</td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12">
                <Users size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No clients yet</p>
              </td></tr>
            ) : clients.map(c => (
              <tr key={c.id} className="cursor-pointer" onClick={() => setModal(c)}>
                <td>
                  <div className="font-medium text-slate-900">{c.full_name}</div>
                  <div className="text-xs text-slate-400">{c.email}</div>
                </td>
                <td>{c.phone || '—'}</td>
                <td className="capitalize">{c.billing_frequency?.replace('_', ' ')}</td>
                <td>{c.session_count}</td>
                <td className={clsx('font-medium', c.outstanding_balance > 0 ? 'text-red-600' : 'text-slate-400')}>
                  {c.outstanding_balance > 0 ? `$${c.outstanding_balance.toFixed(2)}` : '—'}
                </td>
                <td>
                  <span className={clsx('badge', c.is_active ? 'badge-paid' : 'badge-cancelled')}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <Modal isOpen={modal === 'create'} onClose={() => setModal(null)} title="Add Client" size="lg">
        <ClientForm onSubmit={data => create.mutate(data)} loading={create.isPending} />
      </Modal>

      {/* Edit Modal */}
      {modal && typeof modal === 'object' && (
        <Modal isOpen onClose={() => setModal(null)} title={`Edit — ${modal.full_name}`} size="lg">
          <ClientForm
            initial={{ ...EMPTY, ...modal, default_rate: modal.default_rate || '' }}
            onSubmit={data => update.mutate({ id: modal.id, data })}
            loading={update.isPending}
          />
        </Modal>
      )}
    </div>
  )
}
