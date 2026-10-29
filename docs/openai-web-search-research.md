# Web-search migration investigation

Historical findings from 2026-03-19; this is an unresolved design investigation. Recheck the installed LangChain adapter and provider documentation before implementing a migration.

## Why replacing the factory is insufficient

The investigation compared the local [SerpAPI wrapper](../src/Tools/SerpAPI.ts) and [search factory](../src/Tools/GoogleSearchToolFactory.ts) with provider-hosted search. SerpAPI results were flattened into text and links; hosted search supplied assistant text, citations, and provider output metadata instead of the same raw Google result fields.

The inspected `@langchain/openai` 1.3.0 adapter exposed Responses built-in tools, but carried hosted `web_search_call` output separately from local LangChain `tool_calls`. The local [tool execution node](../src/AgentStateGraph/ToolsNodeFactory.ts) therefore would not execute or persist hosted searches as ordinary local tool calls. A migration must account for the [tool-call history contract](../CODING_STANDARDS.md#tool-call-history), including announcements and linked responses.

## Unresolved choice

- **Provider-hosted tool:** bind search through the provider adapter; decide how hosted output participates in announcements and history.
- **Local compatibility adapter:** call hosted search inside a local tool and return text with citations; preserve the existing tool loop at the cost of an additional model request and adapter.

The investigation preferred the hosted tool if its history behavior meets product requirements. Neither option was selected here. Recheck location, domain filtering, result pagination, citation rendering, model support, and configuration requirements against the intended behavior; the APIs do not offer identical search controls.

## Original sources

These links record the research inputs, rather than a cache of model limits or API syntax:

- [OpenAI web-search guide](https://developers.openai.com/api/docs/guides/tools-web-search)
- [Responses migration guide](https://developers.openai.com/api/docs/guides/migrate-to-responses)
