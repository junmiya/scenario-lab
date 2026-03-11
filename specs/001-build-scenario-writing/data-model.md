# Data Model: Scenario Lab MVP

## Entity: ScriptDocument

- **Purpose**: Primary user-owned screenplay artifact.
- **Fields**:
  - `id` (string)
  - `ownerId` (string)
  - `title` (string)
  - `authorName` (string)
  - `synopsis` (string)
  - `content` (rich text / structured blocks)
  - `settings` (object: lineLength, pageCount)
  - `characterIds` (string[])
  - `createdAt` (timestamp)
  - `updatedAt` (timestamp)
- **Constraints**:
  - `ownerId` MUST match authenticated user for any read/write.
  - `title` and `authorName` are required before export.

## Entity: CharacterProfile

- **Purpose**: Character context used by writing and AI advice.
- **Fields**:
  - `id` (string)
  - `documentId` (string)
  - `name` (string)
  - `age` (string)
  - `traits` (string)
  - `background` (string)
  - `relationships` (string)
  - `notes` (string)
  - `updatedAt` (timestamp)
- **Constraints**:
  - Must belong to one `ScriptDocument` owned by same user.

## Entity: AdviceSession

- **Purpose**: Captures advisory interactions for traceability/debugging.
- **Fields**:
  - `id` (string)
  - `documentId` (string)
  - `requestScope` (enum: full, partial)
  - `selectedText` (string, optional)
  - `panelAProvider` (string)
  - `panelBProvider` (string)
  - `presetA` (string)
  - `presetB` (string)
  - `responseA` (text)
  - `responseB` (text)
  - `status` (enum: success, failed, partial)
  - `createdAt` (timestamp)
- **Constraints**:
  - Advice content must only be accessible to owning user.

## Entity: StructureMap

- **Purpose**: Links synopsis and draft to narrative structure guidance.
- **Fields**:
  - `id` (string)
  - `documentId` (string)
  - `segments` (array)
  - `currentPosition` (object)
  - `updatedAt` (timestamp)
- **Constraints**:
  - Generated from document context; stale maps must be invalidated after major edits.

## Relationships

- One `ScriptDocument` has many `CharacterProfile`.
- One `ScriptDocument` has many `AdviceSession`.
- One `ScriptDocument` has one active `StructureMap`.
