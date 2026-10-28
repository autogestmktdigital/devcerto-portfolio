import type { SystemStatus } from '@/types'

export function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function statusClass(status: SystemStatus) {
  if (status === 'Em dev') return 'dev'
  if (status === 'Desativado') return 'off'
  if (status === 'Prancheta') return 'plan'
  return 'on'
}
