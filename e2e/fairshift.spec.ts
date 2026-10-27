import { expect, test } from "@playwright/test";

test("worker checks in, understands pay, files an anonymous report and admin reviews it", async ({ page }) => {
  await page.goto("/worker/login");
  await page.getByLabel("Workplace").selectOption("org-construction");
  await page.getByLabel("Your name").selectOption("org-construction-worker-1");
  await page.getByLabel("4-digit PIN").fill("1234");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/worker$/);

  await page.getByRole("button", { name: "Check in without camera" }).click();
  await expect(page.getByRole("status")).toContainText("checked in");
  await page.goto("/worker/pay");
  await expect(page.getByRole("heading", { name: "Your explained pay" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Listen to my pay/ })).toBeVisible();
  await page.getByLabel("Choose language").selectOption("ta");
  await expect(page.locator("html")).toHaveAttribute("lang", "ta-IN");
  await expect(page.getByRole("button", { name: /ஊதிய விளக்கத்தைக் கேள்/ })).toBeVisible();
  await page.getByLabel("Choose language").selectOption("hi");
  await expect(page.locator("html")).toHaveAttribute("lang", "hi-IN");
  await expect(page.getByRole("button", { name: /तनख्वाह सुनें/ })).toBeVisible();
  await page.getByLabel("Choose language").selectOption("en");

  await page.goto("/worker/report");
  await page.getByRole("button", { name: /Safety hazard/ }).click();
  const reportText = "No helmet or harness was provided near the unsafe scaffold.";
  await page.getByLabel("Tell us what happened").fill(reportText);
  await page.getByRole("button", { name: "Send anonymous report" }).click();
  const trackingCode = await page.locator(".tracking-success code").innerText();
  expect(trackingCode).toMatch(/^FS-/);

  await page.goto("/worker/track");
  await page.getByLabel("Tracking code").fill(trackingCode);
  await page.getByRole("button", { name: "Check status" }).click();
  await expect(page.getByText("Submitted", { exact: true })).toBeVisible();

  await page.goto("/admin/login");
  await page.getByLabel("Workplace").selectOption("org-construction");
  await page.getByLabel("Admin PIN").fill("2468");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/reports");
  await page.getByText("Original report text").click();
  await expect(page.getByText(reportText)).toBeVisible();
  await expect(page.getByText(/code [a-f0-9]{8}/i)).toBeVisible();

  await page.goto("/admin");
  await page.getByLabel("Industry").selectOption("college");
  await expect(page.getByText("South City College")).toBeVisible();
  await page.getByRole("button", { name: "Sample worker" }).click();
  await expect(page).toHaveURL(/\/worker$/);
  await expect(page.getByText("South City College")).toBeVisible();
  await expect(page.getByLabel("Shift")).toHaveValue("Morning");
});
