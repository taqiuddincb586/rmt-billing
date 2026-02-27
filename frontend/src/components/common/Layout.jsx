import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { LayoutDashboard, Users, Calendar, FileText, Receipt, Building2, Settings, LogOut, Activity } from 'lucide-react'

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/sessions', icon: Calendar, label: 'Sessions' },
  { to: '/invoices', icon: FileText, label: 'Invoices' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/clinics', icon: Building2, label: 'Clinics' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const handleLogout = () => { logout(); navigate('/login') }
  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()

  return (
    <div className="flex h-screen overflow-hidden" style={{background: 'var(--cream)'}}>
      <aside className="w-64 flex-shrink-0 flex flex-col" style={{background: 'var(--teal-950)'}}>
        <div className="px-6 py-6 border-b" style={{borderColor: 'rgba(255,255,255,0.07)'}}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, var(--teal-500), var(--teal-700))'}}>
              <Activity size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm" style={{fontFamily: 'Playfair Display, serif'}}>RMT Billing</p>
              <p className="text-xs" style={{color: 'rgba(255,255,255,0.4)'}}>Practice Management</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest px-4 mb-3" style={{color: 'rgba(255,255,255,0.25)'}}>Navigation</p>
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => ['sidebar-link', isActive ? 'active' : ''].join(' ')}>
              <Icon size={16} />
              <span className="flex-1">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-3 pb-5 border-t pt-4" style={{borderColor: 'rgba(255,255,255,0.07)'}}>
          <NavLink to="/profile" className={({ isActive }) => ['sidebar-link', isActive ? 'active' : ''].join(' ')}>
            <Settings size={16} />
            <span className="flex-1">Settings</span>
          </NavLink>
          <button onClick={handleLogout} className="sidebar-link w-full mt-1" style={{color: 'rgba(255,100,100,0.7)'}}>
            <LogOut size={16} />
            <span className="flex-1">Sign out</span>
          </button>
          <div className="mx-1 mt-4 p-3 rounded-xl" style={{background: 'rgba(255,255,255,0.05)'}}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{background: 'linear-gradient(135deg, var(--gold), #b8832e)'}}>
                {initials}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">{user?.full_name}</p>
                <p className="text-xs truncate" style={{color: 'rgba(255,255,255,0.4)'}}>{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
