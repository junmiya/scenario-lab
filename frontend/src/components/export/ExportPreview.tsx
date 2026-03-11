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

    const pages: string[][] = [];
    for (let i = 0; i < allColumns.length; i += columnsPerPage) {
        pages.push(allColumns.slice(i, i + columnsPerPage));
    }

    if (pages.length === 0) pages.push([]);
    return pages;
}

const PAGE_STYLE: React.CSSProperties = {
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
};

const PAGE_NUMBER_STYLE: React.CSSProperties = {
    position: 'absolute',
    bottom: '0.75rem',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '0.625rem',
    color: '#9ca3af',
};

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
    const totalPages = pages.length + 1; // +1 for title page

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
            {/* ── Title page ── */}
            <div style={PAGE_STYLE}>
                <div style={PAGE_NUMBER_STYLE}>1 / {totalPages}</div>
                <div style={{
                    writingMode: 'vertical-rl',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '2em',
                    height: '100%',
                    minHeight: '400px',
                }}>
                    {title && (
                        <div style={{
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            color: '#111',
                            letterSpacing: '0.2em',
                        }}>
                            {title}
                        </div>
                    )}
                    {authorName && (
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#4b5563',
                            paddingTop: '3em',
                        }}>
                            作　{authorName}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Body pages ── */}
            {pages.map((pageCols, pageIdx) => (
                <div key={pageIdx} style={PAGE_STYLE}>
                    <div style={PAGE_NUMBER_STYLE}>
                        {pageIdx + 2} / {totalPages}
                    </div>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'row-reverse',
                        gap: 0,
                        height: colHeight,
                        overflow: 'hidden',
                    }}>
                        {pageCols.length === 0 ? (
                            <div style={{ writingMode: 'vertical-rl', color: '#d1d5db', fontSize: '0.8125rem' }}>&nbsp;</div>
                        ) : (
                            pageCols.map((col, colIdx) => (
                                <div key={colIdx} style={{
                                    writingMode: 'vertical-rl',
                                    fontSize: '0.8125rem',
                                    lineHeight: 1.5,
                                    letterSpacing: '0.05em',
                                    borderLeft: '1px solid #f3f4f6',
                                    paddingLeft: '0.25em',
                                    paddingRight: '0.25em',
                                    minWidth: '1.3em',
                                    height: '100%',
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
