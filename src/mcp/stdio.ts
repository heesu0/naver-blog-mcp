#!/usr/bin/env node
/**
 * stdio MCP server entry point.
 *
 * MCP over stdio는 stdout으로 JSON-RPC를 흘리므로 일반 로그가 섞이면 깨진다.
 * 모든 console.log를 stderr로 우회.
 */
console.log = console.error;
console.info = console.error;
console.warn = console.error;

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { runMigrations } from '../db/client.js';
import { createMcpServer } from './server.js';

runMigrations();

const server = createMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);

// 종료 시그널 처리
const shutdown = async () => {
  await server.close().catch(() => undefined);
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
