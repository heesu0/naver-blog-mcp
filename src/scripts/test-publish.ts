import { publishPost } from '../naver/publish.js';

const id = process.argv[2];
const blogId = process.argv[3];
if (!id) {
  console.error('Usage: tsx src/scripts/test-publish.ts <naverId> [blogId]');
  process.exit(1);
}

console.log(`[test] publish attempt for naverId='${id}' blogId='${blogId ?? '(auto)'}'`);
try {
  const res = await publishPost({
    naverId: id,
    blogId,
    title: '테스트 포스팅 (자동 삭제 예정)',
    content: '이 글은 자동화 테스트입니다.\n곧 삭제됩니다.',
  });
  console.log('[test] ✅ 발행 성공:', res.naverUrl ?? '(url unknown)', `blogId=${res.blogId}`);
  process.exit(0);
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.log(`[test] ❌ 실패: ${msg}`);
  if (err instanceof Error && err.stack) console.log(err.stack);
  process.exit(2);
}
