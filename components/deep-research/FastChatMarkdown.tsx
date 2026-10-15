import ReactMarkdown, { type Components } from 'react-markdown';

type FastChatMarkdownProps = {
  content: string;
};

/** Allow web URLs and relative links only; reject script/data and other schemes. */
export function safeMarkdownUrl(url: string | undefined): string {
  const value = url?.trim();
  if (!value) return '';

  try {
    const parsed = new URL(value, 'https://markdown.local');
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? value : '';
  } catch {
    return '';
  }
}

const markdownComponents: Components = {
  p: ({ children }) => (
    <p className="mb-3 last:mb-0 leading-relaxed text-slate-700">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-bold text-slate-900">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => (
    <ul className="my-3 list-disc space-y-1 pl-6 text-slate-700">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 list-decimal space-y-1 pl-6 text-slate-700">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-1 leading-relaxed">{children}</li>,
  code: ({ children, className }) => (
    <code className={`rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em] text-violet-700 ${className ?? ''}`}>
      {children}
    </code>
  ),
  a: ({ href, children }) => {
    const safeHref = safeMarkdownUrl(href);
    if (!safeHref) return <span className="text-[#135bec]">{children}</span>;

    return (
      <a
        href={safeHref}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="text-[#135bec] underline decoration-blue-300 underline-offset-2 hover:text-blue-800"
      >
        {children}
      </a>
    );
  },
};

export default function FastChatMarkdown({ content }: FastChatMarkdownProps) {
  return (
    <div className="prose prose-sm md:prose-base prose-slate max-w-none prose-a:no-underline">
      <ReactMarkdown
        skipHtml
        urlTransform={safeMarkdownUrl}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
