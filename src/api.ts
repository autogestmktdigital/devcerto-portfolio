import type { ClientItem, CredentialItem, InfraItem, SystemItem } from '@/types'

export interface AppData {
  systems: SystemItem[]
  infras: InfraItem[]
  clients: ClientItem[]
  credentials: CredentialItem[]
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''
  const response = await fetch(`${baseUrl}/api${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(payload.error ?? `Erro na API (${response.status})`)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const api = {
  session: () => request<{ authenticated: boolean }>('/session'),
  login: (password: string) => request<{ authenticated: boolean }>('/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => request<void>('/logout', { method: 'POST' }),
  data: () => request<AppData>('/data'),
  create: <T>(collection: string, data: unknown) => request<T>(`/${collection}`, { method: 'POST', body: JSON.stringify(data) }),
  update: <T>(collection: string, id: number, data: unknown) => request<T>(`/${collection}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (collection: string, id: number) => request<void>(`/${collection}/${id}`, { method: 'DELETE' }),
}
