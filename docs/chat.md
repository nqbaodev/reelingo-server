# Chat feature

This document owns the current product and backend decisions for conversations,
messages, and chat media. The implementation and `src/openapi.ts` remain the
executable API contract; update this document when those decisions change.

## Scope and ownership

- `features/conversations` owns conversation creation from the first text message,
  listing, and name updates.
- `features/messages` owns message validation, persistence, listing, ordered media
  attachments, and creation of generation requests triggered by a message.
- `features/media` owns the shared image/video media type, authenticated image
  upload, local file storage, media persistence, and owned media retrieval.
- `features/ai` owns generation statuses, configuration semantics, and the legacy
  standalone Gemini text endpoint. Image/video provider execution is not wired
  yet; message creation only persists a pending generation request for a future
  worker.
- Every conversation and nested message operation is authenticated and scoped to
  the conversation owner. A missing or non-owned conversation returns the same 404
  outcome and must not reveal another user's data.

## Conversations

- `Conversation.id` is a database-generated UUID and is the public conversation
  identifier used in routes.
- The current name field is `name`, with a maximum length of 120 characters;
  null bytes are rejected before persistence.
- `createdAt` and `updatedAt` are stored as `TIMESTAMPTZ(3)` and returned as ISO
  8601 UTC strings.
- Creating a message updates the parent conversation's `updatedAt` in the same
  transaction, so active conversations move to the top of the list.
- Conversation lists order by `updatedAt DESC, id DESC`. The UUID is only a stable
  tie-breaker when timestamps match.
- The create endpoint accepts `{ "content": "..." }`. It creates the conversation
  and first `user` message atomically.
- The initial name is derived synchronously from the first 120 Unicode characters
  of the trimmed message content. Users may rename it through the update endpoint.
- Creating a conversation from a media-only first message is deferred until its
  initial naming behavior is defined.

Current endpoints:

```text
POST  /api/v1/conversations
GET   /api/v1/conversations
PATCH /api/v1/conversations/:conversationId
```

Create from the first text message:

```json
{
  "content": "Hello AI"
}
```

## Messages

- `Message.id` is a database-generated UUID.
- `role` is either `user` or `assistant`. The public send-message endpoint always
  assigns `user`; clients cannot choose or spoof the role.
- A message contains `content`, up to four uploaded `mediaIds`, or both. At least
  one must be present. Duplicate IDs are rejected.
- Every `mediaId` must reference media owned by the authenticated user. If any ID
  is missing or non-owned, the request returns 404 without revealing which record
  failed ownership validation.
- An optional `generation` object may be included only with non-empty `content`.
  Its `type` is `image` or `video`; `config` contains the aspect ratio,
  resolution, quality, output count, and prompt-enhancement choice used for this
  one request. The server stores that object as an immutable JSONB snapshot.
- Creating the user message and its pending generation row is atomic. The prompt
  is not duplicated in the generation table: `triggerMessageId` points to the
  user message containing it.
- When provider execution is added, it must create one `assistant` message, attach
  its ordered output media through `MessageMedia`, and set the generation's
  `resultMessageId`. This makes each generated media result traceable to the
  original prompt.
- Message responses expose the associated `generation` on both sides: the user
  prompt has `triggerMessageId` equal to its own ID, while the assistant result
  has the same generation ID and points back to that trigger message.
- Text content is trimmed, cannot be empty, and is limited to 8,000 characters.
  Null bytes are rejected before persistence. Emoji are ordinary Unicode content
  and require no separate field.
- Messages are immutable in the current scope and therefore have `createdAt` but
  no `updatedAt`.
- Device identity and country are not persisted. Authentication establishes the
  user; request-derived location is not part of the message contract.

Current endpoints:

```text
POST /api/v1/conversations/:conversationId/messages
GET  /api/v1/conversations/:conversationId/messages
```

Text-only request:

```json
{
  "content": "Hello 👋"
}
```

Text with uploaded media:

```json
{
  "content": "What is in this image?",
  "mediaIds": ["6aa7ba5e-5bf0-43ec-bb58-068e21cad413"]
}
```

Image-only message:

```json
{
  "mediaIds": ["6aa7ba5e-5bf0-43ec-bb58-068e21cad413"]
}
```

Upload the image first with `POST /api/v1/media`, then send the returned `id` as
an item in `mediaIds`. The message endpoint never accepts raw file bytes, storage paths, URLs,
MIME types, or file sizes.

Prompt requesting image generation:

```json
{
  "content": "Create a cinematic mountain landscape",
  "generation": {
    "type": "image",
    "config": {
      "aspectRatio": "16:9",
      "resolution": "1K",
      "quality": "medium",
      "outputCount": 2,
      "enhancePrompt": true
    }
  }
}
```

## Media

- `POST /api/v1/media` accepts exactly one `multipart/form-data` field named
  `file`. It currently accepts JPEG, PNG, or WebP images up to 2 MiB.
- The upload boundary checks the actual file signature and does not trust the
  client-provided filename or MIME type. The detected MIME type is persisted.
- `Media.id` is a database-generated UUID. The initial table stores only `id`,
  `userId`, `type`, `storageKey`, `mimeType`, and `createdAt`.
- `sizeBytes`, original filename, width, height, duration, status, and public URL
  are intentionally not stored. Image size is enforced directly from the uploaded
  bytes before persistence.
- Files are stored under `MEDIA_STORAGE_ROOT`. A Docker image uses
  `/app/storage/media`; mount a Docker volume there so files survive container
  replacement.
- The upload response contains a stable authenticated API `path` and an absolute
  `url` derived from `PUBLIC_BASE_URL`. Neither value is persisted.
- `GET /api/v1/media/:mediaId` returns the image bytes only to the owner.
- `POST /api/v1/media/delete` accepts up to 50 IDs as
  `{ "mediaIds": ["..."] }` and deletes owned media that is not attached to any
  message. The response contains only `{ "deletedIds": [...] }`; missing,
  non-owned, duplicate, and already attached media IDs are skipped.
- If the file write succeeds but the database insert fails, the upload use case
  attempts to delete the stored file before propagating the failure.
- A future S3/R2 adapter can replace local storage through the media storage
  contract without changing the upload use case or API response.
- Upload and message creation are separate requests. An upload remains unattached
  until its `id` is used in a message's `mediaIds`.

## Persistence invariants

PostgreSQL constraints enforce the valid stored shapes:

- text-only: non-empty `content` and no media links;
- media with optional text: one to four ordered `MessageMedia` rows referencing
  `Media`;
- generation: exactly one generation per trigger message and at most one result
  message per generation;
- deleting a conversation cascades to its messages.
- deleting media referenced by a message is restricted.

The database can validate non-empty text but cannot express “content or at least
one row in another table” as a row-level check. The HTTP/application boundary
therefore enforces that every message has content or at least one media item.

Creating a conversation uses one atomic nested write for the conversation and its
first user message. Sending a later message uses one transaction to verify both
conversation and media ownership, update the parent conversation timestamp, and
insert the message, its ordered media links, and optional pending generation. Keep
both atomic behaviors when either write flow changes.

## Cursor pagination

- All list responses use `{ "items": [...], "nextCursor": string | null }`.
- Conversations use an opaque cursor containing `updatedAt` and `id`.
- Messages order by `createdAt DESC, id DESC` and use those fields in the opaque
  cursor. The next page therefore loads older messages.
- Queries fetch `limit + 1`; the extra row determines whether `nextCursor` exists
  and is not returned as an item.
- List responses do not return `totalItems` or `count`. Infinite scrolling uses
  `items.length` and `nextCursor`.

## Deferred work

The following behavior is intentionally not implemented yet:

- replacing local media storage with an object-storage provider;
- supporting video upload and video-specific metadata such as duration and a
  thumbnail;
- calling image/video providers and persisting the assistant result message;
- building AI context from previous messages;
- replacing the initial name with an AI-generated summary;
- creating a conversation from a media-only first message;
- message edits and message deletion.

## Change checklist

When changing this feature, keep the affected surfaces aligned:

- Prisma schema and a new migration if the existing migration may have been
  applied anywhere;
- domain discriminated unions and infrastructure mapper;
- request validator, presenter, routes, and localized response messages;
- repository ownership, transaction, and cursor conditions;
- `src/openapi.ts`, this document, and the README endpoint summary;
- companion-app request adapters and runtime decoders when that repository is in
  scope.

Do not create or modify automated tests unless the user explicitly requests them.
Still run the non-test checks appropriate to the change and report database or HTTP
verification gaps honestly.
