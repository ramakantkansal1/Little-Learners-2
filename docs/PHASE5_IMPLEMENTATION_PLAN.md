# Happy Little Learners — Phase 5 Implementation Plan

**Date:** 2026-10-13  
**Prerequisite:** Phase 4 VERIFIED ✅

---

## Phase 5 Scope (from Master Prompt)

### F1. Curriculum Hierarchy
Implement reusable, database-driven hierarchy:
```
Educational Stage → Domain/Subject → Topic → Learning Objective → Lesson → Activity → Question/Task → Result
```

### F2. Reusable Activity Types
Implement 15 activity types:
1. Image Selection
2. Color Identification
3. Shape Matching
4. Picture Matching
5. Alphabet Recognition
6. Letter-Sound Awareness
7. Number Recognition
8. Counting Objects
9. Sorting & Categorization
10. Sequence Completion
11. Tracing & Drawing
12. Story Listening
13. Picture-Based Comprehension
14. Simple Quizzes
15. Audio-Based Identification

### F3. Curriculum Administration
Admin capabilities:
- Create/edit lessons
- Configure learning objectives
- Attach images and audio
- Add multilingual content (EN/HI)
- Create questions and answer choices
- Preview before publication
- Publish/unpublish/archive
- Filter by stage, subject, language
- Prevent invalid/incomplete lessons from publishing

### F4. Seed Data
Minimum content for all 4 stages:
- 3 subjects/domains per stage
- 3 topics per subject per stage
- 2 lessons per topic
- 3 activities per lesson
= 4 stages × 3 subjects × 3 topics × 2 lessons × 3 activities = **216 activities minimum**

---

## Current State Analysis

### Existing Database Models (backend/app/models/curriculum.py)
✅ **Already Implemented:**
- `LearningStage` — 4 stages (playgroup, nursery, lkg, ukg)
- `LearningDomain` — 6 domains per stage
- `Subject` — 2-3 subjects per domain per stage
- `Topic` — 3 topics per subject (seeded)
- `LearningObjective` — 1 per topic (seeded)
- `Lesson` — 3 per topic (seeded), with status, version, translations
- `LessonTranslation` — EN/HI titles, descriptions, instructions, audio
- `Activity` — 3 per lesson (seeded), with type enum, configuration JSON
- `ActivityTranslation` — EN/HI titles, instructions, audio
- `Question` — 2 per activity (seeded), with prompt, audio, configuration
- `QuestionTranslation` — EN/HI prompts
- `AnswerOption` — 3 per question (seeded), with text, image, audio, correctness
- `AnswerOptionTranslation` — EN/HI text, feedback

### Existing Seed Data (backend/app/scripts/seed_data.py)
✅ **Already Seeded:**
- 4 stages, 24 domains, 38 subjects, 114 topics, 114 lessons, 342 activities, ~684 questions
- 10 reward definitions
- Content covers all 4 stages with EN/HI translations

### Existing API Endpoints (backend/app/api/routes/v1/curriculum.py)
Need to inspect — likely has basic CRUD for curriculum entities.

### Existing Admin UI (frontend/src/pages/admin/)
- `CurriculumPage.tsx` — likely the main admin curriculum management page
- `DashboardPage.tsx`, `UsersPage.tsx`, `MediaPage.tsx`, etc.

### Existing Frontend Components
- Activity rendering in `ActivityPage.tsx` uses `question_type` to determine display
- Lesson page shows activities with type badges

---

## Implementation Gaps

### 1. Activity Type Configuration System (NEW)
**Missing:** A maintainable registry mapping activity types to:
- Rendering components
- Validation logic
- Configuration schemas
- Default instructions

**Current:** ActivityPage.tsx has hardcoded rendering logic for all types in one component.

### 2. Admin Curriculum Management UI (PARTIAL)
**Need to verify:** `CurriculumPage.tsx` capabilities — likely needs:
- Lesson/Activity create/edit forms
- Rich text editor for instructions
- Media attachment UI
- Language tab for translations
- Preview mode
- Publish/unpublish/archive actions
- Validation before publish

### 3. Activity Rendering Architecture (REFACTOR)
**Current:** Single `ActivityPage.tsx` with giant switch/if-else
**Required:** Component registry pattern:
```
ActivityRenderer → dispatches to → ActivityTypeComponent[]
```

### 4. Content Validation & Publishing Workflow (NEW)
**Need:** Backend validation that lesson has:
- At least 1 activity
- All activities have questions
- All questions have correct answers
- Translations exist for enabled languages
- Media assets attached where required

### 5. Enhanced Seed Data (EXTEND)
**Current:** 342 activities but uses only 3 types (IMAGE_SELECTION, PICTURE_MATCHING, SIMPLE_QUIZ)
**Required:** Seed all 15 activity types with developmentally appropriate content

---

## Files Likely to be Affected

### Backend
| File | Change Type |
|------|-------------|
| `backend/app/models/curriculum.py` | Minor: add validation methods, helper properties |
| `backend/app/api/routes/v1/curriculum.py` | Major: add admin CRUD, validation, publish endpoints |
| `backend/app/schemas/curriculum.py` | New: Pydantic schemas for admin requests/responses |
| `backend/app/services/curriculum_service.py` | New: business logic for curriculum operations |
| `backend/app/scripts/seed_data.py` | Extend: add all 15 activity types, richer content |
| `backend/migrations/versions/xxxx_phase5_curriculum.py` | New: migration for any schema changes |

### Frontend
| File | Change Type |
|------|-------------|
| `frontend/src/pages/admin/CurriculumPage.tsx` | Major: full admin curriculum management UI |
| `frontend/src/components/learning/ActivityRenderer.tsx` | New: registry-based activity rendering |
| `frontend/src/components/learning/activity-types/` | New: 15 activity type components |
| `frontend/src/pages/student/ActivityPage.tsx` | Refactor: use ActivityRenderer |
| `frontend/src/services/api.ts` | Extend: admin curriculum API calls |
| `frontend/src/types/index.ts` | Extend: admin curriculum types |

### Database
| Change | Type |
|--------|------|
| Add `validation_rules` JSON to Activity model | Migration |
| Add `publish_checklist` to Lesson model | Migration |
| Indexes for admin filtering | Migration |

---

## Implementation Stages

### Stage 5A: Activity Type Registry & Rendering (Week 1)
1. Create `ActivityTypeRegistry` with component mapping
2. Build 15 activity type components in `components/learning/activity-types/`
3. Refactor `ActivityPage.tsx` to use registry
4. Test all 15 types render correctly with seed data

### Stage 5B: Admin Curriculum Management UI (Week 1-2)
1. Enhance `CurriculumPage.tsx` with:
   - Stage/Domain/Subject/Topic tree navigation
   - Lesson list with filters (stage, subject, status, language)
   - Lesson create/edit modal with tabs: Content, Activities, Translations, Media, Settings
   - Activity builder with type selector, configuration form
   - Question/answer editor
   - Preview mode (renders in student view)
   - Publish validation checklist
2. Add API endpoints for admin operations

### Stage 5C: Content Validation & Publishing (Week 2)
1. Backend validation service for lesson completeness
2. Publish/unpublish/archive endpoints with checks
3. Version control for lessons/activities
4. Audit logging for content changes

### Stage 5D: Enhanced Seed Data (Week 2)
1. Extend `seed_data.py` with all 15 activity types
2. Create developmentally appropriate content per stage
3. Ensure EN/HI translations for all new content
4. Verify minimum counts met

### Stage 5E: Testing & Verification (Week 2-3)
1. Backend tests for curriculum CRUD, validation, publishing
2. Frontend tests for admin UI, activity rendering
3. Playwright E2E for admin workflows
4. Student-facing activity playback tests for all 15 types

---

## API Endpoints to Add/Modify

### Admin Curriculum Endpoints
```
POST   /api/v1/admin/curriculum/stages
GET    /api/v1/admin/curriculum/stages
PATCH  /api/v1/admin/curriculum/stages/{id}
DELETE /api/v1/admin/curriculum/stages/{id}

POST   /api/v1/admin/curriculum/domains
GET    /api/v1/admin/curriculum/domains?stage_id=
PATCH  /api/v1/admin/curriculum/domains/{id}

POST   /api/v1/admin/curriculum/subjects
GET    /api/v1/admin/curriculum/subjects?stage_id=&domain_id=
PATCH  /api/v1/admin/curriculum/subjects/{id}

POST   /api/v1/admin/curriculum/topics
GET    /api/v1/admin/curriculum/topics?subject_id=
PATCH  /api/v1/admin/curriculum/topics/{id}

POST   /api/v1/admin/curriculum/lessons
GET    /api/v1/admin/curriculum/lessons?stage_id=&subject_id=&status=
PATCH  /api/v1/admin/curriculum/lessons/{id}
POST   /api/v1/admin/curriculum/lessons/{id}/publish
POST   /api/v1/admin/curriculum/lessons/{id}/unpublish
POST   /api/v1/admin/curriculum/lessons/{id}/archive
GET    /api/v1/admin/curriculum/lessons/{id}/preview

POST   /api/v1/admin/curriculum/activities
GET    /api/v1/admin/curriculum/activities?lesson_id=
PATCH  /api/v1/admin/curriculum/activities/{id}

POST   /api/v1/admin/curriculum/questions
GET    /api/v1/admin/curriculum/questions?activity_id=
PATCH  /api/v1/admin/curriculum/questions/{id}

POST   /api/v1/admin/curriculum/answer-options
GET    /api/v1/admin/curriculum/answer-options?question_id=
PATCH  /api/v1/admin/curriculum/answer-options/{id}
```

### Student-Facing (Existing, Verify)
```
GET    /api/v1/curriculum/lessons?stage_id=&subject_id=&status=published
GET    /api/v1/curriculum/lessons/{id}?language=en
GET    /api/v1/curriculum/lessons/{id}/activities?language=en
GET    /api/v1/curriculum/activities/{id}?language=en
```

---

## Database Migrations

### Migration 1: Activity Validation Config
```sql
ALTER TABLE activities ADD COLUMN validation_config JSON;
-- Stores: min_options, max_selections, required_media, etc.
```

### Migration 2: Lesson Publish Checklist
```sql
ALTER TABLE lessons ADD COLUMN publish_checklist JSON;
-- Tracks: has_activities, has_questions, has_translations, has_media
```

### Migration 3: Content Versioning
```sql
-- lessons.version and activities.version already exist
-- Add lesson_version_history table if needed
```

---

## Testing Strategy

### Backend (pytest)
- CRUD operations for all curriculum entities
- Validation: incomplete lesson cannot publish
- Version increments on edit
- Publish/unpublish toggles status correctly
- Admin authorization enforced
- Student sees only published content

### Frontend (Vitest)
- ActivityRenderer dispatches to correct component
- Each activity type component renders with props
- Admin forms validate correctly
- Preview mode matches student view

### E2E (Playwright)
- Admin creates lesson → adds activities → publishes → student sees it
- Admin edits published lesson → creates new version → publishes
- Student completes all 15 activity types
- Multilingual content switches correctly

---

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Phase 4 activity workflow | Low | Already verified |
| Media upload (Phase 8) | Medium | Use placeholder images for now; integrate later |
| Speech synthesis (Phase 8) | Medium | Text-only fallback for story_listening, audio_identification |
| Admin authentication | Low | Already implemented in Phase 2/3 |

---

## Success Criteria for Phase 5

1. **All 15 activity types render and function** in student view
2. **Admin can create/edit/publish/archive lessons** via UI
3. **Content validation prevents** incomplete lessons from publishing
4. **Seed data covers all 4 stages** with all 15 activity types
5. **Student sees only published, authorized content**
6. **Multilingual (EN/HI) works** for all curriculum content
7. **All regression tests pass** (Phase 4 + Phase 5)
8. **Production build succeeds**

---

## Next Steps

1. **Inspect existing `CurriculumPage.tsx` and `curriculum.py` API** to assess current admin capabilities
2. **Begin Stage 5A:** Build activity type registry and components
3. **Parallel:** Extend seed data with all 15 types
4. **Stage 5B:** Build admin curriculum management UI
5. **Stage 5C-E:** Validation, enhanced seeding, testing

---

*Plan created after Phase 4 verification. Ready to begin Phase 5 implementation.*