import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import { Save } from 'lucide-react'

export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const qc = useQueryClient()

  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    registration_number: user?.registration_number || '',
    tax_number: user?.tax_number || '',
    address: user?.address || '',
    city: user?.city || '',
    province: user?.province || '',
    postal_code: user?.postal_code || '',
    default_session_rate: user?.default_session_rate || 100,
    default_session_duration: user?.default_session_duration || 60,
    tax_rate: user?.tax_rate || 0.13,
    invoice_prefix: user?.invoice_prefix || 'INV',
    password: '',
  })

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const save = useMutation({
    mutationFn: (data) => {
      const payload = { ...data }
      if (!payload.password) delete payload.password
      return usersApi.updateMe(payload)
    },
    onSuccess: (res) => {
      setUser(res.data)
      toast.success('Profile updated!')
    },
    onError: () => toast.error('Update failed'),
  })

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profile & Settings</h1>
        <p className="text-slate-500 text-sm">Manage your therapist profile and billing defaults</p>
      </div>

      <form onSubmit={e => { e.preventDefault(); save.mutate(form) }} className="space-y-6">
        {/* Personal Info */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Personal Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Full Name</label><input required className="input" value={form.full_name} onChange={set('full_name')} /></div>
            <div><label className="label">Email</label><input type="email" required className="input" value={form.email} onChange={set('email')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={set('phone')} /></div>
            <div><label className="label">Registration #</label><input className="input" placeholder="RMT-00000" value={form.registration_number} onChange={set('registration_number')} /></div>
          </div>
          <div><label className="label">HST / Tax Number</label><input className="input" placeholder="12345 6789 RT0001" value={form.tax_number} onChange={set('tax_number')} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2"><label className="label">Address</label><input className="input" value={form.address} onChange={set('address')} /></div>
            <div><label className="label">City</label><input className="input" value={form.city} onChange={set('city')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Province</label><input className="input" placeholder="ON" value={form.province} onChange={set('province')} /></div>
            <div><label className="label">Postal Code</label><input className="input" value={form.postal_code} onChange={set('postal_code')} /></div>
          </div>
        </div>

        {/* Billing Defaults */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Billing Defaults</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Default Session Rate ($)</label><input type="number" min="0" step="0.01" className="input" value={form.default_session_rate} onChange={set('default_session_rate')} /></div>
            <div><label className="label">Default Duration (min)</label>
              <select className="input" value={form.default_session_duration} onChange={set('default_session_duration')}>
                {[30,45,60,75,90,120].map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Default Tax Rate (HST)</label><input type="number" min="0" max="1" step="0.01" className="input" value={form.tax_rate} onChange={set('tax_rate')} /></div>
            <div><label className="label">Invoice Prefix</label><input className="input" placeholder="INV" value={form.invoice_prefix} onChange={set('invoice_prefix')} /></div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
            <strong>Invoice Counter:</strong> Next invoice will be {form.invoice_prefix}-{String(user?.invoice_counter || 1000).padStart(4, '0')}
          </div>
        </div>

        {/* Security */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Change Password</h2>
          <div>
            <label className="label">New Password (leave blank to keep current)</label>
            <input type="password" minLength={8} className="input" placeholder="Min. 8 characters" value={form.password} onChange={set('password')} />
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={save.isPending} className="btn-primary">
            <Save size={16} />
            {save.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
