import { deletePost } from '../naver/delete.js';

const id = process.argv[2];
const blogId = process.argv[3];
const logNo = process.argv[4];
if (!id || !blogId || !logNo) {
  console.error('Usage: tsx src/scripts/test-delete.ts <naverId> <blogId> <logNo>');
  process.exit(1);
}

try {
  const res = await deletePost({ naverId: id, blogId, logNo });
  console.log(res.deleted ? '[test] ✅ 삭제 성공' : '[test] ⚠️ 삭제 명령 완료, URL 변화 확인 실패');
  process.exit(0);
} catch (err) {
  console.log(`[test] ❌ 실패: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(2);
}
