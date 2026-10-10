# API Design Document

## Happy Little Learners - REST API Specification

---

## 1. Overview

This document describes the RESTful API for the Happy Little Learners platform. All endpoints are versioned under `/api/v1/` and follow REST conventions.

---

## 2. Conventions

### 2.1 Base URL

```
Development: http://localhost:8000/api/v1
Production:  https://api.happylittlelearners.in/api/v1
```

### 2.2 Authentication

All protected endpoints require JWT authentication via HttpOnly cookies:

- **Access Token**: Short-lived (30 min), sent in `access_token` cookie
- **Refresh Token**: Long-lived (7 days), sent in `refresh_token` cookie
- **CSRF Token**: Required for state-changing operations, sent in `csrf_token` cookie and `X-CSRF-Token` header

### 2.3 Request/Response Format

#### Success Response
```json
{
  "data": { ... },
  "meta": {
    "pagination": {
      "cursor": "string",
      "limit": 20,
      "has_more": true
    }
  }
}
```

#### Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "email", "message": "Invalid email format", "type": "value_error" }
    ]
  }
}
```

### 2.4 HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Successful GET, PATCH |
| 201 | Created - Successful POST |
| 204 | No Content - Successful DELETE |
| 400 | Bad Request - Invalid request |
| 401 | Unauthorized - Invalid/missing auth |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |
| 503 | Service Unavailable - DB down |

### 2.4 Pagination

Cursor-based pagination for list endpoints:

```
GET /api/v1/curriculum/lessons?cursor=abc123&limit=20
```

Response includes pagination metadata:
```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "cursor": "next_cursor_value",
      "limit": 20,
      "has_more": true
    }
  }
}
```

### 2.5 Filtering & Sorting

Common query parameters:
- `?stage=playgroup` - Filter by stage
- `?status=published` - Filter by status
- `?sort=created_at:desc` - Sort descending by created_at
- `?language=en` - Filter by language

---

## 3. Endpoints

### 3.1 Authentication

#### POST `/auth/parent/register`
Register a new parent account.

**Request:**
```json
{
  "full_name": "Priya Sharma",
  "email": "priya@example.com",
  "phone_number": "+91 98765 43210",
  "password": "SecurePass123",
  "confirm_password": "SecurePass123",
  "accept_terms": true,
  "accept_privacy": true
}
```

**Response (201):**
```json
{
  "data": {
    "message": "Registration successful",
    "user_id": 1,
    "email_verification_required": false
  }
}
```

#### POST `/auth/parent/login`
Parent login with email and password.

**Request:**
```json
{
  "email": "priya@example.com",
  "password": "SecurePass123",
  "remember_me": false
}
```

**Response (200):**
```json
{
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "token_type": "bearer",
    "expires_in": 1800,
    "user": {
      "id": 1,
      "email": "priya@example.com",
      "role": "parent",
      "is_verified": true
    }
  }
}
```

#### POST `/auth/student/login`
Student login with username and PIN.

**Request:**
```json
{
  "username": "Aarav",
  "pin": "1234"
}
```

#### POST `/auth/refresh`
Refresh access token using refresh token.

**Request:** (Cookie-based, no body required)

**Response (200):**
```json
{
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "token_type": "bearer",
    "expires_in": 1800,
    "user": { ... }
  }
}
```

#### POST `/auth/logout`
Logout and revoke tokens.

**Response (200):**
```json
{
  "data": { "message": "Logged out successfully" }
}
```

#### POST `/auth/forgot-password`
Request password reset.

**Request:**
```json
{ "email": "priya@example.com" }
```

#### POST `/auth/reset-password`
Reset password using token.

**Request:**
```json
{
  "token": "reset_token_from_email",
  "password": "NewSecurePass123",
  "confirm_password": "NewSecurePass123"
}
```

#### GET `/auth/csrf-token`
Get CSRF token for forms.

**Response (200):**
```json
{
  "data": { "csrf_token": "random_token_string" }
}
```

#### GET `/auth/me`
Get current user info.

**Response (200):**
```json
{
  "data": {
    "id": 1,
    "email": "priya@example.com",
    "role": "parent",
    "is_verified": true
  }
}
```

---

### 3.2 Parent Endpoints

#### GET `/parents/me`
Get current parent profile.

**Response (200):**
```json
{
  "data": {
    "id": 1,
    "user_id": 1,
    "full_name": "Priya Sharma",
    "phone_number": "+91 98765 43210",
    "phone_verified": true,
    "children": [
      {
        "id": 1,
        "display_name": "Aarav",
        "current_stage": { "code": "nursery", "name": "Nursery" },
        "progress_percentage": 65
      }
    ]
  }
}
```

#### GET `/parents/me/children`
List all children for current parent.

#### POST `/parents/me/children`
Create a new child profile.

**Request:**
```json
{
  "display_name": "Anaya",
  "date_of_birth": "2018-05-15",
  "gender": "female",
  "avatar_type": "girl",
  "current_stage_id": 2,
  "preferred_language": "en"
}
```

#### GET `/parents/me/children/{child_id}`
Get child profile with progress summary.

#### PATCH `/parents/me/children/{child_id}`
Update child profile.

#### DELETE `/parents/me/children/{child_id}`
Deactivate child profile.

#### GET `/parents/me/children/{child_id}/progress`
Get detailed progress report for a child.

---

### 3.3 Student Endpoints

#### GET `/students/me`
Get current student profile.

**Response (200):**
```json
{
  "data": {
    "id": 1,
    "display_name": "Aarav",
    "current_stage": { "code": "nursery", "name": "Nursery" },
    "preferred_language": "en",
    "audio_enabled": true,
    "avatar_type": "boy"
  }
}
```

#### GET `/students/me/dashboard`
Get student learning dashboard data.

**Response (200):**
```json
{
  "data": {
    "continue_learning": [
      { "lesson_id": 3, "title": "Shapes & Colors", "progress": 65 }
    ],
    "next_lessons": [
      { "lesson_id": 4, "title": "My Family", "locked": true }
    ],
    "rewards_preview": [
      { "name": "First Star", "earned": true },
      { "name": "Five Stars", "earned": false }
    ],
    "stats": {
      "lessons_completed": 12,
      "rewards_earned": 8,
      "time_this_week": "3h 45m",
      "current_streak": 5
    }
  }
}
```

#### GET `/students/me/learn/{lesson_id}`
Get lesson content for learning.

#### POST `/students/me/activities/{activity_id}/attempts`
Start a new activity attempt.

**Response (201):**
```json
{
  "data": {
    "attempt_id": 1,
    "activity": { ... },
    "questions": [ ... ]
  }
}
```

#### POST `/attempts/{attempt_id}/responses`
Submit answer for a question.

**Request:**
```json
{
  "question_id": 1,
  "selected_option_ids": [2]
}
```

#### POST `/attempts/{attempt_id}/complete`
Complete activity attempt.

**Response (200):**
```json
{
  "data": {
    "score": 85,
    "passed": true,
    "rewards_earned": [
      { "name": "Perfect Score", "type": "sticker" }
    ],
    "next_activity_id": 4
  }
}
```

#### GET `/students/me/rewards`
Get all earned rewards.

#### GET `/students/me/history`
Get learning history.

---

### 3.4 Curriculum Endpoints

#### GET `/curriculum/stages`
List all learning stages.

**Response (200):**
```json
{
  "data": [
    { "id": 1, "code": "playgroup", "name": "Playgroup / Pre-Nursery", "min_age_months": 24, "max_age_months": 36 },
    { "id": 2, "code": "nursery", "name": "Nursery", "min_age_months": 36, "max_age_months": 48 },
    ...
  ]
}
```

#### GET `/curriculum/stages/{stage_id}/domains`
List domains for a stage.

#### GET `/curriculum/subjects`
List subjects (filterable by stage, domain).

#### GET `/curriculum/lessons`
List lessons (filterable by stage, subject, status).

**Query Parameters:**
- `stage_id`, `subject_id`, `topic_id`
- `status` (draft, review, published, archived)
- `language` (en, hi)

#### GET `/curriculum/lessons/{lesson_id}`
Get full lesson with activities.

**Response (200):**
```json
{
  "data": {
    "id": 1,
    "title": "Counting 1-10",
    "subject": "Mathematics",
    "stage": "nursery",
    "activities": [
      {
        "id": 1,
        "type": "counting",
        "title": "Count the Apples",
        "questions": [
          {
            "id": 1,
            "prompt": "How many apples?",
            "image_url": "/media/apples.png",
            "options": [
              { "id": 1, "text": "2", "image_url": "..." },
              { "id": 2, "text": "3", "image_url": "..." }
            ]
          }
        ]
      }
    ]
  }
}
```

#### GET `/curriculum/activities/{activity_id}`
Get activity configuration.

---

### 3.5 Progress Endpoints

#### POST `/progress/activities/{activity_id}/attempts`
Start activity attempt (alias for student endpoint).

#### GET `/progress/students/{student_id}/lessons`
Get lesson progress for a student.

#### GET `/progress/students/{student_id}/activities`
Get activity attempts for a student.

#### GET `/progress/parents/me/children/{child_id}/summary`
Get progress summary for parent view.

---

### 3.6 Admin Endpoints

#### GET `/admin/dashboard`
Get admin dashboard metrics.

#### GET `/admin/users`
List all users (paginated, filterable).

#### PATCH `/admin/users/{user_id}`
Update user (role, status, etc.).

#### GET `/admin/curriculum/stages`
Manage learning stages.

#### POST `/admin/curriculum/lessons`
Create new lesson.

#### PATCH `/admin/curriculum/lessons/{lesson_id}`
Update lesson.

#### POST `/admin/curriculum/lessons/{lesson_id}/publish`
Publish lesson.

#### POST `/admin/curriculum/lessons/{lesson_id}/unpublish`
Unpublish lesson.

#### GET `/admin/media`
List media assets.

#### POST `/admin/media/upload`
Upload new media.

#### GET `/admin/analytics`
Get platform analytics.

#### GET `/admin/audit-logs`
List audit logs (filterable by user, action, resource, date).

---

### 3.7 Health Endpoints

#### GET `/health`
Basic health check.

**Response (200):**
```json
{
  "data": {
    "status": "healthy",
    "app": "Happy Little Learners",
    "version": "0.1.0",
    "environment": "development"
  }
}
```

#### GET `/health/db`
Database connectivity check.

#### GET `/health/ready`
Readiness probe for Kubernetes.

---

## 4. Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/*` | 5 requests | 15 minutes |
| `/api/*` | 100 requests | 1 minute |

Headers returned:
- `X-RateLimit-Limit`: Maximum requests
- `X-RateLimit-Remaining`: Remaining requests
- `Retry-After`: Seconds until reset (on 429)

---

## 5. Webhooks (Future)

Planned webhook events:
- `user.registered`
- `lesson.completed`
- `reward.earned`
- `subscription.changed`

---

## 6. SDKs & Client Libraries

- **TypeScript/JavaScript**: Auto-generated from OpenAPI spec
- **Python**: Auto-generated from OpenAPI spec

OpenAPI spec available at: `/openapi.json` (dev only)

---

## 7. Versioning & Deprecation

- **Current Version**: v1
- **Deprecation Policy**: 6 months notice
- **Breaking Changes**: New version (v2) with migration guide
- **Sunset Headers**: `Sunset` header on deprecated endpoints

---

*Document Version: 1.0*
*Last Updated: 2026-10-09*