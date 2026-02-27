import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { expensesApi } from '../services/api'
import Modal from '../components/common/Modal'
import toast from 'react-hot-toast'
import { Plus, Receipt } from 'lucide-react'
import { format } from 'date-fns'

const CATEGORIES = ['supplies','equipment','rent','insurance','education','marketing','software','utilities','other']
const today = () => format(new Date(), 'yyyy-MM-dd')
const EMPTY = { category: 'supplies', description: '', amount: '', tax_amount: 0, date: today(), vendor: '', is_tax_deductible: true, notes: '' }

function ExpenseForm({ initial = EMPTY, onSubmit, loading }) {
  const [form, setForm] = useState(initial)
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ ...form, amount: Number(form.amount), tax_amount: Number(form.tax_amount) }) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Category</label>
          <select required className="input" value={form.category} onChange={set('category')}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>
        <div><label className="label">Date</label><input type="date" required className="input" value={form.date} onChange={set('date')} /></div>
      </div>
      <div><label className="label">Description *</label><input required className="input" value={form.description} onChange={set('description')} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Amount ($) *</label><input type="number" required min="0" step="0.01" className="input" value={form.amount} onChange={set('amount')} /></div>
        <div><label className="label">Tax Paid ($)</label><input type="number" min="0" step="0.01" className="input" value={form.tax_amount} onChange={set('tax_amount')} /></div>
      </div>
      <div><label className="label">Vendor</label><input className="input" value={form.vendor} onChange={set('vendor')} /></div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.is_tax_deductible} onChange={e => setForm(p => ({ ...p, is_tax_deductible: e.target.checked }))} />
        <span className="text-sm text-slate-700">Tax deductible expense</span>
      </label>
      <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={set('notes')} /></div>
      <div className="flex justify-end">
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving…' : 'Save Expense'}</button>
      </div>
    </form>
  )
}

export default function ExpensesPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [catFilter, setCatFilter] = useState('')

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', catFilter],
    queryFn: () => expensesApi.list(catFilter ? { category: catFilter } : {}).then(r => r.data),
  })

  const create = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => { qc.invalidateQueries(['expenses', 'dashboard']); setModal(null); toast.success('Expense added!') },
    onError: e => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const del = useMutation({
    mutationFn: expensesApi.delete,
    onSuccess: () => { qc.invalidateQueries(['expenses', 'dashboard']); toast.success('Deleted') },
  })

  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const deductible = expenses.filter(e => e.is_tax_deductible).reduce((s, e) => s + e.amount, 0)

  const CAT_COLORS = {
    supplies: 'bg-blue-100 text-blue-700', equipment: 'bg-purple-100 text-purple-700',
    rent: 'bg-amber-100 text-amber-700', insurance: 'bg-green-100 text-green-700',
    education: 'bg-cyan-100 text-cyan-700', marketing: 'bg-pink-100 text-pink-700',
    software: 'bg-indigo-100 text-indigo-700', utilities: 'bg-orange-100 text-orange-700',
    other: 'bg-slate-100 text-slate-600',
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
          <p className="text-slate-500 text-sm">${total.toFixed(2)} total · ${deductible.toFixed(2)} deductible</p>
        </div>
        <button className="btn-primary" onClick={() => setModal('create')}><Plus size={16} /> Add Expense</button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setCatFilter('')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!catFilter ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>All</button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCatFilter(c)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${catFilter === c ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
            {c}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="table-auto w-full">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Vendor</th>
              <th>Amount</th>
              <th>Tax</th>
              <th>Deductible</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">Loading…</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12">
                <Receipt size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No expenses recorded</p>
              </td></tr>
            ) : expenses.map(e => (
              <tr key={e.id}>
                <td>{e.date}</td>
                <td><span className={`badge ${CAT_COLORS[e.category] || 'badge-draft'} capitalize`}>{e.category}</span></td>
                <td className="font-medium">{e.description}</td>
                <td className="text-slate-400">{e.vendor || '—'}</td>
                <td className="font-semibold">${e.amount.toFixed(2)}</td>
                <td className="text-slate-400">${e.tax_amount.toFixed(2)}</td>
                <td>{e.is_tax_deductible ? <span className="badge-paid badge">Yes</span> : <span className="badge-draft badge">No</span>}</td>
                <td>
                  <button onClick={() => del.mutate(e.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modal === 'create'} onClose={() => setModal(null)} title="Add Expense">
        <ExpenseForm onSubmit={data => create.mutate(data)} loading={create.isPending} />
      </Modal>
    </div>
  )
}
