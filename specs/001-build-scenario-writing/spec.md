# Feature Specification: Scenario Lab MVP

**Feature Branch**: `001-build-scenario-writing`  
**Created**: 2026-02-10  
**Status**: Draft  
**Input**: User description: "Build scenario writing lab MVP"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Write in Professional Vertical Format (Priority: P1)

As a screenplay writer, I can create a script document and write in a vertical composition
format with format helper tools so I can draft production-ready text quickly.

**Why this priority**: Core writing value depends on correct format entry and editing.

**Independent Test**: A logged-in user creates one document, writes text in vertical mode,
uses format helpers (scene heading, dialogue, action), and saves successfully.

**Acceptance Scenarios**:

1. **Given** a logged-in user opens a new document, **When** they type in the editor,
   **Then** the content is displayed and edited in vertical writing format.
2. **Given** the user uses format helper actions, **When** they insert scene heading,
   dialogue, and action blocks, **Then** the expected screenplay structure is inserted and
   remains editable.
3. **Given** the user updates line-length and page settings, **When** they continue writing,
   **Then** layout guidance updates without data loss.

---

### User Story 2 - Receive Contextual Dual AI Advice (Priority: P2)

As a screenplay writer, I can receive two parallel advice streams based on synopsis,
current content, and character context so I can revise from multiple perspectives.

**Why this priority**: AI guidance is the core differentiation after writing fidelity.

**Independent Test**: A user with existing script content requests advice and receives
parallel responses in two panels with selectable models and advice presets.

**Acceptance Scenarios**:

1. **Given** a user has written synopsis and body text, **When** they trigger advice,
   **Then** two advice panels are generated with structure and emotional feedback.
2. **Given** the user selects a text segment, **When** they request partial advice,
   **Then** advice reflects selected text and document context.
3. **Given** one model selection is changed, **When** advice refreshes,
   **Then** the updated panel reflects the new model while the other panel remains independent.

---

### User Story 3 - Manage Structure and Export Deliverable (Priority: P3)

As a screenplay writer, I can map story structure, compare revisions, and export the script
so I can finalize and share a usable screenplay draft.

**Why this priority**: Completion and delivery workflows are required for end-to-end value.

**Independent Test**: A user with completed content reviews structure guidance, compares
pre/post revisions, and exports a file that preserves required formatting.

**Acceptance Scenarios**:

1. **Given** a completed synopsis and draft, **When** the user opens structure view,
   **Then** the system shows current position and structure allocation guidance.
2. **Given** the user applies edits from advice, **When** they open compare view,
   **Then** before/after differences are visible.
3. **Given** the user exports the script, **When** export completes,
   **Then** the file is downloadable and preserves script formatting intent.

### Edge Cases

- When an AI provider response fails or times out, the affected panel displays an error
  message with a retry button; the other panel continues to display its result independently.
- How does the system handle save conflicts from two sessions editing the same document?
- What happens when users attempt export with incomplete required metadata (title/author)?
- How does the system handle character references that were deleted from the character list?
- What happens when a user loses network connectivity during active editing?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require authentication via Firebase Authentication (Google sign-in
  and email/password) before document access.
- **FR-002**: System MUST allow users to create, open, update, and list script documents.
- **FR-003**: System MUST support vertical writing mode for screenplay editing.
- **FR-004**: System MUST provide format helper actions for screenplay structures
  (scene heading, action, dialogue, brackets/quotes).
- **FR-005**: System MUST allow users to adjust line-length and page-size guidance settings.
- **FR-006**: System MUST save synopsis, script body, character table, and layout settings
  to Cloud Firestore as the persistence backend.
- **FR-007**: System MUST isolate document access so users can access only their own data,
  enforced via Firestore security rules scoped to authenticated user IDs.
- **FR-008**: System MUST support character table management (add/edit/remove entries).
- **FR-009**: System MUST generate dual advice panels from current writing context via a
  unified provider response contract supporting multiple AI providers (e.g., OpenAI,
  Anthropic) as well as single-provider multi-model configurations.
- **FR-010**: System MUST allow independent model/provider selection per advice panel.
- **FR-011**: System MUST allow users to customize and save advice tone presets.
- **FR-012**: System MUST support partial advice for selected text with full-context support.
- **FR-013**: System MUST display writing progress indicators (character count/page progress).
- **FR-014**: System MUST provide structure mapping guidance tied to synopsis and draft state.
- **FR-015**: System MUST provide revision comparison between before/after edits.
- **FR-016**: System MUST export script content to downloadable PDF and Word (.docx) formats,
  preserving screenplay formatting intent in both outputs.
- **FR-017**: System MUST log operational failures for save, advice generation, and export
  with actionable diagnostic context.
- **FR-018**: System MUST define rollback actions for any release that changes document data
  format or advice model configuration behavior.

### Constitution Alignment *(mandatory)*

- **CA-001 Spec-Driven Delivery**: User stories, requirements, and success criteria are
  explicitly defined and independently testable.
- **CA-002 Script Format Fidelity**: Acceptance scenarios verify that writing and export
  preserve screenplay formatting intent.
- **CA-003 Secure AI and Data Boundaries**: Requirements enforce per-user access control,
  authenticated access, and protected provider integration boundaries.
- **CA-004 Testable Incremental Quality**: Scope is split into independently deliverable
  stories (P1, P2, P3) with clear validation paths.
- **CA-005 Observable and Reversible Change**: Requirements include operational logging and
  rollback expectations for risky configuration/data behavior changes.

### Key Entities *(include if feature involves data)*

- **ScriptDocument**: User-owned screenplay document including metadata, synopsis, body,
  layout settings, and timestamps.
- **CharacterProfile**: Character entry associated with a script document containing name,
  traits, background, relationships, and notes.
- **AdviceSession**: Request/response record for advice generation containing selected scope,
  panel model choices, preset/tone inputs, and generated feedback.
- **StructureMap**: Mapping artifact linking synopsis segments and current draft regions to
  high-level narrative structure positions.

## Clarifications

### Session 2026-02-19

- Q: MVP のデュアルアドバイスパネルで対応すべき AI プロバイダーは？ → A: 2プロバイダー対応（例：OpenAI + Anthropic）を統一レスポンス契約で接続。単一プロバイダーの2モデル構成も選択可能とする。
- Q: AI アドバイス生成が失敗またはタイムアウトした場合の対処は？ → A: 失敗パネルのみにエラー表示＋再試行ボタンを表示し、もう一方のパネルは独立して正常表示を維持する。
- Q: MVP のエクスポート形式は？ → A: PDF + Word (.docx) の2形式を対応する。
- Q: MVP のデータ永続化のストレージ戦略は？ → A: Cloud Firestore をバックエンドとして使用する。
- Q: MVP の認証方式は？ → A: Firebase Authentication（Google ログイン + メール/パスワード）を採用する。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 90% of test users complete first script setup and initial formatted writing
  within 10 minutes.
- **SC-002**: 95% of document save operations complete successfully on first attempt.
- **SC-003**: 90% of advice requests return both panel responses within 8 seconds under
  normal operating load.
- **SC-004**: 95% of successful exports open without critical content loss in standard
  document viewers.
