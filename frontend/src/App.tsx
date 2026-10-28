import React, { useState, useEffect } from 'react'
import './App.css'

// Описываем тип пользователя
interface UserInfo {
  login: string
  role: string
  permissions: string[]
}

export default function App() {
  const [login, setLogin] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [role, setRole] = useState<string>('user')
  const [msg, setMsg] = useState<string>('')

  const [users, setUsers] = useState<UserInfo[]>([])
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [accessMsg, setAccessMsg] = useState<string>('')

  // Чтобы в адресной строке всегда было /register
  useEffect(() => {
    if (window.location.pathname !== '/register') {
      window.history.replaceState({}, '', '/register')
    }
    loadUsers()
  }, [])

  async function loadUsers() {
    const res = await fetch('http://localhost:8000/api/users')
    const data: UserInfo[] = await res.json()
    setUsers(data)
    if (data.length > 0 && !selectedUser) {
      setSelectedUser(data[0].login)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('http://localhost:8000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password, role })
    })
    const data = await res.json()
    if (res.ok) {
      setMsg('✅ Успех: ' + data.message)
      setSelectedUser(login)
      setLogin('')
      setPassword('')
      loadUsers()
    } else {
      setMsg('❌ Ошибка: ' + data.detail)
    }
  }

  async function checkAction(perm: string) {
    const res = await fetch(`http://localhost:8000/api/action/${perm}?login=${selectedUser}`)
    const data = await res.json()
    if (res.ok) {
      setAccessMsg('✅ ' + data.message)
    } else {
      setAccessMsg('⛔ ' + data.detail)
    }
  }

  const currentUserObj = users.find(u => u.login === selectedUser)

  return (
    <div className="container">
      <div className="hero-banner">
        <h1 className="hero-logo">RBAC ACCESS</h1>
        <p className="hero-subtitle">Лабораторная работа 4 • Регистрация и Ролевая модель доступа (Вариант 3)</p>
      </div>

      {/* БЛОК 1: Форма регистрации */}
      <form onSubmit={handleRegister} className="card">
        <h3>01 / Регистрация пользователя (/register)</h3>

        <div className="form-group">
          <label>ЛОГИН (3–32 символа: латиница, цифры, . _ -)</label>
          <input
            value={login}
            onChange={e => setLogin(e.target.value)}
            placeholder="Например: ivan_123"
            required
          />
        </div>

        <div className="form-group">
          <label>ПАРОЛЬ (мин. 8 симв., A-Z, a-z, 0-9 и спецсимвол)</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Например: Password1!"
            required
          />
        </div>

        <div className="form-group">
          <label>ВЫБЕРИТЕ РОЛЬ</label>
          <select value={role} onChange={e => setRole(e.target.value)}>
            <option value="user">user (обычный пользователь)</option>
            <option value="moderator">moderator (модератор)</option>
            <option value="admin">admin (полный доступ)</option>
          </select>
        </div>

        <button type="submit" className="btn-lime">Зарегистрироваться</button>

        {msg && <div className="status-box">{msg}</div>}
      </form>

      {/* БЛОК 2: Проверка ролей */}
      <div className="card">
        <h3>02 / Проверка Ролевой модели (RBAC)</h3>
        {users.length === 0 ? (
          <p>Сначала зарегистрируйте хотя бы одного пользователя в форме выше.</p>
        ) : (
          <div>
            <div className="form-group">
              <label>ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ</label>
              <select
                value={selectedUser}
                onChange={e => { setSelectedUser(e.target.value); setAccessMsg('') }}
              >
                {users.map(u => (
                  <option key={u.login} value={u.login}>
                    {u.login} — роль: {u.role.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {currentUserObj && (
              <p>
                Активные права роли в БД:{' '}
                {currentUserObj.permissions.map(p => (
                  <span key={p} className="badge">{p}</span>
                ))}
              </p>
            )}

            <div className="actions-grid">
              <button className="btn-action" onClick={() => checkAction('read')}>
                📖 1. Читать материалы (требуется право: read)
              </button>
              <button className="btn-action" onClick={() => checkAction('moderate')}>
                🛡️ 2. Модерировать контент (требуется право: moderate)
              </button>
              <button className="btn-action" onClick={() => checkAction('admin')}>
                ⚡ 3. Управление системой (требуется право: admin)
              </button>
            </div>

            {accessMsg && <div className="status-box">{accessMsg}</div>}
          </div>
        )}
      </div>
    </div>
  )
}