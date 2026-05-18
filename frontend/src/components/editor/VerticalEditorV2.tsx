import {
  useEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useState,
  useMemo,
  type Ref,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import type { EditorHandle } from './VerticalEditor';
import './../../styles/editor-v2.css';

interface VerticalEditorV2Props {
  value: string;
  onChange: (value: string) => void;
  lineCount?: number;
  charsPerColumn?: number;
  placeholder?: string;
}

// ────────────────────────────────────────
// テキスト → 行分割
// ────────────────────────────────────────

interface LineInfo {
  text: string;
  /** この行の先頭文字がvalue内で何文字目か */
  startIndex: number;
}

function splitTextIntoLines(text: string, charsPerColumn: number): LineInfo[] {
  const lines: LineInfo[] = [];
  const paragraphs = text.split('\n');
  let globalIdx = 0;

  for (let pi = 0; pi < paragraphs.length; pi++) {
    const para = paragraphs[pi]!;
    if (para.length === 0) {
      lines.push({ text: '', startIndex: globalIdx });
    } else {
      for (let i = 0; i < para.length; i += charsPerColumn) {
        lines.push({
          text: para.slice(i, i + charsPerColumn),
          startIndex: globalIdx + i,
        });
      }
    }
    globalIdx += para.length + 1; // +1 for \n
  }

  if (lines.length === 0) lines.push({ text: '', startIndex: 0 });
  return lines;
}

// ────────────────────────────────────────
// カーソル位置 ⇄ グリッド座標
// ────────────────────────────────────────

interface GridPos {
  col: number; // 行番号（右から左、0始まり）
  row: number; // 文字位置（上から下、0始まり）
}

function cursorToGrid(cursorIndex: number, lines: LineInfo[]): GridPos {
  for (let col = 0; col < lines.length; col++) {
    const line = lines[col]!;
    const lineEnd = line.startIndex + line.text.length;
    if (cursorIndex <= lineEnd) {
      return { col, row: cursorIndex - line.startIndex };
    }
  }
  // カーソルがテキスト末尾を超える場合、最後の行の末尾
  const last = lines[lines.length - 1]!;
  return { col: lines.length - 1, row: last.text.length };
}

function gridToCursor(grid: GridPos, lines: LineInfo[]): number {
  const col = Math.max(0, Math.min(grid.col, lines.length - 1));
  const line = lines[col]!;
  const row = Math.max(0, Math.min(grid.row, line.text.length));
  return line.startIndex + row;
}

// ────────────────────────────────────────
// コンポーネント
// ────────────────────────────────────────

export const VerticalEditorV2 = forwardRef(function VerticalEditorV2(
  { value, onChange, lineCount = 1, charsPerColumn = 20, placeholder }: VerticalEditorV2Props,
  ref: Ref<EditorHandle>,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [composing, setComposing] = useState(false);
  const [compositionText, setCompositionText] = useState('');
  const [focused, setFocused] = useState(false);

  const lines = useMemo(() => splitTextIntoLines(value, charsPerColumn), [value, charsPerColumn]);

  // EditorHandle
  useImperativeHandle(
    ref,
    () => ({
      get element() {
        return displayRef.current;
      },
      insertText(text: string) {
        const before = value.slice(0, cursorIndex);
        const after = value.slice(cursorIndex);
        const newValue = before + text + after;
        onChange(newValue);
        setCursorIndex(cursorIndex + text.length);
        setSelectionEnd(null);
      },
      focus() {
        textareaRef.current?.focus();
      },
    }),
    [value, cursorIndex, onChange],
  );

  // textarea にフォーカスを常に維持
  const _focusTextarea = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  // テキスト入力ハンドラ
  const handleInput = useCallback(() => {
    if (composing) return;
    const ta = textareaRef.current;
    if (!ta) return;

    const newText = ta.value;
    // textarea には常に1文字分のバッファがある想定だが、
    // 実際には全テキストを同期する
    if (newText !== value) {
      onChange(newText);
      setCursorIndex(ta.selectionStart ?? newText.length);
      setSelectionEnd(null);
    }
  }, [composing, value, onChange]);

  // IME
  const handleCompositionStart = useCallback(() => {
    setComposing(true);
    setCompositionText('');
  }, []);

  const handleCompositionUpdate = useCallback((e: React.CompositionEvent) => {
    setCompositionText(e.data);
  }, []);

  const handleCompositionEnd = useCallback(() => {
    setComposing(false);
    setCompositionText('');
    const ta = textareaRef.current;
    if (!ta) return;
    onChange(ta.value);
    setCursorIndex(ta.selectionStart ?? ta.value.length);
    setSelectionEnd(null);
  }, [onChange]);

  // textarea の選択変更を監視
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const handler = () => {
      if (composing) return;
      setCursorIndex(ta.selectionStart ?? 0);
      if (ta.selectionStart !== ta.selectionEnd) {
        setSelectionEnd(ta.selectionEnd ?? null);
      } else {
        setSelectionEnd(null);
      }
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, [composing]);

  // 外部からの value 変更を textarea に同期
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta || composing) return;
    if (ta.value !== value) {
      ta.value = value;
    }
  }, [value, composing]);

  // 表示レイヤーのクリック → カーソル位置を計算
  const handleDisplayClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      const display = displayRef.current;
      if (!display) return;

      const rect = display.getBoundingClientRect();
      const scrollLeft = display.parentElement?.scrollLeft ?? 0;

      // 縦書き: X は右から左（列）、Y は上から下（文字）
      const x = rect.right - e.clientX + scrollLeft;
      const y = e.clientY - rect.top;

      // 1列の幅と1文字の高さ（CSS変数から計算）
      const style = getComputedStyle(display);
      const fontSize = parseFloat(style.fontSize);
      const lineHeight = parseFloat(style.lineHeight) / fontSize;
      const colWidth = fontSize * lineHeight;
      const charHeight = fontSize;

      const padding = parseFloat(style.paddingTop);

      const col = Math.floor(x / colWidth);
      const row = Math.floor((y - padding) / charHeight);

      const newCursor = gridToCursor({ col, row }, lines);
      setCursorIndex(newCursor);
      setSelectionEnd(null);

      // textarea のカーソルも同期
      const ta = textareaRef.current;
      if (ta) {
        ta.setSelectionRange(newCursor, newCursor);
        ta.focus();
      }
    },
    [lines],
  );

  // カーソルのグリッド位置
  const cursorGrid = useMemo(() => cursorToGrid(cursorIndex, lines), [cursorIndex, lines]);

  // 選択範囲のグリッド位置
  const selectionGrids = useMemo(() => {
    if (selectionEnd === null) return null;
    const start = Math.min(cursorIndex, selectionEnd);
    const end = Math.max(cursorIndex, selectionEnd);
    const grids: GridPos[] = [];
    for (let i = start; i < end; i++) {
      grids.push(cursorToGrid(i, lines));
    }
    return grids;
  }, [cursorIndex, selectionEnd, lines]);

  const numbers = Array.from({ length: Math.max(1, lineCount) }).map((_, i) => i + 1);
  const isEmpty = !value && !composing;

  return (
    <div className={`v2-editor-container${focused ? ' v2-focused' : ''}`} ref={containerRef}>
      {/* Hidden textarea for input */}
      <textarea
        ref={textareaRef}
        className="v2-hidden-textarea"
        value={value}
        onChange={handleInput}
        onCompositionStart={handleCompositionStart}
        onCompositionUpdate={handleCompositionUpdate}
        onCompositionEnd={handleCompositionEnd}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
      />

      {/* Display layer */}
      <div className="v2-scroll-area">
        <div
          ref={displayRef}
          className="v2-display"
          style={{
            width: `max(100%, calc(${lineCount} * var(--editor-column-width) + var(--space-lg) * 2))`,
            height: `calc(${charsPerColumn}em + var(--space-lg) * 2)`,
          }}
          onClick={handleDisplayClick}
        >
          {/* プレースホルダー */}
          {isEmpty && <div className="v2-placeholder">{placeholder || 'ここに入力'}</div>}

          {/* テキスト描画 */}
          {lines.map((line, colIdx) => (
            <div key={colIdx} className="v2-column">
              {line.text.split('').map((char, charIdx) => (
                <span key={charIdx} className="v2-char">
                  {char}
                </span>
              ))}
              {line.text.length === 0 && <span className="v2-char v2-char-empty">{'\u3000'}</span>}
            </div>
          ))}

          {/* カーソル */}
          {focused && !selectionEnd && (
            <div
              className="v2-cursor"
              style={
                {
                  '--cursor-col': cursorGrid.col,
                  '--cursor-row': cursorGrid.row,
                } as React.CSSProperties
              }
            />
          )}

          {/* 選択範囲 */}
          {selectionGrids &&
            selectionGrids.map((g, i) => (
              <div
                key={i}
                className="v2-selection"
                style={
                  {
                    '--cursor-col': g.col,
                    '--cursor-row': g.row,
                  } as React.CSSProperties
                }
              />
            ))}

          {/* IME 変換中テキスト */}
          {composing && compositionText && (
            <div
              className="v2-composition"
              style={
                {
                  '--cursor-col': cursorGrid.col,
                  '--cursor-row': cursorGrid.row,
                } as React.CSSProperties
              }
            >
              {compositionText}
            </div>
          )}
        </div>
      </div>

      {/* Ruler */}
      <div className="v2-ruler" aria-hidden="true">
        {numbers.map((n) => (
          <span key={n} className={n % 2 === 0 ? 'ruler-even' : 'ruler-odd'}>
            {n}
          </span>
        ))}
      </div>
    </div>
  );
});
