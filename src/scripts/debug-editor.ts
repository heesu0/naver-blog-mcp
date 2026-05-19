import { launchContext } from '../naver/browser.js';

const id = process.argv[2];
const blogId = process.argv[3] ?? id;
if (!id) {
  console.error('Usage: tsx src/scripts/debug-editor.ts <naverId> [blogId]');
  process.exit(1);
}

const { browser, context } = await launchContext({ naverId: id, headless: false });
const page = await context.newPage();
await page.goto(`https://blog.naver.com/${blogId}/postwrite`, {
  waitUntil: 'domcontentloaded',
});

console.log('[debug] current url:', page.url());

if (page.url().includes('nid.naver.com')) {
  console.log('SESSION_EXPIRED');
  process.exit(2);
}

await page.waitForTimeout(10000);

const frames = page.frames();
console.log(`[debug] ${frames.length} frame(s) (all):`);
for (const f of frames) {
  console.log(`  - name='${f.name()}' url=${f.url().slice(0, 120)}`);
}

await page.screenshot({ path: 'editor-debug.png', fullPage: true });

// Try to find editor in any frame
let editorFrame = page.frame({ name: 'mainFrame' });
if (!editorFrame) {
  // Look for a frame that contains editor markers
  for (const f of frames) {
    const has = await f.locator('[contenteditable="true"], .se-editor, .se-component').first().count().catch(() => 0);
    if (has > 0) {
      editorFrame = f;
      console.log(`[debug] found editor in frame name='${f.name()}' url=${f.url().slice(0, 120)}`);
      break;
    }
  }
}
if (!editorFrame) {
  console.log('[debug] editor not found in any frame; dumping outer page');
  editorFrame = page.mainFrame();
}

const dump = await editorFrame.evaluate(() => {
  const w = globalThis as unknown as { document: unknown };
  const doc = w.document as {
    querySelectorAll: (s: string) => ArrayLike<unknown>;
    title: string;
  };
  const collect = (sel: string) =>
    Array.from(doc.querySelectorAll(sel))
      .slice(0, 20)
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
          cls: typeof e.className === 'string' ? e.className.slice(0, 80) : undefined,
          text: (e.textContent ?? '').slice(0, 50).replace(/\s+/g, ' ').trim() || undefined,
          ph: e.getAttribute('placeholder') || undefined,
        };
      });
  return {
    title: doc.title,
    contenteditables: collect('[contenteditable="true"]'),
    placeholders: collect('[class*="placeholder"]'),
    sections: collect('[class*="se-section"]'),
    buttons: collect('button'),
  };
});
console.log(JSON.stringify(dump, null, 2));
await browser.close();
