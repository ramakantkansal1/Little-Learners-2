# Database Design Document

## Happy Little Learners - Database Schema

---

## 1. Overview

This document describes the MySQL 8.x database schema for the Happy Little Learners platform. The database follows a normalized relational design (3NF) with support for multilingual content, soft deletes, and comprehensive audit trails.

---

## 2. Design Principles

- **Normalization**: Third Normal Form (3NF) for transactional tables
- **Character Set**: `utf8mb4` with `utf8mb4_unicode_ci` collation for full Unicode support
- **Soft Deletes**: `deleted_at` timestamp columns for audit trail
- **Timestamps**: `created_at`, `updated_at` on all tables
- **Indexes**: On all foreign keys and frequent query columns
- **Constraints**: Foreign keys, unique constraints, check constraints where appropriate
- **Partitioning**: Consider partitioning for large tables (audit_logs, activity_responses)

---

## 3. Schema Diagram

See [ER Diagram](../database/diagrams/er_diagram.md) for visual representation.

---

## 4. Table Definitions

### 4.1 Users & Authentication

#### `users`
Core user accounts for all roles (admin, parent, student).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| email | VARCHAR(255) | UK, NN | Unique email address |
| password_hash | VARCHAR(255) | NN | Argon2id hashed password |
| is_active | BOOLEAN | NN, DEFAULT true | Account active status |
| is_verified | BOOLEAN | NN, DEFAULT false | Email verification status |
| last_login_at | DATETIME(6) | NULL | Last successful login |
| failed_login_attempts | INT | NN, DEFAULT 0 | Consecutive failed logins |
| locked_until | DATETIME(6) | NULL | Account lock expiry |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |
| deleted_at | DATETIME(6) | NULL | Soft delete |

#### `roles`
System role definitions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| name | VARCHAR(50) | UK, NN | Role name (admin, parent, student) |
| description | TEXT | NULL | Role description |
| is_system | BOOLEAN | NN, DEFAULT false | System-managed role |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |

#### `user_roles`
Many-to-many mapping between users and roles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| user_id | BIGINT | FK, NN, IDX | Reference to users |
| role_id | BIGINT | FK, NN, IDX | Reference to roles |
| assigned_by | BIGINT | FK, NULL | Admin who assigned |
| assigned_at | DATETIME(6) | NN | Assignment timestamp |

#### `refresh_tokens`
JWT refresh token storage for revocation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| user_id | BIGINT | FK, NN, IDX | Token owner |
| token_hash | VARCHAR(255) | NN, IDX | SHA256 of token |
| jti | VARCHAR(64) | UK, NN, IDX | JWT ID |
| expires_at | DATETIME(6) | NN, IDX | Token expiry |
| revoked_at | DATETIME(6) | NULL | Revocation timestamp |
| user_agent | TEXT | NULL | Client user agent |
| ip_address | VARCHAR(45) | NULL | Client IP |
| created_at | DATETIME(6) | NN | Creation timestamp |

#### `password_resets`
Password reset tokens.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| user_id | BIGINT | FK, NN, IDX | User requesting reset |
| token_hash | VARCHAR(255) | NN, IDX | SHA256 of token |
| expires_at | DATETIME(6) | NN, IDX | Token expiry |
| used_at | DATETIME(6) | NULL | Usage timestamp |
| ip_address | VARCHAR(45) | NULL | Request IP |
| created_at | DATETIME(6) | NN | Creation timestamp |

---

### 4.2 Profiles & Relationships

#### `parent_profiles`
Parent/guardian profile information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| user_id | BIGINT | FK, UK, NN, IDX | Reference to users |
| full_name | VARCHAR(255) | NN | Parent's full name |
| phone_number | VARCHAR(20) | NULL, IDX | Phone with country code |
| phone_verified | BOOLEAN | NN, DEFAULT false | Phone verification |
| date_of_birth | DATE | NULL | Optional DOB |
| gender | ENUM | NULL | Gender |
| avatar_url | VARCHAR(500) | NULL | Profile image |
| address | TEXT | NULL | Street address |
| city | VARCHAR(100) | NULL | City |
| state | VARCHAR(100) | NULL | State |
| pincode | VARCHAR(10) | NULL | Postal code |
| country | VARCHAR(100) | NN, DEFAULT 'India' | Country |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |
| deleted_at | DATETIME(6) | NULL | Soft delete |

#### `student_profiles`
Child/student profiles (minimal PII).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| user_id | BIGINT | FK, UK, NN, IDX | Reference to users |
| display_name | VARCHAR(100) | NN | Child's display name |
| date_of_birth | DATE | NULL | Optional DOB |
| gender | ENUM | NULL | Gender |
| avatar_url | VARCHAR(500) | NULL | Profile image |
| avatar_type | VARCHAR(50) | NULL | Avatar identifier |
| pin_hash | VARCHAR(255) | NULL | PIN for child login |
| current_stage_id | BIGINT | FK, NULL, IDX | Current learning stage |
| preferred_language | VARCHAR(10) | NN, DEFAULT 'en' | Language preference |
| audio_enabled | BOOLEAN | NN, DEFAULT true | Audio narration |
| reduced_motion | BOOLEAN | NN, DEFAULT false | Accessibility |
| high_contrast | BOOLEAN | NN, DEFAULT false | Accessibility |
| is_active | BOOLEAN | NN, DEFAULT true | Profile active |
| last_activity_at | DATETIME(6) | NULL | Last activity |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |
| deleted_at | DATETIME(6) | NULL | Soft delete |

#### `parent_student_relationships`
Links between parents and children.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| parent_id | BIGINT | FK, NN, IDX | Parent profile |
| student_id | BIGINT | FK, NN, IDX | Student profile |
| relationship_type | VARCHAR(50) | NN, DEFAULT 'parent' | Relationship |
| is_primary | BOOLEAN | NN, DEFAULT false | Primary guardian |
| can_manage_profile | BOOLEAN | NN, DEFAULT true | Manage permissions |
| can_view_progress | BOOLEAN | NN, DEFAULT true | View progress |
| can_manage_settings | BOOLEAN | NN, DEFAULT true | Manage settings |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |

#### `consent_records`
Privacy consent tracking for children's data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| parent_id | BIGINT | FK, NN, IDX | Consenting parent |
| student_id | BIGINT | FK, NN, IDX | Child subject |
| consent_type | VARCHAR(50) | NN | Type (data_collection, analytics, etc.) |
| consent_given | BOOLEAN | NN, DEFAULT false | Consent status |
| consent_version | VARCHAR(20) | NN | Version string |
| ip_address | VARCHAR(45) | NULL | Consent IP |
| user_agent | TEXT | NULL | Consent UA |
| withdrawn_at | DATETIME(6) | NULL | Withdrawal timestamp |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |

#### `data_deletion_requests`
GDPR/DPDP Act data deletion requests.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| parent_id | BIGINT | FK, NN, IDX | Requesting parent |
| student_id | BIGINT | FK, NULL, IDX | Specific child (NULL = all) |
| request_type | VARCHAR(50) | NN | Type of deletion |
| status | VARCHAR(20) | NN, DEFAULT 'pending' | Request status |
| reason | TEXT | NULL | Optional reason |
| processed_at | DATETIME(6) | NULL | Completion timestamp |
| processed_by | BIGINT | FK, NULL | Processing admin |
| verification_token | VARCHAR(64) | NULL, IDX | Verification token |
| verification_expires_at | DATETIME(6) | NULL | Token expiry |
| created_at | DATETIME(6) | NN | Request timestamp |
| updated_at | DATETIME(6) | NN | Record update |

---

### 4.3 Curriculum (Hierarchical)

#### `learning_stages`
Educational stages: Playgroup, Nursery, LKG, UKG.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| code | VARCHAR(20) | UK, NN, IDX | Stage code |
| name | VARCHAR(100) | NN | Display name |
| description | TEXT | NULL | Description |
| min_age_months | INT | NN | Minimum age |
| max_age_months | INT | NN | Maximum age |
| display_order | INT | NN, DEFAULT 0 | Sort order |
| icon | VARCHAR(100) | NULL | Icon identifier |
| color | VARCHAR(7) | NULL | Hex color |
| is_active | BOOLEAN | NN, DEFAULT true | Active status |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |
| deleted_at | DATETIME(6) | NULL | Soft delete |

#### `learning_domains`
Learning domains within stages.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| stage_id | BIGINT | FK, NN, IDX | Parent stage |
| code | VARCHAR(30) | NN, IDX | Domain code |
| name | VARCHAR(100) | NN | Display name |
| description | TEXT | NULL | Description |
| display_order | INT | NN, DEFAULT 0 | Sort order |
| icon | VARCHAR(100) | NULL | Icon identifier |
| color | VARCHAR(7) | NULL | Hex color |
| is_active | BOOLEAN | NN, DEFAULT true | Active status |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |
| deleted_at | DATETIME(6) | NULL | Soft delete |

#### `subjects`
Subjects within domains.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| stage_id | BIGINT | FK, NN, IDX | Parent stage |
| domain_id | BIGINT | FK, NN, IDX | Parent domain |
| code | VARCHAR(30) | NN, IDX | Subject code |
| name | VARCHAR(100) | NN | Display name |
| description | TEXT | NULL | Description |
| display_order | INT | NN, DEFAULT 0 | Sort order |
| icon | VARCHAR(100) | NULL | Icon identifier |
| color | VARCHAR(7) | NULL | Hex color |
| is_active | BOOLEAN | NN, DEFAULT true | Active status |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |
| deleted_at | DATETIME(6) | NULL | Soft delete |

#### `topics`
Topics within subjects.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| subject_id | BIGINT | FK, NN, IDX | Parent subject |
| code | VARCHAR(50) | NN, IDX | Topic code |
| name | VARCHAR(150) | NN | Display name |
| description | TEXT | NULL | Description |
| display_order | INT | NN, DEFAULT 0 | Sort order |
| estimated_duration_minutes | INT | NULL | Estimated time |
| is_active | BOOLEAN | NN, DEFAULT true | Active status |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |
| deleted_at | DATETIME(6) | NULL | Soft delete |

#### `learning_objectives`
Measurable learning objectives.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| topic_id | BIGINT | FK, NN, IDX | Parent topic |
| code | VARCHAR(50) | NN, IDX | Objective code |
| description | TEXT | NN | Objective description |
| display_order | INT | NN, DEFAULT 0 | Sort order |
| is_assessable | BOOLEAN | NN, DEFAULT true | Can be assessed |
| is_active | BOOLEAN | NN, DEFAULT true | Active status |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |
| deleted_at | DATETIME(6) | NULL | Soft delete |

#### `lessons`
Learning units containing activities.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| topic_id | BIGINT | FK, NN, IDX | Parent topic |
| code | VARCHAR(50) | NN, IDX | Lesson code |
| status | ENUM | NN, DEFAULT 'draft' | Publication status |
| version | INT | NN, DEFAULT 1 | Content version |
| estimated_duration_minutes | INT | NULL | Estimated time |
| thumbnail_url | VARCHAR(500) | NULL | Thumbnail image |
| instructions | TEXT | NULL | Lesson instructions |
| display_order | INT | NN, DEFAULT 0 | Sort order |
| published_at | DATETIME(6) | NULL | Publication timestamp |
| published_by | BIGINT | FK, NULL | Publishing admin |
| is_active | BOOLEAN | NN, DEFAULT true | Active status |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |
| deleted_at | DATETIME(6) | NULL | Soft delete |

#### `lesson_translations`
Multilingual lesson content.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| lesson_id | BIGINT | FK, NN, IDX | Parent lesson |
| language | VARCHAR(10) | NN, IDX | Language code |
| title | VARCHAR(255) | NN | Lesson title |
| description | TEXT | NULL | Description |
| instructions | TEXT | NULL | Instructions |
| audio_url | VARCHAR(500) | NULL | Narration audio |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |

#### `activities`
Interactive activities within lessons.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| lesson_id | BIGINT | FK, NN, IDX | Parent lesson |
| type | ENUM | NN, IDX | Activity type |
| code | VARCHAR(50) | NN, IDX | Activity code |
| status | ENUM | NN, DEFAULT 'draft' | Publication status |
| version | INT | NN, DEFAULT 1 | Content version |
| display_order | INT | NN, DEFAULT 0 | Sort order |
| estimated_duration_minutes | INT | NULL | Estimated time |
| instructions | TEXT | NULL | Activity instructions |
| configuration | JSON | NULL | Type-specific config |
| is_active | BOOLEAN | NN, DEFAULT true | Active status |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |
| deleted_at | DATETIME(6) | NULL | Soft delete |

#### `activity_translations`
Multilingual activity content.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| activity_id | BIGINT | FK, NN, IDX | Parent activity |
| language | VARCHAR(10) | NN, IDX | Language code |
| title | VARCHAR(255) | NN | Activity title |
| instructions | TEXT | NULL | Instructions |
| audio_url | VARCHAR(500) | NULL | Instruction audio |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |

#### `questions`
Quiz/assessment questions within activities.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| activity_id | BIGINT | FK, NN, IDX | Parent activity |
| question_type | VARCHAR(30) | NN | Question type |
| prompt | TEXT | NN | Question text |
| prompt_audio_url | VARCHAR(500) | NULL | Audio prompt |
| display_order | INT | NN, DEFAULT 0 | Sort order |
| points | INT | NN, DEFAULT 1 | Point value |
| configuration | JSON | NULL | Type-specific config |
| is_active | BOOLEAN | NN, DEFAULT true | Active status |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |
| deleted_at | DATETIME(6) | NULL | Soft delete |

#### `question_translations`
Multilingual question content.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| question_id | BIGINT | FK, NN, IDX | Parent question |
| language | VARCHAR(10) | NN, IDX | Language code |
| prompt | TEXT | NN | Question text |
| prompt_audio_url | VARCHAR(500) | NULL | Audio prompt |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |

#### `answer_options`
Answer choices for questions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| question_id | BIGINT | FK, NN, IDX | Parent question |
| text | TEXT | NN | Option text |
| text_audio_url | VARCHAR(500) | NULL | Audio for text |
| image_url | VARCHAR(500) | NULL | Option image |
| is_correct | BOOLEAN | NN, DEFAULT false | Correct answer |
| display_order | INT | NN, DEFAULT 0 | Sort order |
| feedback_correct | TEXT | NULL | Correct feedback |
| feedback_incorrect | TEXT | NULL | Incorrect feedback |
| configuration | JSON | NULL | Type-specific config |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |

#### `answer_option_translations`
Multilingual answer option content.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| answer_option_id | BIGINT | FK, NN, IDX | Parent option |
| language | VARCHAR(10) | NN, IDX | Language code |
| text | TEXT | NN | Option text |
| feedback_correct | TEXT | NULL | Correct feedback |
| feedback_incorrect | TEXT | NULL | Incorrect feedback |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |

---

### 4.4 Progress & Engagement

#### `student_enrollments`
Student stage/subject assignments.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| student_id | BIGINT | FK, NN, IDX | Student profile |
| stage_id | BIGINT | FK, NN, IDX | Learning stage |
| subject_id | BIGINT | FK, NULL, IDX | Specific subject |
| status | ENUM | NN, DEFAULT 'active', IDX | Enrollment status |
| enrolled_at | DATETIME(6) | NN | Enrollment date |
| completed_at | DATETIME(6) | NULL | Completion date |
| assigned_by | BIGINT | FK, NULL | Assigning admin |
| notes | TEXT | NULL | Notes |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |
| deleted_at | DATETIME(6) | NULL | Soft delete |

#### `student_lesson_progress`
Student progress on lessons.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| student_id | BIGINT | FK, NN, IDX | Student profile |
| lesson_id | BIGINT | FK, NN, IDX | Lesson |
| status | ENUM | NN, DEFAULT 'not_started', IDX | Progress status |
| started_at | DATETIME(6) | NULL | Start timestamp |
| completed_at | DATETIME(6) | NULL | Completion timestamp |
| last_activity_at | DATETIME(6) | NULL | Last activity |
| time_spent_seconds | INT | NN, DEFAULT 0 | Total time spent |
| current_activity_id | BIGINT | FK, NULL | Current activity |
| completion_percentage | INT | NN, DEFAULT 0 | 0-100% |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |

#### `activity_attempts`
Student attempts at activities.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| student_id | BIGINT | FK, NN, IDX | Student profile |
| activity_id | BIGINT | FK, NN, IDX | Activity |
| lesson_progress_id | BIGINT | FK, NULL, IDX | Lesson progress |
| attempt_number | INT | NN, DEFAULT 1 | Attempt count |
| status | ENUM | NN, DEFAULT 'started', IDX | Attempt status |
| started_at | DATETIME(6) | NN | Start timestamp |
| completed_at | DATETIME(6) | NULL | Completion timestamp |
| time_spent_seconds | INT | NN, DEFAULT 0 | Time spent |
| score | INT | NULL | Percentage score |
| max_score | INT | NN, DEFAULT 100 | Maximum score |
| passed | BOOLEAN | NULL | Pass/fail |
| metadata | JSON | NULL | Additional data |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |

#### `activity_responses`
Individual question responses.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| attempt_id | BIGINT | FK, NN, IDX | Parent attempt |
| question_id | BIGINT | FK, NN, IDX | Question |
| selected_option_ids | JSON | NN | Selected options |
| is_correct | BOOLEAN | NULL | Correctness |
| points_earned | INT | NN, DEFAULT 0 | Points earned |
| time_spent_seconds | INT | NN, DEFAULT 0 | Time spent |
| metadata | JSON | NULL | Additional data |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |

#### `student_rewards`
Reward definitions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| code | VARCHAR(50) | UK, NN, IDX | Reward code |
| name | VARCHAR(100) | NN | Display name |
| description | TEXT | NULL | Description |
| reward_type | VARCHAR(20) | NN | Type (star, sticker, badge) |
| image_url | VARCHAR(500) | NULL | Reward image |
| criteria | JSON | NULL | Earning criteria |
| points_value | INT | NN, DEFAULT 0 | Point value |
| display_order | INT | NN, DEFAULT 0 | Sort order |
| is_active | BOOLEAN | NN, DEFAULT true | Active status |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |
| deleted_at | DATETIME(6) | NULL | Soft delete |

#### `student_reward_awards`
Rewards earned by students.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| student_id | BIGINT | FK, NN, IDX | Student profile |
| reward_id | BIGINT | FK, NN, IDX | Reward definition |
| attempt_id | BIGINT | FK, NULL, IDX | Source attempt |
| earned_at | DATETIME(6) | NN | Earned timestamp |
| metadata | JSON | NULL | Additional data |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |

---

### 4.5 Media & System

#### `media_assets`
Images, audio, video files.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| file_name | VARCHAR(255) | NN | Stored filename |
| original_name | VARCHAR(255) | NN | Original filename |
| file_path | VARCHAR(500) | NN | Storage path |
| file_url | VARCHAR(500) | NULL | Public URL |
| media_type | ENUM | NN, IDX | Type (image, audio, video, document) |
| mime_type | VARCHAR(100) | NN | MIME type |
| file_size | INT | NN | Size in bytes |
| width | INT | NULL | Image width |
| height | INT | NULL | Image height |
| duration_seconds | FLOAT | NULL | Audio/video duration |
| alt_text | TEXT | NULL | Accessibility text |
| caption | TEXT | NULL | Caption |
| source | VARCHAR(255) | NULL | Source attribution |
| license | VARCHAR(100) | NULL | License |
| attribution | TEXT | NULL | Attribution text |
| language | VARCHAR(10) | NULL, IDX | Language |
| tags | JSON | NULL | Tags |
| uploaded_by | BIGINT | FK, NULL | Uploader |
| is_processed | BOOLEAN | NN, DEFAULT false | Processing status |
| processing_error | TEXT | NULL | Processing error |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |
| deleted_at | DATETIME(6) | NULL | Soft delete |

#### `lesson_media`
Lesson-media associations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| lesson_id | BIGINT | FK, NN, IDX | Parent lesson |
| media_asset_id | BIGINT | FK, NN, IDX | Media asset |
| media_role | VARCHAR(50) | NN | Role (thumbnail, illustration, audio) |
| display_order | INT | NN, DEFAULT 0 | Sort order |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |

#### `activity_media`
Activity-media associations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| activity_id | BIGINT | FK, NN, IDX | Parent activity |
| media_asset_id | BIGINT | FK, NN, IDX | Media asset |
| media_role | VARCHAR(50) | NN | Role |
| question_id | BIGINT | FK, NULL, IDX | Specific question |
| answer_option_id | BIGINT | FK, NULL, IDX | Specific option |
| display_order | INT | NN, DEFAULT 0 | Sort order |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |

#### `parent_notifications`
In-app notifications for parents.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| parent_id | BIGINT | FK, NN, IDX | Parent profile |
| student_id | BIGINT | FK, NULL, IDX | Related child |
| notification_type | ENUM | NN, IDX | Notification type |
| title | VARCHAR(255) | NN | Title |
| message | TEXT | NN | Message |
| data | JSON | NULL | Additional context |
| is_read | BOOLEAN | NN, DEFAULT false, IDX | Read status |
| read_at | DATETIME(6) | NULL | Read timestamp |
| sent_via_email | BOOLEAN | NN, DEFAULT false | Email sent |
| sent_via_sms | BOOLEAN | NN, DEFAULT false | SMS sent |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |

#### `audit_logs`
Admin action audit trail.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| created_at | DATETIME(6) | NN, IDX | Event timestamp |
| user_id | BIGINT | FK, NULL, IDX | Acting user |
| action | ENUM | NN, IDX | Action type |
| resource_type | VARCHAR(50) | NN, IDX | Resource type |
| resource_id | VARCHAR(100) | NULL, IDX | Resource ID |
| resource_name | VARCHAR(255) | NULL | Resource name |
| old_values | JSON | NULL | Previous values |
| new_values | JSON | NULL | New values |
| ip_address | VARCHAR(45) | NULL | Client IP |
| user_agent | TEXT | NULL | User agent |
| correlation_id | VARCHAR(64) | NULL, IDX | Request correlation |
| success | BOOLEAN | NN, DEFAULT true | Success flag |
| error_message | TEXT | NULL | Error if failed |

#### `user_preferences`
User settings and preferences.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, AI | Primary key |
| user_id | BIGINT | FK, UK, NN, IDX | User reference |
| preferred_language | VARCHAR(10) | NN, DEFAULT 'en' | Language |
| audio_enabled | BOOLEAN | NN, DEFAULT true | Audio on/off |
| audio_volume | FLOAT | NN, DEFAULT 0.8 | Volume 0-1 |
| narration_speed | FLOAT | NN, DEFAULT 1.0 | Speed multiplier |
| reduced_motion | BOOLEAN | NN, DEFAULT false | Reduced motion |
| high_contrast | BOOLEAN | NN, DEFAULT false | High contrast |
| font_size | VARCHAR(20) | NN, DEFAULT 'medium' | Font size |
| screen_reader_optimized | BOOLEAN | NN, DEFAULT false | Screen reader mode |
| email_notifications | BOOLEAN | NN, DEFAULT true | Email notifications |
| sms_notifications | BOOLEAN | NN, DEFAULT false | SMS notifications |
| in_app_notifications | BOOLEAN | NN, DEFAULT true | In-app notifications |
| weekly_summary_email | BOOLEAN | NN, DEFAULT true | Weekly emails |
| progress_alerts | BOOLEAN | NN, DEFAULT true | Progress alerts |
| analytics_opt_in | BOOLEAN | NN, DEFAULT true | Analytics opt-in |
| data_sharing_consent | BOOLEAN | NN, DEFAULT false | Data sharing |
| created_at | DATETIME(6) | NN | Record creation |
| updated_at | DATETIME(6) | NN | Record update |

---

## 5. Key Indexes

```sql
-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- User Roles
CREATE UNIQUE INDEX uq_user_role ON user_roles(user_id, role_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- Refresh Tokens
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_jti ON refresh_tokens(jti);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Profiles
CREATE INDEX idx_parent_profiles_user_id ON parent_profiles(user_id);
CREATE INDEX idx_parent_profiles_phone ON parent_profiles(phone_number);
CREATE INDEX idx_student_profiles_user_id ON student_profiles(user_id);
CREATE INDEX idx_student_profiles_stage ON student_profiles(current_stage_id);

-- Relationships
CREATE UNIQUE INDEX uq_parent_student ON parent_student_relationships(parent_id, student_id);
CREATE INDEX idx_ps_rel_parent_primary ON parent_student_relationships(parent_id, is_primary);

-- Curriculum
CREATE UNIQUE INDEX uq_stage_domain_code ON learning_domains(stage_id, code);
CREATE UNIQUE INDEX uq_stage_domain_subject_code ON subjects(stage_id, domain_id, code);
CREATE UNIQUE INDEX uq_subject_topic_code ON topics(subject_id, code);
CREATE UNIQUE INDEX uq_topic_objective_code ON learning_objectives(topic_id, code);
CREATE UNIQUE INDEX uq_topic_lesson_code ON lessons(topic_id, code);
CREATE UNIQUE INDEX uq_lesson_translation ON lesson_translations(lesson_id, language);
CREATE UNIQUE INDEX uq_lesson_activity_code ON activities(lesson_id, code);
CREATE UNIQUE INDEX uq_activity_translation ON activity_translations(activity_id, language);
CREATE UNIQUE INDEX uq_question_translation ON question_translations(question_id, language);
CREATE UNIQUE INDEX uq_answer_option_translation ON answer_option_translations(answer_option_id, language);

-- Progress
CREATE UNIQUE INDEX uq_student_stage_subject ON student_enrollments(student_id, stage_id, subject_id);
CREATE UNIQUE INDEX uq_student_lesson_progress ON student_lesson_progress(student_id, lesson_id);
CREATE UNIQUE INDEX uq_student_activity_attempt ON activity_attempts(student_id, activity_id, attempt_number);
CREATE UNIQUE INDEX uq_attempt_question_response ON activity_responses(attempt_id, question_id);

-- Media
CREATE INDEX idx_media_type_language ON media_assets(media_type, language);

-- Notifications
CREATE INDEX idx_notification_parent_read ON parent_notifications(parent_id, is_read);
CREATE INDEX idx_notification_parent_created ON parent_notifications(parent_id, created_at);

-- Audit Logs
CREATE INDEX idx_audit_user_action_time ON audit_logs(user_id, action, created_at);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
```

---

## 6. Migration Strategy

All schema changes must be done through Alembic migrations:

```bash
# Create new migration
alembic revision --autogenerate -m "description of changes"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1

# View history
alembic history
```

---

## 7. Seed Data

Initial data is loaded via `backend/app/scripts/seed_data.py`:

- 4 Learning Stages (Playgroup, Nursery, LKG, UKG)
- 6 Domains per stage
- Multiple Subjects per domain
- 3 Topics per subject
- 2 Lessons per topic
- 3 Activities per lesson
- 2-3 Questions per activity
- 10 Default rewards

Run with: `python -m app.scripts.seed_data`

---

## 8. Backup & Recovery

```bash
# Backup
mysqldump -u root -p happy_little_learners > backup_$(date +%Y%m%d).sql

# Restore
mysql -u root -p happy_little_learners < backup_20240115.sql
```

---

*Document Version: 1.0*
*Last Updated: 2026-10-09*