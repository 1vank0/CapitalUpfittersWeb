# Connectors

Status as of 2026-08-06. No secrets stored here — ever.

| Connector | Status | Notes |
|---|---|---|
| GitHub (`gh` CLI) | Connected and authenticated | Account `1vank0`, scopes: gist, read:org, repo, workflow |
| Vercel (MCP connector) | Connected and authenticated | Team `IVANKODev` (`team_KJ50kQvXTsxMSmRgNAQn8B71`), project `capital-upfitters-website` (`prj_pbmw2jhQq9ACUJM7zJLayMcZISA1`) |
| Firecrawl | Unavailable | No MCP server/tool found. Fallback: WebSearch/WebFetch, approved by Ivan 2026-08-06 |
| OpenAI Images API | Unavailable | No connector/tool found, no `OPENAI_API_KEY` configured. Fallback: reuse existing imagery, approved by Ivan 2026-08-06 |
| Browser automation | Connected | In-app Browser pane (Claude_Browser tools) |
| Claude subagents | Connected | Agent tool, background + foreground |
| Lighthouse/axe | Not yet verified | To confirm during QA phase — check for local CLI or browser devtools equivalent |

Last successful use: GitHub (`gh repo clone`, `gh pr list`), Vercel (`list_teams`, `list_projects`, `get_project`) — 2026-08-06.
