import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../services/api'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import {
  DollarSign, TrendingUp, TrendingDown, AlertCircle,
  Calendar, Users, FileText, Clock
} from 'lucide-react'

const fmt = (n) => `$${Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`

const COLORS = ['#0066cc', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
  }
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${colors[color]}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.stats().then(r => r.data),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Your practice at a glance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Total Revenue" value={fmt(stats?.total_revenue)} color="blue" />
        <StatCard icon={TrendingUp} label="Net Income" value={fmt(stats?.net_income)}
          sub={`${fmt(stats?.total_expenses)} in expenses`} color="green" />
        <StatCard icon={AlertCircle} label="Outstanding" value={fmt(stats?.outstanding_balance)}
          sub={`${stats?.invoices_overdue || 0} overdue`} color={stats?.invoices_overdue > 0 ? 'red' : 'amber'} />
        <StatCard icon={Calendar} label="Sessions (Month)" value={stats?.sessions_this_month || 0}
          sub={`${stats?.new_clients_this_month || 0} new clients`} color="blue" />
      </div>

      {/* Invoice Status Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl"><FileText size={16} className="text-blue-600" /></div>
          <div>
            <p className="text-xs text-slate-500">Sent (Unpaid)</p>
            <p className="text-lg font-bold text-slate-900">{stats?.invoices_unpaid || 0}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2 bg-red-50 rounded-xl"><Clock size={16} className="text-red-600" /></div>
          <div>
            <p className="text-xs text-slate-500">Overdue</p>
            <p className="text-lg font-bold text-red-600">{stats?.invoices_overdue || 0}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-xl"><Users size={16} className="text-emerald-600" /></div>
          <div>
            <p className="text-xs text-slate-500">New Clients</p>
            <p className="text-lg font-bold text-slate-900">{stats?.new_clients_this_month || 0}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="col-span-2 card p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Revenue vs Expenses (12 months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats?.revenue_by_month || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Area type="monotone" dataKey="revenue" stackId="1" stroke="#0066cc" fill="#dbeafe" strokeWidth={2} name="Revenue" />
              <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ef4444" fill="#fef2f2" strokeWidth={2} name="Expenses" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Expenses by Category</h3>
          {stats?.expense_by_category?.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={stats.expense_by_category} dataKey="total" nameKey="category"
                    cx="50%" cy="50%" outerRadius={65} strokeWidth={2}>
                    {stats.expense_by_category.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-3">
                {stats.expense_by_category.slice(0, 4).map((item, i) => (
                  <div key={item.category} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-slate-600 capitalize">{item.category}</span>
                    </div>
                    <span className="font-medium text-slate-900">{fmt(item.total)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400 text-center mt-8">No expenses recorded</p>
          )}
        </div>
      </div>

      {/* Top Clients */}
      {stats?.top_clients?.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Top Clients by Revenue</h3>
          <div className="space-y-3">
            {stats.top_clients.map((client, i) => (
              <div key={client.name} className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 w-5">#{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{client.name}</span>
                    <span className="text-sm font-semibold text-slate-900">{fmt(client.total)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(client.total / stats.top_clients[0].total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
