import { useCallback, useMemo, useState } from 'react';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ImageLightbox } from '../ui/ImageLightbox';

export type AssistantMarkdownVariant = 'compact' | 'comfortable';

/** Chuẩn hóa text trước khi render Markdown (xuống dòng, ký tự ẩn, trim). */
export function formatAssistantMarkdown(raw: string): string {
  if (!raw) return '';
  let s = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, '');
  return s.trim();
}

type ImagePreviewHandlers = { onOpen: (src: string, alt?: string) => void };

function buildMarkdownComponents(
  variant: AssistantMarkdownVariant,
  imagePreview: ImagePreviewHandlers
): Components {
  const isComfortable = variant === 'comfortable';
  const pText = isComfortable ? 'text-sm' : 'text-xs';
  const h1Text = isComfortable ? 'text-base' : 'text-sm';
  const h23Text = isComfortable ? 'text-sm' : 'text-xs';
  const inlineCode = isComfortable ? 'text-xs' : 'text-[11px]';
  const blockCode = isComfortable ? 'text-xs' : 'text-[10px]';
  const prePad = isComfortable ? 'p-2.5' : 'p-2';
  const tableText = isComfortable ? 'text-xs' : 'text-[10px]';
  const imgMax =
    isComfortable
      ? 'max-h-72 sm:max-h-80'
      : 'max-h-52 sm:max-h-60';

  return {
    p: ({ children }) => (
      <p className={`mb-1 last:mb-0 leading-relaxed first:mt-0 ${pText}`}>{children}</p>
    ),
    ul: ({ children }) => (
      <ul
        className={`my-1 list-disc pl-4 first:mt-0 last:mb-0 ${pText}`}
      >
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol
        className={`my-1 list-decimal pl-4 first:mt-0 last:mb-0 ${pText}`}
      >
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="mb-0.5">{children}</li>,
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline underline-offset-2 hover:text-blue-700"
      >
        {children}
      </a>
    ),
    img: ({ src, alt, title, className, ...rest }) => (
      <span className="my-1.5 block max-w-full">
        <button
          type="button"
          className="m-0 max-w-full cursor-zoom-in border-0 bg-transparent p-0 text-left"
          onClick={() => {
            if (src) imagePreview.onOpen(src, alt ?? undefined);
          }}
          aria-label={alt ? `Xem ảnh: ${alt}` : 'Xem ảnh phóng to'}
        >
          <img
            {...rest}
            src={src}
            alt={alt ?? ''}
            title={title}
            loading="lazy"
            decoding="async"
            className={`pointer-events-none h-auto w-auto max-w-full rounded-lg border border-slate-200 bg-slate-50 object-contain shadow-sm transition-opacity hover:opacity-90 ${imgMax} ${className ?? ''}`}
          />
        </button>
      </span>
    ),
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    h1: ({ children }) => (
      <h1 className={`mt-1.5 mb-0.5 font-semibold first:mt-0 ${h1Text}`}>{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className={`mt-1.5 mb-0.5 font-semibold first:mt-0 ${h23Text}`}>{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className={`mt-1 mb-0.5 font-semibold first:mt-0 ${h23Text}`}>{children}</h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-1 border-l-2 border-slate-300 pl-2 text-slate-600">{children}</blockquote>
    ),
    hr: () => <hr className="my-2 border-slate-200" />,
    table: ({ children }) => (
      <div className="my-1 max-w-full overflow-x-auto">
        <table className={`w-full border-collapse ${tableText}`}>{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-slate-100">{children}</thead>,
    th: ({ children }) => (
      <th className="border border-slate-200 px-1.5 py-0.5 text-left font-semibold">{children}</th>
    ),
    td: ({ children }) => <td className="border border-slate-200 px-1.5 py-0.5">{children}</td>,
    pre: ({ children }) => (
      <pre
        className={`my-1 max-w-full overflow-x-auto rounded-lg bg-slate-900 ${prePad} leading-snug text-slate-100 first:mt-0`}
      >
        {children}
      </pre>
    ),
    code: ({ className, children, ...props }) => {
      const text = String(children);
      const isBlock =
        /language-[\w-]+/.test(className ?? '') || (text.length > 0 && text.includes('\n'));
      if (isBlock) {
        return (
          <code
            className={`font-mono text-slate-100 ${blockCode} ${className ?? ''}`}
            {...props}
          >
            {children}
          </code>
        );
      }
      return (
        <code
          className={`rounded bg-slate-100 px-1 py-0.5 font-mono text-slate-800 ${inlineCode}`}
          {...props}
        >
          {children}
        </code>
      );
    },
  };
}

export function AssistantMessageMarkdown({
  content,
  variant = 'compact',
  className,
}: {
  content: string;
  variant?: AssistantMarkdownVariant;
  className?: string;
}) {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const openLightbox = useCallback((src: string, alt?: string) => {
    setLightbox({ src, alt: alt ?? '' });
  }, []);
  const closeLightbox = useCallback(() => setLightbox(null), []);

  const components = useMemo(
    () => buildMarkdownComponents(variant, { onOpen: openLightbox }),
    [variant, openLightbox]
  );

  return (
    <div className={className ?? 'break-words text-left [&_*]:max-w-full'}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {formatAssistantMarkdown(content)}
      </ReactMarkdown>
      <ImageLightbox open={lightbox} onClose={closeLightbox} />
    </div>
  );
}
