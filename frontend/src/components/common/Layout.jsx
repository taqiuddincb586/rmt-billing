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
            <NavLink key={to} to={to} className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}>
              <Icon size={16} />
              <span className="flex-1">{label}</span>
            </NavLink>
          )
