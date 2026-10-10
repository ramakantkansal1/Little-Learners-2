# Happy Little Learners

An Indian Early Learning Web Application for children aged 2–6 years, following India's National Curriculum Framework for the Foundational Stage (NCF-FS 2022).

## 📋 Project Overview

**Happy Little Learners** is a production-oriented, responsive web application providing:
- Engaging digital learning environment for children (ages 2-6)
- Progress monitoring for parents/guardians
- Comprehensive curriculum and user management for administrators

### Educational Stages
1. **Playgroup / Pre-Nursery** (2-3 years) - Play-based exploration
2. **Nursery** (3-4 years) - Colors, shapes, motor skills, vocabulary
3. **Lower Kindergarten (LKG)** (4-5 years) - Pre-literacy, pre-numeracy
4. **Upper Kindergarten (UKG)** (5-6 years) - Reading readiness, school preparation

## 🛠 Technology Stack

### Frontend
- React 18 + TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React Router for navigation
- Framer Motion for animations
- React Hook Form + Zod for forms
- Vitest + React Testing Library for tests

### Backend
- Python 3.11+ with FastAPI
- SQLAlchemy 2.0 (async) + Alembic for migrations
- Pydantic v2 for validation
- MySQL 8.x database
- JWT authentication with secure cookies

### Development & Deployment
- Docker & Docker Compose (v2)
- GitHub-compatible project structure
- ESLint + Prettier (frontend)
- Ruff + Black (backend)
- Playwright for E2E tests

## 📁 Project Structure

```
happy-little-learners/
├── frontend/                 # React + TypeScript + Vite
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── app/             # App-level config (router, providers)
│   │   ├── components/      # Reusable UI components
│   │   ├── features/        # Feature-based modules
│   │   ├── hooks/           # Custom React hooks
│   │   ├── layouts/         # Page layouts
│   │   ├── pages/           # Page components by role
│   │   ├── services/        # API services
│   │   ├── schemas/         # Zod validation schemas
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Utility functions
│   └── tests/               # Unit/integration tests
├── backend/                 # FastAPI + Python
│   ├── app/
│   │   ├── api/routes/      # API route handlers
│   │   ├── core/            # Core config, security
│   │   ├── db/              # Database connection
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── repositories/    # Data access layer
│   │   ├── services/        # Business logic
│   │   ├── permissions/     # RBAC
│   │   └── middleware/      # Custom middleware
│   ├── migrations/          # Alembic migrations
│   ├── scripts/             # Utility scripts
│   └── tests/               # Pytest tests
├── database/                # Database scripts & diagrams
│   ├── seed/                # Seed data
│   └── diagrams/            # ER diagrams
├── docs/                    # Documentation
├── e2e/                     # Playwright E2E tests
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose v2 (recommended)
- OR: Node.js 18+, Python 3.11+, MySQL 8.x

### Using Docker (Recommended)

```zsh
# 1. Clone and navigate
cd happy-little-learners

# 2. Copy environment file
cp .env.example .env

# 3. Edit .env with your configuration
# (At minimum, set DB_PASSWORD, MYSQL_ROOT_PASSWORD, and SECRET_KEY)

# 4. Start all services
docker compose up -d

# 5. Run database migrations
docker compose exec backend alembic upgrade head

# 6. Seed initial data (optional)
docker compose exec backend python -m app.scripts.seed_data

# 7. Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
# Adminer (DB UI): http://localhost:8080
```

### Manual Setup (Development)

#### Backend
```zsh
cd backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt

# Copy and configure environment
cp ../.env.example .env
# Edit .env with your database credentials

# Run migrations
alembic upgrade head

# Seed data
python -m app.scripts.seed_data

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend
```zsh
cd frontend

# Install dependencies
npm install

# Copy and configure environment
cp ../.env.example .env
# Edit .env if needed

# Start development server
npm run dev
```

#### Database (MySQL)
```sql
-- Create database and user (run as MySQL root)
CREATE DATABASE happy_little_learners CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'hll_user'@'%' IDENTIFIED BY 'your-secure-app-password';
GRANT ALL PRIVILEGES ON happy_little_learners.* TO 'hll_user'@'%';
FLUSH PRIVILEGES;
```

## 🧪 Testing

### Backend Tests
```zsh
cd backend
python3 -m pytest                    # Run all tests
python3 -m pytest -v                 # Verbose output
python3 -m pytest --cov=app          # With coverage
python3 -m pytest tests/unit/        # Unit tests only
python3 -m pytest tests/integration/ # Integration tests only
```

### Frontend Tests
```zsh
cd frontend
npm run test              # Run Vitest
npm run test:ui           # Vitest UI
npm run test:coverage     # With coverage
```

### E2E Tests
```zsh
# From project root
npm run test:e2e          # Run Playwright tests
npm run test:e2e:ui       # Playwright UI
```

## 📦 Building for Production

### Docker Production Build
```zsh
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### Manual Production Build
```zsh
# Backend
cd backend
python3 -m pip install -r requirements-prod.txt
# Set production environment variables
gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 120

# Frontend
cd frontend
npm run build
# Serve dist/ with nginx or similar
```

## 🗄 Database Migrations

```zsh
# Create new migration (after model changes)
cd backend
alembic revision --autogenerate -m "description of changes"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1

# View history
alembic history
```

## 📚 Documentation

- [Architecture](docs/Architecture.md) - System architecture overview
- [Database Design](docs/Database.md) - ER diagram and schema documentation
- [API Design](docs/API.md) - REST API endpoints and schemas
- [Curriculum](docs/Curriculum.md) - Educational content structure
- [Security](docs/Security.md) - Security implementation details
- [Deployment](docs/Deployment.md) - Production deployment guide

## 🔐 Security Features

- Argon2id password hashing
- JWT with secure HttpOnly cookies
- Role-based access control (Student, Parent, Admin)
- CSRF protection for state-changing operations
- Rate limiting on auth endpoints
- Input validation with Pydantic/Zod
- SQL injection prevention via ORM
- Audit logging for admin actions
- Children's data privacy controls

## ♿ Accessibility

- WCAG 2.1 AA compliance target
- Large touch targets (min 44x44px)
- High contrast color schemes
- Keyboard navigation support
- Screen reader compatible
- Reduced motion support
- Multilingual support (English, Hindi)

## 🌐 Supported Languages

- English (primary)
- Hindi (primary)
- Extensible for additional Indian languages

## 📄 License

Proprietary - All rights reserved.

## 🤝 Contributing

This is a private project. Please refer to internal contribution guidelines.

## 📞 Support

For technical issues, please check the documentation or contact the development team.