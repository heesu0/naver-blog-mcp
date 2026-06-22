import { setTimeout as sleep } from 'node:timers/promises';
import type { Page } from 'playwright';
import { launchContext, saveSession } from './browser.js';
import { hasSession } from './session.js';

export interface DeleteInput {
  naverId: string;
  blogId: string;
  logNo: string;
}

export interface DeleteResult {
  deleted: boolean;
}

/**
 * 발행된 본인 블로그 글 삭제.
 * 흐름: PostView 페이지 → "삭제" 링크 → 확인 레이어 → "삭제하기".
 */
export async function deletePost(input: DeleteInput): Promise<DeleteResult> {
  if (!hasSession(input.naverId)) {
    throw new Error(`NO_SESSION: '${input.naverId}'`);
  }

  const { browser, context } = await launchContext({ naverId: input.naverId });
  const page = await context.newPage();

  // 네이버는 삭제 시 native confirm dialog를 띄울 수 있음 → 자동 accept
  page.on('dialog', (d) => {
    d.accept().catch(() => undefined);
  });

  try {
    await page.goto(
      `https://blog.naver.com/PostView.naver?blogId=${input.blogId}&logNo=${input.logNo}`,
      { waitUntil: 'domcontentloaded' },
    );
    await page.waitForTimeout(2500);

    if (page.url().includes('nid.naver.com')) {
      throw new Error('SESSION_EXPIRED');
    }

    // 이미 삭제된 글이면 Naver가 PostList로 돌려보낸다.
    if (!page.url().includes(input.logNo)) {
      await saveSession(context, input.naverId).catch(() => undefined);
      return { deleted: true };
    }

    // 1단계: 본문 우측 컨트롤의 "삭제" 링크는 DOM엔 있지만 hidden일 수 있음.
    // Naver DOM changed over time: older pages expose a._cfmDeletePost first,
    // current pages may expose the actual delete action as a._deletePost directly.
    // visibility 체크 우회: 후보가 attached 될 때까지 기다린 뒤 JS click().
    await page
      .locator('a._cfmDeletePost, a._deletePost, a[href*="Delete"], a[href*="delete"]')
      .first()
      .waitFor({ state: 'attached', timeout: 15_000 });
    const opened = await page.evaluate((logNo) => {
      const g = globalThis as unknown as {
        document: { querySelectorAll: (s: string) => ArrayLike<unknown> };
      };
      const candidates = Array.from(
        g.document.querySelectorAll(
          'a._cfmDeletePost, a._deletePost, a[href*="Delete"], a[href*="delete"]',
        ),
      );
      const targeted = candidates.find((el) => {
        const anchor = el as {
          textContent?: string;
          className?: string;
          getAttribute?: (name: string) => string | null;
        };
        const text = anchor.textContent?.trim() ?? '';
        const cls = anchor.className ?? '';
        const href = anchor.getAttribute?.('href') ?? '';
        const onclick = anchor.getAttribute?.('onclick') ?? '';
        return (
          cls.includes(`_param(${logNo}`) ||
          href.includes(logNo) ||
          onclick.includes(logNo) ||
          text === '삭제'
        );
      });
      const chosen = (targeted ?? candidates[0]) as { click?: () => void } | undefined;
      if (chosen && typeof chosen.click === 'function') {
        chosen.click();
        return true;
      }
      return false;
    }, input.logNo);
    if (!opened) throw new Error('DELETE_LINK_NOT_FOUND');
    await page.waitForTimeout(800);

    // Some Naver pages delete immediately after the first click via native confirm.
    if (await waitForDeleted(page, input.logNo, 2_000)) {
      await saveSession(context, input.naverId).catch(() => undefined);
      return { deleted: true };
    }

    // 2단계: 확인 레이어의 "삭제하기" 버튼.
    const confirmed = await page.evaluate((logNo) => {
      const g = globalThis as unknown as {
        document: { querySelectorAll: (s: string) => ArrayLike<unknown> };
      };
      const cands = g.document.querySelectorAll('a._deletePost');
      const targeted = Array.from(cands).find((el) => {
        const cls = (el as { className?: string }).className ?? '';
        return typeof cls === 'string' && cls.includes(`_param(${logNo}`);
      });
      const chosen = (targeted ?? cands[0]) as { click?: () => void } | undefined;
      if (chosen && typeof chosen.click === 'function') {
        chosen.click();
        return true;
      }
      return false;
    }, input.logNo);
    if (!confirmed) {
      if (await waitForDeleted(page, input.logNo, 2_000)) {
        await saveSession(context, input.naverId).catch(() => undefined);
        return { deleted: true };
      }
      throw new Error('CONFIRM_BUTTON_NOT_FOUND');
    }

    // 삭제 후 페이지 이동(블로그 메인) 대기
    const deleted = await waitForDeleted(page, input.logNo);

    await saveSession(context, input.naverId).catch(() => undefined);
    return { deleted };
  } finally {
    await context.close();
    await browser.close();
  }
}

async function waitForDeleted(page: Page, logNo: string, timeoutMs = 30_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const url = page.url();
    if (!url.includes(logNo)) return true;
    await sleep(500);
  }
  return false;
}
