import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { convert } from '@jjlabsio/md-to-naver-blog';

export interface MarkdownConvertInput {
  markdown?: string;
  markdownPath?: string;
  title?: string;
  tags?: string[];
}

export interface MarkdownConvertResult {
  title: string;
  html: string;
  frontmatter: Record<string, unknown>;
  tags?: string[];
  errors: unknown[];
}

export async function convertMarkdownInput(
  input: MarkdownConvertInput,
): Promise<MarkdownConvertResult> {
  const markdown = await loadMarkdown(input);
  const result = convert(markdown);
  const fmTitle = typeof result.frontmatter.title === 'string'
    ? result.frontmatter.title
    : undefined;
  const tags = normalizeTags(input.tags ?? result.frontmatter.tags);

  return {
    title: input.title ?? fmTitle ?? result.title,
    html: stripGeneratedTagParagraph(result.html, tags),
    frontmatter: result.frontmatter,
    tags,
    errors: result.errors,
  };
}

async function loadMarkdown(input: MarkdownConvertInput): Promise<string> {
  if (typeof input.markdown === 'string' && input.markdown.length > 0) {
    return input.markdown;
  }
  if (typeof input.markdownPath === 'string' && input.markdownPath.length > 0) {
    return readFile(resolve(input.markdownPath), 'utf-8');
  }
  throw new Error('markdown 또는 markdownPath 중 하나가 필요합니다.');
}

function normalizeTags(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const tags = value
    .map((tag) => String(tag).trim().replace(/^#/, ''))
    .filter(Boolean);
  return tags.length ? tags : undefined;
}

function stripGeneratedTagParagraph(html: string, tags?: string[]): string {
  if (!tags?.length) return html;
  const tagText = tags.map((tag) => `#${tag}`).join(' ');
  const escaped = escapeRegExp(escapeHtml(tagText));
  return html
    .replace(new RegExp(`\\n?<p>${escaped}</p>\\s*$`), '')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
