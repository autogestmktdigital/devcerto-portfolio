import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { CredentialItem } from '@/types'

interface Props {
  credentials: CredentialItem[]
  query: string
  modalOpen: boolean
  onCloseModal: () => void
  onAdd: (credential: Omit<CredentialItem, 'id'>) => Promise<boolean>
  onUpdate: (credential: CredentialItem) => Promise<boolean>
  onRemove: (credentialId: number) => Promise<boolean>
}

export default function CredenciaisPage({ credentials, query, modalOpen, onCloseModal, onAdd, onUpdate, onRemove }: Props) {
  const [form, setForm] = useState({ platform: '', login: '', password: '' })
  const [editing, setEditing] = useState<CredentialItem | null>(null)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (modalOpen) setEditing(null)
  }, [modalOpen])

  const close = () => {
    setEditing(null)
    onCloseModal()
  }

  const filteredCredentials = credentials.filter((credential) => {
    const q = query.toLowerCase()
    if (!q) return true
    return `${credential.platform} ${credential.login}`.toLowerCase().includes(q)
  })

  function startEdit(credential: CredentialItem) {
    setEditing(credential)
    setForm({ platform: credential.platform, login: credential.login, password: credential.password })
  }

  function toggleReveal(id: number) {
    setRevealed((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form.platform.trim() || !form.login.trim()) return
    const payload = { platform: form.platform.trim(), login: form.login.trim(), password: form.password }
    const saved = editing ? await onUpdate({ ...editing, ...payload }) : await onAdd(payload)
    if (!saved) return
    setForm({ platform: '', login: '', password: '' })
    close()
  }

  return (
    <section className="systems-panel">
      <div className="table-head cred-head">
        <span />
        <span>Plataforma</span>
        <span>Login</span>
        <span>Senha</span>
        <span />
        <span />
      </div>
      <div className="system-list">
        {filteredCredentials.map((credential, index) => (
          <article className="cred-row" key={credential.id}>
            <span className="system-index">{String(index + 1).padStart(2, '0')}</span>
            <strong>{credential.platform}</strong>
            <span className="login-text mono">{credential.login}</span>
            <span className="cred-secret">
              <span className={revealed.has(credential.id) ? 'pass-text' : 'pass-mask'}>
                {revealed.has(credential.id) ? credential.password : '••••••••••'}
              </span>
              <button type="button" className="pass-toggle" onClick={() => toggleReveal(credential.id)}>
                {revealed.has(credential.id) ? 'Ocultar' : 'Mostrar'}
              </button>
            </span>
            <button
              type="button"
              className="row-edit"
              aria-label={`Editar ${credential.platform}`}
              title="Editar acesso"
              onClick={() => startEdit(credential)}
            >
              ✎
            </button>
            <button
              type="button"
              className="row-delete"
              aria-label={`Excluir ${credential.platform}`}
              title="Excluir acesso"
              onClick={() => {
                if (window.confirm(`Excluir o acesso "${credential.platform}"?`)) {
                  onRemove(credential.id)
                }
              }}
            >
              ✕
            </button>
          </article>
        ))}
        {filteredCredentials.length === 0 && <div className="empty">Nenhum acesso encontrado.</div>}
      </div>

      {(modalOpen || editing) && (
        <div className="modal-backdrop" onClick={close}>
          <form className="modal" onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
            <div className="modal-heading"><span>{editing ? 'Editar acesso' : 'Novo acesso'}</span><button type="button" onClick={close}>×</button></div>
            <label>Plataforma<input autoFocus value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value })} placeholder="Ex.: Netlify, Railway, AWS" /></label>
            <label>Login<input value={form.login} onChange={(event) => setForm({ ...form, login: event.target.value })} placeholder="E-mail ou usuário" /></label>
            <label>Senha<input type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Senha da plataforma" /></label>
            <button className="primary-button submit" type="submit">{editing ? 'Salvar alterações' : 'Salvar acesso'}</button>
          </form>
        </div>
      )}
    </section>
  )
}
