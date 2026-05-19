import { eq } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import { deletePost } from '../naver/delete.js';

export interface DeleteOptions {
  /** 네이버에서도 삭제할지. false면 DB에서만 제거 */
  deleteOnNaver?: boolean;
}

export interface DeleteResult {
  postId: number;
  removedFromNaver: boolean;
  removedFromDb: boolean;
}

/**
 * 글을 삭제한다. published 상태이고 naverUrl이 있으면 네이버에서도 제거.
 */
export async function deletePostById(
  postId: number,
  opts: DeleteOptions = {},
): Promise<DeleteResult> {
  const deleteOnNaver = opts.deleteOnNaver ?? true;

  const post = await db.query.posts.findFirst({
    where: eq(schema.posts.id, postId),
  });
  if (!post) throw new Error(`post ${postId} not found`);

  let removedFromNaver = false;
  if (deleteOnNaver && post.status === 'published' && post.naverUrl) {
    const parsed = parseNaverUrl(post.naverUrl);
    if (!parsed) {
      throw new Error(`cannot parse naver_url: ${post.naverUrl}`);
    }
    const account = await db.query.accounts.findFirst({
      where: eq(schema.accounts.id, post.accountId),
    });
    if (!account) throw new Error(`account ${post.accountId} not found`);

    const blogId = parsed.blogId ?? account.blogId ?? account.naverId;
    const res = await deletePost({
      naverId: account.naverId,
      blogId,
      logNo: parsed.logNo,
    });
    removedFromNaver = res.deleted;
  }

  await db.delete(schema.posts).where(eq(schema.posts.id, postId));
  return { postId, removedFromNaver, removedFromDb: true };
}

function parseNaverUrl(
  url: string,
): { blogId?: string; logNo: string } | undefined {
  // PostView.naver?blogId=X&logNo=Y
  const u = new URL(url);
  const logNo = u.searchParams.get('logNo');
  const blogId = u.searchParams.get('blogId') ?? undefined;
  if (logNo) return { blogId, logNo };

  // /<blogId>/<logNo>
  const m = url.match(/blog\.naver\.com\/([^/]+)\/(\d+)/);
  if (m && m[1] && m[2]) return { blogId: m[1], logNo: m[2] };

  return undefined;
}
