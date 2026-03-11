# Implementation Plan: Scenario Lab MVP

**Branch**: `001-build-scenario-writing` | **Date**: 2026-02-10 | **Spec**: `specs/001-build-scenario-writing/spec.md`
**Input**: Feature specification from `/specs/001-build-scenario-writing/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See
`.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Deliver an MVP web application for screenplay drafting with vertical writing support,
script formatting helpers, secure user document storage, dual AI advice, structure mapping,
and export. Implementation will follow incremental delivery by user story (P1 -> P2 -> P3),
with security, observability, and rollback captured as first-class constraints.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20.x  
**Primary Dependencies**: React, Vite, Zustand, TipTap, Firebase SDK, Firebase Functions, docx  
**Storage**: Firestore (user-scoped documents + settings)  
**Testing**: Vitest + React Testing Library, Playwright (critical integration flows), ESLint, `tsc --noEmit`  
**Target Platform**: Web browsers (desktop/tablet), Firebase-hosted backend services
**Project Type**: web  
**Performance Goals**: Advice response p95 <= 8s, save response p95 <= 1.5s, initial load <= 3s on broadband  
**Constraints**: Vertical format fidelity, per-user data isolation, provider keys server-side only, rollback documented for risky changes  
**Scale/Scope**: MVP for pilot users (hundreds of active users, thousands of documents)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] `Spec-Driven Delivery`: spec contains independently testable user stories,
      testable requirements, and measurable success criteria.
- [x] `Script Format Fidelity`: plan identifies formatting-impact risk and defines
      acceptance validation for authoring/preview/export behavior when in scope.
- [x] `Secure AI and Data Boundaries`: plan documents secrets handling,
      authentication boundaries, and per-user access controls for data/AI flows.
- [x] `Testable Incremental Quality`: each user story has an independent validation
      path and required automated checks.
- [x] `Observable and Reversible Change`: plan defines structured logging touchpoints
      and rollback approach for risky behavior/configuration/data changes.

Formatting fidelity validation:
- Validate editor writing mode, helper insertion semantics, and export formatting via
  integration tests and quickstart acceptance scenarios.

Security boundary validation:
- Enforce user access through Firestore rules and authenticated document ownership checks.
- Route AI provider calls through Cloud Functions; do not expose provider secrets client-side.

Rollback strategy:
- Keep schema/behavior changes additive for MVP and version any serialized document payload.
- Document rollback steps in release notes before merge when format/storage behavior changes.

## Project Structure

### Documentation (this feature)

```text
specs/001-build-scenario-writing/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── advice-api.md
│   └── document-api.md
└── tasks.md
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── editor/
│   │   ├── advice/
│   │   ├── structure/
│   │   └── common/
│   ├── services/
│   ├── stores/
│   ├── types/
│   └── utils/
└── tests/
    ├── integration/
    └── unit/

functions/
├── src/
│   ├── advice/
│   └── common/
└── tests/
    └── integration/

infra/
├── firestore.rules
└── firebase.json
```

**Structure Decision**: Web application split into `frontend/` and `functions/` to enforce
AI provider secret boundaries and keep UI/runtime concerns isolated.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | Constitution gates pass without exception |
