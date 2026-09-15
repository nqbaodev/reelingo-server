# Chat feature

This document owns the current product and backend decisions for conversations,
messages, and chat media. The implementation and `src/openapi.ts` remain the
executable API contract; update this document when those decisions change.

## Scope and ownership

- `features/conversations` owns conversation creation, listing, and name updates.
- `features/messages` owns message validation, persistence, listing, and media
  metadata attached to a message.
- `features/ai` currently exposes standalone Gemini text generation. It is not yet
  orchestrated with conversation messages.
- Every conversation and nested message operation is authenticated and scoped to
  the conversation owner. A missing or non-owned conversation returns the same 404
  outcome and must not reveal another user's data.

## Conversations

- `Conversation.id` is a database-generated UUID and is the public conversation
  identifier used in routes.
- The current name field is `name`, with a maximum length of 120 characters.
- `createdAt` and `updatedAt` are stored as `TIMESTAMPTZ(3)` and returned as ISO
  8601 UTC strings.
- Creating a message updates the parent conversation's `updatedAt` in the same
  transaction, so active conversations move to the top of the list.
- Conversation lists order by `updatedAt DESC, id DESC`. The UUID is only a stable
  tie-breaker when timestamps match.
- The current create endpoint accepts `{ "name": "..." }`. Automatically creating
  a conversation from its first message and generating its name are deferred; do
  not describe that flow as implemented.

Current endpoints:

```text
POST  /api/v1/conversations
GET   /api/v1/conversations
PATCH /api/v1/conversations/:conversationId
```

## Messages

- `Message.id` is a database-generated UUID.
- `role` is either `user` or `assistant`. The public send-message endpoint always
  assigns `user`; clients cannot choose or spoof the role.
- A message contains `content`, one `media` object, or both. At least one must be
  present, and multiple media items are not supported.
- Text content is trimmed, cannot be empty, and is limited to 8,000 characters.
  Emoji are ordinary Unicode content and require no separate field.
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

Sending a message uses one transaction to verify ownership, update the parent
conversation timestamp, and insert the message. Keep that atomic behavior when the
write flow changes.

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

- receiving binary uploads or integrating a storage provider;
- verifying actual remote media bytes instead of declared request metadata;
- generating and persisting an assistant response;
- building AI context from previous messages;
- creating a conversation automatically from the first message;
- generating a conversation name from the first message or an AI summary;
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
