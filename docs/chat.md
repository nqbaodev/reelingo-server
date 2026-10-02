# Chat feature

This document owns the current product and backend decisions for conversations,
messages, assets, and generated media. The implementation and
`src/presentation/http/openapi.ts`
remain the executable API contract; update this document when those decisions
change.

## Scope and ownership

- The `projects` area across the four layers owns private project creation, listing, lookup, title
  updates. See [Projects](projects.md).
- The `conversations` area owns project-scoped listing and name updates.
- The `messages` area owns the send flow, including conversation creation from the
  first text message, message validation, persistence, listing, ordered asset
  attachments, durable chat runs, and persistence of the AI decision.
- The `assets` area owns the shared image/video asset kind, authenticated image
  upload, local file storage, asset persistence, owned asset listing, and content
  retrieval.
- The `ai` area owns chat routing, generation statuses, configuration semantics,
  model-route selection, and provider integrations. Gemini is the local provider.
  When the standalone AI agent URL and service token are configured, chat routing
  uses its versioned streaming contract instead. A media tool call still persists a
  generation request in this server during the first extraction stage; when enabled,
  the background worker stores its output through the assets feature.
- Every conversation belongs to one project. Conversation and nested message
  operations are authenticated and scoped through the project owner. A missing or
  non-owned project or conversation returns the same 404 outcome and must not
  reveal another user's data.

## Conversations

- `Conversation.id` is a database-generated UUID and is the public conversation
  identifier used in routes.
- `projectId` identifies the required parent project. User ownership is not
  duplicated on the conversation row.
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
- The conversation stream endpoint accepts `projectId` for the first prompt. It creates the
  conversation, first `user` message, and pending chat run atomically, then starts
  AI processing in the same SSE request.
- The initial name is derived synchronously from the first 120 Unicode characters
  of the trimmed message content. Users may rename it through the update endpoint.
- Creating a conversation from an asset-only first message is deferred until its
  initial naming behavior is defined.

Current endpoints:

```text
POST  /api/v1/conversations
GET   /api/v1/projects/:projectId/conversations
PATCH /api/v1/conversations/:conversationId
```

Create from the first text message:

```text
POST /api/v1/conversations
```

## Messages

- `Message.id` is a database-generated UUID.
- `role` is either `user` or `assistant`. The public conversation stream endpoint always
  assigns `user`; clients cannot choose or spoof the role.
- A message contains `content`, up to four uploaded `assetIds`, or both. At least
  one must be present. Duplicate IDs are rejected.
- Every `assetId` must reference an asset owned by the authenticated user. If any ID
  is missing or non-owned, the request returns 404 without revealing which record
  failed ownership validation.
- The client does not send a chat/image/video mode. Sending a message stores the
  user message and a pending `ChatRun` atomically, then starts the configured chat
  adapter in the same SSE request. The adapter receives only that prompt and may
  return normal text, call `generate_image`, or call `generate_video`. The current
  local and standalone adapters use Gemini function calling in automatic mode, not
  server-side keyword matching. Previous messages are not included in AI context yet.
- Optional `aiContext` carries the user's current session preference and image or
  video settings. `intentHint` is only a hint; it cannot trigger generation on its
  own. If the prompt asks for media but does not identify image or video, the AI
  should ask a clarifying question as normal assistant text.
- Image settings contain a supported aspect ratio, `512`/`1K`/`2K`/`4K`
  resolution, and one to four outputs. Video settings contain `16:9` or `9:16`,
  `720p`/`1080p`/`4k`, exactly one output, and optional prompt enhancement. They
  are not persisted for ordinary chat. When the AI
  chooses a media tool, the matching image/video settings are copied into the new
  generation row as an immutable JSONB snapshot. The selected media provider and
  model are stored on the same row so pending or reclaimed work keeps its original
  execution route after configuration changes. Missing settings use server
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
- The response endpoint is read-only. It returns durable chat-run, generation, and
  assistant-message state but never claims, starts, resumes, or retries AI work.
- The generation worker creates media and requests a concise completion text in
  parallel. Completion text is best-effort and may be null, so a secondary text
  request cannot discard successfully generated media. One transaction creates a
  single `assistant` message and its ordered `MessageAsset` rows, completes the
  generation, and assigns the message to both generation and chat run
  `resultMessageId` fields. Media generation and completion text use separate
  inputs on capability-specific provider contracts. A provider implements only the
  text, image, or video operations it supports. `AiService` dispatches text through
  the configured provider and media through the stored provider/model route using
  capability-specific registry entries. Unsupported operations are rejected during
  registration/routing rather than by inherited provider methods.
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
POST /api/v1/conversations
GET  /api/v1/conversations/:conversationId/messages/:messageId/response
GET  /api/v1/conversations/:conversationId/messages
```

Text-only request:

```json
{
  "projectId": "68c366d4-d1c2-4095-b285-703d98782df4",
  "content": "Hello 👋"
}
```

Text with an uploaded asset:

```json
{
  "conversationId": "f8a81760-c5fe-4aad-b040-15dbf72ffde8",
  "content": "What is in this image?",
  "assetIds": ["6aa7ba5e-5bf0-43ec-bb58-068e21cad413"]
}
```

Image-only message:

```json
{
  "conversationId": "f8a81760-c5fe-4aad-b040-15dbf72ffde8",
  "assetIds": ["6aa7ba5e-5bf0-43ec-bb58-068e21cad413"]
}
```

Upload the image first with `POST /api/v1/assets`, then send the returned `id` as
an item in `assetIds`. The conversation stream endpoint never accepts raw file bytes, storage
paths, URLs, MIME types, or file sizes.

Prompt requesting image generation:

```json
{
  "conversationId": "f8a81760-c5fe-4aad-b040-15dbf72ffde8",
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

The conversation endpoint requires `Accept: text/event-stream` and normal Bearer
authorization. Exactly one target is required: `projectId` creates a conversation
from the first prompt, while `conversationId` appends to an existing conversation.
A non-streaming request is rejected with 406 before persistence or AI starts. The
server responds with versioned SSE data using these ordered events:

- `message.created` after the transaction commits; it includes top-level
  `conversationId`, `messageId`, and `runId`, the persisted user message, and the
  newly created conversation, or `null` for an existing one;
- `chat.started` after the pending run is claimed;
- zero or more `assistant.delta` events for ordinary text output;
- `generation.queued` after a media-generation request is committed;
- `chat.completed` after the text reply or generation request is committed; it
  repeats `conversationId`, `messageId`, and `runId`, and includes
  `assistantMessageId` when an assistant message is already available;
- `chat.failed` when processing fails after streaming has started.

Heartbeat frames are SSE comments and carry no business state. Text deltas are
temporary display data; `chat.completed` contains the canonical persisted routing
state and may have a null assistant message for generation.
The server does not persist or replay individual SSE events, so clients must not
treat SSE delivery as durable state. Browser clients use streaming `fetch` rather
than native `EventSource` because this protected endpoint requires an
`Authorization` header. `POST /api/v1/conversations` is both the only SSE endpoint
and the only HTTP endpoint that starts AI chat. Its stream belongs to the current
turn and closes after `chat.completed`; it does not remain open for background
image or video generation.

Polling uses `GET` on the same response path. It is a read-only recovery endpoint
and returns only the durable run state plus the result when available. Its
`messageId` path parameter is the user-message ID from `message.created`, not the
`assistantMessageId` emitted at completion:

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
`assistantMessage` remains null until that generation is completed. The client
polls this durable state after `generation.queued`. Polling never claims, starts,
or retries work. Clients apply backoff with jitter and stop when the generation is
`completed` or `failed`, or when the normal chat result is available.

Reloading the page does not lose the user prompt or processing state: both are in
PostgreSQL. The client reloads the message list and polls `GET` while chat routing
or media generation is still processing. A failed run remains failed; retrying AI
requires sending a new message through `POST /api/v1/conversations`. Only
temporary local typing and queue animations are lost on reload.

## Assets

- `POST /api/v1/assets` accepts exactly one `multipart/form-data` field named
  `file`. It currently accepts JPEG, PNG, or WebP images up to 2 MiB.
- The worker may create image or video `Asset` rows. Generated output is available
  through the same authenticated `GET /api/v1/assets/:assetId` endpoint; video
  upload from clients remains unsupported.
- The upload boundary checks the actual file signature and does not trust the
  client-provided filename or MIME type. The detected MIME type is persisted.
- `Asset.id` is a database-generated UUID. The initial table stores only `id`,
  `userId`, `kind`, `storageKey`, `mimeType`, and `createdAt`.
- `sizeBytes`, original filename, width, height, duration, status, and public URL
  are intentionally not stored. Image size is enforced directly from the uploaded
  bytes before persistence.
- New uploaded files are stored under `STORAGE_ROOT/assets/uploads/{userId}` and AI
  output under `STORAGE_ROOT/assets/generated/{userId}`. Existing `media/`,
  `images/`, and `videos/` storage keys remain readable. A Docker image uses
  `/app/storage`; mount a Docker volume there so files survive container replacement.
- The upload response contains a stable authenticated API `path` and an absolute
  `url` derived from `PUBLIC_BASE_URL`. Neither value is persisted.
- `GET /api/v1/assets` lists owned assets newest first with cursor pagination and
  an optional `kind=image|video` filter.
- `GET /api/v1/assets/:assetId` returns the asset bytes only to the owner.
- `POST /api/v1/assets/delete` accepts up to 50 IDs as
  `{ "assetIds": ["..."] }` and deletes owned assets that are not attached to any
  message. The response contains only `{ "deletedIds": [...] }`; missing,
  non-owned, duplicate, and already attached asset IDs are skipped.
- If the file write succeeds but the database insert fails, the upload use case
  attempts to delete the stored file before propagating the failure.
- A future S3/R2 adapter can replace local storage through the asset storage
  contract without changing the upload use case or API response.
- Upload and message creation are separate requests. An upload remains unattached
  until its `id` is used in a message's `assetIds`.

## Persistence invariants

PostgreSQL constraints enforce the valid stored shapes:

- text-only: non-empty `content` and no asset links;
- assets with optional text: one to four ordered `MessageAsset` rows referencing
  `Asset`;
- generation: exactly one generation per trigger message and at most one result
  message per generation;
- generation worker claims must condition their updates on both status and
  `updatedAt` so only one worker owns the current lease;
- deleting a conversation cascades to its messages;
- deleting an asset referenced by a message is restricted.

The database can validate non-empty text but cannot express “content or at least
one row in another table” as a row-level check. The HTTP/application boundary
therefore enforces that every message has content or at least one asset.

Sending a first message verifies the owned project and uses one transaction for
the conversation, first user message, ordered asset links, and pending chat run.
Sending a later message uses one transaction to verify conversation and asset
ownership and insert the user message, ordered asset links, and pending chat run.
Conversation activity is derived from
the newest message; message writes do not modify the parent conversation timestamp.
After the send transaction commits, the server claims that run and calls Gemini
outside every database transaction. The read-only response endpoint does not use
this claim path and cannot start AI work.
Gemini's streaming adapter emits text deltas without persisting each chunk. A
short follow-up transaction persists either the assembled normal assistant reply
or the pending generation snapshot, then marks the chat run completed. The
terminal request SSE event is sent only after this transaction commits.

When enabled, one background worker polls for jobs, atomically claims a pending or
stale generation, and renews its lease while provider work runs outside a database
transaction. It creates image/video output and best-effort completion text in
parallel. Files are stored before one short completion transaction inserts the
`Asset` and `MessageAsset` rows, creates the assistant message, and conditionally
completes the still-owned generation. Failed or lost claims clean up stored files
when possible. Worker shutdown aborts in-flight local work; its processing row is
left for stale-lease recovery.

Generation claims provide at-least-once processing rather than an exactly-once
provider guarantee. A future provider implementation must use the generation ID as an
idempotency key when supported, because a process can stop after an external
provider accepts work but before the local completion transaction commits.

If Gemini becomes unavailable after SSE delivery starts, the stream emits
`chat.failed` and the chat run is marked failed. The user message remains stored.
The response endpoint reports that durable failure but does not retry it; a new AI
attempt requires a new message through `POST /api/v1/conversations`.

## Cursor pagination

- All list responses use `{ "items": [...], "nextCursor": string | null }`.
- Assets order by `createdAt DESC, id DESC` and may be filtered by `kind`.
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

- replacing local asset storage with an object-storage provider;
- supporting video upload and video-specific metadata such as duration and a
  thumbnail;
- adding previous messages or a conversation summary to AI context;
- sending uploaded media bytes to a multimodal chat model (current AI context
  includes a text marker for attachments, not their contents);
- replacing the initial name with an AI-generated summary;
- creating a conversation from an asset-only first message;
- message edits and message deletion.

## Change checklist

When changing this feature, keep the affected surfaces aligned:

- Prisma schema and a new migration if the existing migration may have been
  applied anywhere;
- domain discriminated unions and infrastructure mapper;
- request DTO schema, presenter, routes, and localized response messages;
- repository ownership, transaction, and cursor conditions;
- `src/presentation/http/openapi.ts`, this document, and the README endpoint summary;
- companion-app request adapters and runtime decoders when that repository is in
  scope.
