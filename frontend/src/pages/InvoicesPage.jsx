import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'
import Modal from '../components/common/Modal'
import { Plus, FileText, Download, Send, DollarSign, Search } from 'lucide-react'

const STATUS_TABS = ['all','draft','sent','paid','overdue','cancelled']

export default function InvoicesPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [payModal, setPayModal] = useState(null)
  const [createModal, setCreateModal] = useState(false)
  const [payForm, setPayForm] = useState({ amount:'', payment_method:'bank_transfer', notes:'' })
  const [createForm, setCreateForm] = useState({ client_id:'', session_ids:[], due_date:'', notes:'' })

  const { data: invoices=[], isLoading } = useQuery({
    queryKey: ['invoices', status, search],
    queryFn: () => api.get('/invoices', { params: { status: status==='all'?undefined:status, search } }).then(r => r.data)
  })
  const { data: clients=[] } = useQuery({ queryKey: ['clients'], queryFn: () => api.get('/clients').then(r => r.data) })
  const { data: sessions=[] } = useQuery({ queryKey: ['sessions-unbilled'], queryFn: () => api.get('/sessions', { params: { billed: false } }).then(r => r.data) })

  const createInv = useMutation({
    mutationFn: d => api.post('/invoices', d),
    onSuccess: () => { qc.invalidateQueries(['invoices']); setCreateModal(false); toast.success('Invoice created!') }
  })
  const recordPayment = useMutation({
    mutationFn: ({ id, data }) => api.post(`/invoices/${id}/payments`, data),
    onSuccess: () => { qc.invalidateQueries(['invoices']); setPayModal(null); toast.success('Payment recorded!') }
  })
  const sendEmail = useMutation({
    mutationFn: id => api.post(`/invoices/${id}/send-email`),
    onSuccess: () => { qc.invalidateQueries(['invoices']); toast.success('Invoice sent by email!') }
  })

  const openPdf = async (id) => {
    try {
      const r = await api.post(`/invoices/${id}/generate-pdf`, {}, { responseType: 'blob' })
      window.open(URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' })))
    } catch { toast.error('Could not generate PDF') }
  }

  const statusBadge = (s) => {
    const map = {
      paid: {bg:'#ecfdf5', color:'#065f46', border:'#a7f3d0'},
      sent: {bg:'#f0f9ff', color:'#0369a1', border:'#bae6fd'},
      overdue: {bg:'#fef2f2', color:'#991b1b', border:'#fecaca'},
      draft: {bg:'#f5f5f4', color:'#57534e', border:'#e7e5e4'},
      cancelled: {bg:'#fafaf9', color:'#a8a29e', border:'#e7e5e4'},
    }
    const c = map[s] || map.draft
    return <span style={{display:'inline-flex', alignItems:'center', padding:'0.125rem 0.625rem', borderRadius:'9999px', fontSize:'0.75rem', fontWeight:600, background:c.bg, color:c.color, border:`1px solid ${c.border}`, textTransform:'capitalize'}}>{s}</span>
  }

  return (
    <div className="stagger-children" style={{display:'flex', flexDirection:'column', gap:'1.5rem'}}>
      <div className="page-header" style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between'}}>
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">{invoices.length} invoices</p>
        </div>
        <button onClick={() => setCreateModal(true)} className="btn-primary"><Plus size={16} />New Invoice</button>
      </div>

      <div className="card" style={{padding:'1rem', display:'flex', flexDirection:'column', gap:'0.75rem'}}>
        <div style={{display:'flex', flexWrap:'wrap', gap:'0.5rem'}}>
          {STATUS_TABS.map(s => (
            <button key={s} onClick={() => setStatus(s)} style={{padding:'0.375rem 0.75rem', borderRadius:'0.5rem', fontSize:'0.75rem', fontWeight:600, textTransform:'capitalize', border:'none', cursor:'pointer', background: status===s ? 'var(--teal-600)' : '#f5f2ed', color: status===s ? 'white' : 'var(--text-mid)', transition:'all 0.15s'}}>
              {s}
            </button>
          ))}
        </div>
        <div style={{position:'relative'}}>
          <Search size={14} style={{position:'absolute', left:'0.75rem', top:'50%', transform:'translateY(-50%)', color:'var(--text-light)'}} />
          <input className="input" style={{paddingLeft:'2.25rem'}} placeholder="Search invoices…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card" style={{overflow:'hidden'}}>
        {isLoading ? (
          <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'10rem'}}>
            <div style={{width:'1.5rem', height:'1.5rem', borderRadius:'50%', border:'2px solid var(--teal-500)', borderTopColor:'transparent', animation:'spin 0.8s linear infinite'}} />
          </div>
        ) : invoices.length === 0 ? (
          <div className="empty-state">
            <div style={{width:'3.5rem', height:'3.5rem', borderRadius:'1rem', background:'rgba(23,162,200,0.08)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'1rem'}}>
              <FileText size={24} style={{color:'var(--teal-500)'}} />
            </div>
            <p style={{fontWeight:600, color:'var(--text-dark)'}}>No invoices yet</p>
            <p style={{fontSize:'0.875rem', marginTop:'0.25rem', marginBottom:'1rem', color:'var(--text-light)'}}>Create your first invoice to get started</p>
            <button onClick={() => setCreateModal(true)} className="btn-primary"><Plus size={15} />New Invoice</button>
          </div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Invoice</th><th>Client</th><th>Date</th><th>Due</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td><span style={{fontFamily:'monospace', fontSize:'0.75rem', fontWeight:600, color:'var(--teal-700)'}}>{inv.invoice_number}</span></td>
                  <td><span style={{fontWeight:500, fontSize:'0.875rem', color:'var(--text-dark)'}}>{inv.client_name}</span></td>
                  <td><span style={{fontSize:'0.75rem'}}>{new Date(inv.invoice_date).toLocaleDateString('en-CA')}</span></td>
                  <td><span style={{fontSize:'0.75rem'}}>{inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-CA') : '—'}</span></td>
                  <td>
                    <p style={{fontWeight:600, fontSize:'0.875rem', color:'var(--text-dark)'}}>${Number(inv.total_amount).toFixed(2)}</p>
                    {inv.balance_due > 0 && <p style={{fontSize:'0.75rem', color:'#d97706'}}>Due: ${Number(inv.balance_due).toFixed(2)}</p>}
                  </td>
                  <td>{statusBadge(inv.status)}</td>
                  <td>
                    <div style={{display:'flex', alignItems:'center', gap:'0.25rem'}}>
                      <button onClick={() => openPdf(inv.id)} title="Download PDF" style={{padding:'0.375rem', borderRadius:'0.5rem', background:'transparent', border:'none', cursor:'pointer'}}><Download size={13} style={{color:'var(--teal-600)'}} /></button>
                      <button onClick={() => sendEmail.mutate(inv.id)} title="Send Email" style={{padding:'0.375rem', borderRadius:'0.5rem', background:'transparent', border:'none', cursor:'pointer'}}><Send size={13} style={{color:'var(--teal-600)'}} /></button>
                      {['sent','overdue','draft'].includes(inv.status) && (
                        <button onClick={() => { setPayModal(inv); setPayForm({amount: inv.balance_due, payment_method:'bank_transfer', notes:''}) }} title="Record Payment" style={{padding:'0.375rem', borderRadius:'0.5rem', background:'transparent', border:'none', cursor:'pointer'}}><DollarSign size={13} style={{color:'#10b981'}} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Create Invoice">
        <form onSubmit={e => { e.preventDefault(); createInv.mutate(createForm) }} style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
          <div><label className="label">Client</label>
            <select required className="input" value={createForm.client_id} onChange={e => setCreateForm(p=>({...p,client_id:e.target.value}))}>
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
            </select>
          </div>
          <div><label className="label">Due Date</label><input type="date" className="input" value={createForm.due_date} onChange={e => setCreateForm(p=>({...p,due_date:e.target.value}))} /></div>
          {sessions.filter(s => !createForm.client_id || s.client_id == createForm.client_id).length > 0 && (
            <div><label className="label">Link Unbilled Sessions</label>
              <div style={{display:'flex', flexDirection:'column', gap:'0.5rem', maxHeight:'10rem', overflowY:'auto'}}>
                {sessions.filter(s => !createForm.client_id || s.client_id == createForm.client_id).map(s => (
                  <label key={s.id} style={{display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.625rem', borderRadius:'0.75rem', border:'1px solid #e5e0d8', cursor:'pointer', background: createForm.session_ids.includes(s.id) ? '#f0f9ff' : 'white'}}>
                    <input type="checkbox" checked={createForm.session_ids.includes(s.id)}
                      onChange={e => setCreateForm(p => ({...p, session_ids: e.target.checked ? [...p.session_ids, s.id] : p.session_ids.filter(i=>i!==s.id)}))} />
                    <span style={{fontSize:'0.875rem'}}>{new Date(s.session_date).toLocaleDateString('en-CA')} — {s.duration_minutes}min — ${s.rate}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={createForm.notes} onChange={e => setCreateForm(p=>({...p,notes:e.target.value}))} /></div>
          <div style={{display:'flex', gap:'0.75rem', paddingTop:'0.5rem'}}>
            <button type="submit" disabled={createInv.isPending} className="btn-primary" style={{flex:1, justifyContent:'center'}}>{createInv.isPending ? 'Creating…' : 'Create Invoice'}</button>
            <button type="button" onClick={() => setCreateModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!payModal} onClose={() => setPayModal(null)} title="Record Payment">
        <form onSubmit={e => { e.preventDefault(); recordPayment.mutate({ id: payModal.id, data: payForm }) }} style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
          <div style={{padding:'1rem', borderRadius:'0.75rem', background:'var(--cream)', border:'1px solid #e8e4dc'}}>
            <p style={{fontSize:'0.75rem', color:'var(--text-light)'}}>Invoice</p>
            <p style={{fontWeight:700, color:'var(--text-dark)'}}>{payModal?.invoice_number}</p>
            <p style={{fontSize:'0.875rem', marginTop:'0.25rem', color:'var(--text-mid)'}}>Balance due: <span style={{fontWeight:600, color:'#d97706'}}>${Number(payModal?.balance_due||0).toFixed(2)}</span></p>
          </div>
          <div><label className="label">Amount</label><input type="number" step="0.01" required className="input" value={payForm.amount} onChange={e => setPayForm(p=>({...p,amount:e.target.value}))} /></div>
          <div><label className="label">Payment Method</label>
            <select className="input" value={payForm.payment_method} onChange={e => setPayForm(p=>({...p,payment_method:e.target.value}))}>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="credit_card">Credit Card</option>
              <option value="insurance">Insurance</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={payForm.notes} onChange={e => setPayForm(p=>({...p,notes:e.target.value}))} /></div>
          <div style={{display:'flex', gap:'0.75rem', paddingTop:'0.5rem'}}>
            <button type="submit" disabled={recordPayment.isPending} className="btn-gold" style={{flex:1, justifyContent:'center'}}>{recordPayment.isPending ? 'Recording…' : 'Record Payment'}</button>
            <button type="button" onClick={() => setPayModal(null)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
