import type { ReactElement } from 'react';

export type ToolbarAction = 'scene' | 'dialogue' | 'action';

export const INSERT_TEMPLATES: Record<ToolbarAction, string> = {
  scene: '○場所（時間）\n',
  dialogue: '「」\n',
  action: '　ト書き\n',
};

export function applyToolbarAction(content: string, action: ToolbarAction): string {
  return `${content}${INSERT_TEMPLATES[action]}`;
}

export function insertToolbarAction(
  textarea: HTMLTextAreaElement,
  content: string,
  action: ToolbarAction,
): string {
  const template = INSERT_TEMPLATES[action];
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const newContent = content.substring(0, start) + template + content.substring(end);
  const newPos = start + template.length;
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(newPos, newPos);
  });
  return newContent;
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
