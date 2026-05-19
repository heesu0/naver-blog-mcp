import { setTimeout as sleep } from 'node:timers/promises';
import type { Page } from 'playwright';
import { launchContext, saveSession } from './browser.js';

const LOGIN_URL = 'https://nid.naver.com/nidlogin.login';
const HOME_URL = 'https://www.naver.com';
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * 사람이 직접 로그인하도록 브라우저를 띄운다.
 * 캡차/2단계 인증 등 모든 케이스를 사용자가 처리. 완료되면 세션을 파일로 저장.
 */
export async function interactiveLogin(naverId: string): Promise<void> {
  const { browser, context } = await launchContext({ naverId, headless: false });
  const page = await context.newPage();

  await page.goto(LOGIN_URL);
  console.log(`[login] '${naverId}' 로 직접 로그인하세요. ${LOGIN_TIMEOUT_MS / 1000}초 안에 완료.`);

  try {
    await waitForLoggedIn(page, LOGIN_TIMEOUT_MS);
    await saveSession(context, naverId);
    console.log('[login] 세션 저장 완료');
  } finally {
    await context.close();
    await browser.close();
  }
}

/**
 * 저장된 ID/PW로 자동 로그인 시도.
 * 캡차/2FA가 뜨면 throw — 그땐 interactiveLogin으로 폴백.
 */
export async function automatedLogin(
  naverId: string,
  password: string,
): Promise<void> {
  const { browser, context } = await launchContext({ naverId, headless: false });
  const page = await context.newPage();

  try {
    await page.goto(LOGIN_URL);

    // Naver는 클립보드 페이스트 방식을 키 입력보다 덜 의심한다.
    await page.fill('#id', '');
    await page.$eval('#id', (el, v) => {
      (el as unknown as { value: string }).value = v;
    }, naverId);
    await page.type('#id', ' ');
    await page.keyboard.press('Backspace');

    await page.fill('#pw', '');
    await page.$eval('#pw', (el, v) => {
      (el as unknown as { value: string }).value = v;
    }, password);
    await page.type('#pw', ' ');
    await page.keyboard.press('Backspace');

    await Promise.all([
      page.waitForLoadState('networkidle').catch(() => undefined),
      page.click('#log\\.login, .btn_login, button[type="submit"]'),
    ]);

    // 캡차/2단계 화면 감지
    if (await detectChallenge(page)) {
      throw new Error('CAPTCHA_OR_2FA_REQUIRED');
    }

    await waitForLoggedIn(page, 30_000);
    await saveSession(context, naverId);
  } finally {
    await context.close();
    await browser.close();
  }
}

async function detectChallenge(page: Page): Promise<boolean> {
  const url = page.url();
  if (url.includes('nid.naver.com') && url.includes('captcha')) return true;
  const indicators = ['#captchaimg', 'text=새로운 환경에서 로그인', 'text=자동입력 방지'];
  for (const sel of indicators) {
    if (await page.locator(sel).first().isVisible().catch(() => false)) return true;
  }
  return false;
}

async function waitForLoggedIn(page: Page, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const url = page.url();
    if (!url.includes('nid.naver.com')) {
      await page.goto(HOME_URL, { waitUntil: 'domcontentloaded' });
      const loggedIn = await page
        .locator('a.MyView-module__link_login___HpHMW, .MyView-module__my_menu___ekrM_')
        .first()
        .isVisible()
        .catch(() => false);
      if (loggedIn) return;
      // fallback: 로그인 링크가 사라졌으면 OK
      const stillLoginLink = await page
        .locator('a:has-text("NAVER 로그인")')
        .first()
        .isVisible()
        .catch(() => false);
      if (!stillLoginLink) return;
    }
    await sleep(1000);
  }
  throw new Error('LOGIN_TIMEOUT');
}
