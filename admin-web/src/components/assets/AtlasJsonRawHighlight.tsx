import { useMemo } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { cn } from '../../lib/utils';

/** Dòng dạng `    "keyName": {` — key là tên frame trong atlas. */
function frameKeyFromJsonLine(lineText: string): string | null {
  const m = lineText.match(/^\s*"([^"]+)"\s*:\s*\{/);
  return m ? m[1] : null;
}

type AtlasJsonRawHighlightProps = {
  data: unknown;
  className?: string;
  /** Các tên frame (key trong JSON) được phép bấm để highlight. */
  frameNames: ReadonlySet<string>;
  selectedFrameKey: string | null;
  onFrameKeyClick: (name: string) => void;
};

export function AtlasJsonRawHighlight({
  data,
  className,
  frameNames,
  selectedFrameKey,
  onFrameKeyClick,
}: AtlasJsonRawHighlightProps) {
  const code = useMemo(() => JSON.stringify(data, null, 2), [data]);

  return (
    <Highlight theme={themes.vsDark} code={code} language="json">
      {({ className: preClass, style, tokens, getLineProps, getTokenProps }) => {
        const linesText = tokens.map((line) => line.map((t) => t.content).join(''));

        let currentKey: string | null = null;
        let currentDepth = 0;

        return (
          <pre
            className={`${preClass} max-h-[min(70vh,560px)] overflow-auto rounded-lg border border-border p-3 text-xs leading-relaxed ${className ?? ''}`}
            style={{ ...style, margin: 0 }}
          >
            {tokens.map((line, i) => {
              const lineText = linesText[i];
              const lineProps = getLineProps({ line });

              const keyOnThisLine = frameKeyFromJsonLine(lineText);
              const isFrameKeyLine = keyOnThisLine !== null && frameNames.has(keyOnThisLine);

              let keyForLine: string | null = null;
              let willExitBlock = false;

              const opens = (lineText.match(/{/g) ?? []).length;
              const closes = (lineText.match(/}/g) ?? []).length;

              if (isFrameKeyLine && keyOnThisLine) {
                currentKey = keyOnThisLine;
                currentDepth = opens - closes;
                keyForLine = currentKey;
                if (currentDepth <= 0) {
                  willExitBlock = true;
                }
              } else if (currentKey) {
                keyForLine = currentKey;
                currentDepth += opens - closes;
                if (currentDepth <= 0) {
                  willExitBlock = true;
                }
              }

              const content = line.map((token, j) => (
                <span key={j} {...getTokenProps({ token })} />
              ));

              if (keyForLine) {
                const isSelected = selectedFrameKey === keyForLine;
                const button = (
                  <button
                    key={i}
                    type="button"
                    className={cn(
                      lineProps.className,
                      'token-line block w-full cursor-pointer px-0.5 text-left font-inherit transition-colors',
                      'hover:bg-emerald-900/45',
                      isSelected && 'bg-emerald-800/55'
                    )}
                    style={lineProps.style}
                    onClick={() => onFrameKeyClick(keyForLine)}
                    aria-pressed={isSelected}
                  >
                    {content}
                  </button>
                );

                if (willExitBlock) {
                  currentKey = null;
                  currentDepth = 0;
                }

                return button;
              }

              if (willExitBlock) {
                currentKey = null;
                currentDepth = 0;
              }

              return (
                <div key={i} {...lineProps}>
                  {content}
                </div>
              );
            })}
          </pre>
        );
      }}
    </Highlight>
  );
}
