import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { InfraItem, SystemItem } from '@/types'
import { formatCurrency } from '@/utils'

interface Props {
  systems: SystemItem[]
  infras: InfraItem[]
  query: string
  modalOpen: boolean
  onCloseModal: () => void
  onAdd: (infra: Omit<InfraItem, 'id'>) => Promise<boolean>
  onUpdate: (infra: InfraItem) => Promise<boolean>
  onRemove: (infraId: number) => Promise<boolean>
}

export default function InfraPage({ systems, infras, query, modalOpen, onCloseModal, onAdd, onUpdate, onRemove }: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(systems[0]?.id ?? null)
  const [form, setForm] = useState({ systemId: '', platform: '', usage: '', dueDay: '', payer: '', value: '' })
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
      systemId: String(infra.systemId),
      platform: infra.platform,
      usage: infra.usage,
      dueDay: String(infra.dueDay),
      payer: infra.payer,
      value: String(infra.value),
    })
  }

  const q = query.toLowerCase()
  const matchesQuery = (infra: InfraItem) => !q || `${infra.platform} ${infra.usage} ${infra.payer}`.toLowerCase().includes(q)

  const visibleSystems = useMemo(() => {
    if (!q) return systems
    return systems.filter(
      (system) =>
        system.name.toLowerCase().includes(q) ||
        infras.some((infra) => infra.systemId === system.id && `${infra.platform} ${infra.usage} ${infra.payer}`.toLowerCase().includes(q)),
    )
  }, [systems, infras, q])

  const totalsBySystem = useMemo(() => {
    const totals = new Map<number, number>()
    for (const infra of infras) {
      totals.set(infra.systemId, (totals.get(infra.systemId) ?? 0) + infra.value)
    }
    return totals
  }, [infras])

  const systemName = (id: number) => systems.find((system) => system.id === id)?.name ?? ''

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const systemId = Number(form.systemId)
    if (!systemId || !form.platform.trim() || !form.usage.trim()) return
    const payload = {
      systemId,
      platform: form.platform.trim(),
      usage: form.usage.trim(),
      dueDay: Math.min(31, Math.max(1, Number(form.dueDay) || 1)),
      payer: form.payer.trim(),
      value: Number(form.value) || 0,
    }
    const saved = editing ? await onUpdate({ ...editing, ...payload }) : await onAdd(payload)
    if (!saved) return
    setForm({ systemId: '', platform: '', usage: '', dueDay: '', payer: '', value: '' })
    close()
  }

  return (
    <section className="systems-panel">
      <div className="table-head infra-master-head">
        <span />
        <span>Sistema</span>
        <span className="cell-right">Total infra/mês</span>
      </div>
      <div className="system-list">
        {visibleSystems.map((system, index) => {
          const entries = infras.filter((infra) => infra.systemId === system.id && matchesQuery(infra))
          const expanded = expandedId === system.id
          return (
            <div key={system.id} className={`infra-system ${expanded ? 'expanded' : ''}`}>
              <button type="button" className="infra-master" onClick={() => setExpandedId(expanded ? null : system.id)}>
                <span className="system-index">{String(index + 1).padStart(2, '0')}</span>
                <strong>{system.name}</strong>
                <span className="chevron">▸</span>
                <span className="infra-value">{formatCurrency(totalsBySystem.get(system.id) ?? 0)}</span>
              </button>
              {expanded && (
                <div className="infra-detail">
                  <div className="infra-subhead">
                    <span>Plataforma</span><span>Utilização</span><span>Vencimento</span><span>Pagador</span><span className="cell-right">Valor/mês</span>
                  </div>
                  {entries.map((entry) => (
                    <div className="infra-subrow" key={entry.id}>
                      <strong>{entry.platform}</strong>
                      <span>{entry.usage}</span>
                      <span className="mono">dia {String(entry.dueDay).padStart(2, '0')}</span>
                      <span>{entry.payer}</span>
                      <span className="mono cell-right">{formatCurrency(entry.value)}</span>
                      <button
                        type="button"
                        className="row-edit"
                        aria-label={`Editar ${entry.platform}`}
                        title="Editar infraestrutura"
                        onClick={() => startEdit(entry)}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="row-delete"
                        aria-label={`Excluir ${entry.platform}`}
                        title="Excluir infraestrutura"
                        onClick={() => {
                          if (window.confirm(`Excluir "${entry.platform}" (${systemName(entry.systemId)})?`)) {
                            onRemove(entry.id)
                          }
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {entries.length === 0 && <div className="empty small">Nenhuma infraestrutura cadastrada para este sistema.</div>}
                </div>
              )}
            </div>
          )
        })}
        {visibleSystems.length === 0 && <div className="empty">Nenhuma infraestrutura encontrada.</div>}
      </div>

      {(modalOpen || editing) && (
        <div className="modal-backdrop" onClick={close}>
          <form className="modal" onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
            <div className="modal-heading"><span>{editing ? 'Editar infraestrutura' : 'Nova infraestrutura'}</span><button type="button" onClick={close}>×</button></div>
            <label>Sistema
              <select autoFocus value={form.systemId} onChange={(event) => setForm({ ...form, systemId: event.target.value })}>
                <option value="">Selecione o sistema</option>
                {systems.map((system) => <option key={system.id} value={system.id}>{system.name}</option>)}
              </select>
            </label>
            <label>Plataforma<input value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value })} placeholder="Ex.: Railway, AWS, Vercel" /></label>
            <label>Utilização<input value={form.usage} onChange={(event) => setForm({ ...form, usage: event.target.value })} placeholder="Ex.: Backend / Banco de dados" /></label>
            <div className="form-grid">
              <label>Vencimento (dia)<input type="number" min={1} max={31} value={form.dueDay} onChange={(event) => setForm({ ...form, dueDay: event.target.value })} placeholder="09" /></label>
              <label>Valor/mês (R$)<input type="number" min={0} step="0.01" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} placeholder="0" /></label>
            </div>
            <label>Pagador (banco)<input value={form.payer} onChange={(event) => setForm({ ...form, payer: event.target.value })} placeholder="Ex.: Banco Inter" /></label>
            <button className="primary-button submit" type="submit">{editing ? 'Salvar alterações' : 'Salvar infraestrutura'}</button>
          </form>
        </div>
      )}
    </section>
  )
}
