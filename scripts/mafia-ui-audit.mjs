/**
 * Capture Mafia UI audit screenshots (dev server must be running on :3000).
 * Usage: node scripts/mafia-ui-audit.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "docs", "mafia-ui-audit");
const BASE = process.env.MAFIA_AUDIT_URL ?? "http://localhost:3000";

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto(`${BASE}/mafia`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(OUT_DIR, "01-live-create-gate.png"), fullPage: true });

  await page.goto(`${BASE}/mafia?room=AUDIT01`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(OUT_DIR, "02-live-invite-gate.png"), fullPage: true });

  await page.goto(`${BASE}/mafia/ui-audit`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT_DIR, "03-audit-full.png"), fullPage: true });

  const sections = page.locator("[data-audit-section]");
  const count = await sections.count();
  for (let i = 0; i < count; i++) {
    const el = sections.nth(i);
    const id = await el.getAttribute("data-audit-section");
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await el.screenshot({ path: path.join(OUT_DIR, `section-${id}.png`) });
  }

  await browser.close();
  console.log(`Screenshots saved to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
