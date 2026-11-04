# Phase 6 — Interactive Learning Activities, Assessment, and Rewards

Date: 4 November 2026. **Status: Phase 6 functional acceptance PASSED.**
This report supersedes earlier Phase 6 closure claims for the files changed here.

## Implementation

- All 15 existing activity renderers use persisted backend configurations. A new
  original pilot lesson in each of Playgroup, Nursery, LKG and UKG demonstrates
  every renderer (60 activities). This is a small shared introductory library,
  not a claim that all stages have a complete differentiated curriculum.
- Server scoring compares selections against **all** correct options for that
  question. Cross-question, invalid and duplicate option identifiers are rejected.
  Empty selections are recorded as incorrect; unanswered tasks block completion.
- Upserted answers recompute counters from unique response rows. Answer retries
  cannot inflate scores. Refresh selects the first unanswered task, restores
  saved selections and feedback, and preserves the completed result.
- Duplicate and concurrent starts resume one unfinished attempt. A retry after
  completion creates the next numbered attempt. Child-level MySQL locks serialize
  attempt numbering, answer writes, completion and reward issuance. Authentication's
  read-only transaction ends before acquiring that lock, avoiding a stale MySQL
  repeatable-read snapshot after a concurrent write.
- Completion is idempotent: transport retries return the saved result. The frontend
  uses the server's score and correct-answer count. It never claims completion
  when the completion request fails, and provides an explicit retry message.
- Visible, recently active browser time is saved cumulatively every ten seconds
  and on answer/completion. Hidden tabs and long idle intervals do not count;
  the server bounds the cumulative value to elapsed wall time and 30 minutes per
  attempt. Retrying a request cannot add time twice. This is approximate learning
  time, not surveillance or a clinical measure.
- Completing an activity earns a discovery star once per activity; replays do
  not award another. Stickers and lesson/learning-count milestone badges remain
  one-time per child. Parents can disable future awards on the child's report;
  historical awards remain visible. Scores never gate participation stars.
- No streak requirement gates these rewards. Child-facing streak pressure was
  removed from the dashboard/history and the week-streak reward is hidden from
  the student reward catalog. Existing internal streak fields remain for
  compatibility with previous reports/tests; no new streak reward is issued.
- Tracing now supports pointer/touch drawing and a keyboard-accessible exploration
  alternative. Only the explored outcome is saved, never stroke coordinates.
  Story exploration has text alternatives and optional device narration.
- Optional narration requires a matching installed voice or an actual media asset.
  It reports missing voice/playback support clearly and supports stop/mute.
  Browser/OS Hindi voice availability is not guaranteed. Full recorded media and
  translation of every interface label belong to Phase 8.
- Parent reports show persisted subject completion, recent translated content
  titles, activity outcomes, time and rewards, with genuine empty/error states.
  Fabricated strengths, placeholder subject zeros and unrelated recommendations
  were removed. The account page now displays the real profile read-only; the
  simulated save flow was removed. Full settings editing remains Phase 9.
- Parent/admin/student page routes verify the session/role with the backend.
  Attempts are restricted to their owning active child and published content in
  that child's stage. Existing backend parent-child permissions remain enforced.
- Development frontend port 5173 targets the development API; the E2E frontend
  is isolated on port 5174. The database entrypoint respects DB_HOST/DB_PORT and
  application credentials. Build contexts exclude secrets/environments/caches;
  frontend Dockerfiles now use Node 22. Backend package mirrors use HTTPS with
  bounded retries/timeouts after HTTP downloads stalled locally.

## Files and database changes

Core execution is in `backend/app/services/activity_attempts.py`, called by the
student routes. Parent routes supply real report aggregates and reward settings.
The activity page, shared renderer props/components, tracing pad, narration,
parent report and role guard implement the corresponding UI behavior. A small
curriculum-page effect dependency correction removes its repeated loading loop.

Additive migrations:

1. `phase6_rewards_20261104`: student_profiles.rewards_enabled (defaults true).
2. `phase6_scopes_20261104`: student_reward_awards.award_key, with uniqueness on
   (student_id, reward_id, award_key). Milestones use `milestone`; discovery stars
   use `activity:<id>`. Existing awards are preserved.

The second migration refuses downgrade if scoped awards would be lost. Reconcile
and export those records before intentionally reverting to the narrower schema.
No existing database was reset. Pilot seeding adds only reserved `phase6_*`
content and reward definitions; unrelated lessons/users were preserved.

## API changes

- POST `/api/v1/students/me/activities/{id}/attempts`: start or resume.
- GET `/api/v1/students/me/attempts/{id}`: status, score, saved responses/time.
- POST `/api/v1/students/attempts/{id}/responses`: validated options or exploration
  outcome, cumulative time, authoritative progress counters.
- PATCH `/api/v1/students/attempts/{id}/time`: cumulative foreground seconds.
- POST `/api/v1/students/attempts/{id}/complete`: saved result, idempotent replay,
  actual rewards and lesson progress. Optional body: time_spent_seconds.
- PATCH `/api/v1/parents/me/children/{id}`: optional rewards_enabled boolean.
- GET `/api/v1/parents/me/children/{id}/progress`: real subjects, seconds, titles
  and rewards_enabled in addition to prior report fields.
- GET `/api/v1/students/me/rewards`: award_count includes scoped discovery stars.

The API keeps prior request fields compatible. Completed answer writes remain
rejected; repeated completion now returns 200 with the same saved result instead
of the previous 422. Existing tests were updated to verify the new contract,
not merely to ignore errors. New tests cover wrong answers, score replacement,
unpublished lessons, resume, incomplete completion and replay.

## Verification

| Check | Actual result |
|---|---|
| Backend `DEBUG=false .venv-phase0-py311/bin/python -m pytest app/tests/ -q` | 106 passed; 32 dependency/deprecation warnings |
| Backend tests inside rebuilt container | 106 passed, 33 warnings, 37.30 seconds; pytest 8.2.2 + pytest-asyncio 0.24.0 from image site-packages |
| Frontend `npm run typecheck` | Passed |
| Frontend `npm run typecheck:tests` | Passed |
| Frontend `npm run lint` | Passed |
| Frontend `npm test -- --run` | 55 passed, 8 files |
| Frontend `npm run build` | Passed; existing mixed static/dynamic renderer import warning |
| Ruff on new backend service/seed/verifier/migrations | Passed |
| Fresh temporary MySQL migration + seed twice + downgrade/upgrade | Passed; 4 stages, 60 activities, correct stage/domain relationships; temporary schema removed |
| Final Chromium/MySQL acceptance | 22 passed, 1.5 minutes, all 15 activity types plus concurrency/recovery/isolation/mobile checks |
| Updated Docker image builds | Backend, E2E backend, Node 22 frontend and E2E frontend: passed |

Direct read-only MySQL verification also confirmed 18 completed attempts across
15 distinct activities, 15 discovery stars, nonzero learning time and zero
duplicate answer/award rows. Final test account: child ID **4924**, lesson ID
**117**. Evidence is in `artifacts/phase6-acceptance-2026-11-04/`; local browser
report: `frontend/playwright-phase6-report/index.html`.

The dedicated Playwright suite is `frontend/tests/phase6/acceptance.spec.ts` and
uses `playwright.phase6.config.ts`. It exercises all 15 renderers, reload before
and after completion, actual drawing, exploration outcomes, concurrent starts,
concurrent answers/completion, wrong answers, failed-answer/completion recovery,
parent reporting, mobile layout, role boundaries, sibling/parent isolation,
stage restrictions, disabled rewards, and missing voice fallback.

Commands (from repository root unless shown otherwise):

```sh
docker compose up -d
docker compose exec backend alembic upgrade head
docker compose exec backend python -m app.scripts.seed_phase6
docker compose exec backend-e2e alembic upgrade head
docker compose exec backend-e2e python -m app.scripts.seed_phase6
docker compose --profile e2e up -d frontend-e2e
cd frontend
npx playwright test -c playwright.phase6.config.ts
npx playwright show-report playwright-phase6-report
```

Fresh-schema verification (creates/removes **only** its unique temporary schema):

```sh
docker compose exec -e DEBUG=false backend-e2e python scripts/verify_phase6_mysql.py
```

`ci-phase6.yml` runs backend/frontend checks and these same Chromium acceptance
cases against a fresh MySQL service. It has not yet been executed on GitHub.
Older workflows still have documented unrelated lint/format/CI debt; this report
is not a claim that every existing workflow or the entire historical E2E suite
passes. Full security/dependency scanning remains Phase 10.

## Final clean-image closure

On resuming the checkpoint, both backends were recreated from the rebuilt images.
The corrected `pytest-asyncio==0.24.0` pin is present in both dependency declarations
and installed at `/usr/local/lib/python3.11/site-packages`, without the temporary
user-site installation used during diagnosis. The clean container regression
suite passed **106 tests** in **37.30 seconds**. It runs with `APP_ENV=development`
so the rate-limit assertion checks normal limits; browser services remain E2E.

Both backends are healthy and both MySQL databases report
`phase6_scopes_20261104` as their migration head. The frontend proxies report
`development` at port 5173 and `e2e` at port 5174. Read-only outcome verification
again found 15 completed activities, 15 completion stars and zero duplicate
answers/awards for test child 4924. Existing data was preserved.

Clean-image test evidence: `artifacts/phase6-acceptance-2026-11-04/container-tests.log`.
All Phase 6 acceptance gates described here passed. Phase 7 has not been started;
production readiness and the later-phase limitations below remain separate work.

## Manual acceptance

1. Open http://localhost:5173 for normal development; register a parent and create
   a child with one of the four stages. Existing E2E accounts use port 5174 instead.
2. Log in as that child; open the **Little discoveries** lesson for its stage.
3. Try a wrong choice, refresh, continue and complete. Refresh the completed page;
   the score must agree with the saved server result. Retry without duplicate stars.
4. Trace a shape with touch/pointer, or use the exploration alternative. Try story
   narration; if no matching voice exists, the screen must say so.
5. As the parent, open the child's Progress report and verify time, subject
   completion, lesson/activity names and rewards. Disable rewards and complete a
   new activity to verify no future award is issued.
6. A student or logged-out browser must not enter parent/admin pages. A different
   parent must not see this child's progress.

Tests create clearly labelled `phase6_*@example.com` parent accounts and child
profiles in **happy_little_learners_e2e**, not the development schema. The latest
manual-test credentials are kept locally in the ignored
`frontend/test-results/phase6/test-account.json` file. Failed-run accounts are
retained for inspection; no blanket cleanup is performed.

Workbench connections: development `127.0.0.1:3307`, E2E `127.0.0.1:3308`, using
the existing configured credentials. No credentials need to be pasted into chat.

## Privacy, limitations and checkpoint

No drawing paths, recordings, exact location, device fingerprint or extra child
personal data are collected by these changes. Necessary response option IDs,
outcomes, timestamps, bounded time and reward records are private to the child,
its authorised parent and permitted administrators. Active-account history is
retained for resume/reporting; account deletion and backup retention must follow
the project's privacy/deletion workflow and be reviewed before deployment.
No automatic deletion of historical records was introduced without a migration
or an owner-approved retention policy. This does not claim legal compliance.

The pilot library is original demonstration content with device-font emoji and
simple geometry; it introduces the engine, and requires educational review and
stage-specific expansion for launch. Older seeded placeholder lessons were not
silently replaced. Recorded audio, production voice providers and full Hindi
interface localisation are not claimed complete. Canvas strokes are intentionally
transient: refresh preserves the saved exploration outcome, not an unfinished
unsaved drawing. Reward opt-out affects future awards, not historical achievements.

Package installation reported existing dependency vulnerabilities. Together with
legacy CI/lint debt and remaining later-phase admin/settings/media features,
these remain release work, not evidence of production readiness. Phase 7 starts
only after the user approves the Phase 6 checkpoint.
