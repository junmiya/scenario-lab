# Research: Scenario Lab MVP

## Decision 1: Editing Experience Model

- **Decision**: Use a structured rich-text editor model with vertical-writing presentation,
  while preserving screenplay helper semantics as explicit insert actions.
- **Rationale**: Supports reliable formatting helpers and future export consistency.
- **Alternatives considered**:
  - Plain textarea + CSS only: simple but weak structure control.
  - Fully custom editor engine: too costly for MVP.

## Decision 2: AI Provider Boundary

- **Decision**: Route advice requests through backend functions; client never calls provider
  APIs directly.
- **Rationale**: Keeps provider keys server-side and allows per-request policy checks.
- **Alternatives considered**:
  - Direct client provider calls: rejected due to key exposure and weak policy control.

## Decision 3: Document Data Shape

- **Decision**: Persist script document as user-scoped aggregate with metadata, synopsis,
  body, character profiles, and layout settings.
- **Rationale**: Simplifies ownership checks and aligns with user workflows.
- **Alternatives considered**:
  - Highly normalized sub-collections only: increased complexity for MVP.

## Decision 4: Testing Strategy

- **Decision**: Enforce layered checks: unit tests for core transforms, integration tests for
  user journeys, and contract checks for backend APIs.
- **Rationale**: Meets constitutional quality gates with manageable effort.
- **Alternatives considered**:
  - Unit tests only: insufficient coverage for format fidelity and auth boundaries.

## Decision 5: Rollback Approach

- **Decision**: Use additive schema changes and feature-flag risky behavior toggles.
- **Rationale**: Minimizes user-impact risk and keeps rollback fast.
- **Alternatives considered**:
  - In-place breaking schema changes: rejected due to recovery complexity.
