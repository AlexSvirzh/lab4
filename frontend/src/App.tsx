import React, { useState, useEffect } from 'react'

export default function App() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')
  const [msg, setMsg] = useState('')

  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState('')
  const [accessMsg, setAccessMsg] = useState('')

  useEffect(() => {
    if (window.location.pathname !== '/register') {
      window.history.replaceState({}, '', '/register')
    }
    loadUsers()
  }, [])

  async function loadUsers() {
    try {
      const res = await fetch('http://localhost:8000/api/users')
      const data = await res.json()
      setUsers(data)
      if (data.length > 0 && !selectedUser) setSelectedUser(data[0].login)
    } catch (e) {
      console.error(e)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    try {
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
    } catch (err) {
      setMsg('⛔ Ошибка соединения с сервером')
    }
  }

  async function checkAction(perm) {
    const res = await fetch(`http://localhost:8000/api/action/${perm}?login=${selectedUser}`)
    const data = await res.json()
    if (res.ok) {
      setAccessMsg('✅ ' + data.message)
    } else {
      setAccessMsg('⛔ ' + data.detail)
    }
  }

  const currentUserObj = users.find(u => u.login === selectedUser)
  const perms = currentUserObj ? currentUserObj.permissions : []

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
              <p>Текущая роль: <b>{currentUserObj.role}</b> | Права роли в БД: <b>{perms.join(', ')}</b></p>
            )}

            <p>Действия в системе (зеленые — доступны роли, серые — запрещены на Backend):</p>
            
            <button 
              onClick={() => checkAction('read')}
              style={{ backgroundColor: perms.includes('read') ? '#d4edda' : '#eee', padding: '8px', marginBottom: '8px', cursor: 'pointer' }}>
              1. Читать статьи (право: read) {perms.includes('read') ? '— [Доступно]' : '— [Заблокировано]'}
            </button><br />

            <button 
              onClick={() => checkAction('moderate')}
              style={{ backgroundColor: perms.includes('moderate') ? '#d4edda' : '#eee', padding: '8px', marginBottom: '8px', cursor: 'pointer' }}>
              2. Модерировать контент (право: moderate) {perms.includes('moderate') ? '— [Доступно]' : '— [Заблокировано]'}
            </button><br />

            <button 
              onClick={() => checkAction('admin')}
              style={{ backgroundColor: perms.includes('admin') ? '#d4edda' : '#eee', padding: '8px', marginBottom: '8px', cursor: 'pointer' }}>
              3. Управление системой (право: admin) {perms.includes('admin') ? '— [Доступно]' : '— [Заблокировано]'}
            </button>

            {accessMsg && <p style={{ fontSize: 18 }}><b>{accessMsg}</b></p>}
          </div>
        )}
      </div>
    </div>
  )
}