import { convertMarkdownInput } from '../markdown/convert.js';
import { publishPost } from '../naver/publish.js';
import { deletePost } from '../naver/delete.js';

const markdownPath = process.argv[2];
if (!markdownPath) {
  console.error('Usage: tsx src/scripts/test-publish-markdown.ts <file.md>');
  process.exit(1);
}

const converted = await convertMarkdownInput({ markdownPath });
if (!converted.title) throw new Error('title missing');

const published = await publishPost({
  naverId: 'cove2028',
  blogId: 'cove2028',
  title: converted.title,
  content: converted.html,
  tags: converted.tags,
  category: '일상',
});
console.log(JSON.stringify({ phase: 'published', ...published, title: converted.title }, null, 2));

const url = published.naverUrl ?? '';
const u = new URL(url);
const logNo = u.searchParams.get('logNo');
if (!logNo) throw new Error(`cannot parse logNo from ${url}`);

const deleted = await deletePost({ naverId: 'cove2028', blogId: 'cove2028', logNo });
console.log(JSON.stringify({ phase: 'deleted', logNo, ...deleted }, null, 2));
