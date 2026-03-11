# Quickstart: Scenario Lab MVP

## Prerequisites

- Node.js 20+
- npm 10+
- Firebase project with Auth, Firestore, Functions enabled

## Setup

1. Install dependencies for frontend and functions.
2. Copy example env files and fill required values.
3. Configure Firebase project and apply Firestore security rules.
4. Start local development servers.

```bash
npm install
cp .env.example .env
cp frontend/.env.example frontend/.env
cp functions/.env.example functions/.env
```

Set `VITE_FUNCTIONS_BASE_URL` in `frontend/.env` (for example `http://localhost:8787`).
Set `DOCUMENT_STORE_BACKEND=firestore` in `functions/.env` when you want persistent storage.

Start development servers in separate terminals:

```bash
npm run dev:functions
```

```bash
npm run dev:frontend
```

Run quality checks in another shell:

```bash
npm run ci:check
```

Deploy (after `firebase login` and project selection):

```bash
cp .firebaserc.example .firebaserc
firebase use --add
npm run deploy:precheck
npm run deploy:firebase
```

## Validation Flow

1. Login and create a new script document.
2. Write in vertical editor and use format helper controls.
3. Save and reload the document to confirm persistence.
4. Add and edit character entries.
5. Generate dual advice with two different provider selections.
6. Request partial advice on selected text.
7. Review structure panel and before/after diff.
8. Export document and verify format integrity.

## Quality Gates

- `npm run lint`
- `npm run test`
- `npm run typecheck`

## Validation Record

- `2026-02-11`: Dependency installation and local quality gates are verified. End-to-end Firebase
  runtime validation remains pending local project credentials.
