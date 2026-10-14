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
export function WikiMarkdown({ source }: { source: string }) {
  const seen = new Map<string, number>();
  return (
    <div className="wiki-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h2>{children}</h2>, // 문서 제목은 페이지가 이미 h1 이라 본문 # 는 h2 로 낮추되 목차에는 넣지 않는다
          h2: ({ children }) => <h2 id={headingId(textOf(children), seen)}>{children}</h2>,
          h3: ({ children }) => <h3 id={headingId(textOf(children), seen)}>{children}</h3>,
          a: ({ href, children }) =>
            href?.startsWith('/') ? (
              <a href={href}>{children}</a>
            ) : (
              <a href={href} target="_blank" rel="noopener noreferrer nofollow ugc">
                {children} <span aria-hidden>↗</span>
              </a>
            ),
          table: ({ children }) => (
            <div className="wiki-md-table">
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
