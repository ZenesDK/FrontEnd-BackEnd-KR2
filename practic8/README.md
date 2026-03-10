# JWT Auth + CRUD API

Серверное приложение с JWT аутентификацией и управлением товарами.

## 🛠 Технологии
- Node.js + Express (сервер)
- bcrypt (хеширование паролей)
- JWT (jsonwebtoken) — токены доступа
- nanoid (генерация ID)
- Swagger / OpenAPI (документация)

## 📋 Маршруты

### Auth (публичные)
- `POST /api/auth/register` — регистрация (email, first_name, last_name, password)
- `POST /api/auth/login` — вход, получение JWT токена

### Auth (защищённые, требуется Bearer токен)
- `GET /api/auth/me` — информация о текущем пользователе

### Products (все защищены JWT)
- `GET /api/products` — список товаров
- `GET /api/products/:id` — товар по ID
- `POST /api/products` — создать товар (title, category, description, price)
- `PUT /api/products/:id` — полностью обновить товар
- `DELETE /api/products/:id` — удалить товар

## 🔐 Аутентификация

1. Зарегистрируйтесь (`/api/auth/register`)
2. Выполните вход (`/api/auth/login`), получите `accessToken`
3. При всех запросах к защищённым маршрутам добавляйте заголовок:

Сервер: http://localhost:3000
Swagger UI: http://localhost:3000/api-docs