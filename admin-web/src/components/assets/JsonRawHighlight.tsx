import { useMemo } from 'react';
import { Highlight, themes } from 'prism-react-renderer';

type JsonRawHighlightProps = {
  data: unknown;
  className?: string;
};

export function JsonRawHighlight({ data, className }: JsonRawHighlightProps) {
  const code = useMemo(() => JSON.stringify(data, null, 2), [data]);

  return (
    <Highlight theme={themes.vsDark} code={code} language="json">
      {({ className: preClass, style, tokens, getLineProps, getTokenProps }) => (
        <pre
          className={`${preClass} max-h-[min(70vh,560px)] overflow-auto rounded-lg border border-border p-3 text-xs leading-relaxed ${className ?? ''}`}
          style={{ ...style, margin: 0 }}
        >
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
}
