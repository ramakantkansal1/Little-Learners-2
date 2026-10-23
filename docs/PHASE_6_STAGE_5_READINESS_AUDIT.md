#### 5D — Backend API Endpoint & Authorization Tests

**Goal:** Expose recommendation via API with authorization; read-only.

**Files:** `backend/app/api/routes/v1/students.py` (add `GET /students/attempts/{attempt_id}/next-activity`), `backend/app/tests/test_api.py` (extend `TestActivityAttemptPersistence`).

**Approach:** New endpoint (see §4.3). Read-only. Authorization: student owns attempt; attempt `status == "completed"`; activity in student's stage; published/active only. Integrates with DEF-005 fix (read-only, no check-then-act race). Does not modify `complete_activity_attempt`.

**Risks:** Must not modify `complete_activity_attempt` or any write path.

**Tests:** Authorized student gets recommendation; unauthorized (different child) → 403/404; cold start returns valid activity; read-only (verify no DB writes via read-only assertion pattern); missing activity → 404.

**Acceptance Criteria:** Returns 200 with valid `next_activity_id` or 404; no writes to database; consistent with existing API response format; all 58+ existing backend tests still pass.

---

#### 5E — Frontend Integration

**Goal:** Surface recommendation in the ActivityPage flow.

**Files:** `frontend/src/services/api.ts` (add `getNextActivity` + `NextActivityRecommendation` interface), `frontend/src/pages/student/ActivityPage.tsx` (display "Next recommended activity" after completion).

**Approach:** After activity completion, call `getNextActivity(activityId)`. If `next_activity_id` returned, show "Next recommended activity" card with reason; clicking navigates to `/student/activity/{id}?attempt={new_attempt_id}`.

**Risks:** Frontend must handle `null` (no next activity) gracefully; must not auto-advance without user consent.

**Tests:** Vitest for API service mock; Vitest for ActivityPage recommendation display.

**Acceptance Criteria:** Typecheck passes; recommendation reason displayed; navigation works; `null` handled without error.

---

#### 5F — Admin Configuration (Optional)

**Goal:** Allow admins to configure difficulty tiers (optional enhancement).

**Files:** `backend/app/api/routes/v1/admin.py`, `frontend/src/pages/admin/CurriculumPage.tsx`, `frontend/src/services/api.ts`.

**Approach:** Add optional `difficulty_tier` to `Activity.configuration` JSON (no schema change — JSON extensible). Admin UI sets tier (1=easy, 2=medium, 3=hard). Recommendation service reads tier when present; falls back to `display_order` when absent.

**Risks:** Admin UI changes could affect existing curriculum workflow; tier values need semantic definition.

**Tests:** Backend API tests for tier get/set; Vitest for admin UI tier selection.

**Acceptance Criteria:** Admin can set difficulty tier on activity creation/edit; recommendation respects tier when present; falls back to `display_order` when absent; no regression in existing admin CRUD tests.

---

#### 5G — End-to-End Testing

**Goal:** Verify full adaptive flow end-to-end.

**Files:** `frontend/tests/e2e/adaptive-learning.spec.ts` (new).

**Approach:** Playwright E2E: child completes activity → sees recommendation → navigates to recommended activity; verify recommendation adapts after repeated low scores; verify stage boundary (no cross-stage recommendations).

**Risks:** Requires backend + MySQL running (DEF-006 unresolved). Cannot run locally until services are available.

**Tests:** Playwright E2E against live backend + MySQL.

**Acceptance Criteria:** Recommendation adapts after repeated low scores; no cross-stage recommendations; E2E passes against live services.

---

## 6. Test Strategy

| Layer | Framework | Location | Focus |
|-------|-----------|----------|-------|
| Unit | pytest | `backend/app/tests/test_adaptive_learning.py` (new) | Mastery calculation, recommendation logic, edge cases |
| API | pytest | `backend/app/tests/test_api.py` (extend `TestActivityAttemptPersistence`) | Endpoint authorization, response format, read-only behavior |
| Frontend unit | Vitest | `frontend/src/services/api.test.ts` (extend) | API service mock, interface types |
| Frontend component | Vitest | `frontend/src/pages/student/ActivityPage.test.tsx` (new) | Recommendation display, navigation |
| E2E | Playwright | `frontend/tests/e2e/adaptive-learning.spec.ts` (new) | Full flow, adaptation over multiple attempts |

**Regression:** Full backend suite (58+ tests), frontend typecheck/lint/Vitest/build must pass.

---

## 7. Data Migrations

**No migration required for Stage 5A–5C.** All data needed (scores, attempts, responses, configuration JSON) already exists.

**Optional migration (Stage 5F only):** If admin wants to configure difficulty tiers via a dedicated column rather than `configuration` JSON, a new `difficulty_tier` column on `activities` table would be needed. **Recommendation:** Use `configuration` JSON (extensible, no migration) for Stage 5. Consider a dedicated column only if admin UI demand justifies it.

---

## 8. Risks and Unresolved Questions

| Risk | Severity | Mitigation |
|------|----------|------------|
| **DEF-006: Playwright E2E unverified** | Medium | Cannot verify E2E until backend + MySQL services running. Stage 5F E2E tests cannot run locally. |
| **No master specification** | Low | Using handoff doc as governing document; no explicit adaptive learning requirements beyond "difficulty adjustment, spaced repetition" |
| **Cold-start recommendations** | Low | Falls back to curriculum `display_order` (existing behavior) |
| **Over-adaptation (narrowing content)** | Medium | Ensure activity type variety; don't always recommend same type |
| **Fairness/bias in recommendations** | Low | Rules-based, transparent, stage-boundary enforced; no cross-child comparison |
| **Explainability gaps** | Medium | Every recommendation includes `reason` field; parent analytics (Stage 4) surfaces context |
| **Spaced repetition complexity** | Low | Defer to later stage; Stage 5 focuses on difficulty adjustment only |
| **All activities seeded `"easy"`** | Medium | Cannot distinguish genuine difficulty without seed-data/admin changes; falls back to `display_order` |

---

## 9. Checkpoint

**No application code, API, schema, database contents, or runtime behavior was changed during this audit.**

**Carried-forward defects:**
- DEF-006: Playwright E2E unverified (blocks Stage 5F). Remains open until E2E tests have actually run successfully against the required services.

**Open product/privacy decisions:**
- Analytics consent for adaptive learning: pending product/privacy confirmation (see §4.7).
- Difficulty tier configuration (Stage 5F): optional, requires separate approval if a dedicated DB column is desired instead of JSON configuration.

**Awaiting explicit approval before implementing Stage 5.**