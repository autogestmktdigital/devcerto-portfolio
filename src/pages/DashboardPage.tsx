import { useMemo } from 'react'
import type { ClientItem, CredentialItem, InfraItem, SystemItem } from '@/types'
import { formatCurrency } from '@/utils'

interface Props {
  systems: SystemItem[]
  infras: InfraItem[]
  clients: ClientItem[]
  credentials: CredentialItem[]
  onNavigate: (page: 'Sistemas' | 'Infraestrutura' | 'Clientes' | 'Acessos') => void
}

export default function DashboardPage({ systems, infras, clients, credentials, onNavigate }: Props) {
  const totalMonthly = useMemo(() => infras.reduce((total, infra) => total + infra.value, 0), [infras])

  const statusCounts = useMemo(
    () => ({
      launched: systems.filter((system) => system.status === 'Lançado').length,
      dev: systems.filter((system) => system.status === 'Em dev').length,
      off: systems.filter((system) => system.status === 'Desativado').length,
    }),
    [systems],
  )

  const spendBySystem = useMemo(() => {
    const totals = new Map<number, number>()
    for (const infra of infras) {
      totals.set(infra.systemId, (totals.get(infra.systemId) ?? 0) + infra.value)
    }
    return [...totals.entries()]
      .map(([id, value]) => ({ id, name: systems.find((system) => system.id === id)?.name ?? '—', value }))
      .sort((a, b) => b.value - a.value)
  }, [infras, systems])
  const maxSpend = Math.max(1, ...spendBySystem.map((item) => item.value))

  const systemName = (id: number) => systems.find((system) => system.id === id)?.name ?? '—'

  const todayDay = new Date().getDate()
  const upcoming = useMemo(() => {
    const daysUntil = (dueDay: number) => (dueDay - todayDay + 31) % 31
    return [...infras].sort((a, b) => daysUntil(a.dueDay) - daysUntil(b.dueDay)).slice(0, 6)
  }, [infras, todayDay])

  return (
    <div className="dash">
      <header className="page-head">
        <h1>Visão geral</h1>
        <p>Acompanhe o portfólio, os custos de infraestrutura e os clientes.</p>
      </header>

      <div className="dash-cards">
        <button type="button" className="stat-card" onClick={() => onNavigate('Sistemas')}>
          <span className="stat-label">Sistemas</span>
          <strong className="stat-value">{systems.length}</strong>
          <span className="stat-sub">
            {statusCounts.launched} lançados · {statusCounts.dev} em dev
            {statusCounts.off > 0 ? ` · ${statusCounts.off} desativados` : ''}
          </span>
        </button>
        <button type="button" className="stat-card" onClick={() => onNavigate('Infraestrutura')}>
          <span className="stat-label">Custo de infra / mês</span>
          <strong className="stat-value">{formatCurrency(totalMonthly)}</strong>
          <span className="stat-sub">{infras.length} recursos cadastrados</span>
        </button>
        <button type="button" className="stat-card" onClick={() => onNavigate('Clientes')}>
          <span className="stat-label">Clientes</span>
          <strong className="stat-value">{clients.length}</strong>
          <span className="stat-sub">{clients.reduce((total, client) => total + client.systemIds.length, 0)} vínculos com sistemas</span>
        </button>
        <button type="button" className="stat-card" onClick={() => onNavigate('Acessos')}>
          <span className="stat-label">Acessos salvos</span>
          <strong className="stat-value">{credentials.length}</strong>
          <span className="stat-sub">credenciais criptografadas</span>
        </button>
      </div>

      <div className="dash-grid">
        <section className="dash-panel">
          <div className="panel-head">
            <h2>Gasto por sistema</h2>
            <button type="button" onClick={() => onNavigate('Infraestrutura')}>Ver infraestrutura</button>
          </div>
          {spendBySystem.length === 0 ? (
            <p className="panel-empty">Nenhuma infraestrutura cadastrada ainda.</p>
          ) : (
            <div className="hbar-list">
              {spendBySystem.map((item) => (
                <div key={item.id}>
                  <div className="hbar-top">
                    <span>{item.name}</span>
                    <span className="mono">{formatCurrency(item.value)}</span>
                  </div>
                  <div className="hbar-track">
                    <div className="hbar-fill" style={{ width: `${(item.value / maxSpend) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="dash-col">
          <section className="dash-panel">
            <div className="panel-head">
              <h2>Status dos sistemas</h2>
              <button type="button" onClick={() => onNavigate('Sistemas')}>Gerenciar</button>
            </div>
            <div className="dash-status-list">
              {systems.map((system) => (
                <div className="dash-status-row" key={system.id}>
                  <span>{system.name}</span>
                  <span className={`status ${system.status === 'Em dev' ? 'dev' : system.status === 'Desativado' ? 'off' : 'on'}`}>
                    {system.status}
                  </span>
                </div>
              ))}
              {systems.length === 0 && <p className="panel-empty">Nenhum sistema cadastrado ainda.</p>}
            </div>
          </section>

          <section className="dash-panel">
            <div className="panel-head">
              <h2>Próximos vencimentos</h2>
              <button type="button" onClick={() => onNavigate('Infraestrutura')}>Ver todas</button>
            </div>
            <div className="dash-due-list">
              {upcoming.map((infra) => (
                <div className="dash-due-row" key={infra.id}>
                  <span className="mono">dia {String(infra.dueDay).padStart(2, '0')}</span>
                  <span>{infra.platform} · {systemName(infra.systemId)}</span>
                  <span className="mono">{formatCurrency(infra.value)}</span>
                </div>
              ))}
              {upcoming.length === 0 && <p className="panel-empty">Sem infraestrutura cadastrada.</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
