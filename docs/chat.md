# Chat feature

This document owns the current product and backend decisions for conversations,
messages, and chat media. The implementation and `src/openapi.ts` remain the
executable API contract; update this document when those decisions change.

## Scope and ownership

- `features/conversations` owns conversation creation from the first text message,
  listing, and name updates.
- `features/messages` owns message validation, persistence, listing, ordered media
  attachments, durable chat runs, and persistence of the AI decision.
- `features/media` owns the shared image/video media type, authenticated image
  upload, local file storage, media persistence, and owned media retrieval.
- `features/ai` owns chat routing, generation statuses, configuration semantics,
  and the Gemini adapter. Image/video provider execution is not wired yet; a media
  tool call only persists a pending generation request for a future worker.
- Every conversation and nested message operation is authenticated and scoped to
  the conversation owner. A missing or non-owned conversation returns the same 404
  outcome and must not reveal another user's data.

## Conversations

- `Conversation.id` is a database-generated UUID and is the public conversation
  identifier used in routes.
- The current name field is `name`, with a maximum length of 120 characters;
  null bytes are rejected before persistence.
- `createdAt` and `updatedAt` are stored as `TIMESTAMPTZ(3)` and returned as ISO
  8601 UTC strings. `updatedAt` changes only when the conversation record itself
  changes; creating a nested message does not update it.
- Conversation list items include `lastMessageAt`, derived from the newest
  message's `createdAt` without storing a duplicate timestamp on the conversation.
  A conversation without a message falls back to its own `createdAt`.
- Conversation lists order by `lastMessageAt DESC, id DESC`. The opaque cursor
  carries both values so the UUID remains a stable tie-breaker when timestamps
  match.
- The create endpoint accepts `{ "content": "..." }`. It creates the conversation,
  first `user` message, and its pending chat run atomically. Because the response
  currently returns only the conversation, the client loads messages to obtain the
  first message ID before calling its response endpoint.
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
- The client does not send a chat/image/video mode. Sending a message stores the
  user message and a pending `ChatRun` atomically, then returns without waiting for
  Gemini. The client displays a typing state and calls the response endpoint with
  the persisted message ID. Gemini receives only that prompt and may return normal
  text, call `generate_image`, or call `generate_video`. Tool selection uses Gemini
  function calling in automatic mode, not server-side keyword matching. Previous
  messages are not included in AI context yet.
- Optional `aiContext` carries the user's current session preference and image or
  video settings. `intentHint` is only a hint; it cannot trigger generation on its
  own. If the prompt asks for media but does not identify image or video, the AI
  should ask a clarifying question as normal assistant text.
- Image settings contain a supported aspect ratio, `512`/`1K`/`2K`/`4K`
  resolution, and one to four outputs. Video settings contain `16:9` or `9:16`,
  `720p`/`1080p`/`4k`, exactly one output, and optional prompt enhancement. They
  are not persisted for ordinary chat. When the AI
  chooses a media tool, the matching image/video settings are copied into the new
  generation row as an immutable JSONB snapshot. Missing settings use server
  defaults.
- The prompt is not duplicated in the generation table: `triggerMessageId`
  points to the user message containing it.
- A normal AI response is persisted as a new `assistant` message. A media tool
  call creates a pending generation associated with the triggering user message.
  Queue confirmation is an ephemeral `generation.queued` event and is not stored
  as a message.
- A chat run is `pending`, `processing`, `completed`, or `failed`. Both the trigger
  user message and the resulting assistant message expose the same chat-run ID and
  status. A media-routing run may be completed with a null `resultMessageId` while
  its generation is pending; the worker assigns the final assistant message later.
- A media generation uses the same four-state lifecycle. Its internal `updatedAt`
  is a worker claim version and lease timestamp, allowing stale `processing` jobs
  to be reclaimed after interruption. It is not a completion timestamp and is not
  part of the public message contract.
- The generation repository atomically claims the oldest pending row, or the
  oldest stale processing row when no pending row is available, using PostgreSQL
  row locking with `SKIP LOCKED`. Claim renewal and failure updates require the
  current `updatedAt` version, so a worker that lost its lease cannot change the
  newer claim.
- The response endpoint is idempotent after completion and returns the existing
  user/assistant turn. A concurrent request while a run is processing returns 409.
  Failed runs may be retried. A processing claim older than the Gemini timeout plus
  a safety buffer may be reclaimed after a server interruption.
- The generation worker creates media and requests a concise completion text in
  parallel. Completion text is best-effort and may be null, so a secondary text
  request cannot discard successfully generated media. One transaction creates a
  single `assistant` message and its ordered `MessageMedia` rows, completes the
  generation, and assigns the message to both generation and chat run
  `resultMessageId` fields.
- Image generation sends at most two provider requests concurrently. A multi-image
  request succeeds when at least one image is valid, preserving successful outputs
  instead of discarding the whole batch when a sibling request fails.
- Video generation polls Veo with a bounded increasing delay and jitter. The initial
  interval remains short for fast jobs, while longer jobs reduce unnecessary provider
  requests; cancellation is checked before each follow-up poll.
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
POST /api/v1/conversations/:conversationId/messages/:messageId/response
GET  /api/v1/conversations/:conversationId/messages/:messageId/response
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
  "aiContext": {
    "intentHint": "image",
    "generationSettings": {
      "image": {
        "aspectRatio": "16:9",
        "resolution": "1K",
        "outputCount": 2,
        "enhancePrompt": false
      }
    }
  }
}
```

`aiContext` is optional. The same text without `aiContext` may still trigger image
generation because the request itself is explicit. Conversely, sending an image
hint with ordinary text such as “hello” must still produce an ordinary chat
response.

The send endpoint returns immediately with the persisted user message:

```json
{
  "role": "user",
  "chatRun": {
    "id": "f8a81760-c5fe-4aad-b040-15dbf72ffde8",
    "status": "pending",
    "resultMessageId": null
  }
}
```

The client then calls the response endpoint and shows the typing indicator while
that request is pending. Without an explicit streaming accept header, its
successful JSON response contains both sides of a normal text turn:

```json
{
  "userMessage": { "role": "user" },
  "assistantMessage": { "role": "assistant" }
}
```

For media generation, the routing response has `assistantMessage: null`; the
`generation.queued` event and `userMessage.generation` identify the durable job.

For realtime output, the client sends the same command with
`Accept: text/event-stream` and its normal Bearer authorization header. The
server responds with versioned SSE data using these ordered events:

- `chat.started` after the pending run is claimed;
- zero or more `assistant.delta` events for ordinary text output;
- `generation.queued` after a media-generation request is committed;
- `chat.completed` after the text reply or generation request is committed;
- `chat.failed` when processing fails after streaming has started.

Heartbeat frames are SSE comments and carry no business state. Text deltas are
temporary display data; `chat.completed` contains the canonical persisted routing
state and may have a null assistant message for generation.
The server does not persist or replay individual SSE events, so clients must not
treat SSE delivery as durable state. Browser clients use streaming `fetch` rather
than native `EventSource` because this protected endpoint requires an
`Authorization` header.

Polling uses `GET` on the same response path. It is a read-only recovery endpoint
and returns only the durable run state plus the result when available:

```json
{
  "chatRun": {
    "id": "f8a81760-c5fe-4aad-b040-15dbf72ffde8",
    "status": "processing",
    "resultMessageId": null
  },
  "generation": null,
  "assistantMessage": null
}
```

For ordinary chat, a completed run has its persisted `assistantMessage`. For media,
the response also exposes `generation`; the run can already be completed while
`assistantMessage` remains null until that generation is completed. Polling never
claims, starts, or retries work. Clients apply backoff with jitter and stop when
the generation is `completed` or `failed`, or when the normal chat result is
available.

The client keeps one authenticated `GET /api/v1/messages/events` streaming-fetch
connection for background results. It begins with `stream.connected`, then emits
`generation.completed` with the canonical assistant message or
`generation.failed` with identifying IDs. The in-memory event transport is
best-effort, process-local, and not replayed. After disconnect, reload, process
restart, or load-balancer reassignment, the client recovers from polling and the
persisted message list rather than assuming an event was delivered.

Reloading the page does not lose the user prompt or processing state: both are in
PostgreSQL. The client reloads messages, calls `POST` for a pending or failed chat
run, and polls `GET` while chat routing or media generation is still processing.
Only temporary local typing and queue animations are lost on reload.

## Media

- `POST /api/v1/media` accepts exactly one `multipart/form-data` field named
  `file`. It currently accepts JPEG, PNG, or WebP images up to 2 MiB.
- The worker may create image or video `Media` rows. Generated output is available
  through the same authenticated `GET /api/v1/media/:mediaId` endpoint; video
  upload from clients remains unsupported.
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
- generation worker claims must condition their updates on both status and
  `updatedAt` so only one worker owns the current lease;
- deleting a conversation cascades to its messages.
- deleting media referenced by a message is restricted.

The database can validate non-empty text but cannot express “content or at least
one row in another table” as a row-level check. The HTTP/application boundary
therefore enforces that every message has content or at least one media item.

Creating a conversation uses one atomic nested write for the conversation and its
first user message. Sending a later message uses one transaction to verify
conversation and media ownership and insert the user message, ordered media links,
and pending chat run. Conversation activity is derived from the newest message;
message writes do not modify the parent conversation timestamp. The response
endpoint claims that run before calling Gemini outside every database transaction.
Gemini's streaming adapter emits text deltas without persisting each chunk. A
short follow-up transaction persists either the assembled normal assistant reply
or the pending generation snapshot, then marks the chat run completed. The
terminal request SSE event is sent only after this transaction commits.

When enabled, one background worker polls for jobs, atomically claims a pending or
stale generation, and renews its lease while provider work runs outside a database
transaction. It creates image/video outputs first and then generates the final
assistant text. Files are stored before one short completion transaction inserts
the `Media` and `MessageMedia` rows, creates the assistant message, and conditionally
completes the still-owned generation. Failed or lost claims clean up stored files
when possible. Worker shutdown aborts in-flight local work; its processing row is
left for stale-lease recovery.

Generation claims provide at-least-once processing rather than an exactly-once
provider guarantee. A future provider adapter must use the generation ID as an
idempotency key when supported, because a process can stop after an external
provider accepts work but before the local completion transaction commits.

If Gemini is unavailable, the response endpoint returns 503 and marks the chat run
failed. The user message remains stored, and the client may retry the same response
endpoint without creating another prompt.

## Cursor pagination

- All list responses use `{ "items": [...], "nextCursor": string | null }`.
- Conversations use an opaque cursor containing `lastMessageAt` and
  `conversationId`.
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
- adding previous messages or a conversation summary to AI context;
- sending uploaded media bytes to a multimodal chat model (current AI context
  includes a text marker for attachments, not their contents);
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
