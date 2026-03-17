import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import api from '../api/client'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import type { StatsOverview } from '../types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import {
  FolderKanban, GitBranch, Container, Rocket, TrendingUp, Cpu, ScanSearch,
  Video, Sparkles, ArrowRight, CheckCircle, XCircle, Clock, Zap
} from 'lucide-react'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#3b82f6']

const tooltipStyle = { borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }

export default function Dashboard() {
  const navigate = useNavigate()

  const { data: stats, isLoading } = useQuery<StatsOverview>({
    queryKey: ['stats'],
    queryFn: () => api.get('/stats/overview').then(r => r.data),
  })
  const { data: categories } = useQuery<{ category: string; count: number }[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/stats/categories').then(r => r.data),
  })
  const { data: saas } = useQuery<{ score: number; count: number }[]>({
    queryKey: ['saas-dist'],
    queryFn: () => api.get('/stats/saas-distribution').then(r => r.data),
  })
  const { data: langs } = useQuery<{ language: string; projects_count: number }[]>({
    queryKey: ['languages'],
    queryFn: () => api.get('/stats/languages').then(r => r.data),
  })
  const { data: monetization } = useQuery<{ level: string; count: number }[]>({
    queryKey: ['monetization'],
    queryFn: () => api.get('/stats/monetization').then(r => r.data),
  })
  const { data: topProjects } = useQuery<any[]>({
    queryKey: ['top-projects'],
    queryFn: () => api.get('/stats/top-projects?limit=6').then(r => r.data),
  })
  const { data: techStack } = useQuery<{ tech: string; count: number }[]>({
    queryKey: ['tech-stack'],
    queryFn: () => api.get('/stats/tech-stack').then(r => r.data),
  })
  const { data: recentActivity } = useQuery<any[]>({
    queryKey: ['recent-activity'],
    queryFn: () => api.get('/stats/recent-activity?limit=8').then(r => r.data),
  })
  const { data: contentStats } = useQuery<any>({
    queryKey: ['content-stats'],
    queryFn: () => api.get('/stats/content-stats').then(r => r.data),
  })
  const { data: deployment } = useQuery<{ status: string; count: number }[]>({
    queryKey: ['deployment'],
    queryFn: () => api.get('/stats/deployment').then(r => r.data),
  })

  const scanAllMutation = useMutation({ mutationFn: () => api.post('/actions/scan', {}) })
  const analyzeAllMutation = useMutation({ mutationFn: () => api.post('/actions/analyze', {}) })

  if (isLoading) return <Spinner />

  const statCards = [
    { label: 'Projetos', value: stats?.total_projects, icon: FolderKanban, gradient: 'from-indigo-500 to-purple-600' },
    { label: 'Analisados', value: stats?.analyzed, icon: Cpu, gradient: 'from-emerald-500 to-teal-600' },
    { label: 'Deployed', value: stats?.deployed, icon: Rocket, gradient: 'from-violet-500 to-purple-600' },
    { label: 'Alto Potencial', value: stats?.high_monetization, icon: TrendingUp, gradient: 'from-amber-500 to-orange-600' },
    { label: 'Com Git', value: stats?.with_git, icon: GitBranch, gradient: 'from-sky-500 to-blue-600' },
    { label: 'Docker', value: stats?.with_docker, icon: Container, gradient: 'from-cyan-500 to-teal-600' },
  ]

  const moneyColors: Record<string, string> = { high: '#10b981', medium: '#f59e0b', low: '#94a3b8', none: '#e2e8f0' }
  const moneyLabels: Record<string, string> = { high: 'Alto', medium: 'Medio', low: 'Baixo', none: 'Nenhum' }
  const activityIcons: Record<string, any> = { scan: ScanSearch, analyze: Cpu, generate: Sparkles, llm_sync: Zap }
  const deployColors: Record<string, string> = { deployed: '#10b981', 'in-progress': '#f59e0b', 'local-only': '#6366f1', abandoned: '#ef4444' }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">Dashboard</h2>
          <p className="text-sm text-text-muted mt-0.5">Visao geral do seu portfolio de {stats?.total_projects} projetos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => scanAllMutation.mutate()} disabled={scanAllMutation.isPending}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl border border-border bg-surface hover:bg-surface-hover shadow-sm transition-all disabled:opacity-50">
            <ScanSearch size={14} className={scanAllMutation.isPending ? 'animate-spin' : ''} /> Escanear
          </button>
          <button onClick={() => analyzeAllMutation.mutate()} disabled={analyzeAllMutation.isPending}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl text-white shadow-sm hover:shadow-md transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <Cpu size={14} className={analyzeAllMutation.isPending ? 'animate-spin' : ''} /> Analisar
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {statCards.map(({ label, value, icon: Icon, gradient }) => (
          <div key={label}
            className="group bg-surface rounded-2xl border border-border/60 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-0.5">
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 shadow-sm`}>
              <Icon size={15} className="text-white" />
            </div>
            <p className="text-2xl font-bold tracking-tight">{value ?? 0}</p>
            <p className="text-[11px] text-text-muted mt-0.5 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Content Production Stats */}
      {contentStats && (
        <div className="mb-6 p-4 sm:p-5 rounded-2xl border border-border/60 bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ec4899, #f43f5e)' }}>
                <Video size={15} className="text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Producao de Conteudo</h3>
                <p className="text-[11px] text-text-muted">Meta: 300 Reels/mes</p>
              </div>
            </div>
            <button onClick={() => navigate('/conteudo')} className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
              Criar <ArrowRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-100/50">
              <p className="text-2xl font-bold text-pink-600">{contentStats.total_scripts}</p>
              <p className="text-[11px] text-pink-500 font-medium">Roteiros Gerados</p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100/50">
              <p className="text-2xl font-bold text-indigo-600">{contentStats.total_calendar}</p>
              <p className="text-[11px] text-indigo-500 font-medium">Agendados</p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100/50">
              <p className="text-2xl font-bold text-emerald-600">{contentStats.published}</p>
              <p className="text-[11px] text-emerald-500 font-medium">Publicados</p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100/50">
              <p className="text-2xl font-bold text-amber-600">{contentStats.projects_with_scripts}</p>
              <p className="text-[11px] text-amber-500 font-medium">Projetos c/ Roteiro</p>
            </div>
          </div>
        </div>
      )}

      {/* Row: Categories + SaaS Score */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card title="Categorias">
          {categories && categories.length > 0 ? (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="w-full sm:w-1/2 h-48 sm:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categories} dataKey="count" nameKey="category" cx="50%" cy="50%"
                      outerRadius="75%" innerRadius="45%" label={({ value }) => `${value}`}
                      labelLine={false} fontSize={10} strokeWidth={2} stroke="#f8f9fc">
                      {categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full sm:w-1/2 flex flex-wrap sm:flex-col gap-1.5 sm:justify-center">
                {categories.map((c, i) => (
                  <div key={c.category} className="flex items-center gap-2 text-[11px]">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-text-secondary truncate">{c.category}</span>
                    <span className="font-semibold ml-auto">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-sm text-text-muted">Nenhuma categoria</p>}
        </Card>

        <Card title="Score SaaS">
          {saas && saas.length > 0 ? (
            <div className="h-48 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={saas}>
                  <XAxis dataKey="score" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} width={28} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 2, 2]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-text-muted">Sem dados</p>}
        </Card>
      </div>

      {/* Row: Top Projects + Tech Stack */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
        {/* Top Projects - wider */}
        <Card title="Top Projetos" className="lg:col-span-3">
          {topProjects && topProjects.length > 0 ? (
            <div className="space-y-2">
              {topProjects.map((p, i) => {
                const scoreColor = (p.saas_readiness_score || 0) >= 8 ? 'text-emerald-600' :
                  (p.saas_readiness_score || 0) >= 6 ? 'text-amber-500' : 'text-gray-400'
                return (
                  <div key={p.id} onClick={() => navigate(`/projetos/${p.id}`)}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-hover cursor-pointer transition-colors group">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {p.project_name || p.folder_name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="primary">{p.category}</Badge>
                        {p.monetization_potential === 'high' && <Badge variant="success">high</Badge>}
                        {p.deployment_status === 'deployed' && (
                          <span className="text-[10px] text-emerald-500 flex items-center gap-0.5"><Rocket size={9} /> live</span>
                        )}
                      </div>
                    </div>
                    <div className={`text-xl font-bold ${scoreColor} shrink-0`}>{p.saas_readiness_score}</div>
                  </div>
                )
              })}
            </div>
          ) : <p className="text-sm text-text-muted">Sem projetos analisados</p>}
        </Card>

        {/* Tech Stack */}
        <Card title="Tecnologias Mais Usadas" className="lg:col-span-2">
          {techStack && techStack.length > 0 ? (
            <div className="space-y-2">
              {techStack.slice(0, 12).map((t, i) => {
                const max = techStack[0]?.count || 1
                const pct = Math.round((t.count / max) * 100)
                return (
                  <div key={t.tech} className="flex items-center gap-2">
                    <span className="text-[11px] w-20 truncate font-medium text-text-secondary">{t.tech}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                    <span className="text-[10px] text-text-muted w-5 text-right font-mono">{t.count}</span>
                  </div>
                )
              })}
            </div>
          ) : <p className="text-sm text-text-muted">Sem dados</p>}
        </Card>
      </div>

      {/* Row: Languages + Monetization + Deployment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card title="Linguagens">
          {langs && langs.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={langs.slice(0, 8)} layout="vertical">
                  <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="language" fontSize={10} width={70} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="projects_count" fill="#10b981" radius={[2, 6, 6, 2]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-text-muted">Sem dados</p>}
        </Card>

        <Card title="Monetizacao">
          {monetization && monetization.length > 0 ? (
            <div className="space-y-4 pt-1">
              {monetization.map(m => {
                const total = monetization.reduce((s, x) => s + x.count, 0)
                const pct = Math.round((m.count / total) * 100)
                return (
                  <div key={m.level}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-medium flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: moneyColors[m.level] }} />
                        {moneyLabels[m.level] || m.level}
                      </span>
                      <span className="text-text-muted font-mono">{m.count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: moneyColors[m.level] }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : <p className="text-sm text-text-muted">Sem dados</p>}
        </Card>

        <Card title="Status de Deploy">
          {deployment && deployment.length > 0 ? (
            <div className="space-y-3 pt-1">
              {deployment.map(d => {
                const total = deployment.reduce((s, x) => s + x.count, 0)
                const pct = Math.round((d.count / total) * 100)
                const labels: Record<string, string> = { deployed: 'Deployed', 'in-progress': 'Em progresso', 'local-only': 'Local', abandoned: 'Abandonado' }
                return (
                  <div key={d.status} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: deployColors[d.status] || '#94a3b8' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{labels[d.status] || d.status}</span>
                        <span className="text-text-muted">{d.count}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: deployColors[d.status] || '#94a3b8' }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : <p className="text-sm text-text-muted">Sem dados</p>}
        </Card>
      </div>

      {/* Row: Recent Activity */}
      <Card title="Atividade Recente">
        {recentActivity && recentActivity.length > 0 ? (
          <div className="space-y-1.5">
            {recentActivity.map((a, i) => {
              const Icon = activityIcons[a.run_type] || Zap
              const typeLabels: Record<string, string> = { scan: 'Scan', analyze: 'Analise', generate: 'Roteiro', llm_sync: 'Sync' }
              return (
                <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-hover transition-colors">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    a.status === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'
                  }`}>
                    <Icon size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium">{typeLabels[a.run_type] || a.run_type}</span>
                      {a.folder_name && <span className="text-[11px] text-text-muted truncate">{a.folder_name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {a.duration_ms && (
                      <span className="text-[10px] text-text-muted flex items-center gap-0.5">
                        <Clock size={9} /> {(a.duration_ms / 1000).toFixed(1)}s
                      </span>
                    )}
                    <span className="text-[10px] text-text-muted">{new Date(a.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    {a.status === 'success'
                      ? <CheckCircle size={12} className="text-emerald-400" />
                      : <XCircle size={12} className="text-red-400" />
                    }
                  </div>
                </div>
              )
            })}
          </div>
        ) : <p className="text-sm text-text-muted">Nenhuma atividade</p>}
      </Card>
    </div>
  )
}
