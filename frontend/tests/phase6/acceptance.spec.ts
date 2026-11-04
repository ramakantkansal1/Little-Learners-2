import { mkdirSync, writeFileSync } from "node:fs";
import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

test.describe.configure({ mode: "serial" });

const apiURL = process.env.E2E_BACKEND_URL || "http://localhost:8001";
let email: string,
  password: string,
  username: string,
  pin: string,
  childId: number;
let parent: APIRequestContext, student: APIRequestContext;
let activities: Array<{
  id: number;
  type: string;
  title: string;
  questions: Array<{
    id: number;
    options: Array<{ id: number; text: string }>;
  }>;
}>;
let lessonId: number;
const attempts: number[] = [];

async function post(ctx: APIRequestContext, path: string, data?: unknown) {
  const stored = (await ctx.storageState()).cookies.find(
    (c) => c.name === "csrf_token",
  );
  const csrf =
    stored?.value ||
    (await (await ctx.get(`${apiURL}/api/v1/auth/csrf-token`)).json())
      .csrf_token;
  return ctx.post(`${apiURL}/api/v1${path}`, {
    data,
    headers: { "X-CSRF-Token": csrf },
  });
}
async function login(page: Page, role: "parent" | "student") {
  await page.goto(`/auth/${role}/login`);
  if (role === "parent") {
    await page.locator("[name=email]").fill(email);
    await page.locator("[name=password]").fill(password);
  } else {
    await page.locator("[name=username]").fill(username);
    await page.locator("[name=pin]").fill(pin);
  }
  await page.locator("button[type=submit]").click();
  await expect(page).toHaveURL(new RegExp(`${role}/dashboard`));
}

test.beforeAll(async ({ playwright }) => {
  parent = await playwright.request.newContext();
  student = await playwright.request.newContext();
  const health = await (await parent.get(`${apiURL}/api/v1/health`)).json();
  expect(health.environment).toBe("e2e");
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  email = `phase6_${suffix}@example.com`;
  password = "Phase6-Test@2026!";
  pin = "4826";
  const registered = await post(parent, "/auth/parent/register", {
    email,
    password,
    confirm_password: password,
    full_name: "Phase 6 acceptance parent",
    accept_terms: true,
    accept_privacy: true,
  });
  expect(registered.ok(), await registered.text()).toBeTruthy();
  expect(
    (await post(parent, "/auth/parent/login", { email, password })).ok(),
  ).toBeTruthy();
  const stages = await (
    await parent.get(`${apiURL}/api/v1/curriculum/stages`)
  ).json();
  const stage = stages.find((s: { code: string }) => s.code === "playgroup");
  const child = await post(parent, "/parents/me/children", {
    display_name: `Phase6 child ${suffix}`,
    pin,
    current_stage_id: stage.id,
  });
  expect(child.ok(), await child.text()).toBeTruthy();
  const data = await child.json();
  childId = data.id;
  username = data.username;
  expect(
    (await post(student, "/auth/student/login", { username, pin })).ok(),
  ).toBeTruthy();
  const lessons = await (
    await student.get(`${apiURL}/api/v1/students/me/lessons`)
  ).json();
  lessonId = lessons.find(
    (l: { code: string }) => l.code === "phase6_playgroup",
  ).id;
  const lesson = await (
    await student.get(`${apiURL}/api/v1/students/me/learn/${lessonId}`)
  ).json();
  activities = lesson.activities;
  expect(activities).toHaveLength(15);
  mkdirSync("test-results/phase6", { recursive: true });
  writeFileSync(
    "test-results/phase6/test-account.json",
    JSON.stringify(
      { email, password, username, pin, childId, lessonId },
      null,
      2,
    ),
    { mode: 0o600 },
  );
});
test.afterAll(async () => {
  await parent?.dispose();
  await student?.dispose();
});

const types = [
  "image_selection",
  "color_identification",
  "shape_matching",
  "picture_matching",
  "alphabet_recognition",
  "letter_sound",
  "number_recognition",
  "counting",
  "sorting",
  "sequencing",
  "tracing",
  "story_listening",
  "picture_comprehension",
  "simple_quiz",
  "audio_identification",
];
for (const type of types)
  test(`${type}: browser completion and reload`, async ({ page }) => {
    await login(page, "student");
    const activity = activities.find((a) => a.type === type)!;
    await page.goto(`/student/activity/${activity.id}`);
    await expect(page.locator("main h1")).toHaveText(activity.title);
    await expect(page).toHaveURL(/attempt=\d+/);
    const attemptId = Number(new URL(page.url()).searchParams.get("attempt"));
    attempts.push(attemptId);
    await page.waitForTimeout(1200);
    if (type === "tracing") {
      const box = await page.locator("canvas").boundingBox();
      expect(box).not.toBeNull();
      await page.mouse.move(box!.x + 80, box!.y + 80);
      await page.mouse.down();
      await page.mouse.move(box!.x + 150, box!.y + 120, { steps: 8 });
      await page.mouse.up();
      await page.getByRole("button", { name: "I explored it!" }).click();
    } else if (type === "story_listening")
      await page.getByRole("button", { name: "We enjoyed the story!" }).click();
    else
      await page
        .locator("main button")
        .filter({ hasText: activity.questions[0].options[0].text })
        .first()
        .click();
    await expect(
      page.getByRole("button", { name: "Finish", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Finish", exact: true }),
    ).toBeVisible();
    const saved = await (
      await student.get(`${apiURL}/api/v1/students/me/attempts/${attemptId}`)
    ).json();
    expect(saved.saved_progress.answers_submitted).toBe(1);
    expect(saved.saved_progress.correct_count).toBe(1);
    const responsePromise = page.waitForResponse((r) =>
      r.url().endsWith(`/attempts/${attemptId}/complete`),
    );
    await page.getByRole("button", { name: "Finish", exact: true }).click();
    expect((await responsePromise).status()).toBe(200);
    await expect(page.getByText("100% Score", { exact: true })).toBeVisible();
    await expect(
      page.getByText("You got 1 out of 1 correct!", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByText("100% Score", { exact: true })).toBeVisible();
  });

test("wrong answers, duplicate starts, concurrent submissions and completion are safe", async () => {
  const a = activities.find((a) => a.type === "simple_quiz")!;
  const starts = await Promise.all([
    post(student, `/students/me/activities/${a.id}/attempts`),
    post(student, `/students/me/activities/${a.id}/attempts`),
  ]);
  expect(starts.every((s) => s.ok())).toBeTruthy();
  const [one, two] = await Promise.all(starts.map((r) => r.json()));
  expect(one.attempt_id).toBe(two.attempt_id);
  const attempt = one.attempt_id;
  const q = one.activity.questions[0];
  const wrong = await post(student, `/students/attempts/${attempt}/responses`, {
    question_id: q.id,
    selected_option_ids: [q.options[1].id],
  });
  expect((await wrong.json()).is_correct).toBe(false);
  const payload = { question_id: q.id, selected_option_ids: [q.options[0].id] };
  const answers = await Promise.all([
    post(student, `/students/attempts/${attempt}/responses`, payload),
    post(student, `/students/attempts/${attempt}/responses`, payload),
  ]);
  for (const answer of answers) {
    expect(answer.ok()).toBeTruthy();
    expect((await answer.json()).saved_progress.correct_count).toBe(1);
  }
  const completed = await Promise.all([
    post(student, `/students/attempts/${attempt}/complete`),
    post(student, `/students/attempts/${attempt}/complete`),
  ]);
  const results = await Promise.all(completed.map((r) => r.json()));
  expect(completed.every((r) => r.ok())).toBeTruthy();
  expect(results[0]).toEqual(results[1]);
  expect(results[0].score).toBe(100);
});

test("network failure does not show false completion; retry succeeds", async ({
  page,
}) => {
  await login(page, "student");
  const a = activities[0];
  await page.goto(`/student/activity/${a.id}`);
  await expect(page.locator("main h1")).toHaveText(a.title);
  await page
    .locator("main button")
    .filter({ hasText: a.questions[0].options[0].text })
    .first()
    .click();
  await page.route("**/attempts/*/complete", (route) => route.abort("failed"));
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Completion was not saved",
  );
  await expect(page.getByText("Great Job!", { exact: true })).not.toBeVisible();
  await page.unroute("**/attempts/*/complete");
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByText("100% Score", { exact: true })).toBeVisible();
});

test("parent report uses persisted outcomes and reward preference persists", async ({
  page,
}) => {
  await login(page, "parent");
  await page.goto(`/parent/children/${childId}/progress`);
  await expect(page.getByRole("heading", { name: /Progress/ })).toBeVisible();
  await expect(
    page.getByText("Little discoveries", { exact: false }).first(),
  ).toBeVisible();
  const report = await (
    await parent.get(`${apiURL}/api/v1/parents/me/children/${childId}/progress`)
  ).json();
  expect(report.total_time_spent_seconds).toBeGreaterThan(0);
  expect(report.average_score).toBe(100);
  expect(
    report.subjects.some(
      (s: { completed_lessons: number }) => s.completed_lessons > 0,
    ),
  ).toBeTruthy();
  expect(
    report.recent_activity.every(
      (r: { lesson: string; activity: string }) =>
        r.lesson !== "Unknown" && r.activity !== "Unknown",
    ),
  ).toBeTruthy();
  const toggle = page.getByRole("checkbox", {
    name: "Enable rewards for this child",
  });
  await toggle.uncheck();
  await expect(toggle).toBeEnabled();
  await page.reload();
  await expect(toggle).not.toBeChecked();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page
        .locator("aside")
        .evaluate((el) => Math.round(el.getBoundingClientRect().right)),
    )
    .toBeLessThanOrEqual(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/phase6/parent-mobile.png",
    fullPage: true,
  });
});

test("student and anonymous role boundaries", async ({ page, browser }) => {
  await login(page, "student");
  for (const route of ["/parent/dashboard", "/admin/dashboard"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/student\/dashboard/);
  }
  expect((await student.get(`${apiURL}/api/v1/admin/dashboard`)).status()).toBe(
    403,
  );
  expect((await student.get(`${apiURL}/api/v1/parents/me`)).status()).toBe(403);
  const other = await browser.newContext();
  const anonymous = await other.newPage();
  await anonymous.goto(
    `${test.info().project.use.baseURL || "http://localhost:5174"}/parent/dashboard`,
  );
  await expect(anonymous).toHaveURL(/auth\/parent\/login/);
  await other.close();
});

test("sibling attempt isolation, stage restrictions, parent isolation and rewards disabled", async ({
  playwright,
}) => {
  const suffix = Date.now();
  const created = await post(parent, "/parents/me/children", {
    display_name: `Phase6 sibling ${suffix}`,
    pin,
    current_stage_id: 1,
  });
  expect(created.ok(), await created.text()).toBeTruthy();
  const child = await created.json();
  const csrf = (await parent.storageState()).cookies.find(
    (c) => c.name === "csrf_token",
  )!.value;
  const patch = await parent.patch(
    `${apiURL}/api/v1/parents/me/children/${child.id}`,
    { headers: { "X-CSRF-Token": csrf }, data: { rewards_enabled: false } },
  );
  expect(patch.ok()).toBeTruthy();
  const sibling = await playwright.request.newContext();
  expect(
    (
      await post(sibling, "/auth/student/login", {
        username: child.username,
        pin,
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await sibling.get(`${apiURL}/api/v1/students/me/attempts/${attempts[0]}`)
    ).status(),
  ).toBe(404);
  const a = activities[0];
  const started = await post(
    sibling,
    `/students/me/activities/${a.id}/attempts`,
  );
  expect(started.ok()).toBeTruthy();
  const startedData = await started.json();
  const q = startedData.activity.questions[0];
  await post(
    sibling,
    `/students/attempts/${startedData.attempt_id}/responses`,
    { question_id: q.id, selected_option_ids: [q.options[0].id] },
  );
  const complete = await post(
    sibling,
    `/students/attempts/${startedData.attempt_id}/complete`,
  );
  expect(complete.ok()).toBeTruthy();
  expect((await complete.json()).rewards_earned).toEqual([]);
  const report = await (
    await parent.get(
      `${apiURL}/api/v1/parents/me/children/${child.id}/progress`,
    )
  ).json();
  expect(report.rewards_earned).toBe(0);
  const stages = await (
    await parent.get(`${apiURL}/api/v1/curriculum/stages`)
  ).json();
  const ukg = stages.find((s: { code: string }) => s.code === "ukg");
  const moved = await parent.patch(
    `${apiURL}/api/v1/parents/me/children/${child.id}`,
    { headers: { "X-CSRF-Token": csrf }, data: { current_stage_id: ukg.id } },
  );
  expect(moved.ok()).toBeTruthy();
  expect(
    (await post(sibling, `/students/me/activities/${a.id}/attempts`)).status(),
  ).toBe(404);
  const stranger = await playwright.request.newContext();
  const email = `phase6_other_${suffix}@example.com`;
  await post(stranger, "/auth/parent/register", {
    email,
    password,
    confirm_password: password,
    full_name: "Other phase6 parent",
    accept_terms: true,
    accept_privacy: true,
  });
  await post(stranger, "/auth/parent/login", { email, password });
  expect(
    (
      await stranger.get(
        `${apiURL}/api/v1/parents/me/children/${childId}/progress`,
      )
    ).status(),
  ).toBe(404);
  await sibling.dispose();
  await stranger.dispose();
});

test("failed answer remains retryable", async ({ page }) => {
  await login(page, "student");
  const a = activities[0];
  await page.goto(`/student/activity/${a.id}`);
  await expect(page.locator("main h1")).toHaveText(a.title);
  await page.route("**/attempts/*/responses", (route) => route.abort("failed"));
  await page
    .locator("main button")
    .filter({ hasText: a.questions[0].options[0].text })
    .first()
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Your answer could not be saved",
  );
  await expect(
    page.getByRole("button", { name: "Finish", exact: true }),
  ).not.toBeVisible();
  await page.unroute("**/attempts/*/responses");
  await page
    .locator("main button")
    .filter({ hasText: a.questions[0].options[0].text })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Finish", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByText("100% Score", { exact: true })).toBeVisible();
});

test("missing device voice shows a clear narration fallback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (window.speechSynthesis)
      Object.defineProperty(window.speechSynthesis, "getVoices", {
        value: () => [],
      });
  });
  await login(page, "student");
  await page.goto(`/student/activity/${activities[0].id}`);
  await page.getByRole("button", { name: "Read instructions aloud" }).click();
  await expect(page.getByRole("status")).toContainText(
    /No matching voice|Narration is unavailable/,
  );
});
