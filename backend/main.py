import os
import re
import logging
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from argon2 import PasswordHasher

# 1. Настройка логов (выводит события INFO и ERROR в консоль)
logging.basicConfig(level=logging.INFO, format='{"level": "%(levelname)s", "message": "%(message)s"}')
logger = logging.getLogger(__name__)

# 2. Настройка базы данных и хэширования из .ENV
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

# Настраиваем Argon2id с параметрами из .env
ph = PasswordHasher(
    time_cost=int(os.getenv("ARGON2_TIME_COST", 2)),
    memory_cost=int(os.getenv("ARGON2_MEMORY_COST", 65536)),
    parallelism=int(os.getenv("ARGON2_PARALLELISM", 2))
)

# 3. Таблицы базы данных (Пользователи, Роли и Права)
class Role(Base):
    __tablename__ = "roles"
    name = Column(String, primary_key=True) # 'user', 'moderator', 'admin'

class RolePermission(Base):
    __tablename__ = "role_permissions"
    id = Column(Integer, primary_key=True)
    role_name = Column(String, ForeignKey("roles.name"))
    permission = Column(String) # 'read', 'moderate', 'admin'

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    login = Column(String(32), unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role_name = Column(String, ForeignKey("roles.name"), default="user")
    created_at = Column(DateTime, default=datetime.utcnow)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Заполняем базу базовыми ролями и их правами, если их еще нет
def init_roles(db: Session):
    if db.query(Role).count() == 0:
        db.add_all([Role(name="user"), Role(name="moderator"), Role(name="admin")])
        db.add_all([
            RolePermission(role_name="user", permission="read"),
            RolePermission(role_name="moderator", permission="read"),
            RolePermission(role_name="moderator", permission="moderate"),
            RolePermission(role_name="admin", permission="read"),
            RolePermission(role_name="admin", permission="moderate"),
            RolePermission(role_name="admin", permission="admin"),
        ])
        db.commit()

# 4. Проверка валидации логина и пароля
class RegisterForm(BaseModel):
    login: str
    password: str
    role: str = "user"

    @field_validator("login")
    @classmethod
    def check_login(cls, v):
        if not re.match(r"^[a-zA-Z0-9._-]{3,32}$", v):
            raise ValueError("Логин: 3-32 символа (латиница, цифры, точка, тире, подчеркивание)")
        return v

    @field_validator("password")
    @classmethod
    def check_password(cls, v):
        if (len(v) < 8 or not re.search(r"[A-Z]", v) or not re.search(r"[a-z]", v)
                or not re.search(r"[0-9]", v) or not re.search(r"[^a-zA-Z0-9]", v)):
            raise ValueError("Пароль: мин. 8 символов, заглавная, строчная, цифра и спецсимвол")
        return v

# 5. Создание приложения FastAPI и настройка CORS
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Если валидация не прошла - логируем ошибку без пароля и возвращаем код 422
@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    logger.error("Ошибка валидации при регистрации (пароль скрыт)")
    return JSONResponse(status_code=422, content={"detail": "Ошибка валидации: проверьте формат логина и сложность пароля"})

# Регистрация пользователя
@app.post("/api/register")
def register(form: RegisterForm, db: Session = Depends(get_db)):
    init_roles(db)

    # Проверяем, не занят ли логин (если занят — ошибка 409)
    if db.query(User).filter(User.login == form.login).first():
        logger.error(f"Попытка регистрации с занятым логином: {form.login}")
        raise HTTPException(status_code=409, detail="Этот логин уже занят")

    # Хэшируем пароль
    hashed = ph.hash(form.password)
    user = User(login=form.login, password_hash=hashed, role_name=form.role)
    db.add(user)
    db.commit()

    logger.info(f"Успешная регистрация пользователя: {form.login} с ролью {form.role}")
    return {"message": "user создан", "login": user.login, "role": user.role_name}

# Список всех пользователей 
@app.get("/api/users")
def get_users(db: Session = Depends(get_db)):
    init_roles(db)
    users = db.query(User).all()
    result = []
    for u in users:
        perms = [p.permission for p in db.query(RolePermission).filter_by(role_name=u.role_name).all()]
        result.append({"login": u.login, "role": u.role_name, "permissions": perms})
    return result

# Проверка доступа по Ролевой модели 
@app.get("/api/action/{required_permission}")
def check_access(required_permission: str, login: str, db: Session = Depends(get_db)):
    init_roles(db)
    user = db.query(User).filter_by(login=login).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    # Узнаем права роли этого пользователя из базы данных
    perms = [p.permission for p in db.query(RolePermission).filter_by(role_name=user.role_name).all()]

    if required_permission not in perms:
        logger.error(f"Отказ в доступе пользователю {login} (роль {user.role_name}) к праву {required_permission}")
        raise HTTPException(
            status_code=403,
            detail=f"Отказ! Ваша роль '{user.role_name}' не имеет права '{required_permission}'"
        )

    logger.info(f"Разрешен доступ пользователю {login} (роль {user.role_name}) к праву {required_permission}")
    return {"message": f"Доступ РАЗРЕШЕН! Роль '{user.role_name}' имеет право '{required_permission}'"}