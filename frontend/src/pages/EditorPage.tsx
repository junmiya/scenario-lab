import type { ReactElement } from 'react';

import { useEffect, useMemo, useState, useRef } from 'react';
import { AdvicePanel } from '../components/advice/AdvicePanel';
import { DiffView } from '../components/advice/DiffView';
import { PartialAdvice } from '../components/advice/PartialAdvice';
import { CharacterTable, type CharacterRow } from '../components/editor/CharacterTable';
import { Settings } from '../components/editor/Settings';
import { VerticalEditor } from '../components/editor/VerticalEditor';
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
import {
  createDocument,
  listDocuments,
  loadDocument,
  saveDocument,
  type DocumentSummary,
} from '../services/documentService';
import type { ScriptDocument } from '../services/documentRepository';
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
  recalculateGuideMetrics,
  updateContent,
  updateSettings,
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
const localDocumentId = 'local-draft';
const defaultAdviceModels: AdviceModelDescriptor[] = [
  { provider: 'gemini', label: 'Gemini', enabled: true },
  { provider: 'openai', label: 'OpenAI', enabled: true },
  { provider: 'anthropic', label: 'Anthropic', enabled: true },
];

function toEditorState(document: ScriptDocument) {
  return {
    title: document.title,
    authorName: document.authorName,
    synopsis: document.synopsis,
    content: document.content,
    settings: document.settings,
    metrics: recalculateGuideMetrics({
      content: document.content,
      settings: document.settings,
    }),
  };
}

function toCharacterRows(document: ScriptDocument): CharacterRow[] {
  return document.characters.map((item) => {
    const row: CharacterRow = {
      id: item.id,
      name: item.name,
    };

    if (item.age !== undefined) {
      row.age = item.age;
    }
    if (item.traits !== undefined) {
      row.traits = item.traits;
    }
    if (item.background !== undefined) {
      row.background = item.background;
    }

    return row;
  });
}

export function EditorPage(): ReactElement {
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
  const [documentId, setDocumentId] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [documentMessage, setDocumentMessage] = useState('');
  const [documentPending, setDocumentPending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeDocumentId = documentId || localDocumentId;

  const applyLoadedDocument = (document: ScriptDocument): void => {
    setDocumentId(document.id);
    setSelectedDocumentId(document.id);
    setState(toEditorState(document));
    setCharacters(toCharacterRows(document));
  };

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

  const refreshDocuments = async (): Promise<void> => {
    const list = await listDocuments();
    setDocuments(list);
    if (list.length > 0) {
      const firstId = list[0]?.id;
      if (firstId) {
        setSelectedDocumentId((current) => current || firstId);
      }
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        await refreshDocuments();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setDocumentMessage(`ドキュメント一覧取得失敗: ${message}`);
      }
    })();
  }, []);

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
    if (textareaRef.current) {
      const newContent = insertToolbarAction(textareaRef.current, state.content, action);
      setState((current) => updateContent(current, newContent));
    } else {
      setState((current) => updateContent(current, applyToolbarAction(current.content, action)));
    }
  };

  const remaining = useMemo(() => {
    return Math.max(state.metrics.totalCapacity - state.content.length, 0);
  }, [state]);

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
      documentId: activeDocumentId,
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

  const onCreateDocument = async (): Promise<void> => {
    setDocumentPending(true);
    try {
      const created = await createDocument({
        title: state.title.trim() || 'untitled-script',
        authorName: state.authorName.trim() || 'unknown-author',
        settings: state.settings,
      });
      const saved = await saveDocument(created.id, {
        synopsis: state.synopsis,
        content: state.content,
        characters,
      });
      applyLoadedDocument(saved);
      await refreshDocuments();
      setDocumentMessage(`新規作成: ${saved.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setDocumentMessage(`新規作成失敗: ${message}`);
    } finally {
      setDocumentPending(false);
    }
  };

  const onSaveDocument = async (): Promise<void> => {
    setDocumentPending(true);
    try {
      let targetId = documentId;
      if (!targetId) {
        const created = await createDocument({
          title: state.title.trim() || 'untitled-script',
          authorName: state.authorName.trim() || 'unknown-author',
          settings: state.settings,
        });
        targetId = created.id;
      }

      const saved = await saveDocument(targetId, {
        title: state.title,
        authorName: state.authorName,
        synopsis: state.synopsis,
        content: state.content,
        settings: state.settings,
        characters,
      });
      applyLoadedDocument(saved);
      await refreshDocuments();
      setDocumentMessage(`保存完了: ${saved.id} (v${saved.version})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setDocumentMessage(`保存失敗: ${message}`);
    } finally {
      setDocumentPending(false);
    }
  };

  const onLoadDocument = async (): Promise<void> => {
    if (!selectedDocumentId) {
      return;
    }

    setDocumentPending(true);
    try {
      const loaded = await loadDocument(selectedDocumentId);
      if (!loaded) {
        setDocumentMessage('ドキュメントが見つかりません');
        return;
      }

      applyLoadedDocument(loaded);
      setDocumentMessage(`読み込み完了: ${loaded.id} (v${loaded.version})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setDocumentMessage(`読み込み失敗: ${message}`);
    } finally {
      setDocumentPending(false);
    }
  };

  const onImportDocx = async (file: File): Promise<void> => {
    try {
      const text = await extractTextFromDocx(file);
      setState((current) => updateContent(current, text));
      setDocumentMessage(`Word読み込み完了: ${file.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setDocumentMessage(`Word読み込み失敗: ${message}`);
    }
  };

  const onExport = async (): Promise<void> => {
    try {
      const payload = await requestExport({
        documentId: activeDocumentId,
        title: state.title || 'untitled-script',
        authorName: state.authorName || 'unknown-author',
        content: state.content,
      });
      setExportMessage(`Export ready: ${payload.fileName} (${payload.content.length} chars)`);
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <main className="main-container">
      <h1>Scenario Writing Lab</h1>

      <section aria-label="Document controls" className="section-container">
        <h3>ドキュメント管理</h3>
        <div className="flex-col">
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
          <label>
            あらすじ
            <textarea
              value={state.synopsis}
              onChange={(event) => {
                const val = event.currentTarget.value;
                setState((current) => ({ ...current, synopsis: val }));
              }}
              placeholder="あらすじ"
            />
          </label>
        </div>
        <div className="document-actions">
          <button type="button" onClick={() => void onCreateDocument()} disabled={documentPending}>
            新規作成
          </button>
          <button type="button" onClick={() => void onSaveDocument()} disabled={documentPending}>
            保存
          </button>
          <select
            value={selectedDocumentId}
            onChange={(event) => setSelectedDocumentId(event.currentTarget.value)}
            aria-label="Saved documents"
          >
            <option value="">保存済みを選択</option>
            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.title || '(untitled)'} / {document.id}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => void onLoadDocument()} disabled={documentPending}>
            読み込み
          </button>
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
        </div>
        <p className="status-text">現在のドキュメントID: {documentId || '(未保存)'}</p>
        {documentMessage ? <p className="status-text">{documentMessage}</p> : null}
      </section>

      <ScriptToolbar onApply={onToolbarApply} />

      <Settings
        value={state.settings}
        onChange={(value) => setState((current) => updateSettings(current, value))}
      />

      <VerticalEditor
        value={state.content}
        onChange={(value) => setState((current) => updateContent(current, value))}
        textareaRef={textareaRef}
        lineCount={Math.max(state.metrics.currentLines, state.settings.pageCount * 20)}
      />

      <p>
        文字数: {state.content.length} / 行数: {state.metrics.currentLines} / 目安容量: {state.metrics.totalCapacity}字 ({state.settings.pageCount}枚) / 残り: {remaining}字
      </p>

      <CharacterTable value={characters} onChange={setCharacters} />

      <button type="button" className="btn-primary" onClick={() => void regenerateAdvice()}>
        全体アドバイス更新
      </button>
      {adviceMessage ? <p>{adviceMessage}</p> : null}

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

      <StructurePanel segments={structureSegments} activeSegmentId={activeSegmentId} />
      <SectionSelector
        segments={structureSegments}
        activeSegmentId={activeSegmentId}
        onSelect={setActiveSegmentId}
      />

      <button type="button" onClick={applyAdviceExamplePatch}>
        修正例を本文に反映
      </button>

      <DiffView before={lastBeforeEdit} after={state.content} />

      <button type="button" onClick={() => void onExport()}>
        エクスポート
      </button>
      {exportMessage ? <p>{exportMessage}</p> : null}
    </main>
  );
}
