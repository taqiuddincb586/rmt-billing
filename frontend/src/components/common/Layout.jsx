import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  LayoutDashboard, Users, Calendar, FileText,
  Receipt, Building2, Settings, LogOut, Activity
} from 'lucide-react'
import clsx from 'clsx'

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

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
              <Activity className="w-4.5 h-4.5 text-white" size={18} />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm leading-none">RMT Billing</p>
              <p className="text-xs text-slate-400 mt-0.5">Professional</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx('sidebar-link', isActive && 'active')
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 pb-4 border-t border-slate-100 pt-3 space-y-0.5">
          <NavLink to="/profile" className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}>
            <Settings size={16} />
            Profile
          </NavLink>
          <button onClick={handleLogout} className="sidebar-link w-full text-red-500 hover:bg-red-50 hover:text-red-600">
            <LogOut size={16} />
            Sign out
          </button>
          <div className="px-3 pt-2 pb-1">
            <p className="text-xs font-semibold text-slate-900 truncate">{user?.full_name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
