# Projects feature

This document owns the product and backend decisions for projects. Projects are
private containers for conversations; they do not provide shared AI memory or
shared project assets in the current scope.

## Ownership and hierarchy

- An authenticated user may own multiple projects.
- A project may contain zero or more conversations.
- Every conversation belongs to exactly one project, and its owner is derived
  through that project. Conversation and message authorization therefore scopes
  the requested conversation through `project.userId`.
- Missing resources and resources owned by another user return the same 404
  outcome so the API does not reveal another user's data.

## Project fields and listing

- `Project.id` is a database-generated UUID and is the public identifier.
- `title` is trimmed, non-empty, rejects null bytes, and is limited to 120
  characters. Titles are display values and do not have to be unique.
- `createdAt` and `updatedAt` use `TIMESTAMPTZ(3)` and are returned publicly.
  Renaming a project updates `updatedAt`; nested conversation or message writes
  do not.
- Project lists order by `updatedAt DESC, id DESC` and use both values in the
  opaque cursor.

Current endpoints:

```text
POST   /api/v1/projects
GET    /api/v1/projects
GET    /api/v1/projects/:projectId
PATCH  /api/v1/projects/:projectId
```

Create and rename requests use the same shape:

```json
{
  "title": "My video project"
}
```

## Conversation entry points

Conversation creation and listing are scoped by project:

```text
POST /api/v1/projects/:projectId/conversations
GET  /api/v1/projects/:projectId/conversations
```

Creating a conversation still atomically creates its first user message and
pending chat run. Message and single-conversation routes continue to use the
globally unique conversation ID while enforcing ownership through the project.

## Deferred work

Project deletion and its data-retention semantics are intentionally deferred.
There is currently no project deletion endpoint or soft-delete marker.
