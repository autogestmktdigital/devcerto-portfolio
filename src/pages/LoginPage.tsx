import { useState } from 'react'
import type { FormEvent } from 'react'

interface Props {
  onLogin: (password: string) => Promise<void>
  error: string
  loading: boolean
}

export default function LoginPage({ onLogin, error, loading }: Props) {
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)

  function submit(event: FormEvent) {
    event.preventDefault()
    void onLogin(password)
  }

  return (
    <main className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="brand login-brand"><span className="brand-mark">◇</span><span>DEVCERTO</span></div>
        <p className="login-eyebrow">PORTFÓLIO · ACESSO RESTRITO</p>
        <h1>Entrar no sistema</h1>
        <label>SENHA ADMINISTRATIVA
          <div className="login-password">
            <input autoFocus type={visible ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Digite sua senha" />
            <button type="button" onClick={() => setVisible((value) => !value)}>{visible ? 'OCULTAR' : 'MOSTRAR'}</button>
          </div>
        </label>
        {error && <p className="login-error" role="alert">{error}</p>}
        <button className="primary-button submit" disabled={loading || !password} type="submit">{loading ? 'VALIDANDO...' : 'ENTRAR ↗'}</button>
        <p className="login-note">O acesso é protegido e monitorado.</p>
      </form>
    </main>
  )
}
