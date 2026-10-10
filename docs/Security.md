# Security Implementation Document

## Happy Little Learners - Security Architecture & Implementation

---

## 1. Security Overview

This document details the security measures implemented in the Happy Little Learners platform to protect user data, ensure privacy compliance, and prevent common vulnerabilities.

---

## 2. Authentication Security

### 2.1 Password Security

**Algorithm**: Argon2id (memory-hard, resistant to GPU/ASIC attacks)

```python
# Implementation in app/core/security.py
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

**Parameters**:
- Memory cost: 64 MB (default)
- Time cost: 3 iterations (default)
- Parallelism: 4 threads (default)
- Salt: 16 bytes random

**Password Requirements**:
- Minimum 8 characters
- No maximum length limit (up to 128 chars)
- No complexity requirements (entropy-based strength)

### 2.2 JWT Token Security

**Algorithm**: HS256 (HMAC with SHA-256)

**Token Structure**:
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "parent",
  "exp": 1704067200,
  "iat": 1704065400,
  "type": "access",
  "jti": "random_string"
}
```

**Token Lifetimes**:
- Access Token: 30 minutes (configurable)
- Refresh Token: 7 days (configurable)
- Remember Me: 30 days for refresh token

**Storage**: HttpOnly, Secure, SameSite=Strict cookies

```python
# Cookie configuration
response.set_cookie(
    key="access_token",
    value=access_token,
    httponly=True,
    secure=settings.APP_ENV == "production",
    samesite="strict",
    max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    path="/"
)
```

### 2.3 Token Refresh & Rotation

- Refresh tokens are single-use (rotated on each use)
- Old refresh tokens are revoked immediately
- Refresh token stored as SHA256 hash in database
- JWT ID (jti) used for revocation tracking

### 2.4 Account Protection

**Brute Force Protection**:
- Max 5 failed attempts → 15 minute lockout
- Tracked per user account
- Reset on successful login

**Session Management**:
- Concurrent session limit: 5 per user
- Inactive session timeout: 30 minutes
- Absolute session timeout: 7 days (30 with remember me)

---

## 3. Authorization Security

### 3.1 Role-Based Access Control (RBAC)

**Role Hierarchy**:
```
ADMIN > PARENT > STUDENT
```

**Permission Model**: Resource-based with action verbs
- Format: `resource:action` (e.g., `lesson:read`, `user:create`)
- Permissions assigned to roles, not users directly
- Backend enforcement on every protected route

### 3.2 Route Protection

```python
# Example: Protecting admin route
@router.get("/admin/dashboard")
async def admin_dashboard(
    current_user: User = Depends(require_admin)
):
    ...
```

**Frontend Guards**:
- Route-level role checks
- Conditional rendering based on permissions
- Automatic redirect to login on auth failure

### 3.3 Resource-Level Authorization

- Parents can only access own children's data
- Students can only access own progress
- Admins have full access with audit logging
- Database-level verification on every query

---

## 4. Input Validation & Sanitization

### 4.1 Backend Validation (Pydantic)

```python
from pydantic import BaseModel, EmailStr, Field
from pydantic import field_validator

class ParentRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    phone_number: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{1,14}$")
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str
    accept_terms: bool
    accept_privacy: bool

    @field_validator("confirm_password")
    def passwords_match(cls, v, info):
        if v != info.data.get("password"):
            raise ValueError("Passwords do not match")
        return v
```

### 4.2 Frontend Validation (Zod)

```typescript
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Required"),
  remember_me: z.boolean().optional(),
});
```

### 4.3 SQL Injection Prevention

- All queries via SQLAlchemy ORM (parameterized)
- No raw SQL in application code
- Repository pattern enforces safe query patterns

### 4.4 XSS Prevention

- React auto-escapes by default
- No `dangerouslySetInnerHTML` without sanitization
- Content Security Policy headers
- Output encoding for any user-generated content

---

## 5. CSRF Protection

### 5.1 Implementation

- CSRF token generated on login/registration
- Stored in HttpOnly cookie
- Required for all state-changing operations (POST, PUT, PATCH, DELETE)
- Validated via `X-CSRF-Token` header

### 5.2 Exempt Endpoints

- `/auth/login`, `/auth/register`, `/auth/refresh`
- `/auth/forgot-password`, `/auth/reset-password`
- `/health/*` endpoints

### 5.3 Token Generation

```python
def create_csrf_token() -> str:
    return secrets.token_urlsafe(32)

def verify_csrf_token(token: str, expected: str) -> bool:
    return secrets.compare_digest(token, expected)
```

---

## 6. Security Headers

### 6.1 HTTP Response Headers

```python
# Applied via middleware
response.headers["X-Content-Type-Options"] = "nosniff"
response.headers["X-Frame-Options"] = "DENY"
response.headers["X-XSS-Protection"] = "1; mode=block"
response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

# CSP for API responses
response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"

# HSTS (production only)
response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
```

### 6.2 Content Security Policy

Frontend CSP (via meta tag):
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self' 'unsafe-inline' 'unsafe-eval';
               style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
               font-src 'self' https://fonts.gstatic.com;
               img-src 'self' data: https:;
               connect-src 'self' https://api.happylittlelearners.in;">
```

---

## 7. Rate Limiting

### 7.1 Implementation

In-memory rate limiting with sliding window:

```python
class RateLimitMiddleware:
    def __init__(self, app):
        self.requests = defaultdict(list)

    async def dispatch(self, request, call_next):
        client_ip = request.client.host
        # Different limits for auth vs API
        # Clean old requests outside window
        # Return 429 if limit exceeded
```

### 7.2 Limits

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Auth (login, register) | 5 | 15 minutes |
| General API | 100 | 1 minute |

### 7.3 Response Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1704067200
Retry-After: 60 (on 429)
```

---

## 8. Data Protection

### 8.1 Encryption

**In Transit**:
- TLS 1.3 enforced (production)
- HSTS with 1-year max-age
- All API communication over HTTPS

**At Rest**:
- MySQL Transparent Data Encryption (TDE)
- AES-256 for sensitive columns (optional)
- Encrypted backups

### 8.2 PII Minimization

**Children's Data Collected**:
- Display name only (no legal name required)
- Date of birth (optional)
- Gender (optional)
- Avatar preference
- Learning preferences

**Not Collected**:
- Legal name
- Address
- Government IDs
- Biometric data
- Location data

### 8.3 Data Retention

| Data Type | Retention Period |
|-----------|------------------|
| User accounts | Until deletion requested |
| Learning progress | 2 years after inactivity |
| Activity responses | 1 year |
| Audit logs | 7 years |
| Media assets | Until content deleted |

### 8.4 Right to Erasure

- Parent can request deletion via dashboard
- Verification email sent to parent
- 30-day grace period before permanent deletion
- Cascading delete: user → profiles → progress → media

---

## 9. Children's Privacy (DPDP Act & COPPA)

### 9.1 Compliance Measures

| Requirement | Implementation |
|-------------|----------------|
| Parental Consent | Required for each child profile |
| Data Minimization | Only essential child data collected |
| No Profiling | No behavioral advertising/tracking |
| Access Control | Parents only see own children |
| Right to Erasure | Deletion workflow in parent dashboard |
| Data Localization | MySQL in India region (production) |
| Consent Records | Versioned consent tracking |

### 9.2 Consent Management

```python
# Consent record created for each child
class ConsentRecord:
    consent_type: "data_collection" | "analytics" | "marketing"
    consent_given: boolean
    consent_version: "1.0"
    withdrawn_at: datetime | null
```

### 9.3 Age Verification

- No age gate for children (parent creates profile)
- Parent confirms age during profile creation
- Content filtered by assigned stage

---

## 10. Audit Logging

### 10.1 Logged Events

| Category | Actions |
|----------|---------|
| Authentication | LOGIN, LOGOUT, PASSWORD_CHANGE |
| User Management | CREATE, UPDATE, DELETE, ROLE_ASSIGN, ROLE_REVOKE |
| Content | CONTENT_PUBLISH, CONTENT_UNPUBLISH, CREATE, UPDATE, DELETE |
| User Status | USER_SUSPEND, USER_ACTIVATE |
| Data | DATA_EXPORT, DATA_DELETE |
| Settings | SETTINGS_CHANGE |

### 10.2 Log Structure

```python
class AuditLog:
    created_at: datetime
    user_id: int | null
    action: enum
    resource_type: str
    resource_id: str | null
    resource_name: str | null
    old_values: dict | null
    new_values: dict | null
    ip_address: str | null
    user_agent: str | null
    correlation_id: str | null
    success: boolean
    error_message: str | null
```

### 10.3 Retention & Access

- Retention: 7 years
- Access: Admin only
- Export: Available for compliance audits

---

## 11. File Upload Security

### 11.1 Validation

```python
# Allowed types
ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"]
ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/ogg", "audio/wav"]
ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"]
ALLOWED_DOCUMENT_TYPES = ["application/pdf"]

# Size limits
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
```

### 11.2 Processing

- Virus scanning (ClamAV) on upload
- MIME type verification (python-magic)
- Filename sanitization
- Stored with random UUID names
- No direct public access (signed URLs)

---

## 12. Dependency Security

### 11.1 Scanning

```bash
# Python
pip-audit
safety check

# Node.js
npm audit
npm audit fix
```

### 11.2 CI/CD Integration

```yaml
# GitHub Actions
- name: Security Scan
  run: |
    pip-audit --desc
    npm audit --audit-level=high
```

### 11.3 Dependency Pinning

- Exact versions in requirements.txt/package.json
- Dependabot for automated updates
- Manual review for major version updates

---

## 12. Incident Response

### 12.1 Response Plan

1. **Detection**: Monitoring alerts, user reports
2. **Containment**: Revoke tokens, disable accounts, block IPs
3. **Investigation**: Audit logs, access patterns
4. **Remediation**: Patch vulnerabilities, rotate secrets
5. **Notification**: Users, authorities (if required)
6. **Post-mortem**: Document, improve defenses

### 12.2 Key Contacts

- Security Team: security@happylittlelearners.in
- DPO: privacy@happylittlelearners.in
- Infrastructure: infra@happylittlelearners.in

---

## 13. Compliance Checklist

- [x] Argon2id password hashing
- [x] JWT with HttpOnly cookies
- [x] RBAC on all endpoints
- [x] CSRF protection
- [x] Rate limiting
- [x] Security headers
- [x] Input validation (Pydantic/Zod)
- [x] SQL injection prevention (ORM)
- [x] XSS prevention (React + CSP)
- [x] Audit logging
- [x] Data encryption (TLS + TDE)
- [x] PII minimization
- [x] Parental consent workflow
- [x] Right to erasure
- [x] DPDP Act compliance
- [x] COPPA compliance
- [x] Dependency scanning
- [x] Incident response plan

---

*Document Version: 1.0*
*Last Updated: 2026-10-09*
*Classification: Internal - Security*