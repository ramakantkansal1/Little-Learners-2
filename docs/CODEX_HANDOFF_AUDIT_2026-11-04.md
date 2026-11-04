# Codex handoff audit — 4 November 2026

## Scope and conclusion

Reviewed the attached master prompt, repository structure, README, phase reports,
Docker configuration, migrations, CI configuration, progress models/routes,
activity components, and selected parent reporting code. This is a handoff and
baseline assessment, not a complete security or curriculum audit.

The existing React/TypeScript/Vite + FastAPI/SQLAlchemy + MySQL architecture fits
the master prompt and should be preserved. No restart from Phase 0 is needed.
Phase 6 has substantial implementation, including attempts, responses, resume
data, rewards, history, and adaptive recommendations. It is not yet verified
complete. Later-phase admin/media/settings code already exists; its presence
does not establish acceptance of those phases.

## Actual verification

| Check | Result |
|---|---|
| Frontend `npm run build` | PASS; mixed static/dynamic ActivityRenderer import warning |
| Frontend `npm test -- --run` | 54 passed, 1 failed, 8 files |
| Frontend `npm run lint` | PASS |
| Frontend `npm run typecheck:tests` | PASS |
| Backend `.venv-phase0-py311/bin/python -m pytest app/tests/ -q` | Initially blocked by inherited `DEBUG=release` |
| Backend rerun with `DEBUG=false` | 103 passed, 32 warnings, 27.46 seconds |
| `docker compose up -d` | PASS after starting Docker Desktop via CLI |
| Development API health and database health | Healthy; MySQL connected |
| E2E database health | Healthy; MySQL connected |
| Frontend `/` | HTTP 200 |
| Frontend proxied `/api/v1/health` | Healthy, but environment is `e2e` |
| Alembic current/head | Both databases at `a7b8c9d0e1f2` (head) |

The failed frontend test is `CurriculumPage — Form Validation > shows validation
error when creating a lesson without required fields`: the helper searches for
buttons while the page still displays its loading state. Diagnose the async
setup before deciding whether the defect is test-only.

Backend fixtures use temporary SQLite databases and `metadata.create_all`.
Their success does not verify MySQL migrations, locking, foreign-key behavior,
or concurrent reward/attempt persistence. Live MySQL connectivity and revision
were checked separately; full authenticated persistence E2E was not executed.
No browser visual/mobile acceptance review, fresh Docker image build, remote
GitHub Actions run, or complete vulnerability scan was performed.

Docker Desktop initially had no running daemon. macOS `open` failed with
`kLSNoExecutableErr`; `docker desktop start` succeeded with sandbox escalation.
Existing images and containers were reused. All seven services were running
at the end: mysql, mysql-e2e, redis, backend, backend-e2e, frontend, adminer.
No migration upgrade, reseed, volume removal, or data reset was performed.

## Priority findings

1. **Development frontend targets E2E.** `docker-compose.yml` sets frontend
   `E2E_MODE=true`; `frontend/vite.config.ts` then proxies to
   `hll-backend-e2e:8000`. Confirmed by live proxy health response. Separate
   normal development and E2E configuration before normal use.
2. **E2E entrypoint checks the wrong database.** `backend/entrypoint.sh`
   hardcodes host `mysql` and root authentication instead of the configured
   database host and application credentials. E2E readiness can depend on the
   development database. Current startup success does not resolve this defect.
3. **Frontend test is failing.** Fix and rerun before declaring Phase 6 complete.
   The previous report's two backend failures did not reproduce locally today.
4. **Parent subject progress is still fabricated zero data.**
   `frontend/src/pages/parent/ChildProgressPage.tsx:getSubjectProgress` returns
   a hardcoded subject array with zeros. Replace it with persisted aggregates
   or an honest unavailable state. Other parent summary data uses API calls.
5. **Completion counting needs regression coverage.** The activity completion
   route counts completed attempts when calculating lesson percentage, while
   another helper counts distinct activities. Repeated attempts may therefore
   inflate percentage or finish a lesson early. Reproduce on MySQL and unify
   the calculation around distinct eligible activities.
6. **E2E CI has concrete connection mismatches.** `ci-e2e.yml` maps MySQL to
   host port 3308 but supplies DB_PORT 3306; launches uvicorn on 8000 while
   waiting for 8001; and invokes `scripts/seed_e2e.py`. Verify the seed path
   and align service, API, frontend proxy, and Playwright settings. The
   Playwright config also uses `testIgnorePatterns`; verify effective exclusion
   using supported Playwright options and test listing. Do not treat old
   reported test counts as execution evidence.
7. **Fresh builds and production configuration need a separate gate.** Neither
   frontend nor backend has a `.dockerignore` in its build context, and both
   Dockerfiles use `COPY . .`. Local environments, caches, and backend `.env`
   can enter build contexts/images. The documented production command merges
   development and production Compose files; inspect resolved configuration
   for inherited bind mounts, published database ports, test services, and dev
   commands before deployment. Do not publish expanded secret values.
8. **Child reward design needs prompt reconciliation.** Code includes streaks,
   a week-streak badge, and a fixed 70% pass threshold. Review child-facing
   presentation against the prompt's gentle, age-appropriate assessment and
   avoidance of streak pressure. A blanket threshold may not suit exploration,
   drawing, and listening activities.
9. **Reports require reconciliation.** Existing reports disagree on acceptance,
   test totals, defect IDs, and open issues. Keep one current phase checklist
   grounded in actual commands and results. README test paths/commands also
   need correction: backend tests live under `app/tests`, and root E2E npm
   scripts are documented although no root package.json exists.

## Recommended continuation

Remain within Phase 6. First fix environment separation, the database wait
script, and the frontend failure. Then verify all 15 activity types for
database-driven execution, resume after refresh, server-side scoring,
ownership/stage/publication checks, duplicate and concurrent submissions,
unique rewards, sensible time measurement, and actual parent report updates.
Use an isolated MySQL test database and preserve existing development data.
Repair CI so local acceptance commands and CI exercise the same configuration.
Record evidence, remaining limitations, and manual checks in one Phase 6
closure report. Obtain the user's Phase 7 checkpoint approval afterward, as
required by the master prompt.

## Information needed from the owner

No additional architecture document or OpenCode/Nvidia history is required to
start remediation. Useful inputs are any uncommitted work outside this folder,
the latest separately approved Phase 6 substage/checklist, and any known
must-preserve behavior not recorded in the repository. Before tests that alter
data, establish whether existing development and E2E volumes contain anything
that must be retained and confirm the disposable test database.

Hosting/domain, email/SMS, media storage, speech services, final content/licensing,
and production privacy/retention decisions can be settled at their applicable
later phases. No production credentials are needed for current Phase 6 work;
keep secrets out of chat and committed files.

## Local access

- Frontend: http://localhost:5173 (currently uses E2E API)
- Development API docs: http://localhost:8000/docs
- E2E API: http://localhost:8001
- Database UI: http://localhost:8080

This review changed documentation only. Application source and database contents
were preserved; generated frontend build output and local test caches may have
been refreshed by verification commands.
