import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DollarSign, TrendingUp, Clock, Calendar, ArrowUpRight, ArrowDownRight, Users } from 'lucide-react'

const COLORS = ['#17a2c8','#c9964a','#10b981','#f59e0b','#8b5cf6','#ef4444']

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data)
  })

  const firstName = user?.full_name?.split(' ')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{borderColor: 'var(--teal-500)', borderTopColor: 'transparent'}} />
    </div>
  )

  const kpis = [
    { label: 'Total Revenue', value: `$${(stats?.total_revenue||0).toLocaleString('en-CA', {minimumFractionDigits:2})}`, icon: DollarSign, color: 'teal', trend: '+12%', up: true },
    { label: 'Net Income', value: `$${(stats?.net_income||0).toLocaleString('en-CA', {minimumFractionDigits:2})}`, icon: TrendingUp, color: 'gold', trend: '+8%', up: true },
    { label: 'Outstanding', value: `$${(stats?.outstanding_balance||0).toLocaleString('en-CA', {minimumFractionDigits:2})}`, icon: Clock, color: 'red', trend: '-3%', up: false },
    { label: 'Sessions This Month', value: stats?.sessions_this_month || 0, icon: Calendar, color: 'emerald', trend: `${stats?.new_clients_this_month||0} new clients`, up: true },
  ]

  const colorMap = { teal: 'var(--teal-500)', gold: 'var(--gold)', red: '#ef4444', emerald: '#10b981' }
  const bgMap = { teal: 'rgba(23,162,200,0.08)', gold: 'rgba(201,150,74,0.08)', red: 'rgba(239,68,68,0.08)', emerald: 'rgba(16,185,129,0.08)' }

  return (
    <div className="space-y-6 stagger-children">
      <div className="page-header">
        <h1 className="page-title">{greeting}, {firstName} 👋</h1>
        <p className="page-subtitle">{new Date().toLocaleDateString('en-CA', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color, trend, up }) => (
          <div key={label} className="stat-card" style={{borderLeft: `3px solid ${colorMap[color]}`}}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background: bgMap[color]}}>
                <Icon size={18} style={{color: colorMap[color]}} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {trend}
              </div>
            </div>
            <p className="text-2xl font-bold" style={{color: 'var(--text-dark)'}}>{value}</p>
            <p className="text-xs mt-1" style={{color: 'var(--text-light)'}}>{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card p-6 xl:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold" style={{fontFamily: 'Playfair Display, serif', color: 'var(--text-dark)'}}>Revenue vs Expenses</h3>
              <p className="text-xs mt-0.5" style={{color: 'var(--text-light)'}}>Last 12 months</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats?.monthly_revenue || []}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--teal-500)" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="var(--teal-500)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--gold)" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="var(--gold)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ece4" />
              <XAxis dataKey="month" tick={{fontSize:11, fill:'var(--text-light)'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize:11, fill:'var(--text-light)'}} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip contentStyle={{borderRadius:'12px', border:'1px solid #e8e4dc', fontSize:'12px'}} />
              <Area type="monotone" dataKey="revenue" stroke="var(--teal-500)" strokeWidth={2} fill="url(#revGrad)" name="Revenue" />
              <Area type="monotone" dataKey="expenses" stroke="var(--gold)" strokeWidth={2} fill="url(#expGrad)" name="Expenses" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="font-bold mb-1" style={{fontFamily: 'Playfair Display, serif', color: 'var(--text-dark)'}}>Expenses</h3>
          <p className="text-xs mb-4" style={{color: 'var(--text-light)'}}>By category</p>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={stats?.expense_breakdown||[]} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="amount">
                {(stats?.expense_breakdown||[]).map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => `$${Number(v).toFixed(2)}`} contentStyle={{borderRadius:'12px', fontSize:'12px'}} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {(stats?.expense_breakdown||[]).slice(0,4).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{background: COLORS[i]}} />
                  <span style={{color: 'var(--text-mid)'}}>{item.category}</span>
                </div>
                <span className="font-semibold" style={{color: 'var(--text-dark)'}}>${Number(item.amount).toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold" style={{fontFamily: 'Playfair Display, serif', color: 'var(--text-dark)'}}>Top Clients</h3>
            <p className="text-xs mt-0.5" style={{color: 'var(--text-light)'}}>By revenue generated</p>
          </div>
          <Users size={16} style={{color: 'var(--text-light)'}} />
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={stats?.top_clients||[]} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0ece4" horizontal={false} />
            <XAxis type="number" tick={{fontSize:11, fill:'var(--text-light)'}} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
            <YAxis type="category" dataKey="name" tick={{fontSize:11, fill:'var(--text-mid)'}} axisLine={false} tickLine={false} width={100} />
            <Tooltip formatter={v => `$${Number(v).toFixed(2)}`} contentStyle={{borderRadius:'12px', fontSize:'12px'}} />
            <Bar dataKey="revenue" fill="var(--teal-500)" radius={[0,6,6,0]} name="Revenue" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
