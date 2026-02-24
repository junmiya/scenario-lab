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
}

const DEFAULT_SETTINGS: EditorSettings = {
  lineLength: 20,
  pageCount: 10,
};

export function recalculateGuideMetrics(
  state: Pick<EditorState, 'content' | 'settings'>,
): GuideMetrics {
  const totalCapacity = state.settings.lineLength * state.settings.pageCount;
  const filledRatio = totalCapacity > 0 ? Math.min(state.content.length / totalCapacity, 1) : 0;

  let currentLines = 0;
  if (state.content.length === 0) {
    currentLines = 0;
  } else if (state.settings.lineLength > 0) {
    const paragraphs = state.content.split('\n');
    for (const p of paragraphs) {
      if (p.length === 0) {
        currentLines += 1;
      } else {
        currentLines += Math.ceil(p.length / state.settings.lineLength);
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
  };
}

export function updateContent(state: EditorState, content: string): EditorState {
  const next = { ...state, content };
  return { ...next, metrics: recalculateGuideMetrics(next) };
}

export function updateSettings(state: EditorState, settings: EditorSettings): EditorState {
  const next = { ...state, settings };
  return { ...next, metrics: recalculateGuideMetrics(next) };
}
