import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'
import Modal from '../components/common/Modal'
import { Plus, Building2, MapPin, Phone, Edit2, Trash2 } from 'lucide-react'

const empty = { name:'', address:'', phone:'', email:'', commission_rate:0, notes:'' }

export default function ClinicsPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(empty)

  const { data: clinics=[] } = useQuery({ queryKey: ['clinics'], queryFn: () => api.get('/clinics').then(r => r.data) })

  const save = useMutation({
    mutationFn: d => modal?.id ? api.put(`/clinics/${modal.id}`, d) : api.post('/clinics', d),
    onSuccess: () => { qc.invalidateQueries(['clinics']); setModal(null); toast.success(modal?.id ? 'Clinic updated!' : 'Clinic added!') }
  })
  const del = useMutation({
    mutationFn: id => api.delete(`/clinics/${id}`),
    onSuccess: () => { qc.invalidateQueries(['clinics']); toast.success('Clinic removed') }
  })

  return (
    <div className="stagger-children" style={{display:'flex', flexDirection:'column', gap:'1.5rem'}}>
      <div className="page-header" style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between'}}>
        <div>
          <h1 className="page-title">Clinics</h1>
          <p className="page-subtitle">{clinics.length} locations</p>
        </div>
        <button onClick={() => { setForm(empty); setModal({}) }} className="btn-primary"><Plus size={16} />Add Clinic</button>
      </div>

      {clinics.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div style={{width:'3.5rem', height:'3.5rem', borderRadius:'1rem', background:'rgba(23,162,200,0.08)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'1rem'}}>
              <Building2 size={24} style={{color:'var(--teal-500)'}} />
            </div>
            <p style={{fontWeight:600, color:'var(--text-dark)'}}>No clinics yet</p>
            <p style={{fontSize:'0.875rem', marginTop:'0.25rem', marginBottom:'1rem', color:'var(--text-light)'}}>Add the clinics or locations where you practice</p>
            <button onClick={() => { setForm(empty); setModal({}) }} className="btn-primary"><Plus size={15} />Add Clinic</button>
          </div>
        </div>
      ) : (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'1rem'}}>
          {clinics.map(c => (
            <div key={c.id} className="card" style={{padding:'1.5rem'}}>
              <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'1rem'}}>
                <div style={{width:'2.75rem', height:'2.75rem', borderRadius:'0.75rem', background:'rgba(23,162,200,0.1)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                  <Building2 size={20} style={{color:'var(--teal-600)'}} />
                </div>
                <div style={{display:'flex', gap:'0.25rem'}}>
                  <button onClick={() => { setForm(c); setModal({id:c.id}) }} style={{padding:'0.375rem', borderRadius:'0.5rem', background:'transparent', border:'none', cursor:'pointer'}}><Edit2 size={13} style={{color:'var(--text-light)'}} /></button>
                  <button onClick={() => del.mutate(c.id)} style={{padding:'0.375rem', borderRadius:'0.5rem', background:'transparent', border:'none', cursor:'pointer'}}><Trash2 size={13} style={{color:'#f87171'}} /></button>
                </div>
              </div>
              <h3 style={{fontWeight:700, fontSize:'1rem', marginBottom:'0.75rem', color:'var(--text-dark)'}}>{c.name}</h3>
              <div style={{display:'flex', flexDirection:'column', gap:'0.375rem'}}>
                {c.address && <div style={{display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.75rem', color:'var(--text-light)'}}><MapPin size={11}/>{c.address}</div>}
                {c.phone && <div style={{display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.75rem', color:'var(--text-light)'}}><Phone size={11}/>{c.phone}</div>}
              </div>
              {c.commission_rate > 0 && (
                <div style={{marginTop:'1rem', paddingTop:'1rem', borderTop:'1px solid #f1ede6'}}>
                  <span style={{display:'inline-flex', alignItems:'center', padding:'0.125rem 0.625rem', borderRadius:'9999px', fontSize:'0.75rem', fontWeight:600, background:'rgba(201,150,74,0.1)', color:'var(--gold)', border:'1px solid rgba(201,150,74,0.2)'}}>
                    {c.commission_rate}% commission
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit Clinic' : 'Add Clinic'}>
        <form onSubmit={e => { e.preventDefault(); save.mutate(form) }} style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
          <div><label className="label">Clinic Name</label><input required className="input" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} /></div>
          <div><label className="label">Address</label><input className="input" value={form.address||''} onChange={e => setForm(p=>({...p,address:e.target.value}))} /></div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
            <div><label className="label">Phone</label><input className="input" value={form.phone||''} onChange={e => setForm(p=>({...p,phone:e.target.value}))} /></div>
            <div><label className="label">Commission Rate (%)</label><input type="number" step="0.01" className="input" value={form.commission_rate||0} onChange={e => setForm(p=>({...p,commission_rate:Number(e.target.value)}))} /></div>
          </div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes||''} onChange={e => setForm(p=>({...p,notes:e.target.value}))} /></div>
          <div style={{display:'flex', gap:'0.75rem', paddingTop:'0.5rem'}}>
            <button type="submit" disabled={save.isPending} className="btn-primary" style={{flex:1, justifyContent:'center'}}>{save.isPending ? 'Saving…' : 'Save Clinic'}</button>
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
