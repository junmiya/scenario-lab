import type { ReactElement } from 'react';
import type { EditorHandle } from '../editor/VerticalEditor';

export type ToolbarAction = 'scene' | 'dialogue' | 'action';

export const INSERT_TEMPLATES: Record<ToolbarAction, string> = {
  scene: '○',
  dialogue: '「」\n',
  action: '　ト書き\n',
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
