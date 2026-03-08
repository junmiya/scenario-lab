import { useMemo, type ReactElement } from 'react';

interface ExportPreviewProps {
    title: string;
    authorName: string;
    content: string;
    charsPerColumn: number;
    columnsPerPage?: number;
}

const FONT = '"游明朝", "Yu Mincho", "Hiragino Mincho ProN", "Noto Serif JP", serif';

/**
 * Split text into pages for vertical writing preview.
 * Each page has `columnsPerPage` columns, each column has `charsPerColumn` characters.
 */
function paginateVertical(
    text: string,
    charsPerColumn: number,
    columnsPerPage: number,
): string[][] {
    // Split into paragraphs, then wrap each into columns
    const paragraphs = text.split('\n');
    const allColumns: string[] = [];

    for (const para of paragraphs) {
        if (para.length === 0) {
            allColumns.push('');
        } else {
            for (let i = 0; i < para.length; i += charsPerColumn) {
                allColumns.push(para.slice(i, i + charsPerColumn));
            }
        }
    }

    // Group columns into pages
    const pages: string[][] = [];
    for (let i = 0; i < allColumns.length; i += columnsPerPage) {
        pages.push(allColumns.slice(i, i + columnsPerPage));
    }

    if (pages.length === 0) pages.push([]);
    return pages;
}

export function ExportPreview({
    title,
    authorName,
    content,
    charsPerColumn,
    columnsPerPage = 20,
}: ExportPreviewProps): ReactElement {
    const pages = useMemo(
        () => paginateVertical(content, charsPerColumn, columnsPerPage),
        [content, charsPerColumn, columnsPerPage],
    );

    const colHeight = `${charsPerColumn * 1.35 + 1.5}em`;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            alignItems: 'center',
            padding: '1.5rem',
            backgroundColor: '#e5e7eb',
            borderRadius: 'var(--radius-md)',
            overflow: 'auto',
            maxHeight: '70vh',
        }}>
            {pages.map((pageCols, pageIdx) => (
                <div key={pageIdx} style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '680px',
                    minHeight: '480px',
                    padding: '2.5rem 2rem 2rem 2rem',
                    backgroundColor: '#fff',
                    border: '1px solid #d1d5db',
                    borderRadius: '2px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    fontFamily: FONT,
                }}>
                    {/* Page number */}
                    <div style={{
                        position: 'absolute',
                        bottom: '0.75rem',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '0.625rem',
                        color: '#9ca3af',
                    }}>
                        {pageIdx + 1} / {pages.length}
                    </div>

                    {/* Title page overlay for first page */}
                    {pageIdx === 0 && (title || authorName) && (
                        <div style={{
                            writingMode: 'vertical-rl',
                            position: 'absolute',
                            top: '2.5rem',
                            right: '2rem',
                            display: 'flex',
                            gap: '1.5em',
                            pointerEvents: 'none',
                        }}>
                            {title && (
                                <div style={{
                                    fontSize: '1rem',
                                    fontWeight: 700,
                                    color: '#111',
                                    letterSpacing: '0.15em',
                                }}>
                                    {title}
                                </div>
                            )}
                            {authorName && (
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: '#6b7280',
                                    paddingTop: '2em',
                                }}>
                                    {authorName}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Vertical text columns */}
                    <div style={{
                        writingMode: 'vertical-rl',
                        display: 'flex',
                        gap: 0,
                        height: colHeight,
                        overflow: 'hidden',
                        ...(pageIdx === 0 && (title || authorName) ? { marginTop: '3.5rem' } : {}),
                    }}>
                        {pageCols.length === 0 ? (
                            <div style={{ color: '#d1d5db', fontSize: '0.8125rem' }}>&nbsp;</div>
                        ) : (
                            pageCols.map((col, colIdx) => (
                                <div key={colIdx} style={{
                                    fontSize: '0.8125rem',
                                    lineHeight: 1.5,
                                    letterSpacing: '0.05em',
                                    borderLeft: '1px solid #f3f4f6',
                                    paddingLeft: '0.25em',
                                    paddingRight: '0.25em',
                                    minWidth: '1.3em',
                                    whiteSpace: 'nowrap',
                                    color: col.length === 0 ? 'transparent' : '#1f2937',
                                }}>
                                    {col.length === 0 ? '\u3000' : col}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
