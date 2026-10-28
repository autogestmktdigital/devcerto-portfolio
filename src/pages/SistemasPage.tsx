import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { ClientItem, InfraItem, SystemFormPayload, SystemItem, SystemStatus } from '@/types'
import { dueLabel, statusClass, valueLabel } from '@/utils'

interface Props {
  systems: SystemItem[]
  infras: InfraItem[]
  clients: ClientItem[]
  query: string
  modalOpen: boolean
  onCloseModal: () => void
  onAdd: (payload: SystemFormPayload) => Promise<boolean>
  onUpdate: (payload: SystemFormPayload) => Promise<boolean>
  onRemove: (systemId: number) => Promise<boolean>
}

function displayCase(text: string) {
  if (!text) return text
  const hasLowercase = /[a-zà-ú]/.test(text)
  return hasLowercase ? text : text.charAt(0) + text.slice(1).toLowerCase()
}

export default function SistemasPage({ systems, infras, clients, query, modalOpen, onCloseModal, onAdd, onUpdate, onRemove }: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', description: '', status: 'Em dev' as SystemStatus, infraIds: [] as number[], clientIds: [] as number[] })
  const [editing, setEditing] = useState<SystemItem | null>(null)
  const [infraOpen, setInfraOpen] = useState(false)
  const [clientsOpen, setClientsOpen] = useState(false)

  useEffect(() => {
    if (modalOpen) setEditing(null)
  }, [modalOpen])

  const close = () => {
    setEditing(null)
    setInfraOpen(false)
    setClientsOpen(false)
    onCloseModal()
  }

  function startEdit(system: SystemItem) {
    setEditing(system)
    setForm({
      name: system.name,
      description: system.description,
      status: system.status,
      infraIds: system.infraIds,
      clientIds: clients.filter((client) => client.systemIds.includes(system.id)).map((client) => client.id),
    })
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
    const payload: SystemFormPayload = {
      ...(editing ? { id: editing.id } : {}),
      name: form.name.trim(),
      description: form.description.trim(),
      status: form.status,
      infraIds: form.infraIds,
      clientIds: form.clientIds,
    }
    const saved = editing ? await onUpdate(payload) : await onAdd(payload)
    if (!saved) return
    setForm({ name: '', description: '', status: 'Em dev', infraIds: [], clientIds: [] })
    setInfraOpen(false)
    setClientsOpen(false)
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
          const systemInfras = infras.filter((infra) => system.infraIds.includes(infra.id))
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
                <span className={`status ${statusClass(system.status)}`}>{system.status}</span>
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
                    if (window.confirm(`Excluir "${system.name}"?\n\nOs vínculos com infraestruturas e clientes serão removidos; os cadastros em si permanecem.`)) {
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
                    <span>Plataforma</span><span>Utilização</span><span>Fonte Pagadora</span><span>Vencimento</span><span className="cell-right">Valor</span>
                  </div>
                  {systemInfras.map((infra) => (
                    <div className="infra-ro-row" key={infra.id}>
                      <strong>{infra.platform}</strong>
                      <span>{infra.usage}</span>
                      <span>{infra.payer}</span>
                      <span className="mono">{dueLabel(infra)}</span>
                      <span className={`mono cell-right ${infra.billingType === 'Grátis' ? 'value-free' : ''}`}>{valueLabel(infra)}</span>
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
            <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as SystemStatus })}><option>Desativado</option><option>Em dev</option><option>Lançado</option><option>Prancheta</option></select></label>
            <div className="form-label">Infraestrutura utilizada
              <button type="button" className="picker-toggle" onClick={() => setInfraOpen((open) => !open)}>
                <span>{form.infraIds.length > 0 ? `${form.infraIds.length} selecionada${form.infraIds.length > 1 ? 's' : ''}` : 'Nenhuma selecionada — clique para escolher'}</span>
                <span className={`chevron ${infraOpen ? 'open' : ''}`}>▸</span>
              </button>
              {infraOpen && (
                <div className="systems-picker">
                  {infras.map((infra) => (
                    <label key={infra.id} className="pick-chip">
                      <input
                        type="checkbox"
                        checked={form.infraIds.includes(infra.id)}
                        onChange={() => setForm((current) => ({
                          ...current,
                          infraIds: current.infraIds.includes(infra.id)
                            ? current.infraIds.filter((id) => id !== infra.id)
                            : [...current.infraIds, infra.id],
                        }))}
                      />
                      {infra.platform} · {infra.usage}
                    </label>
                  ))}
                  {infras.length === 0 && <span className="panel-empty">Nenhuma infraestrutura cadastrada ainda.</span>}
                </div>
              )}
            </div>
            <div className="form-label">Clientes que utilizam
              <button type="button" className="picker-toggle" onClick={() => setClientsOpen((open) => !open)}>
                <span>{form.clientIds.length > 0 ? `${form.clientIds.length} selecionado${form.clientIds.length > 1 ? 's' : ''}` : 'Nenhum selecionado — clique para escolher'}</span>
                <span className={`chevron ${clientsOpen ? 'open' : ''}`}>▸</span>
              </button>
              {clientsOpen && (
                <div className="systems-picker">
                  {clients.map((client) => (
                    <label key={client.id} className="pick-chip">
                      <input
                        type="checkbox"
                        checked={form.clientIds.includes(client.id)}
                        onChange={() => setForm((current) => ({
                          ...current,
                          clientIds: current.clientIds.includes(client.id)
                            ? current.clientIds.filter((id) => id !== client.id)
                            : [...current.clientIds, client.id],
                        }))}
                      />
                      {client.name}
                    </label>
                  ))}
                  {clients.length === 0 && <span className="panel-empty">Nenhum cliente cadastrado ainda.</span>}
                </div>
              )}
            </div>
            <button className="primary-button submit" type="submit">{editing ? 'Salvar alterações' : 'Salvar sistema'}</button>
          </form>
        </div>
      )}
    </section>
  )
}
