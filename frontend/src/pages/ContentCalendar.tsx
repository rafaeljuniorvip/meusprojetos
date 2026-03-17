import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import Spinner from '../components/ui/Spinner'
import ProviderLogo from '../components/ui/ProviderLogo'
import type { LlmModel } from '../types'
import { CalendarDays, ChevronLeft, ChevronRight, Wand2, Sparkles, Brain } from 'lucide-react'

interface CalendarEntry {
  id: number; script_id: number | null; project_id: number | null
  scheduled_date: string; status: string; notes: string | null
  folder_name: string | null; project_name: string | null
  script_title: string | null; script_type: string | null
}

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-gray-400', recorded: 'bg-yellow-500', edited: 'bg-blue-500', published: 'bg-green-500',
}
const STATUS_LABELS: Record<string, string> = {
  planned: 'Planejado', recorded: 'Gravado', edited: 'Editado', published: 'Publicado',
}

export default function ContentCalendar() {
  const queryClient = useQueryClient()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [selectedModel, setSelectedModel] = useState('')
  const [target, setTarget] = useState(300)
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [aiResult, setAiResult] = useState<any>(null)

  const monthStr = `${year}-${String(month).padStart(2, '0')}`
  const monthName = new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const { data, isLoading } = useQuery({
    queryKey: ['calendar', monthStr],
    queryFn: () => api.get(`/calendar?month=${monthStr}`).then(r => r.data),
  })

  const { data: stats } = useQuery({
    queryKey: ['calendar-stats', monthStr],
    queryFn: () => api.get(`/calendar/stats?month=${monthStr}`).then(r => r.data),
  })

  const { data: favModels } = useQuery<LlmModel[]>({
    queryKey: ['fav-models-calendar'],
    queryFn: () => api.get('/llm-models', { params: { favorite_only: true, per_page: 50 } }).then(r => r.data.data),
  })

  const { data: currentModel } = useQuery({
    queryKey: ['current-model'],
    queryFn: () => api.get('/llm-models/current').then(r => r.data),
  })

  const aiPlanMutation = useMutation({
    mutationFn: () => api.post('/calendar/ai-plan', {
      month: monthStr,
      target,
      model: selectedModel || undefined,
    }),
    onSuccess: () => {
      // Poll for result
      const poll = setInterval(async () => {
        try {
          const res = await api.get('/calendar/ai-plan/status')
          if (res.data.status !== 'generating') {
            clearInterval(poll)
            setAiResult(res.data)
            queryClient.invalidateQueries({ queryKey: ['calendar'] })
            queryClient.invalidateQueries({ queryKey: ['calendar-stats'] })
          }
        } catch { clearInterval(poll) }
      }, 3000)
    },
  })

  const autoScheduleMutation = useMutation({
    mutationFn: () => api.post(`/calendar/auto-schedule?month=${monthStr}&target=${target}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-stats'] })
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api.put(`/calendar/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-stats'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/calendar/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-stats'] })
    },
  })

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1); setSelectedDay(null); setAiResult(null) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1); setSelectedDay(null); setAiResult(null) }

  const entries: CalendarEntry[] = data?.entries || []
  const daysInMonth = data?.days_in_month || 30
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()

  const entriesByDay: Record<number, CalendarEntry[]> = {}
  entries.forEach(e => {
    const day = parseInt(e.scheduled_date.split('-')[2])
    if (!entriesByDay[day]) entriesByDay[day] = []
    entriesByDay[day].push(e)
  })

  const dayEntries = selectedDay ? (entriesByDay[selectedDay] || []) : []

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays size={20} className="text-primary" />
          <h2 className="text-lg font-semibold">Calendario de Conteudo</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAIPanel(!showAIPanel)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-colors ${
              showAIPanel ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 border border-purple-200'}`}>
            <Brain size={14} />
            Planejar com I.A.
          </button>
        </div>
      </div>

      {/* AI Planning Panel */}
      {showAIPanel && (
        <Card title="Planejamento Inteligente com I.A." className="mb-4">
          <div className="space-y-3">
            <p className="text-xs text-text-secondary">
              A I.A. vai analisar todos os seus projetos e criar um calendario estrategico,
              decidindo quais projetos merecem mais Reels, variando tipos de roteiro e criando temas semanais.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Modelo LLM</label>
                <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface">
                  <option value="">Padrao ({currentModel?.model?.model_name || '...'})</option>
                  {(favModels || []).map(m => (
                    <option key={m.model_id} value={m.model_id}>
                      {m.model_name} - In: ${m.pricing_prompt?.toFixed(2)} / Out: ${m.pricing_completion?.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Meta de Reels no mes</label>
                <input type="number" value={target} onChange={e => setTarget(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface" />
              </div>
              <div className="flex items-end gap-2">
                <button onClick={() => aiPlanMutation.mutate()}
                  disabled={aiPlanMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                  <Sparkles size={14} className={aiPlanMutation.isPending ? 'animate-spin' : ''} />
                  {aiPlanMutation.isPending ? 'Planejando...' : 'Gerar com I.A.'}
                </button>
                <button onClick={() => autoScheduleMutation.mutate()}
                  disabled={autoScheduleMutation.isPending}
                  className="px-3 py-2 text-sm border border-border rounded-lg bg-surface text-text-secondary hover:bg-gray-50 disabled:opacity-50"
                  title="Distribuicao simples sem IA">
                  <Wand2 size={14} />
                </button>
              </div>
            </div>

            {/* AI Result - Strategy */}
            {aiResult && aiResult.status === 'ok' && (
              <div className="mt-3 space-y-3">
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs font-medium text-purple-700 mb-1">Estrategia do Mes ({aiResult.model})</p>
                  <p className="text-sm text-text-primary">{aiResult.strategy}</p>
                  <p className="text-[11px] text-text-secondary mt-2">
                    {aiResult.created} Reels agendados | {aiResult.input_tokens + aiResult.output_tokens} tokens
                  </p>
                </div>
                {aiResult.weekly_themes && aiResult.weekly_themes.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {aiResult.weekly_themes.map((t: any) => (
                      <div key={t.week} className="p-2 bg-surface border border-border rounded-lg">
                        <p className="text-[11px] text-text-secondary">Semana {t.week}</p>
                        <p className="text-xs font-medium">{t.theme}</p>
                        <p className="text-[11px] text-text-secondary">{t.focus}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {aiResult && aiResult.status === 'error' && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{aiResult.error}</div>
            )}
            {aiPlanMutation.isSuccess && !aiResult && (
              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700 flex items-center gap-2">
                <Spinner /> Planejando... a I.A. esta analisando seus projetos
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
          {[
            { label: 'Total', value: stats.total, color: '' },
            { label: 'Planejado', value: stats.planned, color: 'text-gray-500' },
            { label: 'Gravado', value: stats.recorded, color: 'text-yellow-600' },
            { label: 'Editado', value: stats.edited, color: 'text-blue-600' },
            { label: 'Publicado', value: stats.published, color: 'text-green-600' },
            { label: 'Projetos', value: stats.projects_covered, color: 'text-primary' },
          ].map(s => (
            <div key={s.label} className="bg-surface border border-border rounded-lg p-2 text-center">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-text-secondary">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Month nav */}
      <div className="flex items-center justify-between bg-surface border border-border rounded-lg p-2 sm:p-3 mb-3">
        <button onClick={prevMonth} className="p-1.5 hover:bg-gray-50 rounded"><ChevronLeft size={18} /></button>
        <span className="text-sm font-medium capitalize">{monthName}</span>
        <button onClick={nextMonth} className="p-1.5 hover:bg-gray-50 rounded"><ChevronRight size={18} /></button>
      </div>

      {isLoading ? <Spinner /> : (
        <>
          {/* Calendar grid */}
          <div className="bg-surface border border-border rounded-lg overflow-hidden mb-3">
            <div className="grid grid-cols-7 border-b border-border">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(d => (
                <div key={d} className="p-1.5 text-center text-[10px] sm:text-xs font-medium text-text-secondary">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="border-b border-r border-border/50 p-1 min-h-[52px] sm:min-h-[72px] bg-gray-50/50" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const de = entriesByDay[day] || []
                const isSelected = selectedDay === day
                const isToday = day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear()
                return (
                  <div key={day} onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`border-b border-r border-border/50 p-1 min-h-[52px] sm:min-h-[72px] cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/10' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-[11px] sm:text-xs font-medium ${isToday ? 'bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center' : ''}`}>{day}</span>
                      {de.length > 0 && <span className="text-[10px] text-text-secondary">{de.length}</span>}
                    </div>
                    <div className="flex flex-wrap gap-0.5">
                      {de.slice(0, 6).map(e => (
                        <div key={e.id} className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[e.status] || 'bg-gray-300'}`} />
                      ))}
                      {de.length > 6 && <span className="text-[8px] text-text-secondary">+{de.length - 6}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Day detail */}
          {selectedDay && (
            <Card title={`${selectedDay} de ${monthName} - ${dayEntries.length} Reels`}>
              {dayEntries.length === 0 ? (
                <p className="text-sm text-text-secondary">Nenhum Reel agendado para este dia</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-auto">
                  {dayEntries.map(e => (
                    <div key={e.id} className="flex items-start justify-between gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium truncate">{e.project_name || e.folder_name || 'Sem projeto'}</p>
                        {e.notes && <p className="text-[11px] text-text-secondary mt-0.5">{e.notes}</p>}
                        {e.script_title && <p className="text-[11px] text-primary mt-0.5">{e.script_title}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <select value={e.status}
                          onChange={ev => updateStatusMutation.mutate({ id: e.id, status: ev.target.value })}
                          className="text-[11px] px-1.5 py-0.5 border border-border rounded bg-surface">
                          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        <button onClick={() => deleteMutation.mutate(e.id)} className="text-text-secondary hover:text-red-500 p-0.5 text-[11px]">x</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  )
}
