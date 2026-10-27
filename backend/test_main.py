from fastapi.testclient import TestClient
from main import app, Base, engine

# Пересоздаем чистую тестовую базу перед запуском тестов
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

client = TestClient(app)

# 1. Тест успешной регистрации
def test_register_success():
    res = client.post("/api/register", json={"login": "ivan_1", "password": "Password1!", "role": "user"})
    assert res.status_code == 200
    assert res.json()["message"] == "user создан"

# 2. Тест дублирующего логина (ошибка 409)
def test_duplicate_login():
    client.post("/api/register", json={"login": "ivan_dup", "password": "Password1!"})
    res = client.post("/api/register", json={"login": "ivan_dup", "password": "Password1!"})
    assert res.status_code == 409

# 3. Тест слабого пароля (ошибка 422)
def test_weak_password():
    res = client.post("/api/register", json={"login": "ivan_weak", "password": "123"})
    assert res.status_code == 422

# 4. Тест разрешенного доступа (админ может делать админ-действие)
def test_access_allowed():
    client.post("/api/register", json={"login": "boss", "password": "Password1!", "role": "admin"})
    res = client.get("/api/action/admin?login=boss")
    assert res.status_code == 200

# 5. Тест запрещенного доступа (обычный user НЕ может делать админ-действие)
def test_access_denied():
    client.post("/api/register", json={"login": "simple_user", "password": "Password1!", "role": "user"})
    res = client.get("/api/action/admin?login=simple_user")
    assert res.status_code == 403