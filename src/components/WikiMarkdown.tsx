import { isValidElement, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { headingId, wikiLinksToMarkdown } from '@/lib/markdown';

const textOf = (node: ReactNode): string =>
  typeof node === 'string' || typeof node === 'number'
    ? String(node)
    : Array.isArray(node)
      ? node.map(textOf).join('')
      : isValidElement<{ children?: ReactNode }>(node)
        ? textOf(node.props.children)
        : '';

/**
 * 서버 마크다운 렌더. raw HTML 은 렌더하지 않는다(react-markdown 기본값, rehype-raw 금지) —
 * 사용자가 쓴 `<script>` 는 문자 그대로 보인다. javascript: 등 위험한 URL 도 기본 변환기가 막는다.
 */
/** ids=false 면 제목에 id 를 달지 않는다 — 한 페이지에서 여러 번 쓸 때 중복 id 방지(목차는 첫 본문 기준). */
export function WikiMarkdown({ source, ids = true }: { source: string; ids?: boolean }) {
  const seen = new Map<string, number>();
  return (
    <div className="wiki-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 페이지의 섹션 제목이 h2 라, 본문 제목은 한 단계씩 내린다 (# → h3 목차 제외, ## → h3, ### → h4)
          h1: ({ children }) => <h3>{children}</h3>,
          h2: ({ children }) => <h3 id={ids ? headingId(textOf(children), seen) : undefined}>{children}</h3>,
          h3: ({ children }) => <h4 id={ids ? headingId(textOf(children), seen) : undefined}>{children}</h4>,
          a: ({ href, children }) =>
            href?.startsWith('/') ? (
              <a href={href}>{children}</a>
            ) : (
              <a href={href} target="_blank" rel="noopener noreferrer nofollow ugc">
                {children} <span aria-hidden>↗</span>
                <span className="sr-only">(새 창)</span>
              </a>
            ),
          table: ({ children }) => (
            <div className="wiki-md-table" tabIndex={0} role="region" aria-label="표">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {wikiLinksToMarkdown(source)}
      </ReactMarkdown>
    </div>
  );
}
