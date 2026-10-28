import { useEffect, useState } from 'react'
import type { ClientItem, CredentialItem, InfraFormPayload, InfraItem, SystemFormPayload, SystemItem } from '@/types'
import { api } from '@/api'
import type { AppData } from '@/api'
import DashboardPage from '@/pages/DashboardPage'
import SistemasPage from '@/pages/SistemasPage'
import InfraPage from '@/pages/InfraPage'
import ClientesPage from '@/pages/ClientesPage'
import CredenciaisPage from '@/pages/CredenciaisPage'
import LoginPage from '@/pages/LoginPage'

type Page = 'Dashboard' | 'Sistemas' | 'Infraestrutura' | 'Clientes' | 'Acessos'

type ListPage = Exclude<Page, 'Dashboard'>

const navItems: { label: Page | 'Financeiro'; icon: string; soon?: boolean }[] = [
  { label: 'Dashboard', icon: '▦' },
  { label: 'Sistemas', icon: '⌁' },
  { label: 'Infraestrutura', icon: '▤' },
  { label: 'Clientes', icon: '♧' },
  { label: 'Acessos', icon: '⚿' },
  { label: 'Financeiro', icon: '$', soon: true },
]

const newLabels: Record<ListPage, string> = {
  Sistemas: 'Novo sistema',
  Infraestrutura: 'Nova infra',
  Clientes: 'Novo cliente',
  Acessos: 'Novo acesso',
}

const searchPlaceholders: Record<ListPage, string> = {
  Sistemas: 'Buscar sistemas...',
  Infraestrutura: 'Buscar infraestruturas...',
  Clientes: 'Buscar clientes...',
  Acessos: 'Buscar acessos...',
}

export default function App() {
  const [page, setPage] = useState<Page>('Dashboard')
  const [query, setQuery] = useState('')
  const [modalPage, setModalPage] = useState<ListPage | null>(null)
  const [authenticated, setAuthenticated] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [appError, setAppError] = useState('')
  const [systems, setSystems] = useState<SystemItem[]>([])
  const [infras, setInfras] = useState<InfraItem[]>([])
  const [clients, setClients] = useState<ClientItem[]>([])
  const [credentials, setCredentials] = useState<CredentialItem[]>([])

  async function loadData() {
    const data = await api.data()
    applyData(data)
  }

  function applyData(data: AppData) {
    setSystems(data.systems)
    setInfras(data.infras)
    setClients(data.clients)
    setCredentials(data.credentials)
  }

  useEffect(() => {
    api.session()
      .then(async (session) => {
        if (!session.authenticated) return
        await loadData()
        setAuthenticated(true)
      })
      .catch(() => setLoginError('Não foi possível conectar ao serviço. Tente novamente em instantes.'))
      .finally(() => setCheckingSession(false))
  }, [])

  async function handleLogin(password: string) {
    setLoading(true)
    setLoginError('')
    try {
      await api.login(password)
      await loadData()
      setAuthenticated(true)
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Falha ao entrar')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    try {
      await api.logout()
    } finally {
      setAuthenticated(false)
      setSystems([])
      setInfras([])
      setClients([])
      setCredentials([])
      setPage('Dashboard')
      setQuery('')
    }
  }

  async function perform<T>(operation: () => Promise<T>): Promise<T | null> {
    setAppError('')
    try {
      return await operation()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível concluir a operação.'
      if (message.includes('Sessão encerrada')) setAuthenticated(false)
      setAppError(message)
      return null
    }
  }

  const closeModal = () => setModalPage(null)

  async function removeSystem(id: number): Promise<boolean> {
    const done = await perform(() => api.remove('systems', id))
    if (done === null) return false
    setSystems((current) => current.filter((system) => system.id !== id))
    setClients((current) => current.map((client) => ({ ...client, systemIds: client.systemIds.filter((systemId) => systemId !== id) })))
    return true
  }

  async function updateSystem(payload: SystemFormPayload): Promise<boolean> {
    const { id } = payload
    if (typeof id !== 'number') return false
    const result = await perform(() => api.update<SystemItem>('systems', id, payload))
    if (!result) return false
    setSystems((current) => current.map((item) => (item.id === result.id ? result : item)))
    syncClientLinks(result.id, payload.clientIds)
    return true
  }

  async function addSystem(payload: SystemFormPayload): Promise<boolean> {
    const result = await perform(() => api.create<SystemItem>('systems', payload))
    if (!result) return false
    setSystems((current) => [...current, result])
    syncClientLinks(result.id, payload.clientIds)
    return true
  }

  function syncClientLinks(systemId: number, clientIds: number[]) {
    setClients((current) => current.map((client) => ({
      ...client,
      systemIds: clientIds.includes(client.id)
        ? [...new Set([...client.systemIds, systemId])]
        : client.systemIds.filter((id) => id !== systemId),
    })))
  }

  async function updateInfra(infra: InfraItem): Promise<boolean> {
    const result = await perform(() => api.update<InfraItem>('infras', infra.id, infra))
    if (!result) return false
    setInfras((current) => current.map((item) => (item.id === result.id ? result : item)))
    return true
  }

  async function addInfra(payload: InfraFormPayload): Promise<boolean> {
    const result = await perform(() => api.create<InfraItem>('infras', payload))
    if (!result) return false
    setInfras((current) => [...current, result])
    return true
  }

  async function removeInfra(id: number): Promise<boolean> {
    const result = await perform(() => api.remove('infras', id))
    if (result === null) return false
    setInfras((current) => current.filter((infra) => infra.id !== id))
    return true
  }

  async function updateClient(client: ClientItem): Promise<boolean> {
    const result = await perform(() => api.update<ClientItem>('clients', client.id, client))
    if (!result) return false
    setClients((current) => current.map((item) => (item.id === result.id ? result : item)))
    return true
  }

  async function addClient(client: Omit<ClientItem, 'id'>): Promise<boolean> {
    const result = await perform(() => api.create<ClientItem>('clients', client))
    if (!result) return false
    setClients((current) => [...current, result])
    return true
  }

  async function removeClient(id: number): Promise<boolean> {
    const result = await perform(() => api.remove('clients', id))
    if (result === null) return false
    setClients((current) => current.filter((client) => client.id !== id))
    return true
  }

  async function updateCredential(credential: CredentialItem): Promise<boolean> {
    const result = await perform(() => api.update<CredentialItem>('credentials', credential.id, credential))
    if (!result) return false
    setCredentials((current) => current.map((item) => (item.id === result.id ? result : item)))
    return true
  }

  async function addCredential(credential: Omit<CredentialItem, 'id'>): Promise<boolean> {
    const result = await perform(() => api.create<CredentialItem>('credentials', credential))
    if (!result) return false
    setCredentials((current) => [...current, result])
    return true
  }

  async function removeCredential(id: number): Promise<boolean> {
    const result = await perform(() => api.remove('credentials', id))
    if (result === null) return false
    setCredentials((current) => current.filter((credential) => credential.id !== id))
    return true
  }

  if (checkingSession) return <main className="login-screen"><p className="login-note">CONECTANDO AO PORTFÓLIO...</p></main>
  if (!authenticated) return <LoginPage onLogin={handleLogin} error={loginError} loading={loading} />

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">◇</span><span>DEVCERTO</span></div>
        {page !== 'Dashboard' && (
          <>
            <label className="search">
              <span>⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholders[page]} />
            </label>
            <button className="primary-button" onClick={() => setModalPage(page)}><span>＋</span> {newLabels[page]}</button>
          </>
        )}
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <nav>
            {navItems.map((item) => (
              <button
                key={item.label}
                className={`nav-item ${page === item.label ? 'active' : ''}`}
                disabled={item.soon}
                onClick={() => setPage(item.label as Page)}
              >
                <span className="nav-icon">{item.icon}</span><span>{item.label}</span>
                {item.soon && <small>EM BREVE</small>}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            {appError && <p className="app-error" role="alert">{appError}</p>}
            <button className="logout-button" onClick={() => void handleLogout()}>↪ &nbsp; Sair do sistema</button>
            <button className="collapse" aria-label="Recolher menu">‹‹</button>
          </div>
        </aside>

        {page === 'Dashboard' && <DashboardPage systems={systems} infras={infras} clients={clients} credentials={credentials} onNavigate={(target) => setPage(target)} />}
        {page === 'Sistemas' && <SistemasPage systems={systems} infras={infras} clients={clients} query={query} modalOpen={modalPage === 'Sistemas'} onCloseModal={closeModal} onAdd={addSystem} onUpdate={updateSystem} onRemove={removeSystem} />}
        {page === 'Infraestrutura' && <InfraPage infras={infras} query={query} modalOpen={modalPage === 'Infraestrutura'} onCloseModal={closeModal} onAdd={addInfra} onUpdate={updateInfra} onRemove={removeInfra} />}
        {page === 'Clientes' && <ClientesPage clients={clients} systems={systems} query={query} modalOpen={modalPage === 'Clientes'} onCloseModal={closeModal} onAdd={addClient} onUpdate={updateClient} onRemove={removeClient} />}
        {page === 'Acessos' && <CredenciaisPage credentials={credentials} query={query} modalOpen={modalPage === 'Acessos'} onCloseModal={closeModal} onAdd={addCredential} onUpdate={updateCredential} onRemove={removeCredential} />}
      </div>
    </main>
  )
}
