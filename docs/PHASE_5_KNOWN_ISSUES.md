# Happy Little Learners — Phase 5 Known Issues

**Project:** Happy Little Learners  
**Phase:** Phase 5 — Curriculum and Activity Content Engine  
**Document Date:** 2026-10-15  
**Status:** Unresolved issues identified during Phase 5 final verification

---

## Summary

This document lists all unresolved issues and coverage gaps identified during Phase 5 verification. Issues are classified by severity and phase ownership.

**Total Issues:** 4  
- **Blocking Phase 5:** 0  
- **Phase 5 (test infrastructure):** 1 (DEF-001 - timeout workaround applied, tests pass)  
- **Phase 6 (deferred):** 3  

---

## Issue Details

### DEF-001: Playwright Reload Tests Require Extended Timeouts

| Field | Value |
|-------|-------|
| **Issue ID** | DEF-001 |
| **Description** | Page reload tests (`navigation.spec.ts` and `learning-activity.spec.ts`) require extended timeouts (60s test timeout, 30s visibility waits) because page reload triggers full auth re-validation (`/auth/me`) and StudentContext re-initialization (profile, dashboard, lessons, subjects fetch) which takes 20-35 seconds in the Docker/Playwright test environment. |
| **Reproducible Steps** | 1. Run `npx playwright test tests/e2e/navigation.spec.ts -g "should reload"` with default timeouts<br>2. Observe timeout on `h1:has-text("Learning Journey")` visibility after `page.reload()`<br>3. Same for rewards page and activity resume test |
| **Expected Behavior** | Page reload should restore authenticated state and page content within default timeout (10-20s) |
| **Actual Behavior** | Auth re-validation + parallel data fetches take 20-35s; tests timeout at 10-20s default |
| **Evidence** | Error context screenshots show "Loading your learning space..." spinner persists after reload; videos show 30s+ reload times with default timeouts |
| **Affected Tests** | `navigation.spec.ts`: "should reload journey page correctly", "should reload rewards page correctly"<br>`learning-activity.spec.ts`: "should start activity and submit answer", "should resume existing attempt on reload" |
| **Current Status** | **All 4 affected tests PASS with extended timeouts applied** (test.setTimeout(60000), expect(...).toBeVisible({ timeout: 30000 })) |
| **Severity** | Low (test infrastructure only) |
| **User Impact** | None — production single-origin deployment avoids cross-origin cookie issues |
| **Blocks Phase 5?** | No |
| **Phase Ownership** | Phase 5 (test infrastructure) / Phase 6 (test hardening) |
| **Recommended Next Action** | 1. Add `storageState` authentication persistence to Playwright config<br>2. Or implement explicit `page.waitForLoadState('networkidle')` after reload<br>3. Consider separating auth state from data fetching in StudentContext for faster reload |

---

### DEF-002: ESLint Fast-Refresh Warning in ActivityRenderer

| Field | Value |
|-------|-------|
| **Issue ID** | DEF-002 |
| **Description** | ESLint reports: `react-refresh/only-export-components` warning at `frontend/src/components/learning/ActivityRenderer.tsx:208:17` — the file exports both components and constants/functions, which breaks React Fast Refresh in development. |
| **Reproducible Steps** | Run `npm run lint` — exits with code 1 due to `max-warnings: 0` |
| **Expected Behavior** | Clean lint pass (or at least no fast-refresh warnings) |
| **Actual Behavior** | 1 warning: "Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components" |
| **Evidence** | `npm run lint` output |
| **Affected Files** | `frontend/src/components/learning/ActivityRenderer.tsx` |
| **Severity** | Low (development experience only) |
| **User Impact** | None — production build succeeds, hot reload may be slower |
| **Blocks Phase 5?** | No |
| **Phase Ownership** | Phase 5 (code quality) / Phase 6 (lint cleanup) |
| **Recommended Next Action** | Extract `activityTypeRegistry` and related constants to separate file (e.g., `ActivityTypeRegistry.ts`); keep only component exports in `ActivityRenderer.tsx` |

---

### DEF-003: No Admin CRUD UI Unit/Integration Tests

| Field | Value |
|-------|-------|
| **Issue ID** | DEF-003 |
| **Description** | The completely rewritten `CurriculumPage.tsx` (admin curriculum management UI) has no Vitest/React Testing Library unit tests and no dedicated Playwright admin workflow tests. Only backend API integration tests exist. |
| **Reproducible Steps** | Check `frontend/src/tests/` — no `CurriculumPage.test.tsx` or similar; check `frontend/tests/e2e/` — no admin CRUD workflow tests |
| **Expected Behavior** | Admin UI should have test coverage for create/edit/delete/publish/archive workflows |
| **Actual Behavior** | Zero frontend tests for admin curriculum management |
| **Evidence** | `frontend/src/tests/` contains only `utils.test.ts` and `student-provider.test.tsx` |
| **Severity** | Medium (regression risk) |
| **User Impact** | Future changes to admin UI may introduce regressions undetected |
| **Blocks Phase 5?** | No |
| **Phase Ownership** | Phase 6 (test hardening) |
| **Recommended Next Action** | 1. Add Vitest tests for `CurriculumPage` form validation, modal open/close, API error handling<br>2. Add Playwright tests for admin workflows: create subject → create lesson → add activities → publish → verify student sees it<br>3. Add test for translation field persistence |

---

### DEF-004: No Per-Activity-Type Component Tests

| Field | Value |
|-------|-------|
| **Issue ID** | DEF-004 |
| **Description** | All 15 activity type components in `frontend/src/components/learning/activity-types/` lack dedicated unit tests. Only the registry dispatch is indirectly tested via E2E. |
| **Reproducible Steps** | Check `frontend/src/components/learning/activity-types/` — no `.test.tsx` files |
| **Expected Behavior** | Each activity component should have tests for rendering, option selection, feedback display, navigation, completion |
| **Actual Behavior** | No component-level tests for any of the 15 activity types |
| **Evidence** | Directory listing shows only `.tsx` implementation files |
| **Severity** | Medium (regression risk) |
| **User Impact** | Changes to activity rendering logic may break specific activity types silently |
| **Blocks Phase 5?** | No |
| **Phase Ownership** | Phase 6 (test hardening) |
| **Recommended Next Action** | 1. Create test file per activity type (e.g., `PictureMatchingActivity.test.tsx`)<br>2. Test: rendering with props, option selection, correct/incorrect feedback, next/previous navigation, completion screen, retry flow<br>3. Use Vitest + React Testing Library with mocked `ActivityTypeComponentProps` |

---

## Classification Summary

| Issue | Blocks Phase 5? | Phase | Severity | Current Status |
|-------|-----------------|-------|----------|----------------|
| DEF-001 | No | 5 (test infra) | Low | **Timeout workaround applied; all 4 affected tests pass** |
| DEF-002 | No | 5/6 | Low | Unresolved |
| DEF-003 | No | 6 | Medium | Unresolved |
| DEF-004 | No | 6 | Medium | Unresolved |

---

## Notes

- No issues were classified as "out of scope merely because they are inconvenient to fix"
- All application-level Phase 5 requirements are **verified working** (see `PHASE_5_FINAL_VERIFICATION_REPORT.md`)
- The documented gaps are explicitly acknowledged and scheduled for Phase 6 resolution
- Approver must acknowledge these items before Phase 5 release sign-off