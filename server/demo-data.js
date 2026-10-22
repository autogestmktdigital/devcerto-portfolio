export const initialSystems = [
  { name: 'PAGTOX', description: 'PLATAFORMA DE PAGAMENTOS E CONCILIAÇÃO FINANCEIRA', status: 'Lançado' },
  { name: 'CRM CORE', description: 'CRM DE VENDAS E GESTÃO DE RELACIONAMENTO', status: 'Lançado' },
  { name: 'ANALYTIX', description: 'PLATAFORMA DE BI E ANALYTICS EM TEMPO REAL', status: 'Em dev' },
  { name: 'AUTHNEX', description: 'SERVIÇO DE AUTENTICAÇÃO E AUTORIZAÇÃO (IAM)', status: 'Lançado' },
  { name: 'MOBILE HUB', description: 'BACKEND PARA APPS MÓVEIS E NOTIFICAÇÕES', status: 'Em dev' },
]

export const initialInfras = [
  { systemId: 1, platform: 'RAILWAY', usage: 'BACKEND / BANCO DE DADOS', dueDay: 9, payer: 'BANCO INTER', value: 340 },
  { systemId: 1, platform: 'AWS', usage: 'HOSTING S3', dueDay: 15, payer: 'NUBANK', value: 210 },
  { systemId: 2, platform: 'VERCEL', usage: 'FRONTEND', dueDay: 5, payer: 'BANCO INTER', value: 90 },
  { systemId: 3, platform: 'RAILWAY', usage: 'BANCO DE DADOS', dueDay: 9, payer: 'CAIXA', value: 150 },
  { systemId: 4, platform: 'CLOUDFLARE', usage: 'WORKERS', dueDay: 20, payer: 'NUBANK', value: 95 },
  { systemId: 5, platform: 'FIREBASE', usage: 'PUSH NOTIFICATIONS', dueDay: 12, payer: 'CAIXA', value: 70 },
]

export const initialClients = [
  { name: 'ACME LOGÍSTICA', systemIds: [1, 2], since: 2023 },
  { name: 'SAÚDE MAIS', systemIds: [1], since: 2024 },
  { name: 'VAREJO NORTE', systemIds: [2, 4], since: 2022 },
  { name: 'EDUCARE', systemIds: [3], since: 2025 },
]
