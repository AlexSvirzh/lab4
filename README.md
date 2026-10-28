# Лабораторная работа №4: Регистрация пользователя и модели разграничения доступа (Вариант 3 — Ролевая модель)

Минимальное веб-приложение с регистрацией пользователей (React + FastAPI + PostgreSQL), безопасным хэшированием паролей по алгоритму **Argon2id** и реализацией **ролевой модели разграничения доступа (RBAC)** на стороне сервера.

---

## 1. Инструкция запуска через `docker compose up`

Для запуска проекта требуется установленный **Docker** и **Docker Compose**.

### Шаг 1. Подготовка файла окружения
Скопируйте пример конфигурационного файла `.env.example` в `.env`:
```bash
cp .env.example .env
```
*(На Windows в PowerShell можно выполнить: `copy .env.example .env`)*

### Шаг 2. Запуск контейнеров
Запустите все сервисы (`frontend`, `backend`, `db`) одной командой:
```bash
docker compose up --build
```
При старте контейнера `backend` автоматически выполняются миграции базы данных (`alembic upgrade head`), создающие таблицы `users`, `roles` и `role_permissions`.

### Доступные адреса после запуска:
- **Frontend (Страница регистрации и проверки ролей):** [http://localhost:5173/register](http://localhost:5173/register)
- **Backend API (Интерактивная документация Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

### Шаг 3. Запуск автотестов (`pytest`)
Во втором окне терминала (при запущенных контейнерах) выполните:
```bash
docker compose exec backend pytest -v
```

### Остановка проекта:
```bash
docker compose down
```

---

## 2. Структура проекта

```text
lab4/
├── .env.example               # Пример переменных окружения
├── .gitignore                 # Исключения для Git
├── docker-compose.yml         # Оркестрация контейнеров frontend, backend и db
├── README.md                  # Документация проекта
├── backend/                   # Серверная часть (Python + FastAPI)
│   ├── Dockerfile             # Сборка образа для Backend
│   ├── requirements.txt       # Зависимости Python
│   ├── main.py                # Основной код API, модели БД, валидация и хэширование
│   ├── test_main.py           # Автотесты pytest
│   ├── alembic.ini            # Конфигурация миграций Alembic
│   └── alembic/               # Скрипты миграций базы данных
│       ├── env.py             # Настройка окружения Alembic
│       ├── script.py.mako     # Шаблон миграций
│       └── versions/
│           └── 001_init.py    # Начальная миграция (создание таблиц users, roles, role_permissions)
└── frontend/                  # Клиентская часть (React + Vite)
    ├── Dockerfile             # Сборка образа для Frontend
    ├── package.json           # Зависимости Node.js
    ├── vite.config.ts         # Конфигурация сборщика Vite
    ├── index.html             # Корневой HTML-шаблон
    └── src/
        ├── main.tsx           # Точка входа React-приложения
        └── App.tsx            # Форма /register и интерфейс проверки ролей
```

---

## 3. Ролевая модель доступа (Вариант 3)

В базе данных права назначаются не напрямую пользователю, а ролям (таблица `role_permissions`), а каждый пользователь получает роль (поле `role_name` в таблице `users`, связанное с таблицей `roles`).

| Роль | Назначенные права (`permissions`) | Описание возможностей |
| :--- | :--- | :--- |
| **`user`** | `read` | **Обычный пользователь:** видит как доступное и может выполнять только базовое чтение (`read`). При попытке модерации или администрирования получает отказ `403 Forbidden`. |
| **`moderator`** | `read`, `moderate` | **Модератор:** получает расширенные права — чтение (`read`) и модерация контента (`moderate`). Доступ к праву `admin` запрещен (`403 Forbidden`). |
| **`admin`** | `read`, `moderate`, `admin` | **Администратор:** получает полный доступ ко всем операциям в системе (`read`, `moderate`, `admin`). |

---

## 4. Описание API и `curl`-примеры

### 4.1. `POST /api/register` — Регистрация пользователя
Принимает JSON с полями `login`, `password` и `role` (по умолчанию `"user"`).
- **Правила валидации `login`:** от 3 до 32 символов, разрешены латинские буквы, цифры, точка (`.`), нижнее подчеркивание (`_`) и дефис (`-`).
- **Правила валидации `password`:** минимум 8 символов, минимум 1 заглавная буква, 1 строчная буква, 1 цифра и 1 специальный символ.
- **Коды ответов:**
  - `200 OK` — пользователь успешно создан: `{"message": "user создан", ...}`.
  - `409 Conflict` — указанный `login` уже занят.
  - `422 Unprocessable Entity` — ошибка валидации формата логина или сложности пароля.

#### Примеры `curl` для регистрации:

**1. Успешная регистрация обычного пользователя (`user`) и администратора (`admin`):**
```bash
curl -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -d '{"login": "user_ivan", "password": "Password1!", "role": "user"}'

curl -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -d '{"login": "admin_boss", "password": "Password1!", "role": "admin"}'
```
*Ответ (`200 OK`):*
```json
{"message": "user создан", "login": "user_ivan", "role": "user"}
```

**2. Попытка регистрации с уже занятым логином (`409 Conflict`):**
```bash
curl -i -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -d '{"login": "user_ivan", "password": "Password1!", "role": "user"}'
```
*Ответ (`409 Conflict`):*
```json
{"detail": "Этот логин уже занят"}
```

**3. Попытка регистрации со слабым паролем (`422 Unprocessable Entity`):**
```bash
curl -i -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -d '{"login": "weak_user", "password": "123", "role": "user"}'
```
*Ответ (`422 Unprocessable Entity`):*
```json
{"detail": "Ошибка валидации: проверьте формат логина и сложность пароля"}
```

---

### 4.2. `GET /api/users` — Получение списка пользователей и их прав
Возвращает список зарегистрированных пользователей, их текущую роль и перечень разрешенных прав для отображения на UI.

```bash
curl http://localhost:8000/api/users
```
*Ответ (`200 OK`):*
```json
[
  {"login": "user_ivan", "role": "user", "permissions": ["read"]},
  {"login": "admin_boss", "role": "admin", "permissions": ["read", "moderate", "admin"]}
]
```

---

### 4.3. `GET /api/action/{required_permission}?login={login}` — Проверка прав доступа (RBAC)
Проверяет на стороне backend, обладает ли роль указанного пользователя запрашиваемым правом (`read`, `moderate` или `admin`).
- **Коды ответов:**
  - `200 OK` — доступ разрешен.
  - `403 Forbidden` — у роли пользователя недостаточно прав.
  - `404 Not Found` — пользователь не найден.

#### Примеры `curl` для проверки ролевой модели:

**1. Разрешенный доступ (пользователь `user_ivan` с ролью `user` запрашивает право `read`):**
```bash
curl -i "http://localhost:8000/api/action/read?login=user_ivan"
```
*Ответ (`200 OK`):*
```json
{"message": "Доступ РАЗРЕШЕН! Роль 'user' имеет право 'read'"}
```

**2. Запрещенный доступ (пользователь `user_ivan` с ролью `user` запрашивает право `admin`):**
```bash
curl -i "http://localhost:8000/api/action/admin?login=user_ivan"
```
*Ответ (`403 Forbidden`):*
```json
{"detail": "Отказ! Ваша роль 'user' не имеет права 'admin'"}
```

**3. Полный доступ (пользователь `admin_boss` с ролью `admin` запрашивает право `admin`):**
```bash
curl -i "http://localhost:8000/api/action/admin?login=admin_boss"
```
*Ответ (`200 OK`):*
```json
{"message": "Доступ РАЗРЕШЕН! Роль 'admin' имеет право 'admin'"}
```

---

## 5. Безопасность: что сделано

1. **Хэширование Argon2id:** Пароли хэшируются с помощью алгоритма `Argon2id` (библиотека `argon2-cffi`), который автоматически генерирует криптографически стойкую уникальную соль для каждого пароля.
2. **Конфигурируемые параметры хэширования:** Параметры `ARGON2_TIME_COST`, `ARGON2_MEMORY_COST` и `ARGON2_PARALLELISM` вынесены в переменные окружения (`.env` и `.env.example`).
3. **Отсутствие паролей в открытом виде:** Сырой пароль никогда не сохраняется в базу данных и не выводится в логи (перехватчик ошибок валидации `422` логирует факт ошибки без вывода тела запроса с паролем).
4. **Защита от дублирования логина:** В таблице `users` для поля `login` задано ограничение уникальности (`unique=True`), предотвращающее создание дубликатов на уровне СУБД PostgreSQL.
5. **Серверная проверка доступа:** Все проверки прав ролевой модели выполняются непосредственно на стороне backend (FastAPI), а не только путем визуального ограничения кнопок на frontend.