import type { ReactElement } from 'react';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/ui/Layout';
import { useAuth } from '../contexts/AuthContext';
import { getScript, updateScript } from '../lib/firebase/firestoreService';
import { AdvicePanel } from '../components/advice/AdvicePanel';
import { DiffView } from '../components/advice/DiffView';
import { PartialAdvice } from '../components/advice/PartialAdvice';
import { ContentCommentary } from '../components/advice/ContentCommentary';
import { SynopsisCommentary } from '../components/advice/SynopsisCommentary';
import { CharacterTable, type CharacterRow } from '../components/editor/CharacterTable';
import { Settings } from '../components/editor/Settings';
import { VerticalEditor, type EditorHandle } from '../components/editor/VerticalEditor';
import { SectionSelector } from '../components/structure/SectionSelector';
import { StructurePanel, type StructureSegment } from '../components/structure/StructurePanel';
import {
  ScriptToolbar,
  applyToolbarAction,
  insertToolbarAction,
  type ToolbarAction,
} from '../components/toolbar/ScriptToolbar';
import {
  generateAdvice,
  listAdviceModels,
  type AdviceModelDescriptor,
} from '../services/adviceService';
import { requestExport } from '../services/exportService';
import { extractTextFromDocx } from '../services/importService';
import {
  createAdviceState,
  selectPanelModel,
  setPanelPreset,
  type AdviceProvider,
} from '../stores/adviceStore';
import {
  createInitialEditorState,
  DEFAULT_SETTINGS,
  DEFAULT_SYNOPSIS_SETTINGS,
  recalculateGuideMetrics,
  updateContent,
  updateSettings,
  updateSynopsis,
  updateSynopsisSettings,
} from '../stores/editorStore';

interface AdviceResult {
  structureFeedback: string;
  emotionalFeedback: string;
}

const structureSegments: StructureSegment[] = [
  { id: 'intro', label: '起', ratio: 0.25 },
  { id: 'development', label: '承', ratio: 0.35 },
  { id: 'turn', label: '転', ratio: 0.2 },
  { id: 'closing', label: '結', ratio: 0.2 },
];

const defaultSegmentId = structureSegments[0]?.id ?? 'intro';
const defaultAdviceModels: AdviceModelDescriptor[] = [
  { provider: 'gemini', label: 'Gemini', enabled: true },
  { provider: 'openai', label: 'OpenAI', enabled: true },
  { provider: 'anthropic', label: 'Anthropic', enabled: true },
];

export function EditorPage(): ReactElement {
  const { scriptId: routeScriptId } = useParams<{ scriptId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState(createInitialEditorState);
  const [adviceState, setAdviceState] = useState(createAdviceState);
  const [characters, setCharacters] = useState<CharacterRow[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string>(defaultSegmentId);
  const [lastBeforeEdit, setLastBeforeEdit] = useState('');
  const [panelAAdvice, setPanelAAdvice] = useState<AdviceResult>({
    structureFeedback: 'アドバイス未生成',
    emotionalFeedback: 'アドバイス未生成',
  });
  const [panelBAdvice, setPanelBAdvice] = useState<AdviceResult>({
    structureFeedback: 'アドバイス未生成',
    emotionalFeedback: 'アドバイス未生成',
  });
  const [adviceModels, setAdviceModels] = useState<AdviceModelDescriptor[]>(defaultAdviceModels);
  const [adviceMessage, setAdviceMessage] = useState('');
  const [exportMessage, setExportMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const editorRef = useRef<EditorHandle | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load script from Firestore if a route param is provided
  useEffect(() => {
    if (!routeScriptId) return;
    void (async () => {
      try {
        const script = await getScript(routeScriptId);
        if (script) {
          const settings = script.settings || DEFAULT_SETTINGS;
          setState({
            title: script.title || '',
            authorName: script.authorName || '',
            synopsis: script.synopsis || '',
            content: script.content || '',
            settings,
            metrics: recalculateGuideMetrics(script.content || '', settings),
            synopsisSettings: DEFAULT_SYNOPSIS_SETTINGS,
            synopsisMetrics: recalculateGuideMetrics(script.synopsis || '', DEFAULT_SYNOPSIS_SETTINGS),
          });
          setCharacters(script.characters?.map((c) => {
            const row: CharacterRow = { id: c.id, name: c.name };
            if (c.age) row.age = c.age;
            if (c.traits) row.traits = c.traits;
            if (c.background) row.background = c.background;
            return row;
          }) || []);
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
        characters: characters.map((c) => {
          const entry: { id: string; name: string; age?: string; traits?: string; background?: string } = { id: c.id, name: c.name };
          if (c.age) entry.age = c.age;
          if (c.traits) entry.traits = c.traits;
          if (c.background) entry.background = c.background;
          return entry;
        }),
        settings: state.settings,
      });
      setSaveMessage('保存しました');
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (error) {
      console.error('Failed to save to Firestore:', error);
      setSaveMessage('保存に失敗しました');
    }
  }, [routeScriptId, state, characters]);

  const resolveProvider = (
    current: AdviceProvider,
    models: AdviceModelDescriptor[],
    fallback: AdviceProvider,
  ): AdviceProvider => {
    const enabled = models.filter((item) => item.enabled).map((item) => item.provider);
    if (enabled.length === 0) {
      return fallback;
    }

    if (enabled.includes(current)) {
      return current;
    }

    return enabled[0] ?? fallback;
  };

  useEffect(() => {
    void (async () => {
      try {
        const models = await listAdviceModels();
        setAdviceModels(models);
        setAdviceState((current) => ({
          ...current,
          panelA: {
            ...current.panelA,
            provider: resolveProvider(current.panelA.provider, models, 'gemini'),
          },
          panelB: {
            ...current.panelB,
            provider: resolveProvider(current.panelB.provider, models, 'openai'),
          },
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setAdviceMessage(`モデル一覧取得失敗: ${message}`);
      }
    })();
  }, []);

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

  const regenerateAdvice = async (selectedText?: string): Promise<void> => {
    const providerEnabled = (provider: AdviceProvider): boolean =>
      adviceModels.some((item) => item.provider === provider && item.enabled);
    if (
      !providerEnabled(adviceState.panelA.provider) ||
      !providerEnabled(adviceState.panelB.provider)
    ) {
      setAdviceMessage('選択中のモデルが利用不可です。モデル設定を見直してください。');
      return;
    }

    const response = await generateAdvice({
      documentId: routeScriptId || 'unsaved',
      synopsis: state.synopsis,
      content: state.content,
      ...(selectedText !== undefined ? { selectedText } : {}),
      panelAProvider: adviceState.panelA.provider,
      panelBProvider: adviceState.panelB.provider,
      panelAPreset: adviceState.panelA.preset,
      panelBPreset: adviceState.panelB.preset,
    });

    setPanelAAdvice({
      structureFeedback: response.panelA.structureFeedback,
      emotionalFeedback: response.panelA.emotionalFeedback,
    });
    setPanelBAdvice({
      structureFeedback: response.panelB.structureFeedback,
      emotionalFeedback: response.panelB.emotionalFeedback,
    });
    setAdviceMessage('');
  };

  const onRequestPartialAdvice = async (selectedText: string): Promise<void> => {
    await regenerateAdvice(selectedText);
  };

  const applyAdviceExamplePatch = (): void => {
    setLastBeforeEdit(state.content);
    setState((current) => updateContent(current, `${current.content}\n# 修正案を反映\n`));
  };

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

  const onExport = async (): Promise<void> => {
    try {
      const payload = await requestExport({
        documentId: routeScriptId || 'unsaved',
        title: state.title || 'untitled-script',
        authorName: state.authorName || 'unknown-author',
        content: state.content,
      });
      setExportMessage(`Export ready: ${payload.fileName} (${payload.content.replace(/[\r\n]/g, '').length} chars)`);
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <Layout>
      <main className="main-container">
        {/* ── ヘッダー ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0 }}>脚本エディタ</h1>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {saveMessage && <span style={{ fontSize: '0.875rem', color: 'var(--color-success)' }}>{saveMessage}</span>}
            {routeScriptId && (
              <button type="button" className="btn-primary" onClick={() => void saveToFirestore()} style={{ fontWeight: 600 }}>
                保存
              </button>
            )}
            <button type="button" onClick={() => navigate('/catalog')} style={{ backgroundColor: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
              一覧に戻る
            </button>
          </div>
        </div>

        {/* ── 作品情報 ── */}
        <section className="section-container" aria-label="作品情報">
          <h3>作品情報</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <label>
              タイトル
              <input
                value={state.title}
                onChange={(event) => {
                  const val = event.currentTarget.value;
                  setState((current) => ({ ...current, title: val }));
                }}
                placeholder="脚本タイトル"
              />
            </label>
            <label>
              著者
              <input
                value={state.authorName}
                onChange={(event) => {
                  const val = event.currentTarget.value;
                  setState((current) => ({ ...current, authorName: val }));
                }}
                placeholder="著者名"
              />
            </label>
          </div>
        </section>

        {/* ── あらすじ ── */}
        <section className="section-container" aria-label="あらすじ">
          <h3>あらすじ</h3>
          {/* 上段: AI修正提案 */}
          <SynopsisCommentary synopsis={state.synopsis} scriptId={routeScriptId} charsPerColumn={state.synopsisSettings.lineLength} />
          {/* 下段: エディタ */}
          <Settings
            value={state.synopsisSettings}
            onChange={(value) => setState((current) => updateSynopsisSettings(current, value))}
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
        </section>

        {/* ── 本文 ── */}
        <section className="section-container" aria-label="本文">
          <h3>本文</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <Settings
              value={state.settings}
              onChange={(value) => setState((current) => updateSettings(current, value))}
            />
            <ScriptToolbar onApply={onToolbarApply} />
          </div>
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
          <ContentCommentary content={state.content} scriptId={routeScriptId} />
        </section>

        {/* ── 登場人物 ── */}
        <section className="section-container" aria-label="登場人物">
          <h3>登場人物</h3>
          <CharacterTable value={characters} onChange={setCharacters} />
        </section>

        {/* ── AIアドバイス ── */}
        <section className="section-container" aria-label="AIアドバイス">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h3 style={{ margin: 0 }}>AIアドバイス</h3>
            <button type="button" className="btn-primary" onClick={() => void regenerateAdvice()}>
              全体アドバイス更新
            </button>
          </div>
          {adviceMessage ? <p className="status-text">{adviceMessage}</p> : null}
          <div className="grid-2col">
            <AdvicePanel
              title="Advice A"
              provider={adviceState.panelA.provider}
              models={adviceModels}
              preset={adviceState.panelA.preset}
              structureFeedback={panelAAdvice.structureFeedback}
              emotionalFeedback={panelAAdvice.emotionalFeedback}
              onProviderChange={(provider) =>
                setAdviceState((current) => selectPanelModel(current, 'A', provider))
              }
              onPresetChange={(preset) =>
                setAdviceState((current) => setPanelPreset(current, 'A', preset))
              }
            />
            <AdvicePanel
              title="Advice B"
              provider={adviceState.panelB.provider}
              models={adviceModels}
              preset={adviceState.panelB.preset}
              structureFeedback={panelBAdvice.structureFeedback}
              emotionalFeedback={panelBAdvice.emotionalFeedback}
              onProviderChange={(provider) =>
                setAdviceState((current) => selectPanelModel(current, 'B', provider))
              }
              onPresetChange={(preset) =>
                setAdviceState((current) => setPanelPreset(current, 'B', preset))
              }
            />
          </div>
          <PartialAdvice onRequest={onRequestPartialAdvice} />
        </section>

        {/* ── 構成 ── */}
        <section className="section-container" aria-label="構成">
          <h3>構成</h3>
          <StructurePanel segments={structureSegments} activeSegmentId={activeSegmentId} />
          <SectionSelector
            segments={structureSegments}
            activeSegmentId={activeSegmentId}
            onSelect={setActiveSegmentId}
          />
        </section>

        {/* ── ツール ── */}
        <section className="section-container" aria-label="ツール">
          <h3>ツール</h3>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
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
            <button type="button" onClick={() => void onExport()}>
              エクスポート
            </button>
            <button type="button" onClick={applyAdviceExamplePatch}>
              修正例を本文に反映
            </button>
          </div>
          {statusMessage ? <p className="status-text">{statusMessage}</p> : null}
          {exportMessage ? <p className="status-text">{exportMessage}</p> : null}
          {lastBeforeEdit && <DiffView before={lastBeforeEdit} after={state.content} />}
        </section>
      </main>
    </Layout>
  );
}
