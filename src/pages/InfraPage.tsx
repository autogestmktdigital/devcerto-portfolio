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

  const totalInfra = [...totalsBySystem.values()].reduce((total, value) => total + value, 0)
  const sortedTotals = [...totalsBySystem.entries()].filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1])
  const maxTotal = Math.max(1, ...sortedTotals.map(([, value]) => value))

  const systemName = (id: number) => systems.find((system) => system.id === id)?.name ?? ''

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const systemId = Number(form.systemId)
    if (!systemId || !form.platform.trim() || !form.usage.trim()) return
    const payload = {
      systemId,
      platform: form.platform.toUpperCase(),
      usage: form.usage.toUpperCase(),
      dueDay: Math.min(31, Math.max(1, Number(form.dueDay) || 1)),
      payer: form.payer.toUpperCase(),
      value: Number(form.value) || 0,
    }
    const saved = editing ? await onUpdate({ ...editing, ...payload }) : await onAdd(payload)
    if (!saved) return
    setForm({ systemId: '', platform: '', usage: '', dueDay: '', payer: '', value: '' })
    close()
  }

  return (
    <>
      <section className="systems-panel">
        <div className="table-head infra-master-head">
          <span />
          <span>SISTEMA <b>▼</b></span>
          <span className="cell-right">TOTAL INFRA/MÊS <b>▼</b></span>
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
                      <span>PLATAFORMA</span><span>UTILIZAÇÃO</span><span>VENCIMENTO</span><span>PAGADOR</span><span className="cell-right">VALOR/MÊS</span>
                    </div>
                    {entries.map((entry) => (
                      <div className="infra-subrow" key={entry.id}>
                        <strong>{entry.platform}</strong>
                        <span>{entry.usage}</span>
                        <span className="mono">DIA {String(entry.dueDay).padStart(2, '0')}</span>
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
                            if (window.confirm(`EXCLUIR ${entry.platform} (${systemName(entry.systemId)})?`)) {
                              onRemove(entry.id)
                            }
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {entries.length === 0 && <div className="empty small">NENHUMA INFRAESTRUTURA CADASTRADA PARA ESTE SISTEMA</div>}
                  </div>
                )}
              </div>
            )
          })}
          {visibleSystems.length === 0 && <div className="empty">NENHUMA INFRAESTRUTURA ENCONTRADA</div>}
        </div>
      </section>

      <aside className="telemetry">
        <h2>TELEMETRIA DE INFRAESTRUTURA</h2>
        <div className="telemetry-block">
          <span className="metric-label">GASTO TOTAL INFRA/MÊS</span>
          <strong className="total">{formatCurrency(totalInfra)}</strong>
          <span className="metric-sub">{infras.length} INFRAESTRUTURAS CADASTRADAS</span>
        </div>
        <div className="telemetry-block chart-block">
          <span className="metric-label">GASTO POR SISTEMA (R$/MÊS)</span>
          <div className="hbar-list">
            {sortedTotals.map(([id, value]) => (
              <div key={id}>
                <div className="hbar-top"><span>{systemName(id)}</span><span className="mono">{value.toLocaleString('pt-BR')}</span></div>
                <div className="hbar-track"><div className="hbar-fill" style={{ width: `${(value / maxTotal) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {(modalOpen || editing) && (
        <div className="modal-backdrop" onClick={close}>
          <form className="modal" onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
            <div className="modal-heading"><span>{editing ? 'EDITAR INFRA' : 'NOVA INFRA'}</span><button type="button" onClick={close}>×</button></div>
            <label>SISTEMA
              <select autoFocus value={form.systemId} onChange={(event) => setForm({ ...form, systemId: event.target.value })}>
                <option value="">Selecione o sistema</option>
                {systems.map((system) => <option key={system.id} value={system.id}>{system.name}</option>)}
              </select>
            </label>
            <label>PLATAFORMA<input value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value })} placeholder="Ex.: RAILWAY, AWS, VERCEL" /></label>
            <label>UTILIZAÇÃO<input value={form.usage} onChange={(event) => setForm({ ...form, usage: event.target.value })} placeholder="Ex.: BACKEND / BANCO DE DADOS" /></label>
            <div className="form-grid">
              <label>VENCIMENTO (DIA)<input type="number" min={1} max={31} value={form.dueDay} onChange={(event) => setForm({ ...form, dueDay: event.target.value })} placeholder="09" /></label>
              <label>VALOR/MÊS (R$)<input type="number" min={0} step="0.01" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} placeholder="0" /></label>
            </div>
            <label>PAGADOR (BANCO)<input value={form.payer} onChange={(event) => setForm({ ...form, payer: event.target.value })} placeholder="Ex.: BANCO INTER" /></label>
            <button className="primary-button submit" type="submit">{editing ? 'SALVAR ALTERAÇÕES ↗' : 'SALVAR INFRA ↗'}</button>
          </form>
        </div>
      )}
    </>
  )
}
