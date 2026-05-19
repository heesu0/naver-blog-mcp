import { execSync } from 'node:child_process';

if (process.env.SKIP_PLAYWRIGHT_INSTALL) {
  console.error(
    '[naver-blog-mcp] SKIP_PLAYWRIGHT_INSTALL=1 detected. Skipping Chromium download.\n' +
      '  → Install manually before first use: npx playwright install chromium',
  );
  process.exit(0);
}

console.error(
  '[naver-blog-mcp] Downloading Playwright Chromium (~150 MB). This runs once and is cached system-wide.\n' +
    '  → To skip during install (e.g. CI): SKIP_PLAYWRIGHT_INSTALL=1 npm install @oddeye/naver-blog-mcp',
);

try {
  execSync('npx playwright install chromium', { stdio: 'inherit' });
  console.error('[naver-blog-mcp] Chromium ready.');
} catch {
  console.error(
    '[naver-blog-mcp] Chromium auto-install failed. Install manually:\n' +
      '  npx playwright install chromium\n' +
      '  (publish/login tools will throw a clear error until this completes)',
  );
  // postinstall 실패가 npm install 전체를 깨지 않도록 exit 0
  process.exit(0);
}
