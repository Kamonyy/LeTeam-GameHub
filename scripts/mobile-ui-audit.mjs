/**
 * Capture mobile viewport screenshots for cross-browser parity QA.
 * Requires dev server on :3000 (or MOBILE_AUDIT_URL).
 *
 * Usage: node scripts/mobile-ui-audit.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "docs", "mobile-ui-audit");
const BASE = process.env.MOBILE_AUDIT_URL ?? "http://localhost:3000";
const MOBILE_VIEWPORT = { width: 390, height: 844 };

const ROUTES = [
	{ id: "hub", path: "/" },
	{ id: "dominoes", path: "/dominoes" },
	{ id: "wordgame", path: "/wordgame" },
	{ id: "mafia", path: "/mafia" },
	{ id: "bara", path: "/bara-alsalafa" },
];

async function main() {
	await mkdir(OUT_DIR, { recursive: true });
	const browser = await chromium.launch();

	for (const route of ROUTES) {
		const page = await browser.newPage({ viewport: MOBILE_VIEWPORT });
		await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle" });
		await page.waitForTimeout(600);
		await page.screenshot({
			path: path.join(OUT_DIR, `${route.id}-390x844.png`),
			fullPage: true,
		});
		await page.close();
	}

	// Mafia UI audit fixture at mobile width
	const auditPage = await browser.newPage({ viewport: MOBILE_VIEWPORT });
	await auditPage.goto(`${BASE}/mafia/ui-audit`, { waitUntil: "networkidle" });
	await auditPage.waitForTimeout(800);
	await auditPage.screenshot({
		path: path.join(OUT_DIR, "mafia-ui-audit-390x844.png"),
		fullPage: true,
	});
	await auditPage.close();

	await browser.close();
	console.log(`Mobile screenshots saved to ${OUT_DIR}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
