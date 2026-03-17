import { NavLink, useLocation } from 'react-router'
import { LayoutDashboard, FolderKanban, Bot, Menu, X, TrendingUp, Video, CalendarDays, ScrollText, Sparkles, LogOut, Shield } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/conteudo', icon: Video, label: 'Criar Conteudo' },
  { to: '/calendario', icon: CalendarDays, label: 'Calendario' },
  { to: '/projetos', icon: FolderKanban, label: 'Projetos' },
  { to: '/potencial', icon: TrendingUp, label: 'Potencial' },
  { to: '/modelos', icon: Bot, label: 'Modelos LLM' },
  { to: '/logs', icon: ScrollText, label: 'Atividade' },
  { to: '/admin', icon: Shield, label: 'Admin' },
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const { data: auth } = useAuth()

  useEffect(() => { setOpen(false) }, [location.pathname])

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center px-4 h-14"
        style={{ background: 'rgba(248,249,252,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(226,232,240,0.6)' }}>
        <button onClick={() => setOpen(true)} className="p-2 -ml-2 rounded-xl text-text-secondary hover:bg-black/5 transition-colors">
          <Menu size={20} />
        </button>
        <div className="ml-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <Sparkles size={12} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-text-primary tracking-tight">Catalogador</span>
        </div>
      </div>

      {/* Overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-60 flex flex-col shrink-0
        transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `} style={{ background: '#0f1117' }}>
        {/* Logo */}
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold text-white tracking-tight">Catalogador</h1>
              <p className="text-[11px] -mt-0.5" style={{ color: '#9ca3af' }}>de Projetos</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden p-1.5 rounded-lg hover:bg-white/5" style={{ color: '#9ca3af' }}>
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-1 overflow-auto">
          <p className="text-[10px] font-semibold uppercase tracking-wider px-3 mb-2" style={{ color: '#6b7280' }}>Menu</p>
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] mb-0.5 transition-all duration-200 ${
                  isActive ? 'font-medium' : 'hover:bg-white/[0.06]'
                }`
              }
              style={({ isActive }) => isActive ? {
                color: '#ffffff',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))',
                boxShadow: 'inset 0 0 0 1px rgba(99,102,241,0.2)',
              } : { color: '#9ca3af' }}
            >
              <Icon size={16} strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="px-3 mb-2">
          {auth?.user && (
            <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-2.5 mb-2">
                {auth.user.picture ? (
                  <img src={auth.user.picture} alt="" className="w-7 h-7 rounded-lg" />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-[11px] font-bold text-white">
                    {auth.user.name?.[0] || '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-white truncate">{auth.user.name}</p>
                  <p className="text-[10px] truncate" style={{ color: '#6b7280' }}>{auth.user.email}</p>
                </div>
              </div>
              <a href="/auth/logout"
                className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-[11px] font-medium transition-colors hover:bg-white/[0.06]"
                style={{ color: '#9ca3af' }}>
                <LogOut size={12} /> Sair
              </a>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
