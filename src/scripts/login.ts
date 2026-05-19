import { interactiveLogin } from '../naver/login.js';

const naverId = process.argv[2];
if (!naverId) {
  console.error('Usage: pnpm naver:login <naver_id>');
  process.exit(1);
}

await interactiveLogin(naverId);
