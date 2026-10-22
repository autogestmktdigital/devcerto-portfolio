import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { InfraItem, SystemItem, SystemStatus } from '@/types'
import { formatCurrency } from '@/utils'

interface Props {
  systems: SystemItem[]
  infras: InfraItem[]
  query: string
  modalOpen: boolean
  onCloseModal: () => void
  onAdd: (system: Omit<SystemItem, 'id'>) => Promise<boolean>
  onUpdate: (system: SystemItem) => Promise<boolean>
  onRemove: (systemId: number) => Promise<boolean>
}

export default function SistemasPage({ systems, infras, query, modalOpen, onCloseModal, onAdd, onUpdate, onRemove }: Props) {
  const [form, setForm] = useState({ name: '', description: '', status: 'Em dev' as SystemStatus })
  const [editing, setEditing] = useState<SystemItem | null>(null)

  useEffect(() => {
    if (modalOpen) setEditing(null)
  }, [modalOpen])

  const close = () => {
    setEditing(null)
    onCloseModal()
  }

  function startEdit(system: SystemItem) {
    setEditing(system)
    setForm({ name: system.name, description: system.description, status: system.status })
  }

  const filteredSystems = useMemo(() => {
    const q = query.toLowerCase()
    return systems.filter((system) => `${system.name} ${system.description}`.toLowerCase().includes(q))
  }, [systems, query])

  const infraBySystem = useMemo(() => {
    const totals = new Map<number, number>()
    for (const infra of infras) {
      totals.set(infra.systemId, (totals.get(infra.systemId) ?? 0) + infra.value)
    }
    return totals
  }, [infras])

  const totalInfra = [...infraBySystem.values()].reduce((total, value) => total + value, 0)
  const maxInfra = Math.max(1, ...infraBySystem.values())

  const topSystemId = useMemo(() => {
    let best: number | null = null
    let bestValue = -1
    for (const [id, value] of infraBySystem) {
      if (value > bestValue) {
        best = id
        bestValue = value
      }
    }
    return best
  }, [infraBySystem])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form.name.trim() || !form.description.trim()) return
    const payload = { name: form.name.toUpperCase(), description: form.description.toUpperCase(), status: form.status }
    const saved = editing ? await onUpdate({ ...editing, ...payload }) : await onAdd(payload)
    if (!saved) return
    setForm({ name: '', description: '', status: 'Em dev' })
    close()
  }

  return (
    <>
      <section className="systems-panel">
        <div className="table-head">
          <span />
          <span>SISTEMA <b>▼</b></span><span>DESCRIÇÃO <b>▼</b></span><span>STATUS <b>▼</b></span><span>INFRA/MÊS <b>▼</b></span><span />
        </div>
        <div className="system-list">
          {filteredSystems.map((system, index) => (
            <article className="system-row" key={system.id}>
              <span className="system-index">{String(index + 1).padStart(2, '0')}</span>
              <strong>{system.name}</strong>
              <p>{system.description}</p>
              <span className={`status ${system.status === 'Em dev' ? 'dev' : system.status === 'Desativado' ? 'off' : 'on'}`}>{system.status.toUpperCase()}</span>
              <span className="infra-value">{formatCurrency(infraBySystem.get(system.id) ?? 0)}</span>
              <button
                type="button"
                className="row-edit"
                aria-label={`Editar ${system.name}`}
                title="Editar sistema"
                onClick={() => startEdit(system)}
              >
                ✎
              </button>
              <button
                type="button"
                className="row-delete"
                aria-label={`Excluir ${system.name}`}
                title="Excluir sistema"
                onClick={() => {
                  if (window.confirm(`EXCLUIR ${system.name}?\n\nAs infraestruturas vinculadas serão removidas e os clientes deixarão de referenciar este sistema.`)) {
                    onRemove(system.id)
                  }
                }}
              >
                ✕
              </button>
            </article>
          ))}
          {filteredSystems.length === 0 && <div className="empty">NENHUM SISTEMA ENCONTRADO</div>}
        </div>
      </section>

      <aside className="telemetry">
        <h2>TELEMETRIA DE INFRAESTRUTURA</h2>
        <div className="telemetry-block">
          <span className="metric-label">GASTO TOTAL INFRA/MÊS</span>
          <strong className="total">{formatCurrency(totalInfra)}</strong>
          <span className="trend">↗ <b>12,4%</b> VS MÊS ANTERIOR</span>
        </div>
        <div className="telemetry-block chart-block">
          <span className="metric-label">GASTO POR SISTEMA (R$/MÊS)</span>
          <div className="chart" aria-label="Gráfico de gasto por sistema">
            {systems.map((system) => (
              <div className="bar-wrap" key={system.id}>
                <span>{(infraBySystem.get(system.id) ?? 0).toLocaleString('pt-BR')}</span>
                <div
                  className={`bar ${system.id === topSystemId ? 'highlight' : ''}`}
                  style={{ height: `${Math.max(((infraBySystem.get(system.id) ?? 0) / maxInfra) * 170, 18)}px` }}
                />
                <small>{system.name.replace(' ', '\n')}</small>
              </div>
            ))}
          </div>
        </div>
        <button className="report-button">↗ &nbsp; VER RELATÓRIO COMPLETO</button>
      </aside>

      {(modalOpen || editing) && (
        <div className="modal-backdrop" onClick={close}>
          <form className="modal" onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
            <div className="modal-heading"><span>{editing ? 'EDITAR SISTEMA' : 'NOVO SISTEMA'}</span><button type="button" onClick={close}>×</button></div>
            <label>NOME DO SISTEMA<input autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: PORTAL CLIENTE" /></label>
            <label>DESCRIÇÃO<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Descreva o propósito do sistema" /></label>
            <label>STATUS<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as SystemStatus })}><option>Lançado</option><option>Em dev</option><option>Desativado</option></select></label>
            <button className="primary-button submit" type="submit">{editing ? 'SALVAR ALTERAÇÕES ↗' : 'SALVAR SISTEMA ↗'}</button>
          </form>
        </div>
      )}
    </>
  )
}
