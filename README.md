# SPCTT 2026 Conference REST API Backend

A production-ready Node.js & Express REST API architecture with MySQL for the SPCTT 2026 Conference.

---

## 📁 Project Architecture

```
backend/
│
├── src/
│   ├── config/
│   │   ├── database.js          # MySQL connection pool & automatic table migrations
│   │   ├── env.js               # Multi-environment config loader (.env, .env.development, .env.production)
│   │   └── cors.js              # Dynamic CORS origin resolution
│   │
│   ├── controllers/
│   │   ├── auth.controller.js          # Authentication endpoints (signup, login, adminLogin)
│   │   ├── user.controller.js          # User profile endpoints (getProfile, updateProfile)
│   │   └── registration.controller.js  # Multi-step registration & invoice endpoints
│   │
│   ├── models/
│   │   ├── User.js              # User database queries & operations
│   │   ├── Registration.js      # Registration and Invoice operations
│   │   └── Category.js          # Registration Categories queries
│   │
│   ├── routes/
│   │   ├── auth.routes.js       # /api/auth routes
│   │   ├── user.routes.js       # /api/user routes
│   │   └── registration.routes.js # /api/registration routes
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js   # JWT authentication & role-based access control
│   │   ├── error.middleware.js  # Centralized 404 & Global Exception handler
│   │   └── upload.middleware.js # Multer file upload handler
│   │
│   ├── services/
│   │   ├── auth.service.js          # Auth business logic & password hashing
│   │   ├── user.service.js          # Profile management logic
│   │   └── registration.service.js  # Multi-step calculations, GST & invoices logic
│   │
│   ├── validators/
│   │   ├── auth.validator.js         # Input validation for auth payloads
│   │   └── registration.validator.js # Input validation for registration steps
│   │
│   ├── utils/
│   │   ├── jwt.js               # JWT signing & verification utilities
│   │   ├── response.js          # Standardized JSON response formatters
│   │   └── logger.js            # Structured logger with timestamps
│   │
│   ├── app.js                   # Express application setup & middleware assembly
│   └── server.js                # Server entry point & DB initialization
│
├── uploads/                     # Storage directory for uploaded files
├── tests/                       # Automated tests & health verification
├── .env                         # Active environment configuration
├── .env.development             # Local development configuration (127.0.0.1 / XAMPP)
├── .env.production              # Production / Live server configuration (187.127.128.185)
├── .env.example                 # Configuration template with documentation
├── .gitignore                   # Git ignore file
├── package.json                 # Project scripts and dependencies
└── README.md                    # Project documentation
```

---

## ⚙️ Environment Configuration

The backend supports separated environments for both **Local Development** and **Live Production Server**:

| Environment File | Target | Description |
| :--- | :--- | :--- |
| `.env.development` | Local | Connects to local MySQL / XAMPP (`127.0.0.1:3306`), allows localhost origins. |
| `.env.production` | Server | Connects to remote production MySQL server (`187.127.128.185:3306`), enables production security settings. |
| `.env` | Default | Active environment file loaded by default. |
| `.env.example` | Template | Reference template for all configurable environment variables. |

---

## 🚀 Getting Started

### 1. Installation
```bash
npm install
```

### 2. Run with Local Development Environment
```bash
npm run start:dev
# or for live reloading:
npm run dev
```

### 3. Run with Production Server Environment
```bash
npm run start:prod
# or standard start:
npm start
```

### 4. Run Automated Tests
```bash
npm test
```

---

## 🌐 Dynamic Endpoints (No Hardcoded URLs)

All route and discovery URLs are generated dynamically based on incoming request protocol and host headers (`req.protocol + '://' + req.get('host')`) or configurable `APP_URL`.

### Core API Endpoints

#### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/register` or `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - User sign in (returns Bearer JWT)
- `POST /api/auth/admin/login` - Administrator / Manager sign in

#### 👤 User Profile (`/api/user`)
- `GET /api/user/profile` - Get authenticated user profile *(Requires JWT)*
- `PUT /api/user/profile` - Update authenticated user profile *(Requires JWT)*

#### 📝 Conference Registration Flow (`/api/registration`)
- `GET /api/registration/categories` - Fetch active registration categories
- `GET /api/registration/current` - Fetch user's active/draft registration *(Requires JWT)*
- `POST /api/registration/step1-category` - Select registration category *(Requires JWT)*
- `POST /api/registration/step2-attendee` - Save attendee contact info *(Requires JWT)*
- `POST /api/registration/step3-accompanying` - Save accompanying persons *(Requires JWT)*
- `POST /api/registration/step4-billing` - Save billing details & generate Proforma Invoice *(Requires JWT)*
- `POST /api/registration/payment` - Process payment & issue official Tax Receipt *(Requires JWT)*
- `GET /api/registration/invoices` - List user invoices *(Requires JWT)*
- `GET /api/registration/invoices/:id` - Fetch single invoice details *(Requires JWT)*

#### 📖 Interactive Documentation
- Dynamic Swagger UI: `/api-docs` or `/api/docs`
- Root API Discovery: `GET /`
