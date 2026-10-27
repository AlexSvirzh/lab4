import React, { useState, useEffect } from 'react'

// Описываем тип пользователя для TypeScript
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

  // Чтобы в адресной строке всегда было /register (по требованию методички)
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
    <div>
      <h2>Лабораторная работа 4 (Вариант 3 — Роли)</h2>

      {/* БЛОК 1: Форма регистрации */}
      <form onSubmit={handleRegister} style={{ border: '1px solid #ccc', padding: 15, marginBottom: 20 }}>
        <h3>1. Регистрация (/register)</h3>
        <p>
          Логин: <br />
          <input value={login} onChange={e => setLogin(e.target.value)} placeholder="ivan_123" required />
        </p>
        <p>
          Пароль (мин 8 симв, A-Z, a-z, 0-9, спецсимвол): <br />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password1!" required />
        </p>
        <p>
          Роль: <br />
          <select value={role} onChange={e => setRole(e.target.value)}>
            <option value="user">user (обычный)</option>
            <option value="moderator">moderator (модератор)</option>
            <option value="admin">admin (администратор)</option>
          </select>
        </p>
        <button type="submit">Зарегистрироваться</button>
        {msg && <p><b>{msg}</b></p>}
      </form>

      {/* БЛОК 2: Проверка ролей */}
      <div style={{ border: '1px solid #ccc', padding: 15 }}>
        <h3>2. Проверка Ролевой модели (RBAC)</h3>
        {users.length === 0 ? <p>Сначала зарегистрируйте пользователя выше.</p> : (
          <div>
            <p>
              Выберите пользователя: {' '}
              <select value={selectedUser} onChange={e => { setSelectedUser(e.target.value); setAccessMsg('') }}>
                {users.map(u => (
                  <option key={u.login} value={u.login}>{u.login} (роль: {u.role})</option>
                ))}
              </select>
            </p>

            {currentUserObj && (
              <p>Доступные права этой роли в БД: <b>{currentUserObj.permissions.join(', ')}</b></p>
            )}

            <p>Проверить действие на Backend:</p>
            <button onClick={() => checkAction('read')}>1. Читать статьи (нужно право read)</button><br /><br />
            <button onClick={() => checkAction('moderate')}>2. Модерировать (нужно право moderate)</button><br /><br />
            <button onClick={() => checkAction('admin')}>3. Удалить систему (нужно право admin)</button>

            {accessMsg && <p style={{ fontSize: 18 }}><b>{accessMsg}</b></p>}
          </div>
        )}
      </div>
    </div>
  )
}