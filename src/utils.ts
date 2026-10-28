import type { InfraItem, SystemStatus } from '@/types'

export function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function statusClass(status: SystemStatus) {
  if (status === 'Em dev') return 'dev'
  if (status === 'Desativado') return 'off'
  if (status === 'Prancheta') return 'plan'
  return 'on'
}

export function dueLabel(infra: Pick<InfraItem, 'billingType' | 'dueDay' | 'paidDate'>) {
  if (infra.billingType === 'Grátis') return '—'
  if (infra.billingType === 'Esporádico') {
    if (!infra.paidDate) return 'avulso'
    const [year, month, day] = infra.paidDate.split('-')
    return `pago em ${day}/${month}/${year}`
  }
  return `dia ${String(infra.dueDay ?? 1).padStart(2, '0')}`
}

export function valueLabel(infra: Pick<InfraItem, 'billingType' | 'value'>) {
  if (infra.billingType === 'Grátis') return 'Grátis'
  return formatCurrency(infra.value)
}
