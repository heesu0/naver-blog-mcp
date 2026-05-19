import { chromium, type Browser, type BrowserContext } from 'playwright';
import { env } from '../config.js';
import { hasSession, sessionPath } from './session.js';

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
}

export async function launchContext(opts: {
  naverId: string;
  headless?: boolean;
}): Promise<BrowserSession> {
  let browser;
  try {
    browser = await chromium.launch({
      headless: opts.headless ?? env.HEADLESS,
      args: ['--disable-blink-features=AutomationControlled'],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Executable doesn't exist") || msg.includes('not found')) {
      throw new Error(
        'Chromium is not installed. Run: npx playwright install chromium',
      );
    }
    throw e;
  }

  const storageState = hasSession(opts.naverId) ? sessionPath(opts.naverId) : undefined;

  const context = await browser.newContext({
    storageState,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    viewport: { width: 1280, height: 900 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  });

  // tsx/esbuild가 evaluate 콜백에 __name(fn, 'name') 헬퍼를 inject 하는데
  // 브라우저에 없어서 ReferenceError 발생 → shim 주입.
  await context.addInitScript({
    content:
      'if(typeof globalThis.__name==="undefined"){globalThis.__name=function(f){return f}}',
  });

  return { browser, context };
}

export async function saveSession(
  context: BrowserContext,
  naverId: string,
): Promise<void> {
  await context.storageState({ path: sessionPath(naverId) });
}
