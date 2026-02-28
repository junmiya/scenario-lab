import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef, type Ref } from 'react';

export interface EditorHandle {
  element: HTMLDivElement | null;
  insertText(text: string): void;
  focus(): void;
}

interface VerticalEditorProps {
  value: string;
  onChange: (value: string) => void;
  lineCount?: number;
  charsPerColumn?: number;
  placeholder?: string;
}

function getText(el: HTMLDivElement): string {
  // innerText preserves line breaks from <br> and block elements
  return el.innerText ?? '';
}

export const VerticalEditor = forwardRef(function VerticalEditor(
  { value, onChange, lineCount = 1, charsPerColumn = 20, placeholder }: VerticalEditorProps,
  ref: Ref<EditorHandle>,
) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const rulerRef = useRef<HTMLDivElement | null>(null);
  const lastEmittedValue = useRef(value);
  const composingRef = useRef(false);
  const initializedRef = useRef(false);

  useImperativeHandle(ref, () => ({
    get element() { return divRef.current; },
    insertText(text: string) {
      const el = divRef.current;
      if (!el) return;
      el.focus();
      document.execCommand('insertText', false, text);
    },
    focus() { divRef.current?.focus(); },
  }), []);

  // Set initial content once on mount
  useEffect(() => {
    const el = divRef.current;
    if (!el || initializedRef.current) return;
    initializedRef.current = true;
    if (value) {
      el.innerText = value;
      lastEmittedValue.current = value;
    }
  }, [value]);

  // Sync external value changes (toolbar insert, document load)
  useEffect(() => {
    const el = divRef.current;
    if (!el || !initializedRef.current) return;
    if (composingRef.current) return;
    if (value === lastEmittedValue.current) return;
    // External update — replace content
    el.innerText = value;
    lastEmittedValue.current = value;
  }, [value]);

  const emitChange = useCallback((el: HTMLDivElement) => {
    const text = getText(el);
    lastEmittedValue.current = text;
    onChange(text);
  }, [onChange]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (rulerRef.current) {
      rulerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const numbers = Array.from({ length: Math.max(1, lineCount) }).map((_, i) => i + 1);

  return (
    <div className="vertical-editor-container">
      <div className="vertical-editor-scroll-area" onScroll={handleScroll}>
        <div
          ref={divRef}
          className="vertical-editor"
          contentEditable
          role="textbox"
          aria-multiline="true"
          aria-label="Vertical screenplay editor"
          data-placeholder={placeholder || 'ここに脚本本文を入力'}
          style={{
            width: `max(100%, calc(${lineCount} * var(--editor-column-width) + var(--space-lg) * 2))`,
            height: `calc(${charsPerColumn}em + var(--space-lg) * 2)`,
          }}
          onCompositionStart={() => { composingRef.current = true; }}
          onCompositionEnd={(e) => {
            composingRef.current = false;
            emitChange(e.currentTarget as HTMLDivElement);
          }}
          onInput={(e) => {
            if (composingRef.current) return;
            emitChange(e.currentTarget as HTMLDivElement);
          }}
          onPaste={handlePaste}
          suppressContentEditableWarning
        />
      </div>
      <div className="vertical-editor-ruler" ref={rulerRef} aria-hidden="true">
        {numbers.map((n) => (
          <span key={n} className={n % 2 === 0 ? 'ruler-even' : 'ruler-odd'}>{n}</span>
        ))}
      </div>
    </div>
  );
});
