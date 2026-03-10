# Auth + CRUD API

Серверное приложение на Node.js + Express с регистрацией, авторизацией и управлением товарами.

## 🛠 Технологии
- Node.js + Express (сервер)
- bcrypt (хеширование паролей с солью)
- nanoid (генерация ID)
- Swagger / OpenAPI (документация)

## 📋 Маршруты

### Auth
- `POST /api/auth/register` — регистрация пользователя (email, first_name, last_name, password)
- `POST /api/auth/login` — вход в систему (email, password)

### Products
- `GET /api/products` — список товаров
- `GET /api/products/:id` — товар по ID
- `POST /api/products` — создать товар (title, category, description, price)
- `PUT /api/products/:id` — полностью обновить товар
- `DELETE /api/products/:id` — удалить товар

## 🚀 Запуск

```bash
npm install
npm run dev
```

Сервер: http://localhost:3000
Swagger UI: http://localhost:3000/api-docs