import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoicesApi, clientsApi } from '../services/api'
import Modal from '../components/common/Modal'
import toast from 'react-hot-toast'
import { Plus, FileText, Send, Download, DollarSign, Filter } from 'lucide-react'
import clsx from 'clsx'
import { format, addDays } from 'date-fns'

const STATUS_OPTS = ['', 'draft', 'sent', 'paid', 'overdue', 'cancelled']
const today = () => format(new Date(), 'yyyy-MM-dd')
const in30 = () => format(addDays(new Date(), 30), 'yyyy-MM-dd')

const PAYMENT_METHODS = ['cash', 'cheque', 'e_transfer', 'credit_card', 'insurance', 'other']

function StatusBadge({ status }) {
  return <span className={`badge-${status} badge`}>{status}</span>
}

function InvoiceCreateForm({ clients, onSubmit, loading }) {
  const [form, setForm] = useState({
    client_id: '', issue_date: today(), due_date: in30(),
    tax_rate: 0.13, discount: 0, notes: '',
    line_items: [{ description: 'Massage Therapy Session', quantity: 1, unit_price: 100, tax_rate: 0.13 }]
  })

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const setItem = (i, k) => e => {
    const items = [...form.line_items]
    items[i] = { ...items[i], [k]: k === 'description' ? e.target.value : Number(e.target.value) }
    setForm(p => ({ ...p, line_items: items }))
  }

  const addItem = () => setForm(p => ({
    ...p, line_items: [...p.line_items, { description: '', quantity: 1, unit_price: 0, tax_rate: 0.13 }]
  }))

  const removeItem = (i) => setForm(p => ({ ...p, line_items: p.line_items.filter((_, idx) => idx !== i) }))

  const subtotal = form.line_items.reduce((s, item) => s + item.quantity * item.unit_price, 0)
  const taxes = form.line_items.reduce((s, item) => s + item.quantity * item.unit_price * item.tax_rate, 0)
  const total = subtotal + taxes - Number(form.discount)

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ ...form, client_id: Number(form.client_id) }) }} className="space-y-4">
      <div>
        <label className="label">Client *</label>
        <select required className="input" value={form.client_id} onChange={set('client_id')}>
          <option value="">Select client…</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Issue Date</label><input type="date" className="input" value={form.issue_date} onChange={set('issue_date')} /></div>
        <div><label className="label">Due Date</label><input type="date" className="input" value={form.due_date} onChange={set('due_date')} /></div>
      </div>

      <hr className="border-slate-100" />
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Line Items</p>
        <button type="button" onClick={addItem} className="btn-secondary text-xs py-1.5 px-3">+ Add Line</button>
      </div>

      {form.line_items.map((item, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-start">
          <div className="col-span-5">
            {i === 0 && <label className="label">Description</label>}
            <input className="input" placeholder="Description" value={item.description} onChange={setItem(i, 'description')} />
          </div>
          <div className="col-span-2">
            {i === 0 && <label className="label">Qty</label>}
            <input type="number" min="0" step="0.5" className="input" value={item.quantity} onChange={setItem(i, 'quantity')} />
          </div>
          <div className="col-span-2">
            {i === 0 && <label className="label">Price</label>}
            <input type="number" min="0" step="0.01" className="input" value={item.unit_price} onChange={setItem(i, 'unit_price')} />
          </div>
          <div className="col-span-2">
            {i === 0 && <label className="label">Tax %</label>}
            <input type="number" min="0" max="1" step="0.01" className="input" value={item.tax_rate} onChange={setItem(i, 'tax_rate')} />
          </div>
          <div className="col-span-1 flex items-end">
            {i === 0 && <div className="label opacity-0">x</div>}
            <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 p-2">×</button>
          </div>
        </div>
      ))}

      <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">HST</span><span>${taxes.toFixed(2)}</span></div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Discount</span>
          <input type="number" min="0" className="input w-24 text-right" value={form.discount} onChange={set('discount')} />
        </div>
        <div className="flex justify-between font-semibold text-base border-t border-slate-200 pt-2">
          <span>Total</span><span>${total.toFixed(2)}</span>
        </div>
      </div>

      <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={set('notes')} /></div>

      <div className="flex justify-end">
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Creating…' : 'Create Invoice'}</button>
      </div>
    </form>
  )
}

function PaymentForm({ invoice, onSubmit, loading }) {
  const [form, setForm] = useState({
    amount: invoice.balance_due?.toFixed(2) || '',
    payment_date: today(),
    payment_method: 'e_transfer',
    reference: '', notes: ''
  })
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ ...form, amount: Number(form.amount) }) }} className="space-y-4">
      <div className="bg-blue-50 rounded-xl p-4">
        <p className="text-sm text-blue-800">Invoice {invoice.invoice_number} — Balance Due: <strong>${invoice.balance_due?.toFixed(2)}</strong></p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Amount</label><input type="number" required min="0.01" step="0.01" className="input" value={form.amount} onChange={set('amount')} /></div>
        <div><label className="label">Date</label><input type="date" required className="input" value={form.payment_date} onChange={set('payment_date')} /></div>
      </div>
      <div>
        <label className="label">Payment Method</label>
        <select className="input" value={form.payment_method} onChange={set('payment_method')}>
          {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
        </select>
      </div>
      <div><label className="label">Reference / Confirmation #</label><input className="input" value={form.reference} onChange={set('reference')} /></div>
      <div className="flex justify-end">
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Recording…' : 'Record Payment'}</button>
      </div>
    </form>
  )
}

export default function InvoicesPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [modal, setModal] = useState(null)
  const [payModal, setPayModal] = useState(null)

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', statusFilter],
    queryFn: () => invoicesApi.list(statusFilter ? { status: statusFilter } : {}).then(r => r.data),
  })

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list({}).then(r => r.data),
  })

  const create = useMutation({
    mutationFn: invoicesApi.create,
    onSuccess: () => { qc.invalidateQueries(['invoices']); setModal(null); toast.success('Invoice created!') },
    onError: e => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const genPdf = useMutation({
    mutationFn: (id) => invoicesApi.generatePdf(id),
    onSuccess: (res) => {
      toast.success('PDF generated!')
      window.open(res.data.pdf_url, '_blank')
    },
    onError: () => toast.error('PDF generation failed'),
  })

  const sendEmail = useMutation({
    mutationFn: (id) => invoicesApi.sendEmail(id),
    onSuccess: () => { qc.invalidateQueries(['invoices']); toast.success('Invoice sent!') },
    onError: e => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const recordPayment = useMutation({
    mutationFn: ({ id, data }) => invoicesApi.recordPayment(id, data),
    onSuccess: () => { qc.invalidateQueries(['invoices']); setPayModal(null); toast.success('Payment recorded!') },
    onError: e => toast.error(e.response?.data?.detail || 'Failed'),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500 text-sm">{invoices.length} invoices</p>
        </div>
        <button className="btn-primary" onClick={() => setModal('create')}>
          <Plus size={16} /> New Invoice
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {STATUS_OPTS.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50')}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="table-auto w-full">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Client</th>
              <th>Date</th>
              <th>Due</th>
              <th>Total</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">Loading…</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12">
                <FileText size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No invoices found</p>
              </td></tr>
            ) : invoices.map(inv => (
              <tr key={inv.id}>
                <td className="font-mono text-xs font-medium text-blue-600">{inv.invoice_number}</td>
                <td className="font-medium">{inv.client?.full_name || `Client #${inv.client_id}`}</td>
                <td>{inv.issue_date}</td>
                <td className={clsx(inv.status === 'overdue' && 'text-red-600 font-medium')}>{inv.due_date}</td>
                <td className="font-medium">${inv.total?.toFixed(2)}</td>
                <td className={clsx(inv.balance_due > 0 ? 'text-red-600 font-medium' : 'text-emerald-600')}>
                  ${inv.balance_due?.toFixed(2)}
                </td>
                <td><StatusBadge status={inv.status} /></td>
                <td>
                  <div className="flex items-center gap-1">
                    <button title="Generate PDF" onClick={() => genPdf.mutate(inv.id)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                      <Download size={14} />
                    </button>
                    {inv.status === 'draft' && (
                      <button title="Send Email" onClick={() => sendEmail.mutate(inv.id)}
                        className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-blue-600">
                        <Send size={14} />
                      </button>
                    )}
                    {['sent', 'overdue'].includes(inv.status) && (
                      <button title="Record Payment" onClick={() => setPayModal(inv)}
                        className="p-1.5 hover:bg-emerald-50 rounded-lg transition-colors text-emerald-600">
                        <DollarSign size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modal === 'create'} onClose={() => setModal(null)} title="New Invoice" size="lg">
        <InvoiceCreateForm clients={clients} onSubmit={data => create.mutate(data)} loading={create.isPending} />
      </Modal>

      {payModal && (
        <Modal isOpen onClose={() => setPayModal(null)} title="Record Payment">
          <PaymentForm invoice={payModal}
            onSubmit={data => recordPayment.mutate({ id: payModal.id, data })}
            loading={recordPayment.isPending} />
        </Modal>
      )}
    </div>
  )
}
