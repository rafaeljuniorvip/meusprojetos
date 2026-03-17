import { NavLink, useLocation } from 'react-router'
import { LayoutDashboard, FolderKanban, Bot, Menu, X, TrendingUp, Video, CalendarDays, ScrollText, Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/conteudo', icon: Video, label: 'Criar Conteudo' },
  { to: '/calendario', icon: CalendarDays, label: 'Calendario' },
  { to: '/projetos', icon: FolderKanban, label: 'Projetos' },
  { to: '/potencial', icon: TrendingUp, label: 'Potencial' },
  { to: '/modelos', icon: Bot, label: 'Modelos LLM' },
  { to: '/logs', icon: ScrollText, label: 'Atividade' },
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

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
              <p className="text-[11px] text-gray-500 -mt-0.5">de Projetos</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5">
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-1 overflow-auto">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 px-3 mb-2">Menu</p>
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] mb-0.5 transition-all duration-200 ${
                  isActive
                    ? 'text-white font-medium'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
                }`
              }
              style={({ isActive }) => isActive ? {
                background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.08))',
                boxShadow: 'inset 0 0 0 1px rgba(99,102,241,0.15)',
              } : {}}
            >
              <Icon size={16} strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 mx-3 mb-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[11px] text-gray-600">136 projetos catalogados</p>
          <div className="flex gap-1 mt-1.5">
            <div className="h-1 flex-1 rounded-full bg-primary/30" />
            <div className="h-1 flex-1 rounded-full bg-success/30" />
            <div className="h-1 flex-1 rounded-full bg-warning/30" />
          </div>
        </div>
      </aside>
    </>
  )
}
