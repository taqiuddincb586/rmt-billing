import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'
import Modal from '../components/common/Modal'
import { Plus, Calendar, Edit2, Trash2 } from 'lucide-react'

const empty = { client_id:'', clinic_id:'', session_date:'', duration_minutes:60, rate:'', treatment_type:'Swedish Massage', soap_notes:'', status:'completed' }

export default function SessionsPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(empty)
  const [unbilledOnly, setUnbilledOnly] = useState(false)

  const { data: sessions=[], isLoading } = useQuery({ queryKey: ['sessions', unbilledOnly], queryFn: () => api.get('/sessions', { params: { billed: unbilledOnly ? false : undefined } }).then(r => r.data) })
  const { data: clients=[] } = useQuery({ queryKey: ['clients'], queryFn: () => api.get('/clients').then(r => r.data) })
  const { data: clinics=[] } = useQuery({ queryKey: ['clinics'], queryFn: () => api.get('/clinics').then(r => r.data) })

  const save = useMutation({
    mutationFn: d => modal?.id ? api.put(`/sessions/${modal.id}`, d) : api.post('/sessions', d),
    onSuccess: () => { qc.invalidateQueries(['sessions']); setModal(null); toast.success(modal?.id ? 'Session updated!' : 'Session recorded!') }
  })
  const del = useMutation({
    mutationFn: id => api.delete(`/sessions/${id}`),
    onSuccess: () => { qc.invalidateQueries(['sessions']); toast.success('Session removed') }
  })

  return (
    <div className="stagger-children" style={{display:'flex', flexDirection:'column', gap:'1.5rem'}}>
      <div className="page-header" style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between'}}>
        <div>
          <h1 className="page-title">Sessions</h1>
          <p className="page-subtitle">{sessions.length} sessions recorded</p>
        </div>
        <button onClick={() => { setForm({...empty, session_date: new Date().toISOString().split('T')[0]}); setModal({}) }} className="btn-primary"><Plus size={16} />Record Session</button>
      </div>

      <div className="card" style={{padding:'1rem', display:'flex', alignItems:'center', gap:'0.75rem'}}>
        <input type="checkbox" id="unbilled" checked={unbilledOnly} onChange={e => setUnbilledOnly(e.target.checked)} style={{borderRadius:'4px', cursor:'pointer'}} />
        <label htmlFor="unbilled" style={{fontSize:'0.875rem', fontWeight:500, color:'var(--text-mid)', cursor:'pointer'}}>Show unbilled sessions only</label>
      </div>

      <div className="card" style={{overflow:'hidden'}}>
        {isLoading ? (
          <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'10rem'}}>
            <div style={{width:'1.5rem', height:'1.5rem', borderRadius:'50%', border:'2px solid var(--teal-500)', borderTopColor:'transparent', animation:'spin 0.8s linear infinite'}} />
          </div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">
            <div style={{width:'3.5rem', height:'3.5rem', borderRadius:'1rem', background:'rgba(23,162,200,0.08)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'1rem'}}>
              <Calendar size={24} style={{color:'var(--teal-500)'}} />
            </div>
            <p style={{fontWeight:600, color:'var(--text-dark)'}}>No sessions yet</p>
            <p style={{fontSize:'0.875rem', marginTop:'0.25rem', marginBottom:'1rem', color:'var(--text-light)'}}>Record your first session to begin tracking</p>
            <button onClick={() => { setForm({...empty, session_date: new Date().toISOString().split('T')[0]}); setModal({}) }} className="btn-primary"><Plus size={15} />Record Session</button>
          </div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Date</th><th>Client</th><th>Treatment</th><th>Duration</th><th>Rate</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id}>
                  <td><span style={{fontSize:'0.875rem', fontWeight:500, color:'var(--text-dark)'}}>{new Date(s.session_date).toLocaleDateString('en-CA', {month:'short', day:'numeric', year:'numeric'})}</span></td>
                  <td><span style={{fontSize:'0.875rem'}}>{s.client_name}</span></td>
                  <td><span style={{fontSize:'0.875rem'}}>{s.treatment_type}</span></td>
                  <td><span style={{fontSize:'0.875rem'}}>{s.duration_minutes} min</span></td>
                  <td><span style={{fontSize:'0.875rem', fontWeight:600, color:'var(--text-dark)'}}>${s.rate}</span></td>
                  <td><span className={s.is_billed ? 'badge-paid' : 'badge-draft'} style={{display:'inline-flex', alignItems:'center', padding:'0.125rem 0.625rem', borderRadius:'9999px', fontSize:'0.75rem', fontWeight:600, background: s.is_billed ? '#ecfdf5' : '#f5f5f4', color: s.is_billed ? '#065f46' : '#57534e', border: s.is_billed ? '1px solid #a7f3d0' : '1px solid #e7e5e4'}}>{s.is_billed ? 'Billed' : 'Unbilled'}</span></td>
                  <td>
                    <div style={{display:'flex', gap:'0.25rem'}}>
                      <button onClick={() => { setForm(s); setModal({id:s.id}) }} style={{padding:'0.375rem', borderRadius:'0.5rem', background:'transparent', border:'none', cursor:'pointer'}}><Edit2 size={13} style={{color:'var(--text-light)'}} /></button>
                      <button onClick={() => del.mutate(s.id)} style={{padding:'0.375rem', borderRadius:'0.5rem', background:'transparent', border:'none', cursor:'pointer'}}><Trash2 size={13} style={{color:'#f87171'}} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit Session' : 'Record Session'} size="lg">
        <form onSubmit={e => { e.preventDefault(); save.mutate(form) }} style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
            <div><label className="label">Client</label>
              <select required className="input" value={form.client_id} onChange={e => setForm(p=>({...p,client_id:e.target.value}))}>
                <option value="">Select client…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
              </select>
            </div>
            <div><label className="label">Clinic (optional)</label>
              <select className="input" value={form.clinic_id||''} onChange={e => setForm(p=>({...p,clinic_id:e.target.value||null}))}>
                <option value="">None</option>
                {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
            <div><label className="label">Date</label><input type="date" required className="input" value={form.session_date} onChange={e => setForm(p=>({...p,session_date:e.target.value}))} /></div>
            <div><label className="label">Duration (min)</label><input type="number" required className="input" value={form.duration_minutes} onChange={e => setForm(p=>({...p,duration_minutes:Number(e.target.value)}))} /></div>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
            <div><label className="label">Rate ($)</label><input type="number" step="0.01" required className="input" value={form.rate} onChange={e => setForm(p=>({...p,rate:e.target.value}))} /></div>
            <div><label className="label">Treatment Type</label><input className="input" value={form.treatment_type} onChange={e => setForm(p=>({...p,treatment_type:e.target.value}))} /></div>
          </div>
          <div><label className="label">SOAP Notes</label><textarea className="input" rows={3} placeholder="Subjective, Objective, Assessment, Plan…" value={form.soap_notes||''} onChange={e => setForm(p=>({...p,soap_notes:e.target.value}))} /></div>
          <div style={{display:'flex', gap:'0.75rem', paddingTop:'0.5rem'}}>
            <button type="submit" disabled={save.isPending} className="btn-primary" style={{flex:1, justifyContent:'center'}}>{save.isPending ? 'Saving…' : 'Save Session'}</button>
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
