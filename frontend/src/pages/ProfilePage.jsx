import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { Save, User, FileText, DollarSign, Building2 } from 'lucide-react'

export default function ProfilePage() {
  const { user } = useAuth()
  const [form, setForm] = useState({})

  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: () => api.get('/users/me').then(r => r.data) })
  useEffect(() => { if (profile) setForm(profile) }, [profile])

  const save = useMutation({
    mutationFn: d => api.put('/users/me', d),
    onSuccess: () => toast.success('Profile saved!')
  })

  const initials = user?.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()

  const Section = ({ title, icon: Icon, children }) => (
    <div className="card" style={{padding:'1.5rem'}}>
      <div style={{display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1.25rem', paddingBottom:'1rem', borderBottom:'1px solid #f1ede6'}}>
        <div style={{width:'2rem', height:'2rem', borderRadius:'0.5rem', background:'rgba(23,162,200,0.08)', display:'flex', alignItems:'center', justifyContent:'center'}}>
          <Icon size={15} style={{color:'var(--teal-600)'}} />
        </div>
        <h3 style={{fontWeight:700, fontSize:'0.875rem', fontFamily:'Playfair Display, serif', color:'var(--text-dark)'}}>{title}</h3>
      </div>
      {children}
    </div>
  )

  return (
    <div className="stagger-children" style={{display:'flex', flexDirection:'column', gap:'1.5rem', maxWidth:'48rem'}}>
      <div className="page-header">
        <h1 className="page-title">Profile & Settings</h1>
        <p className="page-subtitle">Your practice information and billing defaults</p>
      </div>

      <div className="card" style={{padding:'1.5rem'}}>
        <div style={{display:'flex', alignItems:'center', gap:'1.25rem'}}>
          <div style={{width:'4rem', height:'4rem', borderRadius:'1rem', background:'linear-gradient(135deg, var(--teal-500), var(--teal-800))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.25rem', fontWeight:700, color:'white', flexShrink:0}}>
            {initials}
          </div>
          <div>
            <p style={{fontWeight:700, fontSize:'1.125rem', fontFamily:'Playfair Display, serif', color:'var(--text-dark)'}}>{user?.full_name}</p>
            <p style={{fontSize:'0.875rem', color:'var(--text-light)'}}>{user?.email}</p>
            <p style={{fontSize:'0.75rem', marginTop:'0.25rem', color:'var(--teal-600)', fontWeight:500}}>Registered Massage Therapist</p>
          </div>
        </div>
      </div>

      <form onSubmit={e => { e.preventDefault(); save.mutate(form) }} style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
        <Section title="Personal Information" icon={User}>
          <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
              <div><label className="label">Full Name</label><input className="input" value={form.full_name||''} onChange={e => setForm(p=>({...p,full_name:e.target.value}))} /></div>
              <div><label className="label">Email</label><input type="email" className="input" value={form.email||''} onChange={e => setForm(p=>({...p,email:e.target.value}))} /></div>
            </div>
            <div><label className="label">Address</label><input className="input" value={form.address||''} onChange={e => setForm(p=>({...p,address:e.target.value}))} /></div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
              <div><label className="label">City</label><input className="input" value={form.city||''} onChange={e => setForm(p=>({...p,city:e.target.value}))} /></div>
              <div><label className="label">Province</label><input className="input" value={form.province||''} onChange={e => setForm(p=>({...p,province:e.target.value}))} /></div>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
              <div><label className="label">Postal Code</label><input className="input" value={form.postal_code||''} onChange={e => setForm(p=>({...p,postal_code:e.target.value}))} /></div>
              <div><label className="label">Phone</label><input className="input" value={form.phone||''} onChange={e => setForm(p=>({...p,phone:e.target.value}))} /></div>
            </div>
          </div>
        </Section>

        <Section title="Professional Details" icon={FileText}>
          <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
              <div><label className="label">RMT Registration Number</label><input className="input" value={form.registration_number||''} onChange={e => setForm(p=>({...p,registration_number:e.target.value}))} /></div>
              <div><label className="label">HST Number</label><input className="input" value={form.hst_number||''} onChange={e => setForm(p=>({...p,hst_number:e.target.value}))} /></div>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
              <div><label className="label">Invoice Prefix</label><input className="input" placeholder="INV" value={form.invoice_prefix||''} onChange={e => setForm(p=>({...p,invoice_prefix:e.target.value}))} /></div>
              <div><label className="label">Invoice Start Number</label><input type="number" className="input" value={form.invoice_counter||1000} onChange={e => setForm(p=>({...p,invoice_counter:Number(e.target.value)}))} /></div>
            </div>
          </div>
        </Section>

        <Section title="Billing Defaults" icon={DollarSign}>
          <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
              <div><label className="label">Default Session Rate ($)</label><input type="number" step="0.01" className="input" value={form.default_rate||''} onChange={e => setForm(p=>({...p,default_rate:e.target.value}))} /></div>
              <div><label className="label">HST Rate (%)</label><input type="number" step="0.01" className="input" value={form.tax_rate||13} onChange={e => setForm(p=>({...p,tax_rate:e.target.value}))} /></div>
            </div>
            <div><label className="label">Payment Terms (days)</label><input type="number" className="input" value={form.payment_terms_days||30} onChange={e => setForm(p=>({...p,payment_terms_days:Number(e.target.value)}))} /></div>
          </div>
        </Section>

        <Section title="Invoice Notes" icon={Building2}>
          <div><label className="label">Default Invoice Notes</label><textarea className="input" rows={3} placeholder="Thank you for choosing my services…" value={form.invoice_notes||''} onChange={e => setForm(p=>({...p,invoice_notes:e.target.value}))} /></div>
        </Section>

        <button type="submit" disabled={save.isPending} className="btn-primary" style={{alignSelf:'flex-start', padding:'0.75rem 2rem'}}>
          <Save size={16} />{save.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
