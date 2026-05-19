import { automatedLogin } from '../naver/login.js';

const id = process.argv[2];
const pw = process.argv[3];
if (!id || !pw) {
  console.error('Usage: tsx src/scripts/test-login.ts <id> <pw>');
  process.exit(1);
}

console.log(`[test] automatedLogin attempt for '${id}'`);
try {
  await automatedLogin(id, pw);
  console.log('[test] ✅ 로그인 + 세션 저장 성공');
  process.exit(0);
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.log(`[test] ❌ 실패: ${msg}`);
  process.exit(2);
}
