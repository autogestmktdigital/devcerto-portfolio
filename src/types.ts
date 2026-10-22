export type SystemStatus = 'Lançado' | 'Em dev' | 'Desativado'

export interface SystemItem {
  id: number
  name: string
  description: string
  status: SystemStatus
}

export interface InfraItem {
  id: number
  systemId: number
  platform: string
  usage: string
  dueDay: number
  payer: string
  value: number
}

export interface ClientItem {
  id: number
  name: string
  systemIds: number[]
  since: number
}

export interface CredentialItem {
  id: number
  platform: string
  login: string
  password: string
}
