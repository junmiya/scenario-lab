import { useEffect, useRef, type ReactElement } from 'react';

interface VerticalEditorProps {
  value: string;
  onChange: (value: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  lineCount?: number;
  charsPerColumn?: number;
  placeholder?: string;
}

export function VerticalEditor({ value, onChange, textareaRef, lineCount = 1, charsPerColumn = 20, placeholder }: VerticalEditorProps): ReactElement {
  const internalRef = useRef<HTMLTextAreaElement | null>(null);
  const rulerRef = useRef<HTMLDivElement | null>(null);
  const lastEmittedValue = useRef(value);

  const setRef = (el: HTMLTextAreaElement | null): void => {
    internalRef.current = el;
    if (textareaRef && 'current' in textareaRef) {
      (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (rulerRef.current) {
      rulerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // Sync external value changes (e.g. toolbar insert, document load) without
  // touching the textarea when the change originated from user typing.
  useEffect(() => {
    const ta = internalRef.current;
    if (!ta) return;
    if (value === lastEmittedValue.current) return;
    // True external update – apply it.
    ta.value = value;
    lastEmittedValue.current = value;
  }, [value]);

  const numbers = Array.from({ length: Math.max(1, lineCount) }).map((_, i) => i + 1);

  return (
    <div className="vertical-editor-container">
      <div className="vertical-editor-scroll-area" onScroll={handleScroll}>
        <textarea
          ref={setRef}
          className="vertical-editor"
          style={{
            width: `max(100%, calc(${lineCount} * 2rem + var(--space-lg) * 2))`,
            height: `calc(${charsPerColumn}em + var(--space-lg) * 2)`
          }}
          defaultValue={value}
          onInput={(e) => {
            const next = (e.target as HTMLTextAreaElement).value;
            lastEmittedValue.current = next;
            onChange(next);
          }}
          placeholder={placeholder || 'ここに脚本本文を入力'}
          aria-label="Vertical screenplay editor"
        />
      </div>
      <div className="vertical-editor-ruler" ref={rulerRef} aria-hidden="true">
        {numbers.map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
    </div>
  );
}
