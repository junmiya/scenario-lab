# Tasks: Scenario Lab MVP

**Input**: Design documents from `/specs/001-build-scenario-writing/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Include test tasks whenever behavior changes are in scope. Tests may be omitted
only for explicitly non-behavioral work.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and baseline tooling

- [x] T001 Create app structure `frontend/`, `functions/`, `infra/` and baseline package configs
- [x] T002 [P] Configure TypeScript, lint, and format scripts for frontend/functions workspaces
- [x] T003 [P] Configure test runners (unit + integration) and CI command aliases
- [x] T004 Define environment variable schema and local example env files

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure required before any user story

**CRITICAL**: No user story work can begin until this phase completes

- [x] T005 Implement authentication/session bootstrap in `frontend/src/services/authService.ts`
- [x] T006 [P] Implement Firestore ownership rules in `infra/firestore.rules`
- [x] T007 Create document and character repository contracts in `frontend/src/services/documentRepository.ts`
- [x] T008 [P] Add structured logging and correlation-id utility in `functions/src/common/logging.ts`
- [x] T009 Build server-side advice provider gateway in `functions/src/advice/providerGateway.ts`
- [x] T010 Define rollback runbook for schema/format risk in `specs/001-build-scenario-writing/release-rollback.md`

**Checkpoint**: Foundation ready; user story work can start

---

## Phase 3: User Story 1 - Write in Professional Vertical Format (Priority: P1) MVP

**Goal**: Deliver authenticated vertical screenplay editing with format helpers and save/load

**Independent Test**: User can create document, write with helpers, save, reload

### Tests for User Story 1 (REQUIRED)

- [x] T011 [P] [US1] Contract tests for document endpoints in `functions/tests/contract/document-api.contract.test.ts`
- [x] T012 [P] [US1] Integration test for vertical editing flow in `frontend/tests/integration/us1-vertical-editor.spec.ts`

### Implementation for User Story 1

- [x] T013 [P] [US1] Implement editor store state and types in `frontend/src/stores/editorStore.ts`
- [x] T014 [P] [US1] Build vertical editor UI in `frontend/src/components/editor/VerticalEditor.tsx`
- [x] T015 [P] [US1] Build screenplay toolbar helpers in `frontend/src/components/toolbar/ScriptToolbar.tsx`
- [x] T016 [US1] Implement line/page settings control in `frontend/src/components/editor/Settings.tsx`
- [x] T017 [US1] Implement document CRUD service in `frontend/src/services/documentService.ts`
- [x] T018 [US1] Add route/page composition for editor workflow in `frontend/src/pages/EditorPage.tsx`
- [x] T019 [US1] Add save/load operational logging hooks in `functions/src/common/logging.ts`

**Checkpoint**: US1 is fully functional and independently testable

---

## Phase 4: User Story 2 - Receive Contextual Dual AI Advice (Priority: P2)

**Goal**: Deliver dual advice panels with model selection, presets, and partial advice

**Independent Test**: User receives two advice streams and can request partial advice

### Tests for User Story 2 (REQUIRED)

- [x] T020 [P] [US2] Contract tests for advice API in `functions/tests/contract/advice-api.contract.test.ts`
- [x] T021 [P] [US2] Integration test for dual-panel advice flow in `frontend/tests/integration/us2-dual-advice.spec.ts`

### Implementation for User Story 2

- [x] T022 [P] [US2] Build character table UI and state in `frontend/src/components/editor/CharacterTable.tsx`
- [x] T023 [P] [US2] Implement advice panel UI in `frontend/src/components/advice/AdvicePanel.tsx`
- [x] T024 [US2] Implement advice state/preset management in `frontend/src/stores/adviceStore.ts`
- [x] T025 [US2] Implement partial advice interaction in `frontend/src/components/advice/PartialAdvice.tsx`
- [x] T026 [US2] Implement advice proxy endpoint in `functions/src/advice/generateAdvice.ts`
- [x] T027 [US2] Enforce provider key boundary and request validation in `functions/src/advice/providerGateway.ts`
- [x] T028 [US2] Add error handling and telemetry for provider timeout/failure paths

**Checkpoint**: US1 and US2 both work independently

---

## Phase 5: User Story 3 - Manage Structure and Export Deliverable (Priority: P3)

**Goal**: Deliver structure guidance, revision compare, and downloadable export

**Independent Test**: User reviews structure, compares revisions, and exports successfully

### Tests for User Story 3 (REQUIRED)

- [x] T029 [P] [US3] Contract tests for export endpoint in `functions/tests/contract/export-api.contract.test.ts`
- [x] T030 [P] [US3] Integration test for structure+export flow in `frontend/tests/integration/us3-export.spec.ts`

### Implementation for User Story 3

- [x] T031 [P] [US3] Implement structure panel in `frontend/src/components/structure/StructurePanel.tsx`
- [x] T032 [P] [US3] Implement section selector in `frontend/src/components/structure/SectionSelector.tsx`
- [x] T033 [US3] Implement before/after diff view in `frontend/src/components/advice/DiffView.tsx`
- [x] T034 [US3] Implement export service in `frontend/src/services/exportService.ts`
- [x] T035 [US3] Implement export function endpoint in `functions/src/advice/exportDocument.ts`
- [x] T036 [US3] Enforce export metadata validation and failure logging

**Checkpoint**: All user stories independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories

- [x] T037 [P] Documentation updates in `specs/001-build-scenario-writing/quickstart.md`
- [x] T038 Performance tuning for save/advice/export paths
- [x] T039 [P] Additional unit tests in `frontend/tests/unit/` and `functions/tests/unit/`
- [x] T040 Security hardening (rate limits, validation, error redaction)
- [x] T041 Execute quickstart validation and record outcomes

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): no dependencies
- Foundational (Phase 2): depends on Phase 1 and blocks all user stories
- User Stories (Phases 3-5): depend on Phase 2
- Polish (Phase 6): depends on desired user stories

### User Story Dependencies

- US1 (P1): can start after Foundational; no dependency on other stories
- US2 (P2): can start after Foundational; may integrate with US1 data model
- US3 (P3): can start after Foundational; may integrate with US1/US2 outputs

### Within Each User Story

- Tests MUST be written and fail before implementation when behavior changes are in scope
- Data/store contracts before UI wiring
- Services before endpoint integration
- Core implementation before polish refinements

### Parallel Opportunities

- Phase 1 tasks marked [P] run in parallel
- Phase 2 tasks marked [P] run in parallel
- Per-story tests marked [P] run in parallel
- Component tasks touching different files run in parallel

---

## Parallel Example: User Story 1

```bash
Task: "T011 [US1] Contract tests for document endpoints"
Task: "T012 [US1] Integration test for vertical editing"
Task: "T013 [US1] Implement editor store state and types"
Task: "T014 [US1] Build vertical editor UI"
Task: "T015 [US1] Build screenplay toolbar helpers"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1
4. Validate US1 independently
5. Demo MVP baseline

### Incremental Delivery

1. Setup + Foundational
2. Add US1 and validate
3. Add US2 and validate
4. Add US3 and validate
5. Run polish and release checks

### Parallel Team Strategy

1. Team completes Phases 1-2 together
2. Then split by story (US1, US2, US3)
3. Rejoin for Phase 6 hardening and validation

---

## Notes

- [P] tasks indicate different files and no hard dependency
- Keep each task scoped to one file or one cohesive change
- Validate each checkpoint before advancing
