# OpenAI Web Search Research

Last reviewed: 2026-03-19

This note captures the findings for Taskmaster task `35.2` and focuses on how OpenAI web search would replace the current SerpAPI integration in this repository.

## Current Repository Baseline

- [`src/Tools/GoogleSearchToolFactory.ts`](/Users/jannis/Documents/workspace/php js/parmelae-bot/src/Tools/GoogleSearchToolFactory.ts) currently creates a local `SerpAPI` tool with fixed location and language settings for Bern/Switzerland.
- [`src/Tools/SerpAPI.ts`](/Users/jannis/Documents/workspace/php js/parmelae-bot/src/Tools/SerpAPI.ts) calls `https://serpapi.com/search` and flattens the JSON response into a single string plus markdown links.
- [`src/ChatGptAgentService.ts`](/Users/jannis/Documents/workspace/php js/parmelae-bot/src/ChatGptAgentService.ts) adds that local search tool to the agent tool list.
- [`src/AgentStateGraph/AgentStateGraphFactory.ts`](/Users/jannis/Documents/workspace/php js/parmelae-bot/src/AgentStateGraph/AgentStateGraphFactory.ts) and [`src/AgentStateGraph/ToolsNodeFactory.ts`](/Users/jannis/Documents/workspace/php js/parmelae-bot/src/AgentStateGraph/ToolsNodeFactory.ts) are built around local LangChain tool calls that flow through `ToolNode`.
- Local package inspection shows `@langchain/openai` `1.3.0` already includes OpenAI built-in tool wrappers, including `tools.webSearch()`, plus `useResponsesApi` support on `ChatOpenAI`.

## Official OpenAI Findings

### Preferred API surface

OpenAI documents the generally available `web_search` tool on the Responses API (`POST /v1/responses`). Example shape:

```json
{
  "model": "gpt-5",
  "tools": [{ "type": "web_search" }],
  "input": "What was a positive news story from today?"
}
```

Authentication is standard OpenAI API auth using `Authorization: Bearer $OPENAI_API_KEY`.

### Alternative API surface

Chat Completions also supports web search, but through specialized search models such as:

- `gpt-5-search-api`
- `gpt-4o-search-preview`
- `gpt-4o-mini-search-preview`

Important difference: OpenAI says Chat Completions search models always retrieve from the web before answering, while the Responses API lets the model use `web_search` only when needed.

### Response format

When the Responses API uses web search, OpenAI documents two relevant output items:

- `web_search_call`
- `message`

The assistant `message` contains the answer text plus citation annotations. OpenAI also documents `include: ["web_search_call.action.sources"]` to return the full list of consulted URLs, not only the citations surfaced inline.

### Search controls

OpenAI documents the following controls that matter for migration:

- Domain allow-listing via `filters.allowed_domains`, limited to 100 domains, without `http://` or `https://`.
- Approximate `user_location` with `country`, `city`, `region`, and/or `timezone`.
- `external_web_access: false` on `web_search` for cache-only mode in the Responses API.

### Limits and constraints

OpenAI documents these constraints for web search:

- `web_search` is the current generally available tool for the Responses API.
- `web_search_preview` still exists as an earlier tool version.
- Web search is not supported with `gpt-5` at `minimal` reasoning.
- Web search is not supported by `gpt-4.1-nano`.
- Web search in the Responses API uses the same tiered rate limits as the underlying model.
- Web search is limited to a 128,000 context window, even on models with a larger normal context window.

OpenAI's current `GPT-5.4` model page also shows that:

- `v1/responses` is supported.
- Web search is supported as a tool on that model.
- Rate limits remain tier-based. As of 2026-03-19, the documented `GPT-5.4` limits are:
  - Tier 1: `500 RPM`, `500,000 TPM`
  - Tier 2: `5,000 RPM`, `1,000,000 TPM`
  - Tier 3: `5,000 RPM`, `2,000,000 TPM`
  - Tier 4: `10,000 RPM`, `4,000,000 TPM`
  - Tier 5: `15,000 RPM`, `40,000,000 TPM`

## Migration-Relevant Differences From SerpAPI

### 1. OpenAI web search is model-mediated, not raw search JSON

SerpAPI returns raw-ish Google result structures like:

- `organic_results`
- `answer_box`
- `knowledge_graph`

The current repo depends on that by flattening those fields into a string in [`src/Tools/SerpAPI.ts`](/Users/jannis/Documents/workspace/php js/parmelae-bot/src/Tools/SerpAPI.ts).

OpenAI web search does not expose a SerpAPI-like result object as the primary interface. Its primary contract is:

- assistant text
- inline citations
- optional source metadata

That means the migration is not a field-for-field parser swap.

### 2. OpenAI built-in web search is a server-side tool

This is the main implementation constraint for this codebase.

Local inspection of `@langchain/openai` shows Responses API built-in tools are treated differently from local function tools. In the OpenAI response converter, non-function built-in tool output such as `web_search_call` is carried in message metadata/tool outputs rather than converted into LangChain `tool_calls`.

Implication for this repo:

- the existing `ToolNode` loop will not execute a local web-search step for built-in OpenAI web search
- the current tool-call announcement and persistence flow will not automatically record web searches the same way it records local tools

If preserving those announcements or persisted tool messages matters, `35.3` will need follow-up changes in the message flow, not only a factory replacement.

### 3. OpenAI has fewer direct search knobs than SerpAPI

The current SerpAPI wrapper exposes many Google-specific knobs such as:

- `gl`
- `hl`
- `location`
- `start`
- `num`
- `tbm`
- advanced Google query parameters

OpenAI web search exposes a smaller and higher-level surface:

- prompt text
- optional allowed domains
- optional user location
- optional live-vs-cache mode

If the repo needs raw pagination, Google vertical selection, or Google-specific query flags, those will not map directly.

## Recommended Direction For Implementation

### Preferred path

Use OpenAI's built-in `web_search` through the Responses API and LangChain's native wrapper instead of re-creating a new standalone search HTTP client.

Reasons:

- The repo already depends on OpenAI and `@langchain/openai`.
- The installed LangChain package already exposes `tools.webSearch()`.
- This keeps search inside the same model/tool stack instead of maintaining a separate search vendor.
- OpenAI's citation model is better aligned with user-facing, sourced answers than the current "plain string plus links" output.

### Expected code impact for `35.3`

At minimum:

- remove `SERPAPI_API_KEY` config requirements
- remove `GoogleSearchToolFactory` / `SerpAPI`
- add OpenAI web search through LangChain/OpenAI Responses tooling
- decide whether web search should simply be available to the model as a built-in server tool or still appear as a named local tool for announcement/history purposes

### Decision point

There are two viable implementation strategies:

1. Built-in OpenAI tool

- Add `tools.webSearch(...)` to the model/tool configuration.
- Accept that web search is server-side and does not behave like the current local `search` tool.
- Add targeted follow-up work if search announcements or persisted tool responses are still required.

2. Compatibility adapter

- Create a local `OpenAIWebSearchTool` that calls `client.responses.create(...)` manually.
- Flatten answer text and citations back into a string so the rest of the graph still sees a normal local tool result.
- This preserves the current `ToolNode` behavior better, but gives up some of the simplicity of using OpenAI's built-in tool directly.

Recommendation: start with the built-in OpenAI tool unless preserving search-call announcements in history is a strict product requirement.

## Sources

- OpenAI Web Search guide: <https://developers.openai.com/api/docs/guides/tools-web-search>
- OpenAI Responses migration guide: <https://developers.openai.com/api/docs/guides/migrate-to-responses>
- OpenAI GPT-5.4 model page: <https://developers.openai.com/api/docs/models/gpt-5.4>
