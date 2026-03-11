<!--
Sync Impact Report
- Version change: N/A (template) -> 1.0.0
- Modified principles:
  - Principle slot 1 -> I. Spec-Driven Delivery
  - Principle slot 2 -> II. Script Format Fidelity
  - Principle slot 3 -> III. Secure AI and Data Boundaries
  - Principle slot 4 -> IV. Testable Incremental Quality
  - Principle slot 5 -> V. Observable and Reversible Change
- Added sections:
  - Engineering Constraints
  - Development Workflow and Quality Gates
- Removed sections:
  - None
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md
  - ✅ .specify/templates/spec-template.md
  - ✅ .specify/templates/tasks-template.md
  - ✅ .specify/templates/commands/constitution.md
  - ✅ .specify/templates/commands/specify.md
  - ✅ .specify/templates/commands/plan.md
  - ✅ .specify/templates/commands/tasks.md
  - ✅ .specify/templates/commands/implement.md
  - ✅ .codex/prompts/speckit.constitution.md
  - ✅ .claude/commands/constitution.md
- Follow-up TODOs:
  - None
-->
# Scenario Lab Constitution

## Core Principles

### I. Spec-Driven Delivery
All implementation work MUST begin from an approved feature specification that defines
independently testable user stories, testable functional requirements, and measurable
success criteria. Ambiguities that materially affect scope, privacy, or user experience
MUST be resolved before planning begins. Rationale: clear specifications prevent scope
creep and keep implementation aligned with user value.

### II. Script Format Fidelity
Changes that affect authoring, preview, or export behavior MUST preserve screenplay
format fidelity, including vertical writing behavior and format helper correctness when
those flows are in scope. Any formatting-impacting change MUST include explicit
acceptance scenarios covering expected output behavior. Rationale: format integrity is a
core product promise for screenplay users.

### III. Secure AI and Data Boundaries
Secrets MUST be managed outside client code, and third-party AI providers MUST be called
through controlled server-side boundaries when production credentials are involved.
User-generated documents MUST be access-scoped to authenticated users with explicit data
access rules. Rationale: the product handles private creative work and must enforce data
isolation and key safety.

### IV. Testable Incremental Quality
Each user story MUST be implementable and verifiable independently. Every delivered
change MUST run automated quality gates appropriate to the touched layers
(unit/integration/contract tests as applicable, plus lint and type checks). Defects found
in accepted flows MUST be captured by a failing regression test before fix validation.
Rationale: incremental, testable slices reduce regression risk and improve delivery speed.

### V. Observable and Reversible Change
Operationally meaningful failures MUST emit structured logs with enough context to debug
without reproducing from scratch. Any risky configuration, schema, or behavior change
MUST document rollback steps before merge. Breaking behavior changes MUST be called out in
specification, plan, and release notes. Rationale: observability and rollback readiness
reduce outage duration and deployment risk.

## Engineering Constraints

- Frontend implementations MUST remain compatible with the project's web stack
  (Vite + React + TypeScript) unless an approved plan explicitly migrates it.
- Authentication and data persistence flows MUST enforce per-user data isolation.
- Features targeting editor, advice, or export flows MUST define how fidelity is
  validated in acceptance tests.
- Secret values and provider credentials MUST be injected through environment or secure
  server-side configuration, never hardcoded in client-delivered artifacts.

## Development Workflow and Quality Gates

- `Specification gate`: `/speckit.specify` output MUST be complete for scenarios,
  requirements, and success criteria before planning.
- `Planning gate`: `/speckit.plan` MUST pass Constitution Check and record any justified
  exception in Complexity Tracking.
- `Tasking gate`: `/speckit.tasks` MUST include tasks for testing, security/privacy
  boundaries, and observability/rollback where the feature scope requires them.
- `Implementation gate`: pull requests MUST show passing automated checks and evidence that
  impacted acceptance scenarios were validated.

## Governance

This constitution overrides conflicting local conventions for specification, planning,
and implementation quality gates.

Amendments MUST include: (1) proposed text changes, (2) rationale, (3) impacted template
or workflow updates, and (4) version bump justification according to semantic versioning.

Versioning policy for this constitution:
- MAJOR: backward-incompatible governance or principle removals/redefinitions.
- MINOR: new principles/sections or materially expanded mandatory guidance.
- PATCH: clarifications, wording improvements, typo fixes, and non-semantic refinements.

Compliance review expectations:
- Every implementation plan MUST complete a Constitution Check before research/design and
  after design updates.
- Every pull request review MUST verify relevant constitutional principles are satisfied or
  include a documented exception approved by maintainers.
- Constitution-template and command-template consistency MUST be reviewed whenever this
  file is amended.

**Version**: 1.0.0 | **Ratified**: 2026-02-10 | **Last Amended**: 2026-02-10
