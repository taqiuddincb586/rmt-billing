import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'
import Modal from '../components/common/Modal'
import { Plus, Receipt, Edit2, Trash2, CheckCircle } from 'lucide-react'

const CATS = ['rent','supplies','equipment','insurance','marketing','education','travel','other']
const empty = { description:'', amount:'', category:'supplies', expense_date: new Date().toISOString().split('T')[0], vendor:'', is_tax_deductible:true, notes:'' }

export default function ExpensesPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(empty)
  const [catFilter, setCatFilter] = useState('all')

  const { data: expenses=[], isLoading } = useQuery({
    queryKey: ['expenses', catFilter],
    queryFn: () => api.get('/expenses', { params: { category: catFilter==='all'?undefined:catFilter } }).then(r => r.data)
  })

  const save = useMutation({
    mutationFn: d => modal?.id ? api.put(`/expenses/${modal.id}`, d) : api.post('/expenses', d),
    onSuccess: () => { qc.invalidateQueries(['expenses']); setModal(null); toast.success(modal?.id ? 'Expense updated!' : 'Expense added!') }
  })
  const del = useMutation({
    mutationFn: id => api.delete(`/expenses/${id}`),
    onSuccess: () => { qc.invalidateQueries(['expenses']); toast.success('Expense removed') }
  })

  const total = expenses.reduce((s, e) => s + Number(e.amount||0), 0)
  const deductible = expenses.filter(e => e.is_tax_deductible).reduce((s, e) => s + Number(e.amount||0), 0)

  return (
    <div className="stagger-children" style={{display:'flex', flexDirection:'column', gap:'1.5rem'}}>
      <div className="page-header" style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between'}}>
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Track your practice expenses</p>
        </div>
        <button onClick={() => { setForm(empty); setModal({}) }} className="btn-primary"><Plus size={16} />Add Expense</button>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
        <div className="stat-card stat-card-teal">
          <p style={{fontSize:'0.75rem', marginBottom:'0.25rem', color:'var(--text-light)'}}>Total Expenses</p>
          <p style={{fontSize:'1.5rem', fontWeight:700, color:'var(--text-dark)'}}>${total.toFixed(2)}</p>
        </div>
        <div className="stat-card stat-card-gold">
          <p style={{fontSize:'0.75rem', marginBottom:'0.25rem', color:'var(--text-light)'}}>Tax Deductible</p>
          <p style={{fontSize:'1.5rem', fontWeight:700, color:'var(--text-dark)'}}>${deductible.toFixed(2)}</p>
        </div>
      </div>

      <div className="card" style={{padding:'1rem'}}>
        <div style={{display:'flex', flexWrap:'wrap', gap:'0.5rem'}}>
          {['all', ...CATS].map(c => (
            <button key={c} onClick={() => setCatFilter(c)} style={{padding:'0.375rem 0.75rem', borderRadius:'0.5rem', fontSize:'0.75rem', fontWeight:600, textTransform:'capitalize', border:'none', cursor:'pointer', background: catFilter===c ? 'var(--teal-600)' : '#f5f2ed', color: catFilter===c ? 'white' : 'var(--text-mid)', transition:'all 0.15s'}}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{overflow:'hidden'}}>
        {isLoading ? (
          <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'10rem'}}>
            <div style={{width:'1.5rem', height:'1.5rem', borderRadius:'50%', border:'2px solid var(--teal-500)', borderTopColor:'transparent', animation:'spin 0.8s linear infinite'}} />
          </div>
        ) : expenses.length === 0 ? (
          <div className="empty-state">
            <div style={{width:'3.5rem', height:'3.5rem', borderRadius:'1rem', background:'rgba(23,162,200,0.08)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'1rem'}}>
              <Receipt size={24} style={{color:'var(--teal-500)'}} />
            </div>
            <p style={{fontWeight:600, color:'var(--text-dark)'}}>No expenses yet</p>
            <p style={{fontSize:'0.875rem', marginTop:'0.25rem', marginBottom:'1rem', color:'var(--text-light)'}}>Start tracking your business expenses</p>
            <button onClick={() => { setForm(empty); setModal({}) }} className="btn-primary"><Plus size={15} />Add Expense</button>
          </div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Description</th><th>Date</th><th>Category</th><th>Vendor</th><th>Amount</th><th>Deductible</th><th></th></tr></thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id}>
                  <td><span style={{fontWeight:500, fontSize:'0.875rem', color:'var(--text-dark)'}}>{e.description}</span></td>
                  <td><span style={{fontSize:'0.75rem'}}>{new Date(e.expense_date).toLocaleDateString('en-CA')}</span></td>
                  <td><span style={{display:'inline-flex', alignItems:'center', padding:'0.125rem 0.625rem', borderRadius:'9999px', fontSize:'0.75rem', fontWeight:600, background:'#f5f5f4', color:'#57534e', border:'1px solid #e7e5e4', textTransform:'capitalize'}}>{e.category}</span></td>
                  <td><span style={{fontSize:'0.875rem'}}>{e.vendor||'—'}</span></td>
                  <td><span style={{fontWeight:600, fontSize:'0.875rem', color:'var(--text-dark)'}}>${Number(e.amount).toFixed(2)}</span></td>
                  <td>{e.is_tax_deductible && <CheckCircle size={16} style={{color:'#10b981'}} />}</td>
                  <td>
                    <div style={{display:'flex', gap:'0.25rem'}}>
                      <button onClick={() => { setForm(e); setModal({id:e.id}) }} style={{padding:'0.375rem', borderRadius:'0.5rem', background:'transparent', border:'none', cursor:'pointer'}}><Edit2 size={13} style={{color:'var(--text-light)'}} /></button>
                      <button onClick={() => del.mutate(e.id)} style={{padding:'0.375rem', borderRadius:'0.5rem', background:'transparent', border:'none', cursor:'pointer'}}><Trash2 size={13} style={{color:'#f87171'}} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit Expense' : 'Add Expense'}>
        <form onSubmit={e => { e.preventDefault(); save.mutate(form) }} style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
          <div><label className="label">Description</label><input required className="input" value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))} /></div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
            <div><label className="label">Amount ($)</label><input type="number" step="0.01" required className="input" value={form.amount} onChange={e => setForm(p=>({...p,amount:e.target.value}))} /></div>
            <div><label className="label">Date</label><input type="date" required className="input" value={form.expense_date} onChange={e => setForm(p=>({...p,expense_date:e.target.value}))} /></div>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
            <div><label className="label">Category</label>
              <select className="input" value={form.category} onChange={e => setForm(p=>({...p,category:e.target.value}))}>
                {CATS.map(c => <option key={c} value={c} style={{textTransform:'capitalize'}}>{c}</option>)}
              </select>
            </div>
            <div><label className="label">Vendor</label><input className="input" value={form.vendor||''} onChange={e => setForm(p=>({...p,vendor:e.target.value}))} /></div>
          </div>
          <label style={{display:'flex', alignItems:'center', gap:'0.75rem', cursor:'pointer'}}>
            <input type="checkbox" checked={form.is_tax_deductible} onChange={e => setForm(p=>({...p,is_tax_deductible:e.target.checked}))} />
            <span style={{fontSize:'0.875rem', fontWeight:500, color:'var(--text-mid)'}}>Tax deductible expense</span>
          </label>
          <div style={{display:'flex', gap:'0.75rem', paddingTop:'0.5rem'}}>
            <button type="submit" disabled={save.isPending} className="btn-primary" style={{flex:1, justifyContent:'center'}}>{save.isPending ? 'Saving…' : 'Save Expense'}</button>
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
