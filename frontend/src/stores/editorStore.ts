export interface EditorSettings {
  lineLength: number;
  pageCount: number;
}

export interface GuideMetrics {
  totalCapacity: number;
  filledRatio: number;
  currentLines: number;
}

export interface EditorState {
  title: string;
  authorName: string;
  synopsis: string;
  content: string;
  settings: EditorSettings;
  metrics: GuideMetrics;
  synopsisSettings: EditorSettings;
  synopsisMetrics: GuideMetrics;
}

export const DEFAULT_SETTINGS: EditorSettings = {
  lineLength: 20,
  pageCount: 10,
};

export const DEFAULT_SYNOPSIS_SETTINGS: EditorSettings = {
  lineLength: 20,
  pageCount: 2,
};

export function recalculateGuideMetrics(
  content: string,
  settings: EditorSettings,
): GuideMetrics {
  const totalCapacity = settings.lineLength * settings.pageCount;
  const contentLength = content.replace(/[\r\n]/g, '').length;
  const filledRatio = totalCapacity > 0 ? Math.min(contentLength / totalCapacity, 1) : 0;

  let currentLines = 0;
  if (content.length === 0) {
    currentLines = 0;
  } else if (settings.lineLength > 0) {
    const paragraphs = content.split('\n');
    for (const p of paragraphs) {
      if (p.length === 0) {
        currentLines += 1;
      } else {
        currentLines += Math.ceil(p.length / settings.lineLength);
      }
    }
  }

  return { totalCapacity, filledRatio, currentLines };
}

export function createInitialEditorState(): EditorState {
  return {
    title: '',
    authorName: '',
    synopsis: '',
    content: '',
    settings: DEFAULT_SETTINGS,
    metrics: {
      totalCapacity: DEFAULT_SETTINGS.lineLength * DEFAULT_SETTINGS.pageCount,
      filledRatio: 0,
      currentLines: 0,
    },
    synopsisSettings: DEFAULT_SYNOPSIS_SETTINGS,
    synopsisMetrics: {
      totalCapacity: DEFAULT_SYNOPSIS_SETTINGS.lineLength * DEFAULT_SYNOPSIS_SETTINGS.pageCount,
      filledRatio: 0,
      currentLines: 0,
    },
  };
}

export function updateContent(state: EditorState, content: string): EditorState {
  const next = { ...state, content };
  return { ...next, metrics: recalculateGuideMetrics(next.content, next.settings) };
}

export function updateSettings(state: EditorState, settings: EditorSettings): EditorState {
  const next = { ...state, settings };
  return { ...next, metrics: recalculateGuideMetrics(next.content, next.settings) };
}

export function updateSynopsis(state: EditorState, synopsis: string): EditorState {
  const next = { ...state, synopsis };
  return { ...next, synopsisMetrics: recalculateGuideMetrics(next.synopsis, next.synopsisSettings) };
}

export function updateSynopsisSettings(state: EditorState, synopsisSettings: EditorSettings): EditorState {
  const next = { ...state, synopsisSettings };
  return { ...next, synopsisMetrics: recalculateGuideMetrics(next.synopsis, next.synopsisSettings) };
}
