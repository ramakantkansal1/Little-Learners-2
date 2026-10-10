# Architecture Document

## Happy Little Learners - System Architecture

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────────────┐  │
│  │   Parent Web     │  │   Student Web    │  │      Admin Web             │  │
│  │   (React/TS)     │  │   (React/TS)     │  │      (React/TS)            │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────────┬───────────────┘  │
│           │                     │                          │                  │
│           └─────────────────────┼──────────────────────────┘                  │
│                                 │                                             │
│                    ┌────────────▼────────────┐                                │
│                    │    API Gateway /        │                                │
│                    │    Load Balancer        │                                │
│                    └────────────┬────────────┘                                │
└─────────────────────────────────┼─────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼─────────────────────────────────────────────┐
│                           APPLICATION LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        FASTAPI BACKEND                                   │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │   │
│  │  │  Auth    │ │ Parent   │ │ Student  │ │ Curriculum│ │   Admin      │  │   │
│  │  │  Module  │ │  Module  │ │  Module  │ │  Module  │ │   Module     │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │   │
│  │  │ Progress │ │ Media    │ │Analytics │ │ Notification│ │  Settings   │  │   │
│  │  │ Module   │ │ Module   │ │ Module   │ │  Module  │ │   Module     │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────┼─────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼─────────────────────────────────────────────┐
│                            DATA LAYER                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │   MySQL 8.x     │  │   Redis         │  │   File Storage               │  │
│  │   (Primary)     │  │   (Cache/Sess)  │  │   (Local/S3)                 │  │
│  └─────────────────┘  └─────────────────┘  └──────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Architecture (React + TypeScript + Vite)

### 2.1 Module Structure

```
frontend/src/
├── app/                    # Application bootstrap
│   ├── router/            # React Router configuration
│   │   ├── routes.tsx     # Route definitions
│   │   ├── guards.tsx     # Route guards (auth, role)
│   │   └── index.ts
│   └── providers/         # Context providers
│       ├── AuthProvider.tsx
│       ├── ThemeProvider.tsx
│       ├── LanguageProvider.tsx
│       └── QueryProvider.tsx
├── components/            # Shared UI components (atomic design)
│   ├── common/           # Atoms: Button, Input, Card, Modal, etc.
│   ├── navigation/       # NavBar, Sidebar, Breadcrumbs
│   ├── learning/         # ActivityContainer, LessonCard, ProgressRing
│   └── forms/            # FormField, FormSelect, ValidationMessage
├── features/             # Feature-based modules (domain-driven)
│   ├── authentication/   # Login, Register, PasswordReset
│   ├── profiles/         # Parent/Student profile management
│   ├── curriculum/       # Stage, Subject, Topic, Lesson browsing
│   ├── activities/       # Activity engine, components, results
│   ├── progress/         # Progress tracking, reports
│   └── analytics/        # Charts, dashboards
├── hooks/                # Custom React hooks
│   ├── useAuth.ts
│   ├── useApi.ts
│   ├── useLocalStorage.ts
│   └── useMediaQuery.ts
├── layouts/              # Page layout wrappers
│   ├── PublicLayout.tsx
│   ├── AuthLayout.tsx
│   ├── ParentLayout.tsx
│   ├── StudentLayout.tsx
│   └── AdminLayout.tsx
├── pages/                # Page components organized by role
│   ├── public/           # Landing, About, Contact, FAQ
│   ├── auth/             # Login, Register, ForgotPassword
│   ├── parent/           # Dashboard, Children, Progress, Settings
│   ├── student/          # LearningDashboard, ActivityPlayer, Rewards
│   └── admin/            # AdminDashboard, ContentManager, Users
├── services/             # API service layer
│   ├── api.ts            # Axios instance with interceptors
│   ├── authApi.ts
│   ├── curriculumApi.ts
│   ├── progressApi.ts
│   └── adminApi.ts
├── schemas/              # Zod validation schemas
├── types/                # TypeScript type definitions
├── utils/                # Utility functions
│   ├── date.ts
│   ├── format.ts
│   ├── validation.ts
│   └── constants.ts
└── main.tsx              # Application entry point
```

### 2.2 State Management

- **Server State**: TanStack Query (React Query) for caching, synchronization
- **Client State**: React Context + useReducer for auth, theme, language
- **Form State**: React Hook Form with Zod resolvers
- **URL State**: React Router for navigation state

### 2.3 Routing Strategy

```
/                                    # Landing page (public)
/auth/
  ├── parent/login                   # Parent login
  ├── parent/register                # Parent registration
  ├── student/login                  # Student login (PIN-based)
  ├── forgot-password                # Password reset request
  └── reset-password                 # Password reset form
/parent/                             # Protected: Parent role required
  ├── dashboard                      # Parent dashboard
  ├── children                       # Child management
  │   ├── /:childId                  # Child profile
  │   └── /:childId/progress         # Child progress reports
  ├── settings                       # Parent account settings
  └── notifications                  # Notifications center
/student/                            # Protected: Student role required
  ├── dashboard                      # Student learning dashboard
  ├── learn/:lessonId                # Lesson player
  ├── activity/:activityId           # Activity player
  ├── rewards                        # Rewards & achievements
  └── history                        # Learning history
/admin/                              # Protected: Admin role required
  ├── dashboard                      # Admin dashboard
  ├── users                          # User management
  ├── curriculum/                    # Curriculum management
  │   ├── stages                     # Learning stages
  │   ├── domains                    # Learning domains
  │   ├── subjects                   # Subjects
  │   ├── topics                     # Topics
  │   ├── lessons                    # Lessons CRUD
  │   └── activities                 # Activities CRUD
  ├── media                          # Media library
  ├── analytics                      # Platform analytics
  ├── audit-logs                     # Audit logs
  └── settings                       # Platform settings
```

---

## 3. Backend Architecture (FastAPI + Python)

### 3.1 Module Structure

```
backend/app/
├── api/
│   └── routes/              # API route handlers (versioned)
│       ├── v1/
│       │   ├── auth.py
│       │   ├── parents.py
│       │   ├── students.py
│       │   ├── curriculum.py
│       │   ├── progress.py
│       │   ├── admin.py
│       │   └── health.py
│       └── deps.py          # Dependency injection (DB, auth, permissions)
├── core/
│   ├── config.py            # Settings management (Pydantic Settings)
│   ├── security.py          # Password hashing, JWT, CSRF
│   ├── database.py          # Database engine, session management
│   ├── exceptions.py        # Custom exceptions, error handlers
│   └── middleware.py        # Custom middleware (logging, timing)
├── db/
│   ├── base.py              # Declarative base
│   └── session.py           # Async session factory
├── models/                  # SQLAlchemy ORM models
│   ├── user.py
│   ├── profile.py
│   ├── curriculum.py
│   ├── progress.py
│   ├── media.py
│   ├── rewards.py
│   ├── notifications.py
│   └── audit.py
├── schemas/                 # Pydantic schemas (request/response)
│   ├── auth.py
│   ├── user.py
│   ├── curriculum.py
│   ├── progress.py
│   ├── admin.py
│   └── common.py            # Pagination, ErrorResponse, etc.
├── repositories/            # Data access layer (Repository pattern)
│   ├── user_repo.py
│   ├── curriculum_repo.py
│   ├── progress_repo.py
│   └── admin_repo.py
├── services/                # Business logic layer
│   ├── auth_service.py
│   ├── curriculum_service.py
│   ├── progress_service.py
│   ├── media_service.py
│   ├── notification_service.py
│   └── reward_service.py
├── permissions/             # RBAC implementation
│   ├── roles.py             # Role definitions
│   ├── policies.py          # Permission policies
│   └── dependencies.py      # FastAPI permission dependencies
├── middleware/              # Custom middleware
│   ├── logging_middleware.py
│   ├── rate_limit_middleware.py
│   └── csrf_middleware.py
├── utils/                   # Utility functions
│   ├── validators.py
│   ├── helpers.py
│   └── constants.py
├── scripts/                 # Standalone scripts
│   ├── seed_data.py
│   ├── create_admin.py
│   └── backup_db.py
├── tests/                   # Pytest tests
│   ├── unit/
│   ├── integration/
│   └── conftest.py
└── main.py                  # FastAPI application factory
```

### 3.2 Request Flow

```
HTTP Request
     │
     ▼
┌─────────────────────────────────────────┐
│         Middleware Stack                │
│  • CORS                                 │
│  • Request Logging                      │
│  • Rate Limiting                        │
│  • CSRF Protection (state-changing)     │
│  • Security Headers                     │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│         Route Handler                   │
│  • Path parameter validation            │
│  • Query parameter validation           │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│         Dependency Injection            │
│  • Database Session                     │
│  • Current User (Auth)                  │
│  • Permission Checks (RBAC)             │
│  • Request Body Validation (Pydantic)   │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│         Service Layer                   │
│  • Business Logic                       │
│  • Transaction Management               │
│  • Repository Orchestration             │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│         Repository Layer                │
│  • Database Queries (SQLAlchemy)        │
│  • Data Mapping                         │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│         Database (MySQL)                │
└─────────────────────────────────────────┘
```

### 3.3 Authentication & Authorization

#### Authentication Flow

```
1. Parent registers → Email verification (mock in dev) → Account created
2. Parent logs in → Credentials verified → JWT access + refresh tokens issued
3. Tokens stored in HttpOnly, Secure, SameSite=Strict cookies
4. Subsequent requests → Cookie sent automatically → JWT validated
5. Access token expires → Refresh token used to get new access token
6. Logout → Tokens revoked (added to blocklist) → Cookies cleared
```

#### Authorization (RBAC)

```python
# Role hierarchy
Role.ADMIN > Role.PARENT > Role.STUDENT

# Permissions by role
ADMIN:     All permissions + user management + system config
PARENT:    Own profile, children management, progress viewing, settings
STUDENT:   Own learning dashboard, activities, rewards, history

# Implementation
- Backend: Permission dependencies on every protected route
- Frontend: Route guards + conditional rendering based on user role
- Database: Role stored in user_roles table, verified on each request
```

---

## 4. Database Architecture (MySQL 8.x)

### 4.1 Design Principles

- **Normalization**: 3NF for transactional tables
- **UTF-8**: `utf8mb4` charset, `utf8mb4_unicode_ci` collation
- **Soft Deletes**: `deleted_at` timestamp for audit trail
- **Timestamps**: `created_at`, `updated_at` on all tables
- **Indexes**: On all foreign keys and frequent query columns
- **Constraints**: Foreign keys, unique constraints, check constraints

### 4.2 Core Entity Groups

```
USERS & AUTHENTICATION
├── users                    # Core user accounts
├── roles                    # Role definitions (admin, parent, student)
├── user_roles               # Many-to-many user-role mapping
├── refresh_tokens           # JWT refresh token store (revocation)
└── password_resets          # Password reset tokens

PROFILES & RELATIONSHIPS
├── parent_profiles          # Parent/guardian details
├── student_profiles         # Child profiles (minimal PII)
├── parent_student_relationships  # Parent-child links
└── consent_records          # Privacy consent tracking

CURRICULUM (Hierarchical)
├── learning_stages          # Playgroup, Nursery, LKG, UKG
├── learning_domains         # Language, Math, Physical, etc.
├── subjects                 # English, Hindi, Mathematics, etc.
├── topics                   # Specific topics within subjects
├── learning_objectives      # Measurable learning goals
├── lessons                  # Learning units
├── lesson_translations      # Multilingual lesson content
├── activities               # Interactive activities
├── activity_translations    # Multilingual activity content
├── questions                # Quiz/assessment questions
├── answer_options           # Answer choices for questions
└── media_assets             # Images, audio, video files

PROGRESS & ENGAGEMENT
├── student_enrollments      # Student → Stage/Subject assignment
├── student_lesson_progress  # Lesson completion tracking
├── activity_attempts        # Activity attempt records
├── activity_responses       # Individual question responses
├── student_rewards          # Reward definitions
└── student_reward_awards    # Earned rewards

ADMIN & SYSTEM
├── user_preferences         # User settings (language, audio, etc.)
├── parent_notifications     # In-app notifications
├── audit_logs               # Admin action audit trail
└── data_deletion_requests   # GDPR/DPDP compliance
```

---

## 5. API Design (RESTful)

### 5.1 Conventions

- **Versioning**: URL-based (`/api/v1/`)
- **Naming**: kebab-case for URLs, snake_case for JSON
- **HTTP Verbs**: GET, POST, PATCH, DELETE (no PUT for partial updates)
- **Status Codes**: Standard REST codes (200, 201, 400, 401, 403, 404, 422, 500)
- **Pagination**: Cursor-based for lists (`?cursor=&limit=`)
- **Filtering**: Query parameters (`?stage=playgroup&status=published`)
- **Sorting**: `?sort=created_at:desc`

### 5.2 Response Format

```json
// Success
{
  "data": { ... },
  "meta": { "pagination": { ... } }
}

// Error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [{ "field": "email", "message": "Invalid email format" }]
  }
}
```

### 5.3 Key Endpoint Groups

| Module | Base Path | Description |
|--------|-----------|-------------|
| Auth | `/api/v1/auth` | Login, register, tokens, password reset |
| Parents | `/api/v1/parents` | Parent profile, children management |
| Students | `/api/v1/students` | Student profile, learning dashboard |
| Curriculum | `/api/v1/curriculum` | Stages, subjects, lessons, activities |
| Progress | `/api/v1/progress` | Activity attempts, completion, reports |
| Admin | `/api/v1/admin` | User mgmt, content mgmt, analytics, audit |
| Media | `/api/v1/media` | Upload, serve, manage assets |
| Health | `/api/v1/health` | System health checks |

---

## 6. Security Architecture

### 6.1 Defense in Depth

```
┌────────────────────────────────────────────────────────────┐
│                    NETWORK SECURITY                         │
│  • HTTPS everywhere (TLS 1.3)                              │
│  • CORS restricted to known origins                        │
│  • Rate limiting on auth endpoints                         │
│  • DDoS protection (cloud provider)                        │
└────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────┐
│                   APPLICATION SECURITY                      │
│  • Input validation (Pydantic/Zod)                         │
│  • Output encoding (XSS prevention)                        │
│  • CSRF tokens for forms                                   │
│  • Secure headers (CSP, HSTS, X-Frame-Options)             │
│  • SQL injection prevention (ORM parameterization)         │
└────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────┐
│                   AUTHENTICATION & AUTHZ                    │
│  • Argon2id password hashing                               │
│  • JWT with short expiry + refresh rotation                │
│  • HttpOnly, Secure, SameSite=Strict cookies               │
│  • Role-based access control (backend enforcement)         │
│  • Permission-based resource access                        │
└────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────┐
│                    DATA SECURITY                            │
│  • Encryption at rest (MySQL TDE)                          │
│  • Encryption in transit (TLS)                             │
│  • PII minimization for children                           │
│  • Audit logging for sensitive operations                  │
│  • Data retention & deletion policies                      │
└────────────────────────────────────────────────────────────┘
```

### 6.2 Children's Privacy (DPDP Act Compliance)

- **Data Minimization**: Only collect essential data (name, DOB optional, avatar)
- **Parental Consent**: Explicit consent for each child profile
- **Access Control**: Parents only access own children's data
- **Right to Erasure**: Account/data deletion workflow
- **No Profiling**: No behavioral advertising or tracking
- **Data Localization**: Consider India data residency requirements

---

## 7. Deployment Architecture

### 7.1 Development

```
docker-compose.yml
├── mysql:8.0           # Database
├── redis:7-alpine      # Cache/sessions
├── backend             # FastAPI (hot reload)
├── frontend            # Vite dev server (HMR)
└── adminer             # DB admin UI (optional)
```

### 7.2 Production

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   CDN/WAF   │────▶│  Load Bal.  │────▶│  Frontend   │
│  (Cloudflare)│    │  (nginx)    │     │  (nginx)    │
└─────────────┘     └─────────────┘     └─────────────┘
                            │
                            ▼
                     ┌─────────────┐     ┌─────────────┐
                     │  Backend    │────▶│   MySQL     │
                     │  (Gunicorn  │     │  (Primary)  │
                     │  + Uvicorn) │     └─────────────┘
                     └─────────────┘           │
                            │                  │
                            ▼                  ▼
                     ┌─────────────┐     ┌─────────────┐
                     │   Redis     │     │  MySQL      │
                     │  (Cluster)  │     │  (Replica)  │
                     └─────────────┘     └─────────────┘
                            │
                            ▼
                     ┌─────────────┐
                     │   S3/MinIO  │
                     │  (Media)    │
                     └─────────────┘
```

### 7.3 CI/CD Pipeline

```
Git Push → GitHub Actions
  ├── Lint & Format Check
  ├── Type Check (TypeScript/Python)
  ├── Unit Tests (Backend + Frontend)
  ├── Integration Tests
  ├── Build Docker Images
  ├── Security Scan (Trivy/Dependabot)
  ├── Deploy to Staging
  ├── E2E Tests (Playwright)
  └── Deploy to Production (manual approval)
```

---

## 8. Monitoring & Observability

### 8.1 Logging

- **Structured JSON logging** (Python `structlog`, frontend `pino`)
- **Log levels**: DEBUG, INFO, WARNING, ERROR, CRITICAL
- **Correlation IDs** for request tracing

### 8.2 Metrics

- **Application**: Request latency, error rate, throughput
- **Business**: Active users, lesson completion, engagement
- **Infrastructure**: CPU, memory, disk, DB connections

### 8.3 Alerting

- Error rate > 1% for 5 minutes
- P95 latency > 2 seconds
- Database connection pool exhaustion
- Disk space < 20%

---

## 9. Technology Decisions & Rationale

| Decision | Rationale |
|----------|-----------|
| React + TypeScript | Type safety, large ecosystem, team familiarity |
| Vite | Fast HMR, optimized builds, modern tooling |
| Tailwind CSS | Utility-first, consistent design system, small bundle |
| FastAPI | Async support, auto OpenAPI, Pydantic integration |
| SQLAlchemy 2.0 | Async ORM, type-safe queries, mature ecosystem |
| MySQL 8.x | ACID compliance, JSON support, CTEs, window functions |
| Alembic | Version-controlled migrations, autogenerate support |
| TanStack Query | Server state management, caching, deduplication |
| Argon2id | Memory-hard password hashing, resistant to GPU attacks |
| JWT in HttpOnly Cookies | XSS-resistant token storage, CSRF mitigated |
| Docker | Consistent environments, easy deployment |

---

## 10. Future Extensibility

- **Multi-tenancy**: School/organization support via `tenant_id`
- **Mobile Apps**: React Native sharing business logic
- **Offline Support**: Service workers + IndexedDB for activities
- **AI/ML**: Personalized learning paths, speech recognition
- **Webhooks**: Third-party integrations (LMS, parent apps)
- **Real-time**: WebSocket for live collaboration, notifications

---

*Document Version: 1.0*
*Last Updated: 2026-10-09*