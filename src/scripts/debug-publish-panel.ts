import { launchContext } from '../naver/browser.js';

const id = process.argv[2];
const blogId = process.argv[3] ?? id;
if (!id) {
  console.error('Usage: tsx src/scripts/debug-publish-panel.ts <naverId> [blogId]');
  process.exit(1);
}

const { browser, context } = await launchContext({ naverId: id, headless: false });
const page = await context.newPage();
await page.goto(`https://blog.naver.com/${blogId}/postwrite`, {
  waitUntil: 'domcontentloaded',
});

await page.waitForSelector('.se-section-documentTitle', { timeout: 30_000 });
await page.waitForTimeout(1500);

// hide help panel via JS
await page.evaluate(() => {
  const g = globalThis as unknown as {
    document: { querySelectorAll: (s: string) => ArrayLike<{ setAttribute: (k: string, v: string) => void }> };
  };
  const nodes = g.document.querySelectorAll(
    '.se-help-panel, [class*="se-help-panel"], .se-help-title',
  );
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i];
    if (el) el.setAttribute('style', 'display:none !important;');
  }
});

// dismiss restore popup
const cancelBtn = page.locator('button.se-popup-button-cancel').first();
if (await cancelBtn.isVisible().catch(() => false)) await cancelBtn.click().catch(() => undefined);

// fill minimal title/body
await page.locator('.se-section-documentTitle').first().click();
await page.keyboard.type('panel-debug', { delay: 5 });
await page.locator('.se-section-text').first().click();
await page.keyboard.type('panel-debug', { delay: 5 });

// click main publish
await page.locator('button[data-click-area="tpb.publish"]').first().click({ timeout: 10_000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: 'publish-panel.png', fullPage: true });

const dump = await page.evaluate(() => {
  const g = globalThis as unknown as {
    document: { querySelectorAll: (s: string) => ArrayLike<unknown> };
  };
  const collect = (sel: string, limit = 50) =>
    Array.from(g.document.querySelectorAll(sel))
      .slice(0, limit)
      .map((el) => {
        const e = el as {
          tagName: string;
          className?: string;
          id?: string;
          textContent?: string;
          getAttribute: (n: string) => string | null;
        };
        return {
          tag: e.tagName,
          id: e.id || undefined,
          cls: typeof e.className === 'string' ? e.className.slice(0, 120) : undefined,
          text: (e.textContent ?? '').slice(0, 60).replace(/\s+/g, ' ').trim() || undefined,
          dataClick: e.getAttribute('data-click-area') || undefined,
        };
      });
  return {
    layerPopups: collect('[class*="layer_popup"]'),
    panelButtons: collect('[class*="layer_popup"] button'),
    panelInputs: collect('[class*="layer_popup"] input'),
    confirmCandidates: collect('button[data-click-area*="confirm"], button[data-click-area*="publish"]'),
  };
});
console.log(JSON.stringify(dump, null, 2));
await browser.close();
