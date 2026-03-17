import { useQuery } from '@tanstack/react-query'
import api from '../api/client'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import { ScrollText, CheckCircle, XCircle, Clock } from 'lucide-react'

interface RunLog {
  id: number; run_type: string; status: string; error_message: string | null
  duration_ms: number | null; created_at: string; folder_name: string | null
}

export default function ActivityLogs() {
  const { data: logs, isLoading } = useQuery<RunLog[]>({
    queryKey: ['logs'],
    queryFn: () => api.get('/actions/logs?limit=100').then(r => r.data),
  })

  if (isLoading) return <Spinner />

  const successCount = logs?.filter(l => l.status === 'success').length || 0
  const errorCount = logs?.filter(l => l.status === 'error').length || 0
  const total = logs?.length || 0

  const typeLabels: Record<string, string> = {
    scan: 'Scan', analyze: 'Analise', generate: 'Roteiro',
    llm_sync: 'Sync LLM',
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <ScrollText size={20} className="text-primary" />
        <h2 className="text-lg font-semibold">Atividade</h2>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
        <div className="bg-surface border border-border rounded-lg p-3 text-center">
          <p className="text-xl font-bold">{total}</p>
          <p className="text-xs text-text-secondary">Total</p>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-green-600">{successCount}</p>
          <p className="text-xs text-text-secondary">Sucesso</p>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-red-500">{errorCount}</p>
          <p className="text-xs text-text-secondary">Erros</p>
        </div>
      </div>

      {/* Log list */}
      <div className="space-y-1.5">
        {logs?.map(log => (
          <div key={log.id} className="bg-surface border border-border rounded-lg p-2.5 sm:p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {log.status === 'success'
                  ? <CheckCircle size={14} className="text-green-500 shrink-0" />
                  : <XCircle size={14} className="text-red-500 shrink-0" />
                }
                <Badge variant={log.status === 'success' ? 'success' : 'error'}>
                  {typeLabels[log.run_type] || log.run_type}
                </Badge>
                {log.folder_name && (
                  <span className="text-xs text-text-secondary truncate">{log.folder_name}</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 text-[11px] text-text-secondary">
                {log.duration_ms && (
                  <span className="flex items-center gap-0.5">
                    <Clock size={10} /> {(log.duration_ms / 1000).toFixed(1)}s
                  </span>
                )}
                <span>{new Date(log.created_at).toLocaleString('pt-BR')}</span>
              </div>
            </div>
            {log.error_message && (
              <p className="text-xs text-red-500 mt-1.5 pl-5 break-all">{log.error_message}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
