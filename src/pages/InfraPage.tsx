import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { BillingType, InfraFormPayload, InfraItem } from '@/types'
import { dueLabel, formatCurrency, valueLabel } from '@/utils'

interface Props {
  infras: InfraItem[]
  query: string
  modalOpen: boolean
  onCloseModal: () => void
  onAdd: (payload: InfraFormPayload) => Promise<boolean>
  onUpdate: (infra: InfraItem) => Promise<boolean>
  onRemove: (infraId: number) => Promise<boolean>
}

const billingOptions: { value: BillingType; hint: string }[] = [
  { value: 'Mensal', hint: 'Assinatura recorrente com dia de vencimento' },
  { value: 'Grátis', hint: 'Plano gratuito, sem cobrança' },
  { value: 'Esporádico', hint: 'Crédito pré-pago ou pagamento único' },
]

export default function InfraPage({ infras, query, modalOpen, onCloseModal, onAdd, onUpdate, onRemove }: Props) {
  const [form, setForm] = useState({ platform: '', usage: '', payer: '', billingType: 'Mensal' as BillingType, dueDay: '', value: '', paidDate: '' })
  const [editing, setEditing] = useState<InfraItem | null>(null)

  useEffect(() => {
    if (modalOpen) setEditing(null)
  }, [modalOpen])

  const close = () => {
    setEditing(null)
    onCloseModal()
  }

  function startEdit(infra: InfraItem) {
    setEditing(infra)
    setForm({
      platform: infra.platform,
      usage: infra.usage,
      payer: infra.payer,
      billingType: infra.billingType,
      dueDay: infra.dueDay === null ? '' : String(infra.dueDay),
      value: infra.billingType === 'Grátis' ? '' : String(infra.value),
      paidDate: infra.paidDate ?? '',
    })
  }

  const filteredInfras = useMemo(() => {
    const q = query.toLowerCase()
    if (!q) return infras
    return infras.filter((infra) => `${infra.platform} ${infra.usage} ${infra.payer}`.toLowerCase().includes(q))
  }, [infras, query])

  const totalMonthly = useMemo(
    () => infras.filter((infra) => infra.billingType === 'Mensal').reduce((total, infra) => total + infra.value, 0),
    [infras],
  )

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form.platform.trim() || !form.usage.trim()) return
    const payload: InfraFormPayload = {
      platform: form.platform.trim(),
      usage: form.usage.trim(),
      payer: form.payer.trim(),
      billingType: form.billingType,
      dueDay: form.billingType === 'Mensal' ? Math.min(31, Math.max(1, Number(form.dueDay) || 1)) : null,
      value: form.billingType === 'Grátis' ? 0 : Number(form.value) || 0,
      paidDate: form.billingType === 'Esporádico' && form.paidDate ? form.paidDate : null,
    }
    const saved = editing ? await onUpdate({ ...editing, ...payload }) : await onAdd(payload)
    if (!saved) return
    setForm({ platform: '', usage: '', payer: '', billingType: 'Mensal', dueDay: '', value: '', paidDate: '' })
    close()
  }

  const selectedHint = billingOptions.find((option) => option.value === form.billingType)?.hint

  return (
    <section className="systems-panel">
      <div className="table-head infra-cat-head">
        <span />
        <span>Plataforma</span>
        <span>Utilização</span>
        <span>Fonte Pagadora</span>
        <span>Vencimento</span>
        <span className="cell-right">Valor</span>
        <span />
        <span />
      </div>
      <div className="system-list">
        {filteredInfras.map((infra, index) => (
          <article className="infra-cat-row" key={infra.id}>
            <span className="system-index">{String(index + 1).padStart(2, '0')}</span>
            <strong>{infra.platform}</strong>
            <span>{infra.usage}</span>
            <span>{infra.payer}</span>
            <span className="mono">{dueLabel(infra)}</span>
            <span className={`mono cell-right ${infra.billingType === 'Grátis' ? 'value-free' : ''}`}>{valueLabel(infra)}</span>
            <button
              type="button"
              className="row-edit"
              aria-label={`Editar ${infra.platform}`}
              title="Editar infraestrutura"
              onClick={() => startEdit(infra)}
            >
              ✎
            </button>
            <button
              type="button"
              className="row-delete"
              aria-label={`Excluir ${infra.platform}`}
              title="Excluir infraestrutura"
              onClick={() => {
                if (window.confirm(`Excluir "${infra.platform}"?\n\nEla deixará de aparecer nos sistemas em que estiver vinculada.`)) {
                  onRemove(infra.id)
                }
              }}
            >
              ✕
            </button>
          </article>
        ))}
        {filteredInfras.length === 0 && <div className="empty">Nenhuma infraestrutura encontrada.</div>}
      </div>
      <p className="infra-total-note">
        Custo mensal de infraestrutura da empresa: <strong className="mono">{formatCurrency(totalMonthly)}</strong>
        <span className="infra-total-hint"> (somente cobranças mensais; créditos e planos grátis não entram)</span>
      </p>

      {(modalOpen || editing) && (
        <div className="modal-backdrop" onClick={close}>
          <form className="modal" onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
            <div className="modal-heading"><span>{editing ? 'Editar infraestrutura' : 'Nova infraestrutura'}</span><button type="button" onClick={close}>×</button></div>
            <label>Plataforma<input autoFocus value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value })} placeholder="Ex.: Railway, AWS, Vercel" /></label>
            <label>Utilização<input value={form.usage} onChange={(event) => setForm({ ...form, usage: event.target.value })} placeholder="Ex.: Backend / Banco de dados" /></label>
            <label>Fonte Pagadora<input value={form.payer} onChange={(event) => setForm({ ...form, payer: event.target.value })} placeholder="Banco pelo qual está pagando" /></label>
            <label>Tipo de pagamento
              <select value={form.billingType} onChange={(event) => setForm({ ...form, billingType: event.target.value as BillingType })}>
                {billingOptions.map((option) => <option key={option.value} value={option.value}>{option.value}</option>)}
              </select>
            </label>
            <p className="form-hint">{selectedHint}</p>
            {form.billingType === 'Mensal' && (
              <div className="form-grid">
                <label>Vencimento (dia)<input type="number" min={1} max={31} value={form.dueDay} onChange={(event) => setForm({ ...form, dueDay: event.target.value })} placeholder="09" /></label>
                <label>Valor/mês (R$)<input type="number" min={0} step="0.01" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} placeholder="0" /></label>
              </div>
            )}
            {form.billingType === 'Esporádico' && (
              <>
                <div className="form-grid">
                  <label>Valor do crédito/pagamento (R$)<input type="number" min={0.01} step="0.01" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} placeholder="Ex.: 100 de crédito" /></label>
                  <label>Data do pagamento<input type="date" value={form.paidDate} onChange={(event) => setForm({ ...form, paidDate: event.target.value })} /></label>
                </div>
                <p className="form-hint">A data do pagamento é opcional — guarde quando o crédito foi comprado para o futuro financeiro.</p>
              </>
            )}
            <button className="primary-button submit" type="submit">{editing ? 'Salvar alterações' : 'Salvar infraestrutura'}</button>
          </form>
        </div>
      )}
    </section>
  )
}
