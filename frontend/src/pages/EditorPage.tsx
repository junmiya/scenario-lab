import type { ReactElement } from 'react';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/ui/Layout';
import { useAuth } from '../contexts/AuthContext';
import { getScript, updateScript, saveVersion, type ScriptVersion } from '../lib/firebase/firestoreService';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { VersionHistory } from '../components/editor/VersionHistory';
import { Undo2, Redo2 } from 'lucide-react';
import { ContentCommentary, type ContentCommentaryCache } from '../components/advice/ContentCommentary';
import { ExportPreview } from '../components/export/ExportPreview';
import { SynopsisCommentary, type SynopsisCommentaryCache } from '../components/advice/SynopsisCommentary';
import { DiscussionPanel, type DiscussionMessage } from '../components/advice/DiscussionPanel';
import { Settings } from '../components/editor/Settings';
import { VerticalEditor, type EditorHandle } from '../components/editor/VerticalEditor';
import type { StructureSegment } from '../components/structure/StructurePanel';
import {
  ScriptToolbar,
  applyToolbarAction,
  insertToolbarAction,
  type ToolbarAction,
} from '../components/toolbar/ScriptToolbar';
import { createExportPayload, createExportFromTemplate, savePayloadAs } from '../services/exportService';
import { extractTextFromDocx } from '../services/importService';
import { parseDocxTemplate } from '../services/templateParserService';
import { createFormatPreset } from '../lib/firebase/firestoreService';
import { FormatPresetSelector } from '../components/export/FormatPresetSelector';
import type { FormatPreset } from '../types/formatPreset';
import type { AiProvider } from '../lib/aiClient';
import {
  createInitialEditorState,
  DEFAULT_SETTINGS,
  DEFAULT_SYNOPSIS_SETTINGS,
  DEFAULT_CHARACTER_SETTINGS,
  recalculateGuideMetrics,
  updateContent,
  updateSettings,
  updateSynopsis,
  updateSynopsisSettings,
  updateCharacterText,
  updateCharacterSettings,
} from '../stores/editorStore';

const structureSegments: StructureSegment[] = [
  { id: 'intro', label: '起', ratio: 0.25 },
  { id: 'development', label: '承', ratio: 0.35 },
  { id: 'turn', label: '転', ratio: 0.2 },
  { id: 'closing', label: '結', ratio: 0.2 },
];

const defaultSegmentId = structureSegments[0]?.id ?? 'intro';

export function EditorPage(): ReactElement {
  const { scriptId: routeScriptId } = useParams<{ scriptId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState(createInitialEditorState);
  const [activeSegmentId, setActiveSegmentId] = useState<string>(defaultSegmentId);
  const [exportPreview, setExportPreview] = useState('');
  const [discussionProviderA, setDiscussionProviderA] = useState<AiProvider>('gemini');
  const [discussionProviderB, setDiscussionProviderB] = useState<AiProvider>('claude');
  const [discussionMessages, setDiscussionMessages] = useState<DiscussionMessage[]>([]);
  const [exportMessage, setExportMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [contentCommentaryCache, setContentCommentaryCache] = useState<ContentCommentaryCache | undefined>(undefined);
  const [synopsisCommentaryCache, setSynopsisCommentaryCache] = useState<SynopsisCommentaryCache | undefined>(undefined);
  const editorRef = useRef<EditorHandle | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [versionRefreshKey, setVersionRefreshKey] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState<FormatPreset | null>(null);
  const [presetRefreshKey, setPresetRefreshKey] = useState(0);
  const templateInputRef = useRef<HTMLInputElement | null>(null);

  // Undo/Redo
  const { undo, redo, canUndo, canRedo } = useUndoRedo(state, setState);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  // Load script from Firestore if a route param is provided
  useEffect(() => {
    if (!routeScriptId) return;
    void (async () => {
      try {
        const script = await getScript(routeScriptId);
        if (script) {
          const settings = { ...DEFAULT_SETTINGS, ...script.settings };
          const synSettings = { ...DEFAULT_SYNOPSIS_SETTINGS, ...script.synopsisSettings };
          const charSettings = { ...DEFAULT_CHARACTER_SETTINGS, ...script.characterSettings };
          const characterText = script.characterText || '';
          setState({
            title: script.title || '',
            authorName: script.authorName || '',
            synopsis: script.synopsis || '',
            characterText,
            content: script.content || '',
            settings,
            metrics: recalculateGuideMetrics(script.content || '', settings),
            synopsisSettings: synSettings,
            synopsisMetrics: recalculateGuideMetrics(script.synopsis || '', synSettings),
            characterSettings: charSettings,
            characterMetrics: recalculateGuideMetrics(characterText, charSettings),
          });
          if (script.contentCommentary) {
            setContentCommentaryCache(script.contentCommentary as ContentCommentaryCache);
          }
          if (script.synopsisCommentary) {
            setSynopsisCommentaryCache(script.synopsisCommentary as SynopsisCommentaryCache);
          }
          if (script.discussionMessages) {
            setDiscussionMessages(script.discussionMessages as DiscussionMessage[]);
          }
        }
      } catch (error) {
        console.error('Failed to load script from Firestore:', error);
      }
    })();
  }, [routeScriptId]);

  // Save to Firestore
  const saveToFirestore = useCallback(async () => {
    if (!routeScriptId) return;
    setSaveMessage('保存中...');
    try {
      await updateScript(routeScriptId, {
        title: state.title,
        authorName: state.authorName,
        synopsis: state.synopsis,
        content: state.content,
        characterText: state.characterText,
        settings: state.settings,
        synopsisSettings: state.synopsisSettings,
        characterSettings: state.characterSettings,
        ...(contentCommentaryCache ? { contentCommentary: contentCommentaryCache } : {}),
        ...(synopsisCommentaryCache ? { synopsisCommentary: synopsisCommentaryCache } : {}),
        ...(discussionMessages.length > 0 ? { discussionMessages } : {}),
      });
      // バージョン履歴にスナップショット保存
      await saveVersion(routeScriptId, {
        title: state.title,
        authorName: state.authorName,
        synopsis: state.synopsis,
        content: state.content,
        characterText: state.characterText,
        settings: state.settings,
      });
      setVersionRefreshKey((k) => k + 1);
      setSaveMessage('保存しました');
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (error) {
      console.error('Failed to save to Firestore:', error);
      setSaveMessage('保存に失敗しました');
    }
  }, [routeScriptId, state, contentCommentaryCache, synopsisCommentaryCache, discussionMessages]);

  const onToolbarApply = (action: ToolbarAction): void => {
    if (editorRef.current) {
      insertToolbarAction(editorRef.current, action);
      // The contenteditable div fires onInput after insertText, which triggers onChange → state update
    } else {
      setState((current) => updateContent(current, applyToolbarAction(current.content, action)));
    }
  };

  const contentLength = useMemo(() => state.content.replace(/[\r\n]/g, '').length, [state.content]);

  const remaining = useMemo(() => {
    return Math.max(state.metrics.totalCapacity - contentLength, 0);
  }, [state.metrics.totalCapacity, contentLength]);

  const synopsisContentLength = useMemo(() => state.synopsis.replace(/[\r\n]/g, '').length, [state.synopsis]);

  const synopsisRemaining = useMemo(() => {
    return Math.max(state.synopsisMetrics.totalCapacity - synopsisContentLength, 0);
  }, [state.synopsisMetrics.totalCapacity, synopsisContentLength]);

  const characterContentLength = useMemo(() => state.characterText.replace(/[\r\n]/g, '').length, [state.characterText]);

  const characterRemaining = useMemo(() => {
    return Math.max(state.characterMetrics.totalCapacity - characterContentLength, 0);
  }, [state.characterMetrics.totalCapacity, characterContentLength]);

  const onImportDocx = async (file: File): Promise<void> => {
    try {
      const text = await extractTextFromDocx(file);
      setState((current) => updateContent(current, text));
      setStatusMessage(`Word読み込み完了: ${file.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatusMessage(`Word読み込み失敗: ${message}`);
    }
  };

  const onImportTemplate = async (file: File): Promise<void> => {
    try {
      console.log('[template] parsing:', file.name, file.size, 'bytes');
      setExportMessage('テンプレート解析中...');
      const parsed = await parseDocxTemplate(file);
      console.log('[template] parsed:', parsed);
      const name = prompt('プリセット名を入力してください', file.name.replace(/\.docx$/i, ''));
      if (!name || !user) {
        setExportMessage('');
        return;
      }
      await createFormatPreset(user.uid, { ...parsed, name });
      setPresetRefreshKey((k) => k + 1);
      setExportMessage(`プリセット「${name}」を保存しました（${parsed.lineLength ?? '?'}字×${parsed.linesPerPage ?? '?'}行）。ドロップダウンから選択して「適用」してください。`);
    } catch (error) {
      setExportMessage(`テンプレート解析失敗: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const onPresetSelect = (preset: FormatPreset | null): void => {
    setSelectedPreset(preset);
  };

  const onPresetApply = (preset: FormatPreset): void => {
    setSelectedPreset(preset);
    const ll = preset.lineLength ?? 20;
    const lpp = preset.linesPerPage ?? 20;
    setState((current) => {
      const s = updateSettings(current, { ...current.settings, lineLength: ll, linesPerPage: lpp });
      s.synopsisSettings = { ...s.synopsisSettings, lineLength: ll, linesPerPage: lpp };
      s.synopsisMetrics = recalculateGuideMetrics(s.synopsis, s.synopsisSettings);
      s.characterSettings = { ...s.characterSettings, lineLength: ll, linesPerPage: lpp };
      s.characterMetrics = recalculateGuideMetrics(s.characterText, s.characterSettings);
      return s;
    });
    setExportMessage(`「${preset.name}」を適用しました（${ll}字×${lpp}行）`);
  };

  const onPresetReset = (): void => {
    setSelectedPreset(null);
    setState((current) => {
      const s = updateSettings(current, { ...current.settings, lineLength: 20, linesPerPage: 20 });
      s.synopsisSettings = { ...s.synopsisSettings, lineLength: 20, linesPerPage: 20 };
      s.synopsisMetrics = recalculateGuideMetrics(s.synopsis, s.synopsisSettings);
      s.characterSettings = { ...s.characterSettings, lineLength: 20, linesPerPage: 20 };
      s.characterMetrics = recalculateGuideMetrics(s.characterText, s.characterSettings);
      return s;
    });
    setExportMessage('標準設定（20×20）にリセットしました');
  };

  const onPreview = (): void => {
    if (!state.title.trim() || !state.authorName.trim()) {
      setExportMessage('タイトルと著者名を入力してください');
      setExportPreview('');
      return;
    }
    setExportMessage('');
    setExportPreview(state.content);
  };

  const onDownload = async (): Promise<void> => {
    try {
      setExportMessage('書き出し中...');
      const exportInput = {
        title: state.title || 'untitled-script',
        authorName: state.authorName || 'unknown-author',
        synopsis: state.synopsis,
        characterText: state.characterText,
        content: state.content,
        lineLength: state.settings.lineLength,
        linesPerPage: state.settings.linesPerPage,
      };
      const payload = selectedPreset?.templateBase64
        ? await createExportFromTemplate(exportInput, selectedPreset.templateBase64, selectedPreset.fieldMappings ?? [])
        : await createExportPayload(exportInput);
      const savedName = await savePayloadAs(payload);
      if (savedName) {
        setExportMessage(`${savedName} を保存しました`);
      } else {
        setExportMessage('');
      }
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <Layout
      headerTitle="脚本エディタ"
      headerActions={<>
        <button type="button" onClick={undo} disabled={!canUndo} title="元に戻す (Cmd+Z)" style={{ padding: '0.375rem', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: canUndo ? 'pointer' : 'default', opacity: canUndo ? 1 : 0.3, color: 'var(--text-secondary)' }}>
          <Undo2 size={16} />
        </button>
        <button type="button" onClick={redo} disabled={!canRedo} title="やり直す (Cmd+Shift+Z)" style={{ padding: '0.375rem', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: canRedo ? 'pointer' : 'default', opacity: canRedo ? 1 : 0.3, color: 'var(--text-secondary)' }}>
          <Redo2 size={16} />
        </button>
        {routeScriptId && (
          <div style={{ position: 'relative' }}>
            <VersionHistory scriptId={routeScriptId} refreshKey={versionRefreshKey} onRestore={(v) => {
              setState((current) => ({
                ...current,
                title: v.title,
                authorName: v.authorName,
                synopsis: v.synopsis,
                content: v.content,
                characterText: v.characterText,
                settings: { ...current.settings, ...v.settings },
              }));
            }} />
          </div>
        )}
        {saveMessage && <span style={{ fontSize: '0.875rem', color: 'var(--color-success)' }}>{saveMessage}</span>}
        {routeScriptId && (
          <button type="button" className="btn-primary" onClick={() => void saveToFirestore()} style={{ fontWeight: 600 }}>
            保存
          </button>
        )}
        <button type="button" onClick={() => navigate('/catalog')} style={{ backgroundColor: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
          一覧に戻る
        </button>
      </>}
    >
      <main className="main-container">

        {/* ── タイトル・著者 ── */}
        <section className="section-container" aria-label="タイトル・著者">
          <h3>タイトル・著者</h3>
          <div style={{ display: 'flex', gap: 'var(--space-md)', direction: 'rtl' }}>
            <div style={{ flex: 1, direction: 'ltr' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>タイトル</label>
              <VerticalEditor
                value={state.title}
                onChange={(value) => setState((current) => ({ ...current, title: value }))}
                lineCount={3}
                charsPerColumn={state.settings.lineLength}
                placeholder="タイトル"
              />
            </div>
            <div style={{ flex: 1, direction: 'ltr' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>著者</label>
              <VerticalEditor
                value={state.authorName}
                onChange={(value) => setState((current) => ({ ...current, authorName: value }))}
                lineCount={2}
                charsPerColumn={state.settings.lineLength}
                placeholder="著者名"
              />
            </div>
          </div>
        </section>

        {/* ── 登場人物 ── */}
        <section className="section-container" aria-label="登場人物">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>登場人物</h3>
            <Settings
              value={state.characterSettings}
              onChange={(value) => setState((current) => updateCharacterSettings(current, value))}
              hideLineLength
            />
          </div>
          <VerticalEditor
            value={state.characterText}
            onChange={(value) => setState((current) => updateCharacterText(current, value))}
            lineCount={Math.max(5, state.characterMetrics.currentLines, state.characterSettings.pageCount * 20)}
            charsPerColumn={state.characterSettings.lineLength}
            placeholder="登場人物を入力..."
          />
          <p className="status-text" style={{ marginTop: 'var(--space-sm)' }}>
            文字数: {characterContentLength} / 行数: {state.characterMetrics.currentLines} / 目安容量: {state.characterMetrics.totalCapacity}字 ({state.characterSettings.pageCount}枚) / 残り: {characterRemaining}字
          </p>
          {/* 設定（字数/行、行数/枚） */}
          <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'end', marginTop: '0.75rem' }}>
            <label style={{ fontSize: '0.8125rem' }}>
              字数/行
              <input
                type="number"
                min={10}
                max={40}
                value={state.settings.lineLength}
                onChange={(event) => {
                  const lineLength = Number(event.currentTarget.value);
                  setState((current) => {
                    const s = { ...current };
                    s.settings = { ...s.settings, lineLength };
                    s.metrics = recalculateGuideMetrics(s.content, s.settings);
                    s.synopsisSettings = { ...s.synopsisSettings, lineLength };
                    s.synopsisMetrics = recalculateGuideMetrics(s.synopsis, s.synopsisSettings);
                    s.characterSettings = { ...s.characterSettings, lineLength };
                    s.characterMetrics = recalculateGuideMetrics(s.characterText, s.characterSettings);
                    return s;
                  });
                }}
                style={{ width: '4rem' }}
              />
            </label>
            <label style={{ fontSize: '0.8125rem' }}>
              行数/枚
              <input
                type="number"
                min={1}
                max={40}
                value={state.settings.linesPerPage}
                onChange={(event) => {
                  const linesPerPage = Number(event.currentTarget.value);
                  setState((current) => {
                    const s = { ...current };
                    s.settings = { ...s.settings, linesPerPage };
                    s.metrics = recalculateGuideMetrics(s.content, s.settings);
                    s.synopsisSettings = { ...s.synopsisSettings, linesPerPage };
                    s.synopsisMetrics = recalculateGuideMetrics(s.synopsis, s.synopsisSettings);
                    s.characterSettings = { ...s.characterSettings, linesPerPage };
                    s.characterMetrics = recalculateGuideMetrics(s.characterText, s.characterSettings);
                    return s;
                  });
                }}
                style={{ width: '4rem' }}
              />
            </label>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
              1枚 = {state.settings.lineLength}字 × {state.settings.linesPerPage}行 = {state.settings.lineLength * state.settings.linesPerPage}字
            </span>
          </div>
        </section>

        {/* ── あらすじ ── */}
        <section className="section-container" aria-label="あらすじ">
          <h3>あらすじ</h3>
          <SynopsisCommentary synopsis={state.synopsis} scriptId={routeScriptId ?? ''} charsPerColumn={state.synopsisSettings.lineLength} pageCount={state.synopsisSettings.pageCount} initialCache={synopsisCommentaryCache} onCacheChange={setSynopsisCommentaryCache}>
            <Settings
              value={state.synopsisSettings}
              onChange={(value) => setState((current) => updateSynopsisSettings(current, value))}
              hideLineLength
            />
            <VerticalEditor
              value={state.synopsis}
              onChange={(value) => setState((current) => updateSynopsis(current, value))}
              lineCount={Math.max(5, state.synopsisMetrics.currentLines, state.synopsisSettings.pageCount * 20)}
              charsPerColumn={state.synopsisSettings.lineLength}
              placeholder="あらすじを入力..."
            />
            <p className="status-text" style={{ marginTop: 'var(--space-sm)' }}>
              文字数: {synopsisContentLength} / 行数: {state.synopsisMetrics.currentLines} / 目安容量: {state.synopsisMetrics.totalCapacity}字 ({state.synopsisSettings.pageCount}枚) / 残り: {synopsisRemaining}字
            </p>
          </SynopsisCommentary>
        </section>

        {/* ── 本文 ── */}
        <section className="section-container" aria-label="本文">
          <h3>本文</h3>
          <ContentCommentary
            content={state.content}
            scriptId={routeScriptId ?? ''}
            charsPerColumn={state.settings.lineLength}
            pageCount={state.settings.pageCount}
            initialCache={contentCommentaryCache}
            onCacheChange={setContentCommentaryCache}
            afterDirector={synopsisContentLength >= 10 ? (
              <div style={{ margin: '0.5rem 0' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>構成ガイド</div>
                <div style={{ display: 'flex', direction: 'rtl', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                  {structureSegments.map((seg) => {
                    const chars = Math.round(state.metrics.totalCapacity * seg.ratio);
                    const isActive = seg.id === activeSegmentId;
                    return (
                      <div key={seg.id} style={{
                        flex: seg.ratio,
                        padding: '0.375rem 0.5rem',
                        textAlign: 'center',
                        fontSize: '0.75rem',
                        fontWeight: isActive ? 700 : 400,
                        backgroundColor: isActive ? 'var(--color-primary-light, #dbeafe)' : 'var(--color-surface)',
                        borderLeft: '1px solid var(--color-border)',
                        color: isActive ? 'var(--color-primary, #2563eb)' : 'var(--text-primary)',
                        direction: 'ltr',
                      }}>
                        <span style={{ fontWeight: 600 }}>{seg.label}</span>
                        <span style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>
                          {Math.round(seg.ratio * 100)}% ({chars}字)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : undefined}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <Settings
                value={state.settings}
                onChange={(value) => setState((current) => updateSettings(current, value))}
                hideLineLength
              />
              <ScriptToolbar onApply={onToolbarApply} />
            </div>
            {/* 執筆開始位置ボタン */}
            {synopsisContentLength >= 10 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.5rem', direction: 'rtl' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', direction: 'ltr' }}>執筆開始位置:</span>
                {structureSegments.map((seg) => {
                  const isActive = seg.id === activeSegmentId;
                  return (
                    <button
                      key={seg.id}
                      type="button"
                      onClick={() => {
                        setActiveSegmentId(seg.id);
                        // Calculate character offset for this segment
                        const offset = structureSegments
                          .slice(0, structureSegments.indexOf(seg))
                          .reduce((sum, s) => sum + Math.round(state.metrics.totalCapacity * s.ratio), 0);
                        // Insert section marker at cursor or jump to offset
                        if (editorRef.current) {
                          const el = editorRef.current.element;
                          if (el) {
                            const text = el.innerText ?? '';
                            if (text.length <= offset) {
                              // Pad with newlines and insert marker
                              const pad = offset > text.length ? '\n'.repeat(Math.max(1, Math.ceil((offset - text.length) / state.settings.lineLength))) : '';
                              editorRef.current.insertText(`${pad}\n【${seg.label}】`);
                            } else {
                              // Place cursor at the offset position
                              editorRef.current.focus();
                              const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
                              let remaining = offset;
                              let node = walker.nextNode();
                              while (node) {
                                const len = (node.textContent ?? '').length;
                                if (remaining <= len) {
                                  const range = document.createRange();
                                  range.setStart(node, remaining);
                                  range.collapse(true);
                                  const selection = window.getSelection();
                                  selection?.removeAllRanges();
                                  selection?.addRange(range);
                                  break;
                                }
                                remaining -= len;
                                node = walker.nextNode();
                              }
                            }
                          }
                        }
                      }}
                      style={{
                        fontSize: '0.6875rem',
                        padding: '0.25rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        cursor: 'pointer',
                        backgroundColor: isActive ? 'var(--color-primary-light, #dbeafe)' : 'var(--color-bg-primary)',
                        color: isActive ? 'var(--color-primary, #2563eb)' : 'var(--text-secondary)',
                        fontWeight: isActive ? 600 : 400,
                      }}
                    >
                      {seg.label}
                    </button>
                  );
                })}
              </div>
            )}
            <VerticalEditor
              ref={editorRef}
              value={state.content}
              onChange={(value) => setState((current) => updateContent(current, value))}
              lineCount={Math.max(state.metrics.currentLines, state.settings.pageCount * 20)}
              charsPerColumn={state.settings.lineLength}
              placeholder="ここに脚本本文を入力..."
            />
            <p className="status-text" style={{ marginTop: 'var(--space-sm)' }}>
              文字数: {contentLength} / 行数: {state.metrics.currentLines} / 目安容量: {state.metrics.totalCapacity}字 ({state.settings.pageCount}枚) / 残り: {remaining}字
            </p>
          </ContentCommentary>
        </section>

        {/* ── AI採点者議論 ── */}
        <section className="section-container" aria-label="AI採点者議論">
          <h3>AI採点者議論</h3>
          <DiscussionPanel
            synopsis={state.synopsis}
            content={state.content}
            providerA={discussionProviderA}
            providerB={discussionProviderB}
            onProviderAChange={setDiscussionProviderA}
            onProviderBChange={setDiscussionProviderB}
            messages={discussionMessages}
            onMessagesChange={setDiscussionMessages}
          />
        </section>

        {/* ── ツール ── */}
        <section className="section-container" aria-label="ツール">
          <h3>ツール</h3>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" onClick={() => fileInputRef.current?.click()}>
              Word読み込み
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                if (file) void onImportDocx(file);
                e.currentTarget.value = '';
              }}
            />
            <button type="button" onClick={() => templateInputRef.current?.click()}>
              テンプレート読み込み
            </button>
            <input
              ref={templateInputRef}
              type="file"
              accept=".docx"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                if (file) void onImportTemplate(file);
                e.currentTarget.value = '';
              }}
            />
            {user && (
              <FormatPresetSelector
                userId={user.uid}
                selectedPresetId={selectedPreset?.id ?? null}
                onSelect={onPresetSelect}
                onApply={onPresetApply}
                onReset={onPresetReset}
                refreshKey={presetRefreshKey}
              />
            )}
            <button type="button" onClick={onPreview}>
              書き出しプレビュー
            </button>
            <button type="button" onClick={() => void onDownload()}>
              ダウンロード
            </button>
            {exportPreview && (
              <button type="button" onClick={() => setExportPreview('')} style={{ fontSize: '0.75rem', backgroundColor: 'transparent', border: '1px solid var(--color-border)', color: 'var(--text-secondary)' }}>
                プレビューを閉じる
              </button>
            )}
          </div>
          {statusMessage ? <p className="status-text">{statusMessage}</p> : null}
          {exportMessage ? <p className="status-text">{exportMessage}</p> : null}
          {exportPreview && (
            <div style={{ marginTop: 'var(--space-sm)' }}>
              <ExportPreview
                title={state.title}
                authorName={state.authorName}
                synopsis={state.synopsis}
                characterText={state.characterText}
                content={exportPreview}
                charsPerColumn={state.settings.lineLength}
                columnsPerPage={state.settings.linesPerPage}
              />
            </div>
          )}
        </section>
      </main>
    </Layout>
  );
}
