import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import { Activity, ArrowRight } from 'lucide-react'

export default function RegisterPage() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/register', form)
      toast.success('Account created! Please sign in.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{background: 'var(--teal-950)'}}>
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10" style={{background: 'var(--teal-500)', filter: 'blur(80px)', transform: 'translate(30%, -30%)'}} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10" style={{background: 'var(--gold)', filter: 'blur(80px)', transform: 'translate(-30%, 30%)'}} />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-2xl p-8 shadow-2xl animate-fade-in-up" style={{boxShadow: '0 25px 60px rgba(10,22,40,0.3)'}}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, var(--teal-500), var(--teal-700))'}}>
              <Activity size={18} className="text-white" />
            </div>
            <span className="font-bold" style={{fontFamily: 'Playfair Display, serif'}}>RMT Billing</span>
          </div>
          <h2 className="text-2xl font-bold mb-1" style={{fontFamily: 'Playfair Display, serif'}}>Create your account</h2>
          <p className="text-sm mb-6" style={{color: 'var(--text-light)'}}>Start managing your practice professionally</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input type="text" required className="input" placeholder="Sarah Thompson, RMT"
                value={form.full_name} onChange={e => setForm(p => ({...p, full_name: e.target.value}))} />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input type="email" required className="input" placeholder="sarah@therapy.com"
                value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" required className="input" placeholder="Min. 8 characters"
                value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 mt-2">
              {loading ? 'Creating account…' : <><span>Create Account</span> <ArrowRight size={16} /></>}
            </button>
          </form>
          <p className="text-center text-sm mt-5" style={{color: 'var(--text-light)'}}>
            Already have an account?{' '}
            <Link to="/login" className="font-semibold" style={{color: 'var(--teal-600)'}}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
