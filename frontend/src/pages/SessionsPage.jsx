import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionsApi, clientsApi, clinicsApi } from '../services/api'
import Modal from '../components/common/Modal'
import toast from 'react-hot-toast'
import { Plus, Calendar } from 'lucide-react'
import clsx from 'clsx'
import { format } from 'date-fns'

const today = () => format(new Date(), 'yyyy-MM-dd')

const EMPTY = {
  client_id: '', clinic_id: '', date: today(), start_time: '',
  duration_minutes: 60, status: 'completed', rate: 100,
  taxes: 0.13, discount: 0, treatment_type: '', soap_notes: '', is_billable: true
}

function SessionForm({ initial = EMPTY, clients, clinics, onSubmit, loading }) {
  const [form, setForm] = useState(initial)
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const setBool = k => e => setForm(p => ({ ...p, [k]: e.target.value === 'true' }))
  const total = (Number(form.rate) * (1 + Number(form.taxes)) - Number(form.discount)).toFixed(2)

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ ...form, client_id: Number(form.client_id), clinic_id: form.clinic_id ? Number(form.clinic_id) : null }) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Client *</label>
          <select required className="input" value={form.client_id} onChange={set('client_id')}>
            <option value="">Select client…</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Clinic</label>
          <select className="input" value={form.clinic_id} onChange={set('clinic_id')}>
            <option value="">No clinic / Home office</option>
            {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Date</label><input type="date" required className="input" value={form.date} onChange={set('date')} /></div>
        <div><label className="label">Start Time</label><input type="time" className="input" value={form.start_time} onChange={set('start_time')} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Duration (min)</label>
          <select className="input" value={form.duration_minutes} onChange={set('duration_minutes')}>
            {[30,45,60,75,90,120].map(d => <option key={d} value={d}>{d} min</option>)}
          </select>
        </div>
        <div><label className="label">Rate ($)</label><input type="number" min="0" step="0.01" required className="input" value={form.rate} onChange={set('rate')} /></div>
        <div><label className="label">HST Rate</label><input type="number" min="0" max="1" step="0.01" className="input" value={form.taxes} onChange={set('taxes')} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={set('status')}>
            {['completed','scheduled','cancelled','no_show'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
          </select>
        </div>
        <div><label className="label">Treatment Type</label><input className="input" placeholder="e.g. Deep Tissue" value={form.treatment_type} onChange={set('treatment_type')} /></div>
      </div>
      <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-slate-500">Session Total (incl. tax)</span>
        <span className="text-lg font-bold text-slate-900">${total}</span>
      </div>
      <div><label className="label">SOAP Notes</label><textarea className="input" rows={3} placeholder="Subjective, Objective, Assessment, Plan" value={form.soap_notes} onChange={set('soap_notes')} /></div>
      <div className="flex justify-end">
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving…' : 'Save Session'}</button>
      </div>
    </form>
  )
}

export default function SessionsPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [unbilledOnly, setUnbilledOnly] = useState(false)

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions', unbilledOnly],
    queryFn: () => sessionsApi.list(unbilledOnly ? { unbilled_only: true } : {}).then(r => r.data),
  })
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => clientsApi.list({}).then(r => r.data) })
  const { data: clinics = [] } = useQuery({ queryKey: ['clinics'], queryFn: () => clinicsApi.list().then(r => r.data) })

  const create = useMutation({
    mutationFn: sessionsApi.create,
    onSuccess: () => { qc.invalidateQueries(['sessions']); setModal(null); toast.success('Session recorded!') },
    onError: e => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const update = useMutation({
    mutationFn: ({ id, data }) => sessionsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['sessions']); setModal(null); toast.success('Session updated!') },
    onError: e => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const STATUS_COLORS = { completed: 'badge-paid', scheduled: 'badge-sent', cancelled: 'badge-cancelled', no_show: 'badge-overdue' }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sessions</h1>
          <p className="text-slate-500 text-sm">{sessions.length} sessions</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={unbilledOnly} onChange={e => setUnbilledOnly(e.target.checked)} className="rounded" />
            Unbilled only
          </label>
          <button className="btn-primary" onClick={() => setModal('create')}><Plus size={16} /> New Session</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="table-auto w-full">
          <thead>
            <tr>
              <th>Date</th>
              <th>Client</th>
              <th>Clinic</th>
              <th>Duration</th>
              <th>Treatment</th>
              <th>Total</th>
              <th>Invoice</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">Loading…</td></tr>
            ) : sessions.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12">
                <Calendar size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No sessions yet</p>
              </td></tr>
            ) : sessions.map(s => (
              <tr key={s.id} className="cursor-pointer" onClick={() => setModal(s)}>
                <td className="font-medium">{s.date}</td>
                <td>{s.client?.full_name || `#${s.client_id}`}</td>
                <td className="text-slate-400">{s.clinic_name || '—'}</td>
                <td>{s.duration_minutes} min</td>
                <td>{s.treatment_type || '—'}</td>
                <td className="font-semibold">${s.total?.toFixed(2)}</td>
                <td>
                  {s.invoice_id
                    ? <span className="badge badge-paid">Invoiced</span>
                    : <span className="badge badge-draft">Unbilled</span>}
                </td>
                <td><span className={clsx('badge', STATUS_COLORS[s.status] || 'badge-draft')}>{s.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modal === 'create'} onClose={() => setModal(null)} title="Record Session" size="lg">
        <SessionForm clients={clients} clinics={clinics} onSubmit={data => create.mutate(data)} loading={create.isPending} />
      </Modal>

      {modal && typeof modal === 'object' && (
        <Modal isOpen onClose={() => setModal(null)} title="Edit Session" size="lg">
          <SessionForm
            initial={{ ...EMPTY, ...modal, clinic_id: modal.clinic_id || '', client_id: modal.client_id || '' }}
            clients={clients} clinics={clinics}
            onSubmit={data => update.mutate({ id: modal.id, data })}
            loading={update.isPending}
          />
        </Modal>
      )}
    </div>
  )
}
