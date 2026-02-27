import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'
import Modal from '../components/common/Modal'
import { Plus, Search, Mail, Phone, Edit2, Trash2, Users } from 'lucide-react'

const empty = { first_name:'', last_name:'', email:'', phone:'', address:'', insurance_provider:'', insurance_policy_number:'', billing_frequency:'monthly', notes:'' }

export default function ClientsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(empty)

  const { data: clients=[], isLoading } = useQuery({ queryKey: ['clients', search], queryFn: () => api.get('/clients', { params: { search } }).then(r => r.data) })

  const save = useMutation({
    mutationFn: d => modal?.id ? api.put(`/clients/${modal.id}`, d) : api.post('/clients', d),
    onSuccess: () => { qc.invalidateQueries(['clients']); setModal(null); toast.success(modal?.id ? 'Client updated!' : 'Client added!') }
  })
  const del = useMutation({
    mutationFn: id => api.delete(`/clients/${id}`),
    onSuccess: () => { qc.invalidateQueries(['clients']); toast.success('Client removed') }
  })

  return (
    <div className="stagger-children" style={{display:'flex', flexDirection:'column', gap:'1.5rem'}}>
      <div className="page-header" style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between'}}>
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">{clients.length} active clients</p>
        </div>
        <button onClick={() => { setForm(empty); setModal({}) }} className="btn-primary"><Plus size={16} />Add Client</button>
      </div>

      <div className="card" style={{padding:'1rem'}}>
        <div style={{position:'relative'}}>
          <Search size={15} style={{position:'absolute', left:'0.75rem', top:'50%', transform:'translateY(-50%)', color:'var(--text-light)'}} />
          <input className="input" style={{paddingLeft:'2.25rem'}} placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card" style={{overflow:'hidden'}}>
        {isLoading ? (
          <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'10rem'}}>
            <div style={{width:'1.5rem', height:'1.5rem', borderRadius:'50%', border:'2px solid var(--teal-500)', borderTopColor:'transparent', animation:'spin 0.8s linear infinite'}} />
          </div>
        ) : clients.length === 0 ? (
          <div className="empty-state">
            <div style={{width:'3.5rem', height:'3.5rem', borderRadius:'1rem', background:'rgba(23,162,200,0.08)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'1rem'}}>
              <Users size={24} style={{color:'var(--teal-500)'}} />
            </div>
            <p style={{fontWeight:600, color:'var(--text-dark)'}}>No clients yet</p>
            <p style={{fontSize:'0.875rem', marginTop:'0.25rem', marginBottom:'1rem', color:'var(--text-light)'}}>Add your first client to get started</p>
            <button onClick={() => { setForm(empty); setModal({}) }} className="btn-primary"><Plus size={15} />Add Client</button>
          </div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Client</th><th>Contact</th><th>Insurance</th><th>Outstanding</th><th>Sessions</th><th></th></tr></thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{display:'flex', alignItems:'center', gap:'0.75rem'}}>
                      <div style={{width:'2rem', height:'2rem', borderRadius:'0.5rem', background:'linear-gradient(135deg, var(--teal-600), var(--teal-800))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.75rem', fontWeight:'700', color:'white', flexShrink:0}}>
                        {c.first_name[0]}{c.last_name[0]}
                      </div>
                      <div>
                        <p style={{fontWeight:600, fontSize:'0.875rem', color:'var(--text-dark)'}}>{c.first_name} {c.last_name}</p>
                        <p style={{fontSize:'0.75rem', color:'var(--text-light)', textTransform:'capitalize'}}>{c.billing_frequency}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{display:'flex', flexDirection:'column', gap:'0.25rem'}}>
                      {c.email && <div style={{display:'flex', alignItems:'center', gap:'0.375rem', fontSize:'0.75rem'}}><Mail size={11} style={{color:'var(--text-light)'}} />{c.email}</div>}
                      {c.phone && <div style={{display:'flex', alignItems:'center', gap:'0.375rem', fontSize:'0.75rem'}}><Phone size={11} style={{color:'var(--text-light)'}} />{c.phone}</div>}
                    </div>
                  </td>
                  <td><span style={{fontSize:'0.875rem'}}>{c.insurance_provider || <span style={{color:'var(--text-light)'}}>—</span>}</span></td>
                  <td><span style={{fontWeight:600, fontSize:'0.875rem', color: c.outstanding_balance > 0 ? '#d97706' : 'var(--text-light)'}}>${Number(c.outstanding_balance||0).toFixed(2)}</span></td>
                  <td><span style={{fontSize:'0.875rem'}}>{c.session_count||0}</span></td>
                  <td>
                    <div style={{display:'flex', gap:'0.25rem'}}>
                      <button onClick={() => { setForm(c); setModal({id:c.id}) }} style={{padding:'0.375rem', borderRadius:'0.5rem', background:'transparent', border:'none', cursor:'pointer'}}><Edit2 size={13} style={{color:'var(--text-light)'}} /></button>
                      <button onClick={() => del.mutate(c.id)} style={{padding:'0.375rem', borderRadius:'0.5rem', background:'transparent', border:'none', cursor:'pointer'}}><Trash2 size={13} style={{color:'#f87171'}} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit Client' : 'Add New Client'} size="lg">
        <form onSubmit={e => { e.preventDefault(); save.mutate(form) }} style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
            <div><label className="label">First Name</label><input required className="input" value={form.first_name} onChange={e => setForm(p=>({...p,first_name:e.target.value}))} /></div>
            <div><label className="label">Last Name</label><input required className="input" value={form.last_name} onChange={e => setForm(p=>({...p,last_name:e.target.value}))} /></div>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
            <div><label className="label">Email</label><input type="email" className="input" value={form.email||''} onChange={e => setForm(p=>({...p,email:e.target.value}))} /></div>
            <div><label className="label">Phone</label><input className="input" value={form.phone||''} onChange={e => setForm(p=>({...p,phone:e.target.value}))} /></div>
          </div>
          <div><label className="label">Address</label><input className="input" value={form.address||''} onChange={e => setForm(p=>({...p,address:e.target.value}))} /></div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
            <div><label className="label">Insurance Provider</label><input className="input" value={form.insurance_provider||''} onChange={e => setForm(p=>({...p,insurance_provider:e.target.value}))} /></div>
            <div><label className="label">Policy Number</label><input className="input" value={form.insurance_policy_number||''} onChange={e => setForm(p=>({...p,insurance_policy_number:e.target.value}))} /></div>
          </div>
          <div><label className="label">Billing Frequency</label>
            <select className="input" value={form.billing_frequency} onChange={e => setForm(p=>({...p,billing_frequency:e.target.value}))}>
              <option value="per_session">Per Session</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes||''} onChange={e => setForm(p=>({...p,notes:e.target.value}))} /></div>
          <div style={{display:'flex', gap:'0.75rem', paddingTop:'0.5rem'}}>
            <button type="submit" disabled={save.isPending} className="btn-primary" style={{flex:1, justifyContent:'center'}}>{save.isPending ? 'Saving…' : 'Save Client'}</button>
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
