import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { ClientItem, InfraItem, SystemItem, SystemStatus } from '@/types'
import { formatCurrency } from '@/utils'

interface Props {
  systems: SystemItem[]
  infras: InfraItem[]
  clients: ClientItem[]
  query: string
  modalOpen: boolean
  onCloseModal: () => void
  onAdd: (system: Omit<SystemItem, 'id'>) => Promise<boolean>
  onUpdate: (system: SystemItem) => Promise<boolean>
  onRemove: (systemId: number) => Promise<boolean>
}

function displayCase(text: string) {
  if (!text) return text
  const hasLowercase = /[a-zà-ú]/.test(text)
  return hasLowercase ? text : text.charAt(0) + text.slice(1).toLowerCase()
}

export default function SistemasPage({ systems, infras, clients, query, modalOpen, onCloseModal, onAdd, onUpdate, onRemove }: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null)
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
    if (!q) return systems
    return systems.filter((system) => {
      const clientNames = clients
        .filter((client) => client.systemIds.includes(system.id))
        .map((client) => client.name)
        .join(' ')
      return `${system.name} ${system.description} ${clientNames}`.toLowerCase().includes(q)
    })
  }, [systems, clients, query])

  const clientsBySystem = useMemo(() => {
    const map = new Map<number, ClientItem[]>()
    for (const client of clients) {
      for (const systemId of client.systemIds) {
        map.set(systemId, [...(map.get(systemId) ?? []), client])
      }
    }
    return map
  }, [clients])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form.name.trim() || !form.description.trim()) return
    const payload = { name: form.name.trim(), description: form.description.trim(), status: form.status }
    const saved = editing ? await onUpdate({ ...editing, ...payload }) : await onAdd(payload)
    if (!saved) return
    setForm({ name: '', description: '', status: 'Em dev' })
    close()
  }

  return (
    <section className="systems-panel">
      <div className="table-head">
        <span />
        <span>Sistema</span>
        <span>Descrição</span>
        <span>Status</span>
        <span>Clientes</span>
        <span />
        <span />
      </div>
      <div className="system-list">
        {filteredSystems.map((system, index) => {
          const expanded = expandedId === system.id
          const systemInfras = infras.filter((infra) => infra.systemId === system.id)
          const systemClients = clientsBySystem.get(system.id) ?? []
          return (
            <div key={system.id} className={`infra-system ${expanded ? 'expanded' : ''}`}>
              <article
                className="system-row clickable"
                onClick={() => setExpandedId(expanded ? null : system.id)}
              >
                <span className="system-index">{String(index + 1).padStart(2, '0')}</span>
                <strong>{system.name}</strong>
                <p>{displayCase(system.description)}</p>
                <span className={`status ${system.status === 'Em dev' ? 'dev' : system.status === 'Desativado' ? 'off' : 'on'}`}>{system.status}</span>
                <div className="chips">
                  {systemClients.map((client) => (
                    <span key={client.id} className="chip">{client.name}</span>
                  ))}
                </div>
                <button
                  type="button"
                  className="row-edit"
                  aria-label={`Editar ${system.name}`}
                  title="Editar sistema"
                  onClick={(event) => {
                    event.stopPropagation()
                    startEdit(system)
                  }}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="row-delete"
                  aria-label={`Excluir ${system.name}`}
                  title="Excluir sistema"
                  onClick={(event) => {
                    event.stopPropagation()
                    if (window.confirm(`Excluir "${system.name}"?\n\nAs infraestruturas vinculadas serão removidas e os clientes deixarão de referenciar este sistema.`)) {
                      onRemove(system.id)
                    }
                  }}
                >
                  ✕
                </button>
              </article>
              {expanded && (
                <div className="infra-detail">
                  <div className="infra-ro-head">
                    <span>Plataforma</span><span>Utilização</span><span>Vencimento</span><span>Pagador</span><span className="cell-right">Valor/mês</span>
                  </div>
                  {systemInfras.map((infra) => (
                    <div className="infra-ro-row" key={infra.id}>
                      <strong>{infra.platform}</strong>
                      <span>{infra.usage}</span>
                      <span className="mono">dia {String(infra.dueDay).padStart(2, '0')}</span>
                      <span>{infra.payer}</span>
                      <span className="mono cell-right">{formatCurrency(infra.value)}</span>
                    </div>
                  ))}
                  {systemInfras.length === 0 && <div className="empty small">Nenhuma infraestrutura cadastrada para este sistema.</div>}
                </div>
              )}
            </div>
          )
        })}
        {filteredSystems.length === 0 && <div className="empty">Nenhum sistema encontrado.</div>}
      </div>

      {(modalOpen || editing) && (
        <div className="modal-backdrop" onClick={close}>
          <form className="modal" onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
            <div className="modal-heading"><span>{editing ? 'Editar sistema' : 'Novo sistema'}</span><button type="button" onClick={close}>×</button></div>
            <label>Nome do sistema<input autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Portal do Cliente" /></label>
            <label>Descrição<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Descreva o propósito do sistema" /></label>
            <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as SystemStatus })}><option>Lançado</option><option>Em dev</option><option>Desativado</option></select></label>
            <button className="primary-button submit" type="submit">{editing ? 'Salvar alterações' : 'Salvar sistema'}</button>
          </form>
        </div>
      )}
    </section>
  )
}
