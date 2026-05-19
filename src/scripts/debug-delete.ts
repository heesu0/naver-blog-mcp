import { launchContext } from '../naver/browser.js';

const id = process.argv[2];
const blogId = process.argv[3];
const logNo = process.argv[4];
if (!id || !blogId || !logNo) {
  console.error('Usage: tsx src/scripts/debug-delete.ts <naverId> <blogId> <logNo>');
  process.exit(1);
}

const { browser, context } = await launchContext({ naverId: id, headless: false });
const page = await context.newPage();

await page.goto(
  `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}`,
  { waitUntil: 'domcontentloaded' },
);
await page.waitForTimeout(4000);
console.log('[debug] url:', page.url());

const frames = page.frames();
console.log(`[debug] ${frames.length} frame(s):`);
for (const f of frames) {
  if (f.url() === 'about:blank') continue;
  console.log(`  - name='${f.name()}' url=${f.url().slice(0, 120)}`);
}

await page.screenshot({ path: 'post-view.png', fullPage: true });

// PostView is rendered inside mainFrame typically
const main = page.frame({ name: 'mainFrame' }) ?? page.mainFrame();

const dump = await main.evaluate(() => {
  const g = globalThis as unknown as {
    document: { querySelectorAll: (s: string) => ArrayLike<unknown> };
  };
  const collect = (sel: string, limit = 30) =>
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
          cls: typeof e.className === 'string' ? e.className.slice(0, 100) : undefined,
          text: (e.textContent ?? '').slice(0, 50).replace(/\s+/g, ' ').trim() || undefined,
          href: e.getAttribute('href') || undefined,
          onclick: e.getAttribute('onclick') || undefined,
        };
      });
  const allBtns = collect('button', 200);
  const allAs = collect('a', 200);
  return {
    deleteByText: allBtns.filter((b) => (b.text ?? '').includes('삭제')),
    deleteByTextLinks: allAs.filter((a) => (a.text ?? '').includes('삭제')),
    moreMenus: collect('[class*="more"], [class*="setting"], [aria-label*="더보기"], [aria-label*="옵션"]'),
    deleteClassed: collect('[class*="delete"], [class*="Delete"], [class*="remove"]'),
    deleteLinks: collect('a[href*="delete"], a[href*="Delete"]'),
    onclickDeletes: allAs.concat(allBtns).filter((x) => (x.onclick ?? '').includes('elete')),
  };
});
console.log(JSON.stringify(dump, null, 2));
await browser.close();
