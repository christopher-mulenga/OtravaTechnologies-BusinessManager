import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const base = process.env.QA_URL || "http://127.0.0.1:8080";
await mkdir("/workspace/screenshots", { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (err) => errors.push("PAGEERROR " + err.message));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push("CONSOLE " + msg.text());
});

await page.goto(base, { waitUntil: "networkidle" });
await page.waitForTimeout(400);

if (await page.getByText("Welcome. Let’s set up your business.").isVisible().catch(() => false)) {
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Skip" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Go to dashboard" }).click();
  await page.getByRole("heading", { name: "Dashboard" }).waitFor();
}

await page.screenshot({ path: "/workspace/screenshots/dashboard.png", fullPage: true });

await page.getByRole("link", { name: "Customers" }).click();
await page.getByRole("heading", { name: "Customers" }).waitFor();
await page.getByRole("button", { name: "Add customer" }).first().click();
await page.getByLabel("Customer name").fill("ABC Solutions Ltd");
await page.getByLabel("Company name").fill("ABC Solutions");
await page.getByLabel("Phone").fill("0971000000");
await page.getByLabel("Email").fill("accounts@abc.example");
await page.getByLabel("City").fill("Lusaka");
await page.getByRole("button", { name: "Save customer" }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: "/workspace/screenshots/customers.png", fullPage: true });

await page.getByRole("link", { name: "Products & services" }).click();
await page.getByRole("heading", { name: "Products & services" }).waitFor();
await page.screenshot({ path: "/workspace/screenshots/catalogue.png", fullPage: true });

await page.getByRole("link", { name: "Quotations" }).click();
await page.getByRole("heading", { name: "Quotations", exact: true }).waitFor();
await page.getByRole("link", { name: "New quotation" }).first().click();
await page.waitForTimeout(800);
await page.screenshot({ path: "/workspace/screenshots/quotation-new.png", fullPage: true });
console.log("QUOTE_PAGE", (await page.locator("body").innerText()).slice(0, 400).replace(/\s+/g, " "));
await page.getByLabel("Customer").selectOption({ index: 1 });
const selects = page.locator("select");
const count = await selects.count();
if (count >= 3) await selects.nth(2).selectOption({ index: 1 });
await page.getByRole("button", { name: "Save" }).click();
await page.waitForTimeout(1000);
await page.screenshot({ path: "/workspace/screenshots/quotation.png", fullPage: true });
console.log("QUOTE_SAVED", (await page.locator("body").innerText()).slice(0, 400).replace(/\s+/g, " "));

const convert = page.getByRole("button", { name: "Convert to invoice" });
if (await convert.isVisible().catch(() => false)) {
  await convert.click();
  await page.getByRole("button", { name: "Convert to invoice" }).last().click();
  await page.waitForTimeout(1000);
}
await page.screenshot({ path: "/workspace/screenshots/invoice.png", fullPage: true });

if (await page.getByRole("button", { name: "Record payment" }).isVisible().catch(() => false)) {
  await page.getByRole("button", { name: "Record payment" }).click();
  await page.getByRole("button", { name: "Save payment" }).click();
  await page.waitForTimeout(800);
}
await page.screenshot({ path: "/workspace/screenshots/invoice-paid.png", fullPage: true });

await page.goto(`${base}/`);
await page.getByRole("heading", { name: "Dashboard" }).waitFor();
await page.screenshot({ path: "/workspace/screenshots/dashboard-after.png", fullPage: true });

console.log("BODY", (await page.locator("body").innerText()).slice(0, 500).replace(/\s+/g, " "));
console.log("ERRORS", errors);
await browser.close();
if (errors.length) process.exit(1);
