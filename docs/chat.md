# Chat feature

This document owns the current product and backend decisions for conversations,
messages, and chat media. The implementation and `src/openapi.ts` remain the
executable API contract; update this document when those decisions change.

## Scope and ownership

- `features/conversations` owns conversation creation from the first text message,
  listing, and name updates.
- `features/messages` owns message validation, persistence, listing, and media
  metadata attached to a message.
- `features/media` owns authenticated image upload, local file storage, media
  persistence, and owned media retrieval. Uploads are not attached to messages yet.
- `features/ai` currently exposes standalone Gemini text generation. It is not yet
  orchestrated with conversation messages.
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
- Creating a conversation from a media-only first message is deferred until the
  separate media-upload API exists.

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
- A message contains `content`, one `media` object, or both. At least one must be
  present, and multiple media items are not supported.
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

Text with one image:

```json
{
  "content": "What is in this image?",
  "media": {
    "type": "image",
    "url": "https://cdn.example.com/image.jpg",
    "mimeType": "image/jpeg",
    "sizeBytes": 2097152
  }
}
```

Text with one video:

```json
{
  "content": "Summarize this video",
  "media": {
    "type": "video",
    "url": "https://cdn.example.com/video.mp4",
    "mimeType": "video/mp4",
    "sizeBytes": 10485760,
    "duration": 45.5,
    "thumbnailUrl": "https://cdn.example.com/video-thumbnail.jpg"
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
- `sizeBytes`, original filename, width, height, duration, status, public URL,
  and message/conversation foreign keys are intentionally not stored.
- Files are stored under `MEDIA_STORAGE_ROOT`. A Docker image uses
  `/app/storage/media`; mount a Docker volume there so files survive container
  replacement.
- The upload response contains a stable authenticated API `path` and an absolute
  `url` derived from `PUBLIC_BASE_URL`. Neither value is persisted.
- `GET /api/v1/media/:mediaId` returns the image bytes only to the owner.
- If the file write succeeds but the database insert fails, the upload use case
  attempts to delete the stored file before propagating the failure.
- A future S3/R2 adapter can replace local storage through the media storage
  contract without changing the upload use case or API response.
- Uploading media does not currently attach it to a message. That integration
  will accept `mediaId` after ownership and single-attachment behavior are defined.

The existing message media payload remains separate during this phase:

- `MediaType` describes only attached media and is `image | video`. There is no
  top-level `MessageType`; a message may contain text and media together.
- `url` and a matching `mimeType` are required for media and are persisted.
- `sizeBytes` is required only at the HTTP validation boundary. It must be a
  positive safe integer and is removed before the domain/repository boundary. It
  is not stored and is not returned in responses.
- Image requests are limited to 2 MiB (2,097,152 bytes). Video requests currently
  validate a positive declared size but do not have a product size limit.
- `width` and `height` are not accepted or stored.
- Video requires positive `duration`, measured in seconds. Fractional values such
  as `12.5` are valid and PostgreSQL stores the value as double precision.
- `thumbnailUrl` is optional and supported only for video. A missing thumbnail is
  represented as `null` in the response.
- The message endpoint receives an already-uploaded URL. Its `sizeBytes` and
  `mimeType` checks validate client-declared metadata only. A future upload/storage
  boundary must enforce actual byte limits, inspect the uploaded content type, and
  issue or verify trusted object references.

## Persistence invariants

PostgreSQL constraints enforce the valid stored shapes:

- text-only: non-empty `content`, with every media column null;
- image with optional text: image URL and image MIME type, with video-only fields
  null;
- video with optional text: video URL, video MIME type, and positive duration;
- deleting a conversation cascades to its messages.

Creating a conversation uses one atomic nested write for the conversation and its
first user message. Sending a later message uses one transaction to verify
ownership, update the parent conversation timestamp, and insert the message. Keep
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

- attaching uploaded media to messages through `mediaId`;
- replacing local media storage with an object-storage provider;
- verifying actual remote media bytes instead of declared request metadata;
- generating and persisting an assistant response;
- building AI context from previous messages;
- replacing the initial name with an AI-generated summary;
- creating a conversation from a media-only first message;
- multi-media messages, message edits, and message deletion.

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
