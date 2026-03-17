import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import Card from '../components/ui/Card'
import Spinner from '../components/ui/Spinner'
import { Shield, Plus, Trash2, Mail, Check } from 'lucide-react'

export default function Admin() {
  const queryClient = useQueryClient()
  const [newEmail, setNewEmail] = useState('')

  const { data, isLoading } = useQuery<{ emails: string[] }>({
    queryKey: ['allowed-emails'],
    queryFn: () => api.get('/admin/allowed-emails').then(r => r.data),
  })

  const addMutation = useMutation({
    mutationFn: (email: string) => api.post('/admin/allowed-emails/add', { email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allowed-emails'] })
      setNewEmail('')
    },
  })

  const removeMutation = useMutation({
    mutationFn: (email: string) => api.post('/admin/allowed-emails/remove', { email }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allowed-emails'] }),
  })

  if (isLoading) return <Spinner />

  const emails = data?.emails || []

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          <Shield size={15} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Admin</h2>
          <p className="text-sm text-text-muted">Gerenciar acesso a plataforma</p>
        </div>
      </div>

      <Card title="Emails Autorizados">
        <p className="text-xs text-text-muted mb-4">
          Apenas estes emails podem acessar a plataforma via Google OAuth.
          Se a lista estiver vazia, qualquer conta Google pode entrar.
        </p>

        {/* Add email */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="email"
              placeholder="email@exemplo.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newEmail) addMutation.mutate(newEmail) }}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-border rounded-xl bg-surface focus:outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={() => newEmail && addMutation.mutate(newEmail)}
            disabled={!newEmail || addMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl text-white disabled:opacity-50 transition-all hover:shadow-md"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <Plus size={14} /> Adicionar
          </button>
        </div>

        {/* Email list */}
        {emails.length === 0 ? (
          <div className="py-8 text-center">
            <Mail size={24} className="mx-auto text-text-muted mb-2 opacity-40" />
            <p className="text-sm text-text-muted">Nenhum email cadastrado</p>
            <p className="text-xs text-text-muted mt-1">Qualquer conta Google pode acessar</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {emails.map(email => (
              <div key={email} className="flex items-center justify-between p-3 rounded-xl bg-surface-hover/50 border border-border/40 group">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <Check size={13} className="text-emerald-500" />
                  </div>
                  <span className="text-sm font-medium truncate">{email}</span>
                </div>
                <button
                  onClick={() => removeMutation.mutate(email)}
                  className="p-1.5 rounded-lg text-text-muted opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {addMutation.isSuccess && (
          <p className="text-xs text-emerald-600 mt-3 flex items-center gap-1"><Check size={12} /> Email adicionado</p>
        )}
      </Card>
    </div>
  )
}
