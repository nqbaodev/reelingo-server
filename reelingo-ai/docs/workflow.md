# Engineering workflow

## 1. Discover

Read `AGENTS.md`, `rule.md`, and the task-specific document. Inspect the owning
package, its consumers, current contract schemas, and working-tree changes. For a
server integration change, inspect both sides before editing.

## 2. Define

State the observable outcome, owning module, inputs, outputs, failures, side
effects, trust boundary, cancellation behavior, and verification evidence. Do not
invent tools, persistence, retries, or provider guarantees outside the request.

## 3. Design

Choose agent, workflow, tool, provider, memory, RAG, media, or transport ownership
using `docs/architecture.md`. For wire changes, classify compatibility and identify
all affected producers and consumers. For provider changes, define the normalized
project-owned result and error categories before using SDK types.

## 4. Implement

Make the smallest complete change. Keep provider construction in the composition
root, validate external values at their boundary, preserve causes without exposing
them, and update the owning documentation with the code.

Do not create or modify automated tests, snapshots, evaluation datasets, or
test-only fixtures unless the user explicitly requests that scope. Running existing
checks is allowed.

## 5. Verify

Use synthetic inputs and local credentials; do not call production models or data.

| Change                                                | Required evidence                                                                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| TypeScript, config, agent, workflow, or provider code | `npm run check` and `npm run build`                                                                                      |
| Internal HTTP contract                                | AI check/build, server build/lint, and a manual authenticated streaming request covering success or a controlled failure |
| Cross-repository wire schema                          | Validate both producer and consumer and inspect version/terminal-event behavior                                          |
| Long-running worker or storage                        | Exercise cancellation, retry/idempotency, restart recovery, and cleanup against a disposable environment                 |
| Prompt or routing behavior                            | Run requested evaluations or representative manual cases; static checks do not prove model behavior                      |
| Documentation only                                    | Read final text and verify local links; no application build required                                                    |

## 6. Review

Review dependency direction, provider leakage, secret handling, unbounded loops or
fan-out, retry safety, cancellation, duplicate terminal events, context size,
storage ownership, and stale docs. Confirm that no code accesses the Reelingo
application database.

## 7. Handoff

Report observable behavior, commands actually run, manual evidence, and specific
remaining gaps. Do not claim that typecheck proves provider availability, agent
quality, authorization, durable recovery, or RAG relevance.
