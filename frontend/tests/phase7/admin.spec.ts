import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const credentials = JSON.parse(
  readFileSync("test-results/phase7/admin.json", "utf8"),
);
test("administrator content lifecycle, real metrics, management and audit", async ({
  page,
  playwright,
}) => {
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => console.log("Browser error:", e.message));
  await page.goto("/auth/parent/login");
  await page.locator("[name=email]").fill(credentials.email);
  await page.locator("[name=password]").fill(credentials.password);
  await page.locator("button[type=submit]").click();
  await expect(page).toHaveURL(/admin\/dashboard/);
  await expect(
    page.getByRole("heading", { name: "Admin dashboard", exact: true }),
  ).toBeVisible();
  const req = page.context().request;
  const mutate = async (path: string, data?: unknown) => {
    const cookies = await page.context().cookies();
    const csrf = cookies.find((c) => c.name === "csrf_token")!.value;
    console.log("Admin action:", path);
    const r = await req.post("/api/v1/admin" + path, {
      data,
      headers: { "X-CSRF-Token": csrf },
    });
    expect(r.ok(), await r.text()).toBeTruthy();
    return r.json();
  };
  const metrics = await (await req.get("/api/v1/admin/dashboard")).json();
  expect(metrics.total_parents).toBeGreaterThan(0);
  expect(metrics.total_children).toBeGreaterThan(0);
  const suffix = Date.now().toString();
  const stage = await mutate("/stages", {
    code: "p7" + suffix,
    name: "Phase 7 learning stage",
    min_age_months: 24,
    max_age_months: 36,
  });
  const domain = await mutate("/catalog/domains", {
    stage_id: stage.id,
    code: "p7" + suffix,
    name: "Phase 7 discovery",
  });
  const subject = await mutate("/subjects", {
    stage_id: stage.id,
    domain_id: domain.id,
    code: "p7" + suffix,
    name: "Phase 7 nature",
  });
  const topic = await mutate("/catalog/topics", {
    subject_id: subject.id,
    code: "p7" + suffix,
    name: "Phase 7 animals",
  });
  const objective = await mutate("/catalog/objectives", {
    topic_id: topic.id,
    code: "p7" + suffix,
    description: "Recognise a familiar elephant",
  });
  const lesson = await mutate("/lessons", {
    topic_id: topic.id,
    code: "p7" + suffix,
    status: "draft",
    translations: [
      { language: "en", title: "Phase 7 Elephant Journey " + suffix },
      { language: "hi", title: "हाथी की यात्रा" },
    ],
  });
  const activity = await mutate("/activities", {
    lesson_id: lesson.id,
    type: "image_selection",
    code: "p7" + suffix,
    status: "draft",
    configuration: {},
    translations: [
      { language: "en", title: "Phase 7 Find the elephant " + suffix },
      { language: "hi", title: "हाथी खोजो" },
    ],
  });
  await page.goto("/admin/catalog");
  console.log("Opened structure editor");
  await page
    .getByLabel("Collection", { exact: true })
    .selectOption("questions");
  await page
    .getByLabel("activity_id", { exact: true })
    .selectOption(String(activity.id));
  await page
    .getByLabel("prompt", { exact: true })
    .fill("Which animal is an elephant? 🐘");
  await page.getByLabel("question_type", { exact: true }).fill("single_choice");
  await page.getByLabel("points", { exact: true }).fill("1");
  await expect(page.getByLabel("activity_id", { exact: true })).toHaveValue(
    String(activity.id),
  );
  const created = page.waitForResponse(
    (r) =>
      r.url().endsWith("/catalog/questions") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  const response = await created;
  expect(response.status(), await response.text()).toBe(201);
  const question = await response.json();
  await expect(page.getByRole("status")).toContainText("Saved.");
  await mutate("/catalog/options", {
    question_id: question.id,
    text: "🐘 Elephant",
    is_correct: true,
  });
  await mutate("/catalog/options", {
    question_id: question.id,
    text: "🐟 Fish",
    is_correct: false,
  });
  const csrf = (await page.context().cookies()).find(
    (c) => c.name === "csrf_token",
  )!.value;
  const assigned = await req.put(
    `/api/v1/admin/lessons/${lesson.id}/objectives`,
    {
      headers: { "X-CSRF-Token": csrf },
      data: { objective_ids: [objective.id] },
    },
  );
  expect(assigned.ok()).toBeTruthy();
  const preview = await (
    await req.get(`/api/v1/admin/lessons/${lesson.id}/preview`)
  ).json();
  expect(preview.activities[0].questions[0].prompt).toContain("elephant");
  await page.goto("/admin/curriculum");
  await page
    .getByRole("button", { name: /Activities/ })
    .first()
    .click();
  const row = page
    .getByRole("row")
    .filter({ hasText: "Phase 7 Find the elephant " + suffix });
  await row.getByRole("button", { name: /Preview/ }).click();
  await expect(
    page.getByRole("heading", { name: "Which animal is an elephant? 🐘" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close preview", exact: true })
    .click();
  const published = await mutate(`/lessons/${lesson.id}/publish`);
  expect(published.valid).toBe(true);
  await mutate(`/lessons/${lesson.id}/archive`);
  const archived = await (
    await req.get("/api/v1/admin/lessons?status=archived&limit=100")
  ).json();
  expect(archived.some((l: { id: number }) => l.id === lesson.id)).toBeTruthy();
  const logs = (
    await (await req.get("/api/v1/admin/audit-logs?limit=100")).json()
  ).logs;
  expect(
    logs.some(
      (l: { resource_id: string; action: string }) =>
        String(l.resource_id) === String(lesson.id) &&
        l.action === "content_publish",
    ),
  ).toBeTruthy();
  for (const route of [
    "/admin/users",
    "/admin/children",
    "/admin/analytics",
    "/admin/audit-logs",
    "/admin/settings",
    "/admin/media",
  ]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.getByRole("alert")).not.toBeVisible();
  }
  await page.goto("/admin/settings");
  const settings = page.waitForResponse(
    (r) =>
      r.url().endsWith("/platform-settings") && r.request().method() === "PUT",
  );
  await page.getByRole("button", { name: "Save platform settings" }).click();
  expect((await settings).status()).toBe(200);
  await expect(page.getByRole("status")).toContainText("Settings saved");
  const anon = await playwright.request.newContext({
    baseURL: "http://localhost:5174",
  });
  expect((await anon.get("/api/v1/admin/dashboard")).status()).toBe(403);
  await anon.dispose();
  await page.screenshot({
    path: "test-results/phase7-browser/admin-settings.png",
    fullPage: true,
  });
});
