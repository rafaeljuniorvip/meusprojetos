import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

interface AuthState {
  authenticated: boolean
  user: { email: string; name: string; picture: string } | null
  auth_required: boolean
}

export function useAuth() {
  return useQuery<AuthState>({
    queryKey: ['auth'],
    queryFn: () => axios.get('/auth/me').then(r => r.data),
    staleTime: 60000,
    retry: false,
  })
}
