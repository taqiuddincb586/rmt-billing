import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../services/api'
import toast from 'react-hot-toast'
import { Activity } from 'lucide-react'

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', full_name: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.register(form)
      toast.success('Account created! Please sign in.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">RMT Billing</h1>
            <p className="text-xs text-slate-400">Professional Management</p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-1">Create account</h2>
          <p className="text-slate-400 text-sm mb-6">Set up your practice billing</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label text-slate-400">Full Name</label>
              <input type="text" required className="input bg-white/5 border-white/10 text-white placeholder-slate-500"
                placeholder="Sarah Thompson, RMT" value={form.full_name} onChange={set('full_name')} />
            </div>
            <div>
              <label className="label text-slate-400">Email</label>
              <input type="email" required className="input bg-white/5 border-white/10 text-white placeholder-slate-500"
                placeholder="sarah@therapy.com" value={form.email} onChange={set('email')} />
            </div>
            <div>
              <label className="label text-slate-400">Password</label>
              <input type="password" required minLength={8} className="input bg-white/5 border-white/10 text-white placeholder-slate-500"
                placeholder="Min. 8 characters" value={form.password} onChange={set('password')} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
          <p className="text-center text-sm text-slate-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
