import { launchContext } from '../naver/browser.js';

const id = process.argv[2];
const blogId = process.argv[3] ?? id;
if (!id) {
  console.error('Usage: tsx src/scripts/debug-help-panel.ts <naverId> [blogId]');
  process.exit(1);
}

const { browser, context } = await launchContext({ naverId: id, headless: false });
const page = await context.newPage();
await page.goto(`https://blog.naver.com/${blogId}/postwrite`, {
  waitUntil: 'domcontentloaded',
});

await page.waitForSelector('.se-section-documentTitle', { timeout: 30_000 });
await page.waitForTimeout(2500);

const helpDump = await page.evaluate(() => {
  const w = globalThis as unknown as { document: unknown };
  const doc = w.document as {
    querySelectorAll: (s: string) => ArrayLike<unknown>;
  };
  const container = doc.querySelectorAll('.container__HW_tc')[0] as
    | {
        outerHTML: string;
        querySelectorAll: (s: string) => ArrayLike<unknown>;
      }
    | undefined;
  if (!container) return { found: false };
  const html = container.outerHTML.slice(0, 3000);
  const buttons = Array.from(container.querySelectorAll('button')).map((b) => {
    const x = b as {
      tagName: string;
      className?: string;
      textContent?: string;
      getAttribute: (n: string) => string | null;
    };
    return {
      cls: typeof x.className === 'string' ? x.className : '',
      text: (x.textContent ?? '').slice(0, 30).replace(/\s+/g, ' ').trim(),
      aria: x.getAttribute('aria-label'),
    };
  });
  return { found: true, htmlSnippet: html, buttons };
});
console.log(JSON.stringify(helpDump, null, 2));
await browser.close();
