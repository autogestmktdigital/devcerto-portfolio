import type { ClientItem, CredentialItem, InfraItem, SystemItem } from '@/types'

export const initialSystems: SystemItem[] = [
  { id: 1, name: 'PAGTOX', description: 'PLATAFORMA DE PAGAMENTOS E CONCILIAÇÃO FINANCEIRA', status: 'Lançado' },
  { id: 2, name: 'CRM CORE', description: 'CRM DE VENDAS E GESTÃO DE RELACIONAMENTO', status: 'Lançado' },
  { id: 3, name: 'ANALYTIX', description: 'PLATAFORMA DE BI E ANALYTICS EM TEMPO REAL', status: 'Em dev' },
  { id: 4, name: 'AUTHNEX', description: 'SERVIÇO DE AUTENTICAÇÃO E AUTORIZAÇÃO (IAM)', status: 'Lançado' },
  { id: 5, name: 'MOBILE HUB', description: 'BACKEND PARA APPS MÓVEIS E NOTIFICAÇÕES', status: 'Em dev' },
]

export const initialInfras: InfraItem[] = [
  { id: 1, systemId: 1, platform: 'RAILWAY', usage: 'BACKEND / BANCO DE DADOS', billingType: 'Mensal', dueDay: 9, payer: 'BANCO INTER', value: 340, paidDate: null },
  { id: 2, systemId: 1, platform: 'AWS', usage: 'HOSTING S3', billingType: 'Mensal', dueDay: 15, payer: 'NUBANK', value: 210, paidDate: null },
  { id: 3, systemId: 2, platform: 'VERCEL', usage: 'FRONTEND', billingType: 'Grátis', dueDay: null, payer: 'BANCO INTER', value: 0, paidDate: null },
  { id: 4, systemId: 3, platform: 'RAILWAY', usage: 'BANCO DE DADOS', billingType: 'Mensal', dueDay: 9, payer: 'CAIXA', value: 150, paidDate: null },
  { id: 5, systemId: 4, platform: 'CLOUDFLARE', usage: 'WORKERS', billingType: 'Mensal', dueDay: 20, payer: 'NUBANK', value: 95, paidDate: null },
  { id: 6, systemId: 5, platform: 'FIREBASE', usage: 'PUSH NOTIFICATIONS', billingType: 'Esporádico', dueDay: null, payer: 'NUBANK', value: 120, paidDate: '2025-11-05' },
]

export const initialClients: ClientItem[] = [
  { id: 1, name: 'ACME LOGÍSTICA', systemIds: [1, 2], since: 2023 },
  { id: 2, name: 'SAÚDE MAIS', systemIds: [1], since: 2024 },
  { id: 3, name: 'VAREJO NORTE', systemIds: [2, 4], since: 2022 },
  { id: 4, name: 'EDUCARE', systemIds: [3], since: 2025 },
]

export const initialCredentials: CredentialItem[] = []
