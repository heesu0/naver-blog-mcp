import { writeFile } from 'node:fs/promises';
import { convertMarkdownInput } from '../markdown/convert.js';
import { publishPost } from '../naver/publish.js';
import { launchContext } from '../naver/browser.js';

const markdownPath = process.argv[2];
if (!markdownPath) {
  console.error('Usage: tsx src/scripts/publish-markdown-inspect.ts <file.md>');
  process.exit(1);
}

const converted = await convertMarkdownInput({ markdownPath });
if (!converted.title) throw new Error('title missing');
console.log(JSON.stringify({ phase: 'converted', title: converted.title, tags: converted.tags, hasBodyTags: converted.html.includes('#마크다운') || converted.html.includes('#네이버블로그') }, null, 2));

const published = await publishPost({
  naverId: 'cove2028',
  blogId: 'cove2028',
  title: converted.title,
  content: converted.html,
  tags: converted.tags,
  category: '일상',
});
console.log(JSON.stringify({ phase: 'published', ...published, title: converted.title }, null, 2));

if (!published.naverUrl) throw new Error('published url missing');
const { browser, context } = await launchContext({ naverId: 'cove2028' });
const page = await context.newPage();
await page.goto(published.naverUrl, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
const frame = page.frame({ name: 'mainFrame' }) ?? page.mainFrame();
const inspect = await frame.evaluate(() => {
  const text = document.body.innerText;
  const html = document.body.innerHTML;
  return {
    url: location.href,
    titleVisible: text.includes('마크다운으로 네이버 블로그 글쓰기 자동화 테스트'),
    hasEscapedHtml: html.includes('&lt;h1') || html.includes('&lt;p') || html.includes('&lt;table'),
    hasBodyTagParagraph: text.includes('#마크다운 #네이버블로그 #자동화'),
    hasCodeText: text.includes("const workflow"),
    hasTableText: text.includes('Markdown 작성') && text.includes('HTML 변환'),
    hasQuoteText: text.includes('좋은 자동화는 글을 대신 망가뜨리지 않습니다'),
    sample: text.slice(0, 2000),
  };
});
await writeFile('tmp-md-demo-inspect.json', JSON.stringify(inspect, null, 2), 'utf-8');
await page.screenshot({ path: 'tmp-md-demo-post.png', fullPage: true });
await browser.close();
console.log(JSON.stringify({ phase: 'inspected', inspect, screenshot: 'tmp-md-demo-post.png' }, null, 2));
