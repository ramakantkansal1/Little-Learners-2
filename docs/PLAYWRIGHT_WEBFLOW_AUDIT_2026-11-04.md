# Browser webflow audit — 4 November 2026

## Method

Used the project's installed Playwright with real headless Chromium against
http://localhost:5173. No separate Playwright extension tool is exposed in this
session. Browser registration/login, screenshots, API response inspection, and
read-only MySQL queries were used; no mocked backend responses.

Confirmed the frontend proxy targets the E2E backend and verified the actual
database name with `SELECT DATABASE()`: `happy_little_learners_e2e`.
Existing application code and other users' records were preserved.

## Test account

- Parent: `codex_webflow_1793776811457@example.com`
- Parent display name: Codex Webflow Test Parent
- Child: Codex Test Child, ID **4907**
- Actual server-generated username: `codex_test_child_4907`
- Assigned stage: Playgroup, ID 1
- Credentials are in `/tmp/hll-webflow-credentials.json` with owner-only access;
  they are test credentials and are not committed into this report.

Only one parent and one child were created. Child creation used the authenticated
parent API. Stage assignment was corrected to Playgroup after the default first
stage returned by the contaminated E2E catalog was an "Admin Test Stage".
The accounts were retained for manual inspection. No administrator was created:
student access checks exposed admin dashboard placeholders without admin login.
An authenticated administrator CRUD journey remains unverified.

## Verified working

- Desktop landing and mobile landing at 390px width; no horizontal overflow
  in the checked mobile landing viewport.
- Parent registration through the UI, automatic login, empty dashboard.
- Authenticated parent child creation; parent children and progress routes.
- Parent dashboard, settings and notifications routes render. Rendering does
  not establish that the displayed data or actions are implemented.
- Parent session persists across reload.
- Student login using the server-generated username and PIN.
- Student dashboard, history, rewards, lesson 1 and activity 1 open.
- Activity answer submission returns HTTP 200 and restores saved score after
  reload. Completion returns HTTP 200.
- MySQL contains completed attempt **145** for child 4907, score **100**,
  max_score **2**, and exactly two response rows (questions 1 and 2, one point
  each). A Perfect Score sticker award exists for attempt 145.
- Student request to admin dashboard API was denied (403). Parent profile API
  also denied student access (403). These checks do not cover every API.
- Parent dashboard fits the checked 390px mobile viewport.
- Final history API independently returns completed attempt 145 with score 100.
  Parent progress API returns one completed activity, average score 100 and one
  reward; its recent activity labels are **Unknown / Unknown** rather than the
  lesson/activity names. Final evidence: `verified-persistence.json`,
  `history-list.png`, and `parent-progress-after-completion.png`.

## Confirmed defects

| Priority | Finding | Evidence |
|---|---|---|
| High | Parent/admin frontend routes lack effective role protection | A logged-in student opens `/parent/dashboard` and `/admin/dashboard`. The parent screen shows an API error; admin screen displays statistics and management navigation. An unauthenticated parent dashboard URL also fails to redirect. Backend denial was separately checked; this is not evidence of a backend privilege escalation. |
| High | Score inflates after reload/reselect | Answer question 1 correctly, reload, select it again, answer question 2 correctly and finish: browser shows **150%**, **3 out of 2 correct**. Completion API and MySQL say **100%**. Duplicate submission also increments saved accumulated score from 1 to 2 for the first question; the response table still has one row per question. |
| High | Settings claims success without persistence | Parent settings shows hardcoded **Priya Sharma / priya@example.com** for the new account. Source `handleSave` delays then shows success, without a save API call. |
| High | Admin dashboard presents sample statistics as real | Student-accessible screen shows **1,234 parents**, **2,156 children**, **48 lessons**, **12,450 completions**, with sample recent activity. These values were not derived from this test's authenticated admin API. |
| Medium | Child report makes unsupported claims | Before any learning, subject rows show placeholder zeros, strengths include "Consistent effort" and "Regular practice", and recommendations include Hindi letters/counting backwards/CVC blending. These do not reflect the new child's history or Playgroup suitability. |
| Medium | Learning time is not recorded for tested activity | Completed attempt 145 has `time_spent_seconds=0` after actual browser interaction, reload and completion; history reports zero active days and zero minutes. |
| Medium | Parent recent activity loses content names | Persisted parent progress contains the result but labels the lesson and activity as **Unknown**. Student history uses internal codes `lesson_1` and `activity_1`. |
| Medium | Sample lesson is not usable early-years content | Animal Sounds activity shows generic "Question 1 about Animal Sounds" with repeated "Option 1/2/3" text, rather than meaningful visual/audio choices. Rendering works but curriculum acceptance is not met for this seed content. |

Landing page also displays usage counts, offline capability, universal audio,
email-summary and legal-compliance claims that this review did not establish.
Reconcile product copy against implemented functionality and the master prompt
before release. No legal-compliance assessment was performed.

## Evidence and limitations

Screenshots, extracted page text, and response evidence are under
`artifacts/webflow-2026-11-04/`. In particular:

- `activity-complete.png` / `.txt`: 150% score reproduction.
- `activity-results.json`: saved-progress and completion response evidence.
- `guard-parent.png` / `.txt` and `guard-admin.png` / `.txt`: student route access.
- `-parent-settings.png` / `.txt`: wrong profile details.
- `landing-mobile.png`, `parent-mobile.png`: mobile layout snapshots.

Raw exploratory scripts had setup/assertion mistakes and their JSON results
must not be read as a clean regression-suite pass count. Initial student checks
used a client-provided username that the server ignores; reruns used the actual
username. An initial child stage was a test catalog entry and was corrected.
History defaults to calendar view (a missing activity title there is not a
persistence failure); list view uses a select dropdown. A student children-list
request returned 404, while a separate parent-profile API request returned 403.
The assessment above distinguishes confirmed app defects from these test issues.

This was a targeted exploratory audit, not execution of every existing E2E test
or all 15 activity types. No claim of complete accessibility, security,
multibrowser, multilingual, admin CRUD or production readiness is made. Screens
may be captured during initial animation/loading; do not infer persistent
contrast defects from those frames alone.

## Inspect in MySQL Workbench

Workbench is a client for the MySQL servers running in Docker. For these test
records use TCP host `127.0.0.1`, port **3308**, schema
`happy_little_learners_e2e`, and your configured E2E credentials. The development
server is port **3307**, schema `happy_little_learners`. Do not confuse them.

```sql
SELECT DATABASE();
SELECT id, display_name, username, current_stage_id
FROM student_profiles WHERE id = 4907;
SELECT id, activity_id, status, score, max_score, time_spent_seconds
FROM activity_attempts WHERE student_id = 4907;
SELECT attempt_id, question_id, is_correct, points_earned
FROM activity_responses WHERE attempt_id = 145;
SELECT student_id, reward_id, attempt_id
FROM student_reward_awards WHERE student_id = 4907;
```

## Recommended next implementation checkpoint

Fix route guards and server/session validation, make answer retries/resume
idempotent across score metadata and UI, use the server's authoritative final
score, and implement bounded learning-time persistence. Replace simulated
settings saves and reports with real data or explicit unavailable states.
Separate normal development from E2E configuration and curate useful test
lessons. Add reproducible regression tests for the confirmed failures, then
repeat the parent → child → activity → reload → completion → parent report flow
before closing Phase 6.
