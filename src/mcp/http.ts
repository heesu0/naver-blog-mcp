import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { Hono } from 'hono';
import { createMcpServer } from './server.js';

/**
 * MCP over HTTP (Streamable HTTP, Web Standards).
 *
 * 인증: MCP_HTTP_TOKEN 환경변수가 설정돼 있으면 Bearer 토큰 검증.
 * 미설정 시 인증 없음 (로컬 개발용).
 */
export function createMcpHttpRouter(opts: { token?: string } = {}): Hono {
  const app = new Hono();
  const token = opts.token;

  app.all('/mcp', async (c) => {
    if (token) {
      const auth = c.req.header('authorization') ?? '';
      if (auth !== `Bearer ${token}`) {
        return c.json({ error: 'unauthorized' }, 401);
      }
    }

    // 각 요청마다 새 transport + server (stateless).
    // 세션 유지가 필요하면 sessionIdGenerator 지정 + transport 캐시 필요.
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    const server = createMcpServer();
    await server.connect(transport);

    try {
      return await transport.handleRequest(c.req.raw);
    } finally {
      // stateless 모드라 매 요청 후 종료
      await transport.close().catch(() => undefined);
      await server.close().catch(() => undefined);
    }
  });

  return app;
}
