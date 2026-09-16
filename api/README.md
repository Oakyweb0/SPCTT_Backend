# SPCTT 2026 - Node.js REST API with Express, MySQL, JWT & Swagger UI

## 📂 Node.js Backend Architecture
```
SPCTT 2026/
├── api/
│   ├── config/
│   │   └── db.js                 # MySQL2 Connection pool & auto table creator
│   ├── controllers/
│   │   ├── authController.js     # Signup & Login logic with bcrypt & JWT
│   │   └── userController.js     # User Profile (Get & Update) logic
│   ├── middlewares/
│   │   └── authMiddleware.js     # JWT Bearer Token validation middleware
│   ├── routes/
│   │   ├── authRoutes.js         # Routes: /api/auth/signup & /api/auth/login
│   │   └── userRoutes.js         # Protected Routes: /api/user/profile
│   ├── docs/
│   │   └── swagger.json          # OpenAPI 3.0.3 specification
│   ├── server.js                 # Express server & Swagger UI mount
│   └── README.md                 # Backend Documentation
├── .env                          # Environment variables (DB, JWT, Port)
└── package.json                  # Scripts & dependencies
```

---

## 🚀 Running the Server

### 1. Start Server
Run the following command in terminal:
```bash
npm run server
```
Or directly:
```bash
node api/server.js
```

The server runs on **`http://localhost:5000`**.

---

## 📖 Swagger UI Documentation (Interactive Testing)

Open your browser and visit:
👉 **[http://localhost:5000/api-docs](http://localhost:5000/api-docs)**

---

## 📡 API Endpoints

| Method | Endpoint | Description | Protected (JWT) |
|---|---|---|:---:|
| `POST` | `/api/auth/signup` | Register new user in MySQL & receive JWT | ❌ No |
| `POST` | `/api/auth/login` | Login with email & password to receive JWT | ❌ No |
| `GET` | `/api/user/profile` | Get authenticated user's profile details | ✅ **Yes** |
| `PUT` | `/api/user/profile` | Update user name, phone, avatar, or password | ✅ **Yes** |

---

## 🔐 JWT Authentication Flow
1. Register with **Signup** or login with **Login**.
2. Copy the `token` from the response.
3. In **Swagger UI**, click the green **Authorize** button at the top right, paste your token, and click **Authorize**.
4. In custom HTTP requests (e.g. React/Postman/Axios), send the header:
   ```http
   Authorization: Bearer <your_token>
   ```

---

## ⚙️ Environment Configuration (`.env`)
```env
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=spctt_db
JWT_SECRET=SPCTT_SECURE_JWT_SECRET_KEY_2026_!@#$%
JWT_EXPIRES_IN=24h
```
