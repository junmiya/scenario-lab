import { useRef, useCallback, useState, type ReactElement } from 'react';
import type { Correction } from '../../lib/firebase/firestoreService';

interface CorrectionEditorProps {
  text: string;
  field: Correction['field'];
  corrections: Correction[];
  activeCorrectionId: string | null;
  charsPerColumn?: number;
  lineCount?: number;
  onTextSelect?:
    | ((selection: { startOffset: number; endOffset: number; text: string }) => void)
    | undefined;
  onCorrectionClick?: ((correctionId: string) => void) | undefined;
}

export function CorrectionEditor({
  text,
  field,
  corrections,
  activeCorrectionId,
  charsPerColumn = 20,
  lineCount = 20,
  onTextSelect,
  onCorrectionClick,
}: CorrectionEditorProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Filter corrections for this field
  const fieldCorrections = corrections.filter((c) => c.field === field);

  // Build highlighted segments
  const segments = buildSegments(text, fieldCorrections, activeCorrectionId);

  const handleMouseUp = useCallback(() => {
    if (!onTextSelect) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !containerRef.current) return;

    const range = sel.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) return;

    // Calculate text offset from the container
    const preRange = document.createRange();
    preRange.selectNodeContents(containerRef.current);
    preRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preRange.toString().length;
    const selectedText = range.toString();
    const endOffset = startOffset + selectedText.length;

    if (selectedText.length > 0) {
      onTextSelect({ startOffset, endOffset, text: selectedText });
    }
  }, [onTextSelect]);

  return (
    <div className="vertical-editor-container">
      <div className="vertical-editor-scroll-area">
        <div
          ref={containerRef}
          className="vertical-editor"
          style={{
            width: `max(100%, calc(${lineCount} * var(--editor-column-width) + var(--space-lg) * 2))`,
            height: `calc(${charsPerColumn}em + var(--space-lg) * 2)`,
            cursor: onTextSelect ? 'text' : 'default',
            userSelect: 'text',
          }}
          onMouseUp={handleMouseUp}
        >
          {segments.map((seg, i) => {
            if (!seg.correction) {
              return <span key={i}>{seg.text}</span>;
            }
            const isActive = seg.correction.id === activeCorrectionId;
            const isPending = seg.correction.status === 'pending';
            const isAccepted = seg.correction.status === 'accepted';
            const isRejected = seg.correction.status === 'rejected';
            return (
              <span
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  onCorrectionClick?.(seg.correction!.id);
                }}
                onMouseEnter={() => setHighlightedId(seg.correction!.id)}
                onMouseLeave={() => setHighlightedId(null)}
                title={`${seg.correction.teacherName}: ${seg.correction.explanation}`}
                style={{
                  backgroundColor: isActive
                    ? 'rgba(220, 38, 38, 0.25)'
                    : isAccepted
                      ? 'rgba(22, 163, 74, 0.15)'
                      : isRejected
                        ? 'rgba(156, 163, 175, 0.15)'
                        : highlightedId === seg.correction.id
                          ? 'rgba(220, 38, 38, 0.15)'
                          : 'rgba(220, 38, 38, 0.1)',
                  borderBottom: isPending
                    ? '2px solid #dc2626'
                    : isAccepted
                      ? '2px solid #16a34a'
                      : '2px solid #9ca3af',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                }}
              >
                {seg.text}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface Segment {
  text: string;
  correction: Correction | null;
}

function buildSegments(
  text: string,
  corrections: Correction[],
  _activeId: string | null,
): Segment[] {
  if (corrections.length === 0) {
    return [{ text, correction: null }];
  }

  // Sort corrections by startOffset
  const sorted = [...corrections].sort((a, b) => a.startOffset - b.startOffset);
  const segments: Segment[] = [];
  let pos = 0;

  for (const c of sorted) {
    // Skip overlapping or out-of-range corrections
    if (c.startOffset < pos || c.endOffset > text.length) continue;

    // Text before this correction
    if (c.startOffset > pos) {
      segments.push({ text: text.slice(pos, c.startOffset), correction: null });
    }

    // Correction span
    segments.push({ text: text.slice(c.startOffset, c.endOffset), correction: c });
    pos = c.endOffset;
  }

  // Remaining text
  if (pos < text.length) {
    segments.push({ text: text.slice(pos), correction: null });
  }

  return segments;
}
