export type MappedField = 'title' | 'authorName' | 'characterText' | 'synopsis' | 'content';

export interface FieldMapping {
  field: MappedField;
  keyword: string; // 検出されたプレースホルダーテキスト
  sectionIndex: number; // テンプレートのセクション番号
  paragraphIndex: number; // そのセクション内の段落番号
  action: 'replace' | 'insertAfter'; // 差し替え / 後に挿入
}

export interface FormatPreset {
  id: string;
  name: string;
  ownerId: string;
  templateBase64: string;
  fieldMappings: FieldMapping[];
  lineLength: number | null;
  linesPerPage: number | null;
  fontEastAsia: string;
  sourceFileName: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}
