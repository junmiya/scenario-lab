import { useState, useEffect, type ReactElement } from 'react';
import type { FormatPreset } from '../../types/formatPreset';
import { listFormatPresets, deleteFormatPreset } from '../../lib/firebase/firestoreService';

interface FormatPresetSelectorProps {
  userId: string;
  selectedPresetId: string | null;
  onSelect: (preset: FormatPreset | null) => void;
  onApply: (preset: FormatPreset) => void;
  onReset: () => void;
  refreshKey?: number;
}

const BTN_STYLE: React.CSSProperties = {
  fontSize: '0.75rem',
  padding: '0.25rem 0.5rem',
  backgroundColor: 'transparent',
  border: '1px solid var(--color-border)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
};

export function FormatPresetSelector({
  userId,
  selectedPresetId,
  onSelect,
  onApply,
  onReset,
  refreshKey,
}: FormatPresetSelectorProps): ReactElement {
  const [presets, setPresets] = useState<FormatPreset[]>([]);

  useEffect(() => {
    listFormatPresets(userId).then(setPresets).catch(console.error);
  }, [userId, refreshKey]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id === '') {
      onSelect(null);
    } else {
      const preset = presets.find((p) => p.id === id) ?? null;
      onSelect(preset);
    }
  };

  const handleApply = () => {
    const preset = presets.find((p) => p.id === selectedPresetId);
    if (preset) onApply(preset);
  };

  const handleDelete = async () => {
    if (!selectedPresetId) return;
    const preset = presets.find((p) => p.id === selectedPresetId);
    if (!preset || !confirm(`「${preset.name}」を削除しますか？`)) return;
    await deleteFormatPreset(selectedPresetId);
    onSelect(null);
    setPresets((prev) => prev.filter((p) => p.id !== selectedPresetId));
  };

  if (presets.length === 0) return <></>;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
      <select
        value={selectedPresetId ?? ''}
        onChange={handleChange}
        style={{ fontSize: '0.8125rem', padding: '0.375rem 0.5rem' }}
      >
        <option value="">標準設定</option>
        {presets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.lineLength && p.linesPerPage ? ` (${p.lineLength}×${p.linesPerPage})` : ''}
          </option>
        ))}
      </select>
      {selectedPresetId && (
        <>
          <button
            type="button"
            onClick={handleApply}
            style={{ ...BTN_STYLE, color: 'var(--text-primary)', fontWeight: 600 }}
          >
            適用
          </button>
          <button type="button" onClick={onReset} style={BTN_STYLE}>
            リセット
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            title="プリセットを削除"
            style={BTN_STYLE}
          >
            削除
          </button>
        </>
      )}
    </div>
  );
}
