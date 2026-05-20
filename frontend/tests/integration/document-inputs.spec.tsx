/**
 * ドキュメント管理セクションの入力検証テスト
 * - タイトル: VerticalEditor (contenteditable) への入力
 * - 著者: VerticalEditor (contenteditable) への入力
 * - あらすじ: VerticalEditor (contenteditable) への入力
 *
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock Firebase modules to prevent initialization errors in test environment
vi.mock('../../src/lib/firebase/config', () => ({
  app: {},
  auth: {},
  db: {},
  authReady: Promise.resolve(),
}));
vi.mock('../../src/lib/firebase/authService', () => ({
  subscribeToAuthChanges: vi.fn(() => vi.fn()),
  signOut: vi.fn(),
  handleRedirectResult: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../src/lib/firebase/firestoreService', () => ({
  getScript: vi.fn(() => Promise.resolve(null)),
  updateScript: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../src/services/adviceService', () => ({
  listAdviceModels: vi.fn(() =>
    Promise.resolve([{ provider: 'gemini', label: 'Gemini', enabled: true }]),
  ),
  generateAdvice: vi.fn(),
}));
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(),
}));

import { AuthProvider } from '../../src/contexts/AuthContext';
import { EditorPage } from '../../src/pages/EditorPage';

function renderEditor() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <EditorPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

function getByDataPlaceholder(container: HTMLElement, placeholder: string): HTMLElement {
  const el = container.querySelector(`[data-placeholder="${placeholder}"]`);
  if (!el) throw new Error(`Element with data-placeholder="${placeholder}" not found`);
  return el as HTMLElement;
}

describe('ドキュメント管理セクション入力検証', () => {
  it('タイトル: contenteditable が存在し編集可能', () => {
    const { container } = renderEditor();
    const editor = getByDataPlaceholder(container, 'タイトル');
    expect(editor.getAttribute('contenteditable')).toBe('true');
  });

  it('タイトル: テキスト入力をシミュレートできる', () => {
    const { container } = renderEditor();
    const editor = getByDataPlaceholder(container, 'タイトル');
    act(() => {
      editor.innerText = '吾輩は猫である';
      fireEvent.input(editor);
    });
    expect(editor.innerText).toBe('吾輩は猫である');
  });

  it('著者: contenteditable が存在し編集可能', () => {
    const { container } = renderEditor();
    const editor = getByDataPlaceholder(container, '著者名');
    expect(editor.getAttribute('contenteditable')).toBe('true');
  });

  it('著者: テキスト入力をシミュレートできる', () => {
    const { container } = renderEditor();
    const editor = getByDataPlaceholder(container, '著者名');
    act(() => {
      editor.innerText = '夏目漱石';
      fireEvent.input(editor);
    });
    expect(editor.innerText).toBe('夏目漱石');
  });

  it('あらすじ: contenteditable が存在し編集可能', () => {
    const { container } = renderEditor();
    const editor = getByDataPlaceholder(container, 'あらすじを入力...');
    expect(editor).toBeTruthy();
    expect(editor.getAttribute('contenteditable')).toBe('true');
  });

  it('あらすじ: テキスト入力をシミュレートできる', () => {
    const { container } = renderEditor();
    const editor = getByDataPlaceholder(container, 'あらすじを入力...');
    act(() => {
      editor.innerText = 'ある日突然猫になった男の物語。';
      fireEvent.input(editor);
    });
    expect(editor.innerText).toBe('ある日突然猫になった男の物語。');
  });

  it('全フィールドが同時に編集可能', () => {
    const { container } = renderEditor();
    const title = getByDataPlaceholder(container, 'タイトル');
    const author = getByDataPlaceholder(container, '著者名');
    const synopsis = getByDataPlaceholder(container, 'あらすじを入力...');

    expect(title.getAttribute('contenteditable')).toBe('true');
    expect(author.getAttribute('contenteditable')).toBe('true');
    expect(synopsis.getAttribute('contenteditable')).toBe('true');
  });
});
