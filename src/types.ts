export type SystemStatus = 'Lançado' | 'Em dev' | 'Desativado' | 'Prancheta'

export interface SystemItem {
  id: number
  name: string
  description: string
  status: SystemStatus
}

export interface SystemFormPayload extends Omit<SystemItem, 'id'> {
  id?: number
  infraIds: number[]
  clientIds: number[]
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
