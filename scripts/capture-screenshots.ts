/**
 * Playwright screenshot capture for Ledra onboarding videos.
 * Run after `next dev` is serving on E2E_BASE_URL (default: http://localhost:3000).
 *
 * Outputs to public/screenshots/{admin,insurer,agent}/
 *
 * Usage:
 *   npx tsx scripts/capture-screenshots.ts
 */
import { chromium, Page } from "playwright";
import path from "path";
import fs from "fs";

const BASE_URL = process.env.E2E_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";

const ADMIN_EMAIL    = process.env.DEMO_ADMIN_EMAIL    || "demo@ledra-motors.example";
const ADMIN_PASSWORD = process.env.DEMO_ADMIN_PASSWORD || "Demo1234!";
const INSURER_EMAIL    = process.env.DEMO_INSURER_EMAIL    || "";
const INSURER_PASSWORD = process.env.DEMO_INSURER_PASSWORD || "";
const AGENT_EMAIL    = process.env.DEMO_AGENT_EMAIL    || "";
const AGENT_PASSWORD = process.env.DEMO_AGENT_PASSWORD || "";

const OUT = path.join(process.cwd(), "public", "screenshots");

async function go(page: Page, url: string) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(800);
}

async function shot(page: Page, file: string) {
  const dest = path.join(OUT, file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  await page.screenshot({ path: dest, fullPage: false });
  console.log("✓", file);
}

async function captureAdmin(browser: ReturnType<typeof chromium.launch> extends Promise<infer T> ? T : never) {
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  // Login page (pre-auth)
  await go(page, `${BASE_URL}/login`);
  await shot(page, "admin/login.png");

  // Authenticate
  await page.locator('input[name="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[name="password"]').fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/admin/, { timeout: 20000 });
  await page.waitForTimeout(1200);

  // Dashboard
  await go(page, `${BASE_URL}/admin`);
  await shot(page, "admin/dashboard.png");

  // Certificates list
  await go(page, `${BASE_URL}/admin/certificates`);
  await shot(page, "admin/certs-list.png");

  // Try to open new-certificate form
  const newCertBtn = page.locator(
    'button:has-text("発行"), button:has-text("新規"), a:has-text("発行"), a:has-text("新規"), button:has-text("New"), a:has-text("New")'
  ).first();
  if ((await newCertBtn.count()) > 0) {
    await newCertBtn.click();
    await page.waitForTimeout(800);
    await shot(page, "admin/certs-new.png");
    await page.goBack();
    await page.waitForTimeout(500);
  } else {
    fs.copyFileSync(path.join(OUT, "admin/certs-list.png"), path.join(OUT, "admin/certs-new.png"));
  }

  // Vehicles list
  await go(page, `${BASE_URL}/admin/vehicles`);
  await shot(page, "admin/vehicles-list.png");

  // Try new vehicle form
  const newVehicleBtn = page.locator(
    'button:has-text("登録"), button:has-text("新規"), a:has-text("登録"), a:has-text("新規")'
  ).first();
  if ((await newVehicleBtn.count()) > 0) {
    await newVehicleBtn.click();
    await page.waitForTimeout(800);
    await shot(page, "admin/vehicles-new.png");
    await page.goBack();
    await page.waitForTimeout(500);
  } else {
    fs.copyFileSync(path.join(OUT, "admin/vehicles-list.png"), path.join(OUT, "admin/vehicles-new.png"));
  }

  // Customers
  await go(page, `${BASE_URL}/admin/customers`);
  await shot(page, "admin/customers-list.png");

  // Try clicking first customer row for detail
  const firstCustomer = page.locator("table tbody tr, [data-testid='customer-row'], .customer-row").first();
  if ((await firstCustomer.count()) > 0) {
    await firstCustomer.click();
    await page.waitForTimeout(800);
    await shot(page, "admin/customers-detail.png");
    await page.goBack();
    await page.waitForTimeout(500);
  } else {
    fs.copyFileSync(path.join(OUT, "admin/customers-list.png"), path.join(OUT, "admin/customers-detail.png"));
  }

  // Reservations
  await go(page, `${BASE_URL}/admin/reservations`);
  await shot(page, "admin/reservations.png");

  // POS
  await go(page, `${BASE_URL}/admin/pos`);
  await shot(page, "admin/pos.png");

  // Billing
  await go(page, `${BASE_URL}/admin/billing`);
  await shot(page, "admin/billing.png");

  // Settings (general)
  await go(page, `${BASE_URL}/admin/settings`);
  await shot(page, "admin/settings.png");

  // Try members/team sub-page
  const membersLink = page.locator('a:has-text("メンバー"), a:has-text("チーム"), a:has-text("Members"), a:has-text("Team")').first();
  if ((await membersLink.count()) > 0) {
    await membersLink.click();
    await page.waitForTimeout(800);
    await shot(page, "admin/settings-members.png");
  } else {
    fs.copyFileSync(path.join(OUT, "admin/settings.png"), path.join(OUT, "admin/settings-members.png"));
  }

  await ctx.close();
}

async function captureInsurer(browser: ReturnType<typeof chromium.launch> extends Promise<infer T> ? T : never) {
  if (!INSURER_EMAIL) {
    console.warn("⚠ DEMO_INSURER_EMAIL not set — skipping insurer screenshots");
    return;
  }

  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  // Login page
  await go(page, `${BASE_URL}/insurer/login`);
  await shot(page, "insurer/login.png");

  // Authenticate
  await page.locator('input[name="email"], input[type="email"]').fill(INSURER_EMAIL);
  await page.locator('input[name="password"], input[type="password"]').fill(INSURER_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/insurer\/dashboard/, { timeout: 20000 });
  await page.waitForTimeout(1200);

  // Dashboard
  await shot(page, "insurer/dashboard.png");

  // Search
  await go(page, `${BASE_URL}/insurer/search`);
  await shot(page, "insurer/search.png");

  // Certificates
  await go(page, `${BASE_URL}/insurer/certificates`);
  await shot(page, "insurer/certs.png");

  // Try clicking first certificate for detail
  const firstCert = page.locator("table tbody tr, [data-testid='cert-row']").first();
  if ((await firstCert.count()) > 0) {
    await firstCert.click();
    await page.waitForTimeout(800);
    await shot(page, "insurer/cert-detail.png");
    await page.goBack();
    await page.waitForTimeout(500);
  } else {
    fs.copyFileSync(path.join(OUT, "insurer/certs.png"), path.join(OUT, "insurer/cert-detail.png"));
  }

  // Vehicles
  await go(page, `${BASE_URL}/insurer/vehicles`);
  await shot(page, "insurer/vehicles.png");

  // Cases
  await go(page, `${BASE_URL}/insurer/cases`);
  await shot(page, "insurer/cases.png");

  // Try new case form
  const newCaseBtn = page.locator(
    'button:has-text("新規"), button:has-text("作成"), a:has-text("新規"), a:has-text("作成")'
  ).first();
  if ((await newCaseBtn.count()) > 0) {
    await newCaseBtn.click();
    await page.waitForTimeout(800);
    await shot(page, "insurer/cases-new.png");
    await page.goBack();
    await page.waitForTimeout(500);
  } else {
    fs.copyFileSync(path.join(OUT, "insurer/cases.png"), path.join(OUT, "insurer/cases-new.png"));
  }

  await ctx.close();
}

async function captureAgent(browser: ReturnType<typeof chromium.launch> extends Promise<infer T> ? T : never) {
  if (!AGENT_EMAIL) {
    console.warn("⚠ DEMO_AGENT_EMAIL not set — skipping agent screenshots");
    return;
  }

  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  // Login page
  await go(page, `${BASE_URL}/agent/login`);
  await shot(page, "agent/login.png");

  // Authenticate
  await page.locator('input[name="email"], input[type="email"]').fill(AGENT_EMAIL);
  await page.locator('input[name="password"], input[type="password"]').fill(AGENT_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/agent\/dashboard/, { timeout: 20000 });
  await page.waitForTimeout(1200);

  // Dashboard
  await shot(page, "agent/dashboard.png");

  // Referrals list
  await go(page, `${BASE_URL}/agent/referrals`);
  await shot(page, "agent/referrals.png");

  // Try new referral form
  const newRefBtn = page.locator(
    'button:has-text("新規"), button:has-text("紹介"), a:has-text("新規"), a:has-text("紹介")'
  ).first();
  if ((await newRefBtn.count()) > 0) {
    await newRefBtn.click();
    await page.waitForTimeout(800);
    await shot(page, "agent/referrals-new.png");
    await page.goBack();
    await page.waitForTimeout(500);
  } else {
    fs.copyFileSync(path.join(OUT, "agent/referrals.png"), path.join(OUT, "agent/referrals-new.png"));
  }

  // Commissions
  await go(page, `${BASE_URL}/agent/commissions`);
  await shot(page, "agent/commissions.png");

  // Training
  await go(page, `${BASE_URL}/agent/training`);
  await shot(page, "agent/training.png");

  await ctx.close();
}

async function main() {
  console.log("📸 Capturing screenshots from", BASE_URL);
  const browser = await chromium.launch({ headless: true });

  await captureAdmin(browser);
  await captureInsurer(browser);
  await captureAgent(browser);

  await browser.close();
  console.log("✅ All screenshots saved to public/screenshots/");
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
