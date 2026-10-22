import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { ClientItem, SystemItem } from '@/types'

interface Props {
  clients: ClientItem[]
  systems: SystemItem[]
  query: string
  modalOpen: boolean
  onCloseModal: () => void
  onAdd: (client: Omit<ClientItem, 'id'>) => Promise<boolean>
  onUpdate: (client: ClientItem) => Promise<boolean>
  onRemove: (clientId: number) => Promise<boolean>
}

export default function ClientesPage({ clients, systems, query, modalOpen, onCloseModal, onAdd, onUpdate, onRemove }: Props) {
  const [form, setForm] = useState<{ name: string; systemIds: number[]; since: string }>({ name: '', systemIds: [], since: '' })
  const [editing, setEditing] = useState<ClientItem | null>(null)

  useEffect(() => {
    if (modalOpen) setEditing(null)
  }, [modalOpen])

  const close = () => {
    setEditing(null)
    onCloseModal()
  }

  function startEdit(client: ClientItem) {
    setEditing(client)
    setForm({ name: client.name, systemIds: [...client.systemIds], since: String(client.since) })
  }

  const filteredClients = useMemo(() => {
    const q = query.toLowerCase()
    if (!q) return clients
    return clients.filter((client) => {
      const systemNames = client.systemIds.map((id) => systems.find((system) => system.id === id)?.name ?? '').join(' ')
      return `${client.name} ${systemNames}`.toLowerCase().includes(q)
    })
  }, [clients, systems, query])

  const clientsBySystem = useMemo(() => {
    const counts = new Map<number, number>()
    for (const client of clients) {
      for (const id of client.systemIds) {
        counts.set(id, (counts.get(id) ?? 0) + 1)
      }
    }
    return counts
  }, [clients])

  const maxClients = Math.max(1, ...clientsBySystem.values())

  function toggleSystem(id: number) {
    setForm((current) => ({
      ...current,
      systemIds: current.systemIds.includes(id) ? current.systemIds.filter((systemId) => systemId !== id) : [...current.systemIds, id],
    }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form.name.trim()) return
    const payload = { name: form.name.toUpperCase(), systemIds: form.systemIds, since: Number(form.since) || new Date().getFullYear() }
    const saved = editing ? await onUpdate({ ...editing, ...payload }) : await onAdd(payload)
    if (!saved) return
    setForm({ name: '', systemIds: [], since: '' })
    close()
  }

  return (
    <>
      <section className="systems-panel">
        <div className="table-head client-head">
          <span />
          <span>CLIENTE <b>▼</b></span><span>SISTEMAS UTILIZADOS <b>▼</b></span><span>DESDE <b>▼</b></span>
        </div>
        <div className="system-list">
          {filteredClients.map((client, index) => (
            <article className="client-row" key={client.id}>
              <span className="system-index">{String(index + 1).padStart(2, '0')}</span>
              <strong>{client.name}</strong>
              <div className="chips">
                {client.systemIds.map((id) => {
                  const system = systems.find((item) => item.id === id)
                  if (!system) return null
                  return <span key={id} className={`chip ${system.status === 'Em dev' ? 'dev' : system.status === 'Desativado' ? 'off' : ''}`}>{system.name}</span>
                })}
              </div>
              <span className="since mono">{client.since}</span>
              <button
                type="button"
                className="row-edit"
                aria-label={`Editar ${client.name}`}
                title="Editar cliente"
                onClick={() => startEdit(client)}
              >
                ✎
              </button>
              <button
                type="button"
                className="row-delete"
                aria-label={`Excluir ${client.name}`}
                title="Excluir cliente"
                onClick={() => {
                  if (window.confirm(`EXCLUIR ${client.name}?`)) {
                    onRemove(client.id)
                  }
                }}
              >
                ✕
              </button>
            </article>
          ))}
          {filteredClients.length === 0 && <div className="empty">NENHUM CLIENTE ENCONTRADO</div>}
        </div>
      </section>

      <aside className="telemetry">
        <h2>TELEMETRIA DE CLIENTES</h2>
        <div className="telemetry-block">
          <span className="metric-label">CLIENTES ATIVOS</span>
          <strong className="total">{String(clients.length).padStart(2, '0')}</strong>
        </div>
        <div className="telemetry-block chart-block">
          <span className="metric-label">CLIENTES POR SISTEMA</span>
          <div className="hbar-list">
            {systems.map((system) => {
              const count = clientsBySystem.get(system.id) ?? 0
              return (
                <div key={system.id}>
                  <div className="hbar-top"><span>{system.name}</span><span className="mono">{count}</span></div>
                  <div className="hbar-track"><div className="hbar-fill" style={{ width: `${(count / maxClients) * 100}%` }} /></div>
                </div>
              )
            })}
          </div>
        </div>
      </aside>

      {(modalOpen || editing) && (
        <div className="modal-backdrop" onClick={close}>
          <form className="modal" onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
            <div className="modal-heading"><span>{editing ? 'EDITAR CLIENTE' : 'NOVO CLIENTE'}</span><button type="button" onClick={close}>×</button></div>
            <label>NOME DO CLIENTE<input autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: ACME LOGÍSTICA" /></label>
            <div className="form-label">SISTEMAS UTILIZADOS
              <div className="systems-picker">
                {systems.map((system) => (
                  <label key={system.id} className="pick-chip">
                    <input type="checkbox" checked={form.systemIds.includes(system.id)} onChange={() => toggleSystem(system.id)} />
                    {system.name}
                  </label>
                ))}
              </div>
            </div>
            <label>CLIENTE DESDE (ANO)<input type="number" min={1900} max={2100} value={form.since} onChange={(event) => setForm({ ...form, since: event.target.value })} placeholder={String(new Date().getFullYear())} /></label>
            <button className="primary-button submit" type="submit">{editing ? 'SALVAR ALTERAÇÕES ↗' : 'SALVAR CLIENTE ↗'}</button>
          </form>
        </div>
      )}
    </>
  )
}
