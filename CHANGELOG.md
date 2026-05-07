# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

<!-- speckit:start:unreleased -->
### Added

- Initialized monorepo workspaces for `frontend` and `functions`
- Added TypeScript, ESLint, Prettier, Vitest tooling and CI check scripts
- Added foundational auth/session, document repository contracts, and security rules
- Added dual-advice provider boundary, structured logging, rate limiting, and redaction
- Added MVP UI components for editor, advice, structure, and diff/export flows
- Added contract, integration, and unit test coverage for MVP scope
- Added spec kit artifacts for `001-build-scenario-writing`
- Added frontend and functions local runtime wiring (`vite`, functions local HTTP server)
- Added functions document CRUD API implementation and frontend document create/save/load workflow
- Added functions advice model listing endpoint (`GET /api/advice/models`)
- Added frontend dynamic advice model loading from API with fallback behavior
- Added switchable functions document store backend (`memory` / `firestore`)
- Added GitHub Actions CI workflow (`.github/workflows/ci.yml`)
- Added Firebase deploy configuration with functions build/output entrypoint
- Added `deploy:precheck` script to validate Firebase auth/project setup before deploy
- Added Firebase client SDK integration with auth context and Firestore service layer
- Added routing, login page, catalog page, and shared layout
- Added Firestore-integrated editor with synopsis metrics
- Added Gemini direct advice and synopsis auto-commentary
- Added AI provider selection, revision markers, and vertical synopsis panel
- Added 3-expert AI commentary panel
- Added collapsible AI analysis panels and AI discussion panel
- Added vertical character editor, structure guide, and export preview
- Added `linesPerPage` setting to match screenplay submission format
- Added groups, contests, template-based export, and format presets
- Added admin dashboard with tabs, stats cards, and group management
- Added V2 vertical editor
- Added Word (.docx) import via mammoth
- Added GitHub Actions deploy-hosting workflow for Firebase Hosting
- Added Claude Code Review and Claude PR Assistant GitHub workflows
- Added speckit agent skills (clarify, plan, tasks, implement, analyze, etc.)
- Added Q1–Q5 spec clarifications covering AI provider strategy, AI failure handling,
  export format (PDF + docx), Firestore storage strategy, and Firebase Auth strategy

### Changed

- Renamed product to **Scenario Lab** (from Scenario Writing Lab); export reworked to
  plain-text screenplay format with separate title page and File System Access "Save As"
- Renamed packages from `scenario-writing-lab` to `scenario-lab`
  (`@scenario-lab/frontend`, `@scenario-lab/functions`)
- Introduced CSS design system and applied design rules across components
- Reorganized editor UI sections and added synopsis advice alongside structure guidance
- Reverted TipTap rich text editor to plain textarea for stability with vertical writing
- Upgraded `firebase-functions` SDK to v7 and moved functions runtime to Node 22
- CI: added auto-format step

### Fixed

- Prevent text disappearing during English (IME) input in vertical editor
- Fall back to `signInWithRedirect` when popup-based sign-in is blocked, and add a
  redirect fallback for popup-closed login on the V2 editor
- Enforce `ownerId` check on create rules for scripts and projects
- Add SPA rewrites to Firebase Hosting config so deep links resolve client-side
- Preserve fonts and add field mapping fallback for template-based export
- Avoid reserved `FIREBASE_` environment variable name in functions runtime
- Harden Firebase deploy precheck against update-check noise
<!-- speckit:end:unreleased -->
