const express = require('express');
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Swagger
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000;

// Секреты и время жизни токенов
const ACCESS_SECRET = 'access_secret_key_change_in_production';
const REFRESH_SECRET = 'refresh_secret_key_change_in_production';
const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';

// Middleware
app.use(express.json());
app.use(cors({ origin: 'http://localhost:3001', credentials: true }));

// ==================== НАСТРОЙКА ЗАГРУЗКИ ИЗОБРАЖЕНИЙ ====================

// Создаем папку для загрузок, если её нет
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log('📁 Uploads directory created:', UPLOAD_DIR);
} else {
  console.log('📁 Uploads directory exists:', UPLOAD_DIR);
}

// Настройка multer для сохранения файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Сохраняем оригинальное расширение
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
    console.log(`💾 Saving file: ${uniqueName}`);
    console.log(`   Original: ${file.originalname}`);
    console.log(`   MIME type: ${file.mimetype}`);
    cb(null, uniqueName);
  }
});

// Фильтр файлов (только изображения)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  console.log(`🔍 File check: ${file.originalname}`);
  console.log(`   Extension: ${path.extname(file.originalname)} (valid: ${extname})`);
  console.log(`   MIME type: ${file.mimetype} (valid: ${mimetype})`);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error(`Только изображения! Разрешены: jpeg, jpg, png, gif, webp. Получено: ${file.mimetype}`));
  }
};

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB лимит
  fileFilter
});

// Раздача статических файлов из папки uploads (ДО объявления маршрутов!)
app.use('/uploads', express.static(UPLOAD_DIR));

// Добавляем тестовый маршрут для проверки статических файлов
app.get('/api/check-uploads', (req, res) => {
  fs.readdir(UPLOAD_DIR, (err, files) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ 
      uploadDir: UPLOAD_DIR,
      files: files,
      filesWithUrls: files.map(f => `/uploads/${f}`)
    });
  });
});

// ==================== РАБОТА С JSON ФАЙЛОМ ====================

const DB_PATH = path.join(__dirname, 'db.json');

// Инициализация файла БД, если его нет
function initDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initialData = {
      users: [
        {
          id: nanoid(6),
          email: 'admin@example.com',
          first_name: 'Admin',
          last_name: 'User',
          role: 'admin',
          isBlocked: false,
          hashedPassword: '$2b$10$JimyATOMbdi7iTUqBdvPiuyWDIV1UnMz..u6JvG5sRhDaha85lc72' // password: "admin123"
        }
      ],
      products: [],
      refreshTokens: []
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
    console.log('✅ Database file created: db.json');
  }
}

// Чтение всей БД
function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading database:', err);
    return { users: [], products: [], refreshTokens: [] };
  }
}

// Запись всей БД
function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ РАБОТЫ С БД ====================

function getUsers() {
  return readDB().users;
}

function saveUsers(users) {
  const db = readDB();
  db.users = users;
  writeDB(db);
}

function getProducts() {
  return readDB().products;
}

function saveProducts(products) {
  const db = readDB();
  db.products = products;
  writeDB(db);
}

function getRefreshTokens() {
  return readDB().refreshTokens || [];
}

function saveRefreshTokens(refreshTokens) {
  const db = readDB();
  db.refreshTokens = refreshTokens;
  writeDB(db);
}

function addRefreshToken(token) {
  const tokens = getRefreshTokens();
  tokens.push(token);
  saveRefreshTokens(tokens);
}

function removeRefreshToken(token) {
  const tokens = getRefreshTokens();
  const filtered = tokens.filter(t => t !== token);
  saveRefreshTokens(filtered);
}

function hasRefreshToken(token) {
  return getRefreshTokens().includes(token);
}

// Удаление изображения товара
function deleteProductImage(imageUrl) {
  if (imageUrl) {
    const imagePath = path.join(__dirname, imageUrl);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      console.log(`🗑️ Deleted image: ${imagePath}`);
    }
  }
}

// ==================== ХЕШИРОВАНИЕ ПАРОЛЕЙ ====================

const saltRounds = 10;
async function hashPassword(password) {
  return bcrypt.hash(password, saltRounds);
}
async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

// ==================== ПОИСК ====================

function findUserByEmail(email, res) {
  const users = getUsers();
  const user = users.find(u => u.email === email);
  if (!user && res) {
    res.status(404).json({ error: "User not found" });
    return null;
  }
  return user;
}

function findUserById(id, res) {
  const users = getUsers();
  const user = users.find(u => u.id === id);
  if (!user && res) {
    res.status(404).json({ error: "User not found" });
    return null;
  }
  return user;
}

function findProductOr404(id, res) {
  const products = getProducts();
  const product = products.find(p => p.id === id);
  if (!product && res) {
    res.status(404).json({ error: "Product not found" });
    return null;
  }
  return product;
}

// ==================== ГЕНЕРАЦИЯ ТОКЕНОВ ====================

function generateAccessToken(user) {
  return jwt.sign(
    { 
      sub: user.id, 
      email: user.email, 
      first_name: user.first_name, 
      last_name: user.last_name,
      role: user.role 
    },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
}

// ==================== MIDDLEWARE ====================

// Проверка аутентификации с проверкой актуальной роли из БД
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");
  
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  
  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    const users = getUsers();
    const userFromDB = users.find(u => u.id === payload.sub);
    
    if (!userFromDB) {
      console.log(`❌ User not found in DB: ${payload.sub}`);
      return res.status(401).json({ error: "User not found. Please login again." });
    }
    
    if (userFromDB.isBlocked) {
      console.log(`❌ User is blocked: ${userFromDB.email}`);
      return res.status(401).json({ error: "User is blocked. Please login again." });
    }
    
    if (userFromDB.role !== payload.role) {
      console.log(`⚠️ Role changed: token(${payload.role}) → DB(${userFromDB.role}) for user ${userFromDB.email}`);
      return res.status(401).json({ 
        error: "Your role has been changed. Please login again.",
        forceLogout: true 
      });
    }
    
    req.user = { 
      sub: userFromDB.id,
      email: userFromDB.email,
      first_name: userFromDB.first_name,
      last_name: userFromDB.last_name,
      role: userFromDB.role 
    };
    
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Access token expired" });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: "Invalid token" });
    }
    console.error("Auth middleware error:", err);
    return res.status(401).json({ error: "Authentication failed" });
  }
}

// Проверка ролей
function roleMiddleware(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied: insufficient permissions" });
    }
    next();
  };
}

// ==================== SWAGGER КОНФИГУРАЦИЯ ====================

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RBAC API - Управление доступом на основе ролей',
      version: '1.0.0',
      description: `
        API интернет-магазина с системой ролей (RBAC).
        
        ## Роли:
        - **user** - только просмотр товаров
        - **seller** - управление товарами (создание, редактирование)
        - **admin** - полный доступ (управление пользователями + товарами)
        
        ## Аутентификация:
        Используется Bearer токен. Получите токен через /api/auth/login.
        
        ## Тестовый администратор:
        - Email: admin@example.com
        - Пароль: admin123
      `,
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Локальный сервер разработки',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Введите токен в формате: Bearer <token>',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'abc123' },
            email: { type: 'string', example: 'user@example.com' },
            first_name: { type: 'string', example: 'Иван' },
            last_name: { type: 'string', example: 'Петров' },
            role: { type: 'string', enum: ['user', 'seller', 'admin'], example: 'user' },
            isBlocked: { type: 'boolean', example: false },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'prod123' },
            title: { type: 'string', example: 'Чай Пуэр' },
            category: { type: 'string', example: 'Черный чай' },
            description: { type: 'string', example: 'Отличный китайский чай' },
            price: { type: 'number', example: 2990 },
            imageUrl: { type: 'string', example: '/uploads/1234567890-image.jpg' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', example: 'user@example.com' },
            password: { type: 'string', example: 'password123' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'first_name', 'last_name', 'password'],
          properties: {
            email: { type: 'string', example: 'newuser@example.com' },
            first_name: { type: 'string', example: 'Иван' },
            last_name: { type: 'string', example: 'Иванов' },
            password: { type: 'string', example: 'password123' },
          },
        },
        RefreshRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
        UpdateUserRequest: {
          type: 'object',
          properties: {
            first_name: { type: 'string', example: 'Петр' },
            last_name: { type: 'string', example: 'Сидоров' },
            role: { type: 'string', enum: ['user', 'seller', 'admin'], example: 'seller' },
            isBlocked: { type: 'boolean', example: false },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./server.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ==================== МАРШРУТЫ АУТЕНТИФИКАЦИИ ====================

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация нового пользователя
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Пользователь успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Ошибка валидации или email уже существует
 */
app.post("/api/auth/register", async (req, res) => {
  const { email, first_name, last_name, password } = req.body;
  if (!email || !first_name || !last_name || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }
  
  const users = getUsers();
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: "User with this email already exists" });
  }
  
  const hashedPassword = await hashPassword(password);
  const newUser = {
    id: nanoid(6),
    email,
    first_name,
    last_name,
    role: 'user',
    isBlocked: false,
    hashedPassword
  };
  
  users.push(newUser);
  saveUsers(users);
  
  const { hashedPassword: _, ...userWithoutPassword } = newUser;
  res.status(201).json(userWithoutPassword);
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход в систему
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Успешный вход
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Отсутствуют обязательные поля
 *       401:
 *         description: Неверные учетные данные
 *       403:
 *         description: Пользователь заблокирован
 */
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  
  const user = findUserByEmail(email, res);
  if (!user) return;
  
  if (user.isBlocked) {
    return res.status(403).json({ error: "User is blocked" });
  }
  
  const isValid = await verifyPassword(password, user.hashedPassword);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid password" });
  }
  
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  addRefreshToken(refreshToken);
  
  res.json({ accessToken, refreshToken });
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Обновление пары токенов
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshRequest'
 *     responses:
 *       200:
 *         description: Новая пара токенов
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Отсутствует refreshToken
 *       401:
 *         description: Невалидный или истекший refresh-токен
 *       403:
 *         description: Пользователь заблокирован
 */
app.post("/api/auth/refresh", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: "refreshToken is required" });
  }
  if (!hasRefreshToken(refreshToken)) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }
  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = findUserById(payload.sub, null);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    if (user.isBlocked) {
      return res.status(403).json({ error: "User is blocked" });
    }
    removeRefreshToken(refreshToken);
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    addRefreshToken(newRefreshToken);
    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    removeRefreshToken(refreshToken);
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Получение информации о текущем пользователе
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Данные пользователя
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Не авторизован
 */
app.get("/api/auth/me", authMiddleware, (req, res) => {
  const userId = req.user.sub;
  const user = findUserById(userId, res);
  if (!user) return;
  const { hashedPassword: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// ==================== МАРШРУТЫ УПРАВЛЕНИЯ ПОЛЬЗОВАТЕЛЯМИ (ТОЛЬКО АДМИН) ====================

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Получить список всех пользователей
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Список пользователей
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       403:
 *         description: Доступ запрещен (требуется роль admin)
 */
app.get("/api/users", authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const users = getUsers();
  const usersWithoutPasswords = users.map(({ hashedPassword, ...rest }) => rest);
  res.json(usersWithoutPasswords);
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Обновить информацию о пользователе
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRequest'
 *     responses:
 *       200:
 *         description: Обновленный пользователь
 *       403:
 *         description: Доступ запрещен
 *       404:
 *         description: Пользователь не найден
 */
app.put("/api/users/:id", authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  const id = req.params.id;
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === id);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: "User not found" });
  }
  
  const { first_name, last_name, role, isBlocked } = req.body;
  
  const oldRole = users[userIndex].role;
  const oldBlockedStatus = users[userIndex].isBlocked;
  
  if (first_name !== undefined) users[userIndex].first_name = first_name.trim();
  if (last_name !== undefined) users[userIndex].last_name = last_name.trim();
  if (role !== undefined && ['user', 'seller', 'admin'].includes(role)) {
    users[userIndex].role = role;
  }
  if (isBlocked !== undefined) users[userIndex].isBlocked = isBlocked;
  
  saveUsers(users);
  
  const wasUnblocked = oldBlockedStatus === true && isBlocked === false;
  const roleChanged = oldRole !== users[userIndex].role;
  const wasBlocked = isBlocked === true;
  
  if (roleChanged || wasBlocked || wasUnblocked) {
    const refreshTokensList = getRefreshTokens();
    const userRefreshTokens = refreshTokensList.filter(token => {
      try {
        const decoded = jwt.verify(token, REFRESH_SECRET);
        return decoded.sub === id;
      } catch {
        return false;
      }
    });
    
    const remainingTokens = refreshTokensList.filter(
      token => !userRefreshTokens.includes(token)
    );
    saveRefreshTokens(remainingTokens);
    
    console.log(`🔄 Обновление пользователя ${users[userIndex].email}: roleChanged=${roleChanged}, wasBlocked=${wasBlocked}, wasUnblocked=${wasUnblocked}`);
  }
  
  const { hashedPassword, ...userWithoutPassword } = users[userIndex];
  res.json({ 
    ...userWithoutPassword,
    forceLogout: roleChanged || wasBlocked || wasUnblocked
  });
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Заблокировать пользователя
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Пользователь заблокирован
 *       403:
 *         description: Доступ запрещен
 *       404:
 *         description: Пользователь не найден
 */
app.delete("/api/users/:id", authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const id = req.params.id;
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === id);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: "User not found" });
  }
  
  users[userIndex].isBlocked = true;
  saveUsers(users);
  
  res.status(204).send();
});

/**
 * @swagger
 * /api/users/{id}/unblock:
 *   patch:
 *     summary: Разблокировать пользователя
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Пользователь разблокирован
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       403:
 *         description: Доступ запрещен
 *       404:
 *         description: Пользователь не найден
 */
app.patch("/api/users/:id/unblock", authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const id = req.params.id;
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === id);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: "User not found" });
  }
  
  if (req.user.sub === id) {
    return res.status(400).json({ error: "You cannot unblock yourself through this endpoint" });
  }
  
  users[userIndex].isBlocked = false;
  saveUsers(users);
  
  const { hashedPassword, ...userWithoutPassword } = users[userIndex];
  res.json({ 
    ...userWithoutPassword,
    message: "User has been unblocked"
  });
});

// ==================== МАРШРУТЫ ДЛЯ ТОВАРОВ ====================

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить список всех товаров
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Список товаров
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
app.get("/api/products", authMiddleware, (req, res) => {
  const products = getProducts();
  res.json(products);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить товар по ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Данные товара
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Товар не найден
 */
app.get("/api/products/:id", authMiddleware, (req, res) => {
  const id = req.params.id;
  const product = findProductOr404(id, res);
  if (!product) return;
  res.json(product);
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать новый товар с изображением
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Товар создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Ошибка валидации
 *       403:
 *         description: Доступ запрещен (требуется роль seller или admin)
 */
app.post("/api/products", authMiddleware, roleMiddleware(['seller', 'admin']), upload.single('image'), (req, res) => {
  const { title, category, description, price } = req.body;
  
  if (!title || !category || !description || price === undefined) {
    // Если пришло изображение, но ошибка валидации - удаляем его
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({ error: "All fields are required" });
  }
  
  const products = getProducts();
  const newProduct = {
    id: nanoid(6),
    title: title.trim(),
    category: category.trim(),
    description: description.trim(),
    price: Number(price),
    imageUrl: req.file ? `/uploads/${req.file.filename}` : null
  };
  
  products.push(newProduct);
  saveProducts(products);
  
  console.log(`✅ Product created: ${newProduct.title} with image: ${newProduct.imageUrl || 'no image'}`);
  res.status(201).json(newProduct);
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Полное обновление товара с изображением
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Обновленный товар
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Ошибка валидации
 *       403:
 *         description: Доступ запрещен (требуется роль seller или admin)
 *       404:
 *         description: Товар не найден
 */
app.put("/api/products/:id", authMiddleware, roleMiddleware(['seller', 'admin']), upload.single('image'), (req, res) => {
  const id = req.params.id;
  const products = getProducts();
  const productIndex = products.findIndex(p => p.id === id);
  
  if (productIndex === -1) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(404).json({ error: "Product not found" });
  }
  
  const { title, category, description, price } = req.body;
  
  if (!title || !category || !description || price === undefined) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({ error: "All fields are required for update" });
  }
  
  // Если загружено новое изображение - удаляем старое
  let imageUrl = products[productIndex].imageUrl;
  if (req.file) {
    if (imageUrl) {
      deleteProductImage(imageUrl);
    }
    imageUrl = `/uploads/${req.file.filename}`;
  }
  
  products[productIndex] = {
    ...products[productIndex],
    title: title.trim(),
    category: category.trim(),
    description: description.trim(),
    price: Number(price),
    imageUrl
  };
  
  saveProducts(products);
  
  console.log(`✏️ Product updated: ${products[productIndex].title}`);
  res.json(products[productIndex]);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Товар удален
 *       403:
 *         description: Доступ запрещен (требуется роль admin)
 *       404:
 *         description: Товар не найден
 */
app.delete("/api/products/:id", authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const id = req.params.id;
  const products = getProducts();
  const productIndex = products.findIndex(p => p.id === id);
  
  if (productIndex === -1) {
    return res.status(404).json({ error: "Product not found" });
  }
  
  // Удаляем изображение товара
  const product = products[productIndex];
  if (product.imageUrl) {
    deleteProductImage(product.imageUrl);
  }
  
  products.splice(productIndex, 1);
  saveProducts(products);
  
  console.log(`🗑️ Product deleted: ${product.title}`);
  res.status(204).send();
});

// ==================== ОБРАБОТКА ОШИБОК ====================

// Обработка ошибок multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Файл слишком большой. Максимальный размер 5MB' });
    }
    return res.status(400).json({ error: `Ошибка загрузки файла: ${err.message}` });
  }
  if (err.message === 'Только изображения! Разрешены: jpeg, jpg, png, gif, webp') {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ==================== ЗАПУСК СЕРВЕРА ====================

// Инициализируем БД перед запуском
initDB();

app.listen(port, () => {
  console.log(`\n🚀 Сервер запущен на http://localhost:${port}`);
  console.log(`📚 Swagger UI доступен на http://localhost:${port}/api-docs`);
  console.log(`📁 Загрузки сохраняются в: ${UPLOAD_DIR}`);
  console.log(`📋 Роли: user, seller, admin`);
  console.log(`💾 Данные сохраняются в файл: ${DB_PATH}`);
  console.log(`🔐 Тестовый администратор: admin@example.com / admin123\n`);
});