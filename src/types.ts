export type SystemStatus = 'Lançado' | 'Em dev' | 'Desativado' | 'Prancheta'

export interface SystemItem {
  id: number
  name: string
  description: string
  status: SystemStatus
  infraIds: number[]
}

export interface SystemFormPayload extends Omit<SystemItem, 'id'> {
  id?: number
  clientIds: number[]
}

export type BillingType = 'Mensal' | 'Grátis' | 'Esporádico'

export interface InfraItem {
  id: number
  platform: string
  usage: string
  billingType: BillingType
  dueDay: number | null
  payer: string
  value: number
  paidDate: string | null
}

export type InfraFormPayload = Omit<InfraItem, 'id'>

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
