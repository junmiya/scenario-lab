import type { ReactElement } from 'react';
import type { EditorHandle } from '../editor/VerticalEditor';
import type { ToolbarActionDef } from '../../modes/types';

export type ToolbarAction = 'scene' | 'dialogue' | 'action';

export const INSERT_TEMPLATES: Record<ToolbarAction, string> = {
  scene: '○',
  dialogue: '「」',
  action: '\u3000\u3000\u3000', // 3 full-width spaces
};

export function applyToolbarAction(content: string, action: ToolbarAction): string {
  return `${content}${INSERT_TEMPLATES[action]}`;
}

export function insertToolbarAction(handle: EditorHandle, action: ToolbarAction): void {
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
  /** Legacy screenplay handler (柱/ト書き/セリフ). Used when `actions` is not provided. */
  onApply?: (action: ToolbarAction) => void;
  /** Generic mode-driven actions (e.g. novel 章/節/会話/地の文). From ModeProfile.toolbar. */
  actions?: ToolbarActionDef[];
  /** Generic handler invoked with the selected action definition. */
  onAction?: (action: ToolbarActionDef) => void;
  label?: string;
}

/**
 * Mode-aware insert toolbar. Backward compatible: with no `actions` it renders the
 * screenplay buttons and calls `onApply`. With `actions` (novel etc.) it renders those
 * and calls `onAction` — generalized per FR-004 (T031).
 */
export function ScriptToolbar({
  onApply,
  actions,
  onAction,
  label = 'Script toolbar',
}: ScriptToolbarProps): ReactElement {
  if (actions && actions.length > 0) {
    return (
      <div aria-label={label} className="flex-row">
        {actions.map((action) => (
          <button key={action.id} type="button" onClick={() => onAction?.(action)}>
            {action.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div aria-label={label} className="flex-row">
      <button type="button" onClick={() => onApply?.('scene')}>
        柱
      </button>
      <button type="button" onClick={() => onApply?.('action')}>
        ト書き
      </button>
      <button type="button" onClick={() => onApply?.('dialogue')}>
        セリフ
      </button>
    </div>
  );
}
