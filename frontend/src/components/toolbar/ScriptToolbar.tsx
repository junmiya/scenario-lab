import type { ReactElement } from 'react';
import type { EditorHandle } from '../editor/VerticalEditor';

export type ToolbarAction = 'scene' | 'dialogue' | 'action';

export const INSERT_TEMPLATES: Record<ToolbarAction, string> = {
  scene: '○',
  dialogue: '「」',
  action: '\u3000\u3000\u3000',  // 3 full-width spaces
};

export function applyToolbarAction(content: string, action: ToolbarAction): string {
  return `${content}${INSERT_TEMPLATES[action]}`;
}

export function insertToolbarAction(
  handle: EditorHandle,
  action: ToolbarAction,
): void {
  const template = INSERT_TEMPLATES[action];
  handle.focus();
  handle.insertText(template);

  // For dialogue: move cursor to line start so user can type character name before 「」
  if (action === 'dialogue') {
    const sel = window.getSelection();
    if (sel) sel.modify('move', 'backward', 'lineboundary');
  }
}

interface ScriptToolbarProps {
  onApply: (action: ToolbarAction) => void;
}

export function ScriptToolbar({ onApply }: ScriptToolbarProps): ReactElement {
  return (
    <div aria-label="Script toolbar" className="flex-row">
      <button type="button" onClick={() => onApply('scene')}>
        柱
      </button>
      <button type="button" onClick={() => onApply('action')}>
        ト書き
      </button>
      <button type="button" onClick={() => onApply('dialogue')}>
        セリフ
      </button>
    </div>
  );
}
