import { useMemo, type ReactElement } from 'react';

interface ExportPreviewProps {
    title: string;
    authorName: string;
    synopsis: string;
    characterText: string;
    content: string;
    charsPerColumn: number;
    columnsPerPage?: number;
}

const FONT = '"游明朝", "Yu Mincho", "Hiragino Mincho ProN", "MS 明朝", "Noto Serif JP", serif';

function splitIntoLines(text: string, maxChars: number): string[] {
    const lines: string[] = [];
    const paragraphs = text.replace(/\r/g, '').split('\n');

    const kinsokuStart = /^[「『（《〈【〔［｛]/;
    const kinsokuEnd = /^[」』）》〉】〕］｝、。，．・：；？！]/;

    for (const para of paragraphs) {
        if (para.length === 0) {
            lines.push('');
            continue;
        }

        let currentLine = '';
        let currentWidth = 0;

        const tokens = Array.from(para.matchAll(/([A-Za-z0-9_.,!?:;'-]+|.)/g)).map(m => m[0]);

        for (const token of tokens) {
            const isHalfWidth = /^[\u0020-\u007E\uFF61-\uFF9F]+$/.test(token);
            const w = isHalfWidth ? Math.ceil(token.length * 0.5) : token.length;

            if (
                currentWidth + w > maxChars || 
                (currentWidth + w === maxChars && kinsokuStart.test(token))
            ) {
                if (currentWidth + w > maxChars && kinsokuEnd.test(token) && currentLine.length > 0) {
                    currentLine += token;
                    currentWidth += w;
                    continue; 
                }
                
                if (currentLine) {
                    lines.push(currentLine);
                }
                currentLine = token;
                currentWidth = w;
            } else {
                currentLine += token;
                currentWidth += w;
            }
        }
        if (currentLine) {
            lines.push(currentLine);
        }
    }
    return lines;
}

function paginateVertical(
    text: string,
    charsPerColumn: number,
    columnsPerPage: number,
): string[][] {
    const allColumns = splitIntoLines(text, charsPerColumn);

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
    minHeight: 'min-content',
    padding: '2.5rem 2rem 3.5rem 2rem',
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

const SECTION_HEADING_STYLE: React.CSSProperties = {
    writingMode: 'vertical-rl',
    fontSize: '1rem',
    fontWeight: 700,
    color: '#111',
    letterSpacing: '0.1em',
    marginBottom: '1em',
};

function BodyPages({ pages, colHeight, startPage, totalPages }: {
    pages: string[][]; colHeight: string; startPage: number; totalPages: number;
}): ReactElement {
    return (
        <>
            {pages.map((pageCols, pageIdx) => (
                <div key={pageIdx} style={PAGE_STYLE}>
                    <div style={PAGE_NUMBER_STYLE}>{startPage + pageIdx} / {totalPages}</div>
                    <div style={{
                        display: 'flex', flexDirection: 'row-reverse', gap: 0,
                        height: colHeight, overflow: 'visible',
                    }}>
                        {pageCols.length === 0 ? (
                            <div style={{ writingMode: 'vertical-rl', color: '#d1d5db', fontSize: '0.8125rem' }}>&nbsp;</div>
                        ) : (
                            pageCols.map((col, colIdx) => (
                                <div key={colIdx} style={{
                                    writingMode: 'vertical-rl', textOrientation: 'mixed', fontSize: '0.8125rem', lineHeight: 1.5,
                                    letterSpacing: '0.05em', borderLeft: '1px solid #f3f4f6',
                                    paddingLeft: '0.25em', paddingRight: '0.25em', minWidth: '1.3em',
                                    height: '100%', whiteSpace: 'nowrap',
                                    color: col.length === 0 ? 'transparent' : '#1f2937',
                                }}>
                                    {col.length === 0 ? '\u3000' : col}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ))}
        </>
    );
}

export function ExportPreview({
    title, authorName, synopsis, characterText, content,
    charsPerColumn, columnsPerPage = 20,
}: ExportPreviewProps): ReactElement {
    const contentPages = useMemo(
        () => paginateVertical(content, charsPerColumn, columnsPerPage),
        [content, charsPerColumn, columnsPerPage],
    );
    const characterPages = useMemo(
        () => characterText.trim() ? paginateVertical(characterText, charsPerColumn, columnsPerPage) : [],
        [characterText, charsPerColumn, columnsPerPage],
    );
    const synopsisPages = useMemo(
        () => synopsis.trim() ? paginateVertical(synopsis, charsPerColumn, columnsPerPage) : [],
        [synopsis, charsPerColumn, columnsPerPage],
    );

    const colHeight = `${charsPerColumn * 1.35 + 1.5}em`;
    const totalPages = 1 + characterPages.length + synopsisPages.length + contentPages.length;

    let pageNum = 1;

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', gap: '1.5rem',
            alignItems: 'center', padding: '1.5rem', backgroundColor: '#e5e7eb',
            borderRadius: 'var(--radius-md)', overflow: 'auto', maxHeight: '70vh',
        }}>
            {/* ── 1. 表紙 ── */}
            <div style={PAGE_STYLE}>
                <div style={PAGE_NUMBER_STYLE}>{pageNum++} / {totalPages}</div>
                <div style={{
                    writingMode: 'vertical-rl', display: 'flex', justifyContent: 'center',
                    alignItems: 'center', gap: '2em', height: '100%', minHeight: '400px',
                }}>
                    {title && (
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111', letterSpacing: '0.2em' }}>
                            {title}
                        </div>
                    )}
                    {authorName && (
                        <div style={{ fontSize: '0.875rem', color: '#4b5563', paddingTop: '3em' }}>
                            作　{authorName}
                        </div>
                    )}
                </div>
            </div>

            {/* ── 2. 登場人物 ── */}
            {characterPages.length > 0 && (
                <>
                    {characterPages.map((pageCols, pageIdx) => (
                        <div key={`char-${pageIdx}`} style={PAGE_STYLE}>
                            <div style={PAGE_NUMBER_STYLE}>{pageNum++} / {totalPages}</div>
                            <div style={{ display: 'flex', flexDirection: 'row-reverse', width: '100%', alignItems: 'flex-start' }}>
                                {pageIdx === 0 && (
                                    <div style={{ ...SECTION_HEADING_STYLE, marginLeft: '1.5rem', marginBottom: 0 }}>登場人物</div>
                                )}
                                <div style={{
                                    display: 'flex', flexDirection: 'row-reverse', gap: 0,
                                    height: colHeight, overflow: 'visible',
                                }}>
                                    {pageCols.map((col, colIdx) => (
                                        <div key={colIdx} style={{
                                            writingMode: 'vertical-rl', textOrientation: 'mixed', fontSize: '0.8125rem', lineHeight: 1.5,
                                            letterSpacing: '0.05em', borderLeft: '1px solid #f3f4f6',
                                            paddingLeft: '0.25em', paddingRight: '0.25em', minWidth: '1.3em',
                                            height: '100%', whiteSpace: 'nowrap',
                                            color: col.length === 0 ? 'transparent' : '#1f2937',
                                        }}>
                                            {col.length === 0 ? '\u3000' : col}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </>
            )}

            {/* ── 3. あらすじ ── */}
            {synopsisPages.length > 0 && (
                <>
                    {synopsisPages.map((pageCols, pageIdx) => (
                        <div key={`syn-${pageIdx}`} style={PAGE_STYLE}>
                            <div style={PAGE_NUMBER_STYLE}>{pageNum++} / {totalPages}</div>
                            <div style={{ display: 'flex', flexDirection: 'row-reverse', width: '100%', alignItems: 'flex-start' }}>
                                {pageIdx === 0 && (
                                    <div style={{ ...SECTION_HEADING_STYLE, marginLeft: '1.5rem', marginBottom: 0 }}>あらすじ</div>
                                )}
                                <div style={{
                                    display: 'flex', flexDirection: 'row-reverse', gap: 0,
                                    height: colHeight, overflow: 'visible',
                                }}>
                                    {pageCols.map((col, colIdx) => (
                                        <div key={colIdx} style={{
                                            writingMode: 'vertical-rl', textOrientation: 'mixed', fontSize: '0.8125rem', lineHeight: 1.5,
                                            letterSpacing: '0.05em', borderLeft: '1px solid #f3f4f6',
                                            paddingLeft: '0.25em', paddingRight: '0.25em', minWidth: '1.3em',
                                            height: '100%', whiteSpace: 'nowrap',
                                            color: col.length === 0 ? 'transparent' : '#1f2937',
                                        }}>
                                            {col.length === 0 ? '\u3000' : col}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </>
            )}

            {/* ── 4. 本文 ── */}
            <BodyPages pages={contentPages} colHeight={colHeight} startPage={pageNum} totalPages={totalPages} />
        </div>
    );
}
