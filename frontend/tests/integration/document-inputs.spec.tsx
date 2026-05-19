/**
 * ドキュメント管理セクションの入力検証テスト
 * - タイトル: 文字入力・スペース
 * - 著者: 文字入力・スペース
 * - あらすじ: contenteditable VerticalEditor への入力
 *
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

describe('ドキュメント管理セクション入力検証', () => {
  it('タイトル: 日本語テキストを入力できる', () => {
    renderEditor();
    const input = screen.getByPlaceholderText('脚本タイトル');
    fireEvent.change(input, { target: { value: '吾輩は猫である' } });
    expect((input as HTMLInputElement).value).toBe('吾輩は猫である');
  });

  it('タイトル: スペースを含むテキストを入力できる', () => {
    renderEditor();
    const input = screen.getByPlaceholderText('脚本タイトル');
    fireEvent.change(input, { target: { value: 'タイトル テスト　全角スペース' } });
    expect((input as HTMLInputElement).value).toBe('タイトル テスト　全角スペース');
  });

  it('著者: 日本語テキストを入力できる', () => {
    renderEditor();
    const input = screen.getByPlaceholderText('著者名');
    fireEvent.change(input, { target: { value: '夏目漱石' } });
    expect((input as HTMLInputElement).value).toBe('夏目漱石');
  });

  it('著者: スペースを含むテキストを入力できる', () => {
    renderEditor();
    const input = screen.getByPlaceholderText('著者名');
    fireEvent.change(input, { target: { value: '山田 太郎' } });
    expect((input as HTMLInputElement).value).toBe('山田 太郎');
  });

  it('あらすじ: VerticalEditor contenteditable が存在する', () => {
    const { container } = renderEditor();
    const editor = container.querySelector('[data-placeholder="あらすじを入力..."]');
    expect(editor).toBeTruthy();
    expect(editor?.getAttribute('contenteditable')).toBe('true');
  });

  it('あらすじ: テキスト入力をシミュレートできる', () => {
    const { container } = renderEditor();
    const editor = container.querySelector(
      '[data-placeholder="あらすじを入力..."]',
    ) as HTMLDivElement;
    expect(editor).toBeTruthy();
    act(() => {
      editor.innerText = 'ある日突然猫になった男の物語。';
      fireEvent.input(editor);
    });
    expect(editor.innerText).toBe('ある日突然猫になった男の物語。');
  });

  it('全フィールドに同時に値を保持できる', () => {
    const { container } = renderEditor();
    const title = screen.getByPlaceholderText('脚本タイトル');
    const author = screen.getByPlaceholderText('著者名');

    fireEvent.change(title, { target: { value: 'テスト脚本' } });
    fireEvent.change(author, { target: { value: 'テスト著者' } });

    expect((title as HTMLInputElement).value).toBe('テスト脚本');
    expect((author as HTMLInputElement).value).toBe('テスト著者');

    // Synopsis VerticalEditor exists and is editable
    const synopsisEditor = container.querySelector('[data-placeholder="あらすじを入力..."]');
    expect(synopsisEditor).toBeTruthy();
    expect(synopsisEditor?.getAttribute('contenteditable')).toBe('true');
  });
});
