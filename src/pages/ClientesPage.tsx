import { useEffect, useState } from 'react'
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

  const filteredClients = clients.filter((client) => {
    const q = query.toLowerCase()
    if (!q) return true
    const systemNames = client.systemIds.map((id) => systems.find((system) => system.id === id)?.name ?? '').join(' ')
    return `${client.name} ${systemNames}`.toLowerCase().includes(q)
  })

  function toggleSystem(id: number) {
    setForm((current) => ({
      ...current,
      systemIds: current.systemIds.includes(id) ? current.systemIds.filter((systemId) => systemId !== id) : [...current.systemIds, id],
    }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form.name.trim()) return
    const payload = { name: form.name.trim(), systemIds: form.systemIds, since: Number(form.since) || new Date().getFullYear() }
    const saved = editing ? await onUpdate({ ...editing, ...payload }) : await onAdd(payload)
    if (!saved) return
    setForm({ name: '', systemIds: [], since: '' })
    close()
  }

  return (
    <section className="systems-panel">
      <div className="table-head client-head">
        <span />
        <span>Cliente</span>
        <span>Sistemas utilizados</span>
        <span>Desde</span>
        <span />
        <span />
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
                if (window.confirm(`Excluir "${client.name}"?`)) {
                  onRemove(client.id)
                }
              }}
            >
              ✕
            </button>
          </article>
        ))}
        {filteredClients.length === 0 && <div className="empty">Nenhum cliente encontrado.</div>}
      </div>

      {(modalOpen || editing) && (
        <div className="modal-backdrop" onClick={close}>
          <form className="modal" onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
            <div className="modal-heading"><span>{editing ? 'Editar cliente' : 'Novo cliente'}</span><button type="button" onClick={close}>×</button></div>
            <label>Nome do cliente<input autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Acme Logística" /></label>
            <div className="form-label">Sistemas utilizados
              <div className="systems-picker">
                {systems.map((system) => (
                  <label key={system.id} className="pick-chip">
                    <input type="checkbox" checked={form.systemIds.includes(system.id)} onChange={() => toggleSystem(system.id)} />
                    {system.name}
                  </label>
                ))}
              </div>
            </div>
            <label>Cliente desde (ano)<input type="number" min={1900} max={2100} value={form.since} onChange={(event) => setForm({ ...form, since: event.target.value })} placeholder={String(new Date().getFullYear())} /></label>
            <button className="primary-button submit" type="submit">{editing ? 'Salvar alterações' : 'Salvar cliente'}</button>
          </form>
        </div>
      )}
    </section>
  )
}
