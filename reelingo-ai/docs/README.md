# Documentation map

## Instruction ownership

| Location                                      | Purpose                                                              |
| --------------------------------------------- | -------------------------------------------------------------------- |
| [AGENTS.md](../AGENTS.md)                     | Agent entry point, navigation, and critical boundaries               |
| [rule.md](../rule.md)                         | Concise project-wide engineering rules                               |
| [architecture.md](architecture.md)            | Package ownership, dependency direction, and AI capability placement |
| [contracts.md](contracts.md)                  | Internal server-to-AI transport and compatibility decisions          |
| [workflow.md](workflow.md)                    | Task stages, verification, and evidence                              |
| [README.md](../README.md)                     | Local setup and service operation                                    |
| [.agents/skills](../.agents/skills/README.md) | Project-owned coding-agent skills                                    |

Keep one detailed source of truth for each decision. Entry points may summarize a
critical constraint but should link to the owning document. Skills route work to
these sources; they do not replace them.
