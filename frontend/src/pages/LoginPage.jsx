import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import { Activity, ArrowRight, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{background: 'var(--teal-950)'}}>
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0" style={{background: 'linear-gradient(135deg, var(--teal-900) 0%, var(--teal-950) 100%)'}} />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10" style={{background: 'var(--teal-500)', filter: 'blur(80px)', transform: 'translate(30%, -30%)'}} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10" style={{background: 'var(--gold)', filter: 'blur(80px)', transform: 'translate(-30%, 30%)'}} />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, var(--teal-500), var(--teal-700))'}}>
              <Activity size={20} className="text-white" />
            </div>
            <span className="text-white font-bold text-lg" style={{fontFamily: 'Playfair Display, serif'}}>Kinevie App</span>
          </div>
        </div>
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium" style={{background: 'rgba(23,162,200,0.15)', color: 'var(--teal-300)', border: '1px solid rgba(23,162,200,0.2)'}}>
            <Sparkles size={12} />
            Professional Practice Management
          </div>
          <h1 className="text-5xl font-bold text-white leading-tight" style={{fontFamily: 'Playfair Display, serif'}}>
            Kinevie Therapeutics Inc.
          </h1>
          <p className="text-lg" style={{color: 'rgba(255,255,255,0.5)'}}>
            Invoicing, session tracking, and expense management — built for independent RMTs.
          </p>
          <div className="flex items-center gap-6 pt-4">
            {['Invoices', 'Sessions', 'Analytics', 'PDF Export'].map(f => (
              <div key={f} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{background: 'var(--teal-400)'}} />
                <span className="text-sm" style={{color: 'rgba(255,255,255,0.5)'}}>{f}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex -space-x-2">
            {['S','M','J','A'].map((l,i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white" style={{borderColor: 'var(--teal-950)', background: ['var(--teal-600)','var(--gold)','var(--teal-500)','#7c6b9e'][i]}}>
                {l}
              </div>
            ))}
          </div>
          <p className="text-sm" style={{color: 'rgba(255,255,255,0.5)'}}>Developed by - Crossbolt Technologies Inc.</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8" style={{background: 'var(--cream)'}}>
        <div className="w-full max-w-md animate-fade-in-up">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, var(--teal-500), var(--teal-700))'}}>
              <Activity size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg" style={{fontFamily: 'Playfair Display, serif'}}>Kinevie App</span>
          </div>
          <h2 className="text-3xl font-bold mb-2" style={{fontFamily: 'Playfair Display, serif', color: 'var(--text-dark)'}}>Welcome back</h2>
          <p className="mb-8 text-sm" style={{color: 'var(--text-light)'}}>Sign in to access your practice dashboard</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <input type="email" required className="input" placeholder="sarah@therapy.com"
                value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" required className="input" placeholder="••••••••"
                value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 mt-2">
              {loading ? 'Signing in…' : <><span>Sign in</span> <ArrowRight size={16} /></>}
            </button>
          </form>
          <p className="text-center text-sm mt-6" style={{color: 'var(--text-light)'}}>
            No account?{' '}
            <Link to="/register" className="font-semibold" style={{color: 'var(--teal-600)'}}>Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
