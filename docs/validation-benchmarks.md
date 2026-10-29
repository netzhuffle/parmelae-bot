# Validation workflow benchmarks

Measured on 2026-10-29 with pinned Bun 1.4.4, macOS 27.0.1 arm64,
oxfmt 0.74.0, oxlint 1.89.0, and oxlint-tsgolint 7.0.2005.

## Method

Baseline: commit `892bf5b` (PR #166). Final: the #158 scripts and configurations.
Both variants used disposable copies of the same tracked tree and generated Prisma
client, warm dependencies, and the same source files and exclusions. No diagnostic
probes or application credentials were present during measurement. The baseline
copy retained oxfmt; the final formatter command used the built-in Bun formatter.

For each comparison, run six pairs sequentially, alternating the order of variants
(`baseline, final`, then `final, baseline`). Discard the first measurement of each
variant as warm-up and take the median of its remaining five measurements. Measure
wall-clock time with `performance.now()` around `Bun.spawn(['zsh', '-c', command])`,
awaiting stdout, stderr, and successful exit. Formatting and schema writers finish
before readers run. These are local warm measurements, not CI performance promises.

Before migration, both `bunx --bun oxfmt --check .` and `bun fmt --check .` passed
on the unchanged tree, each matching **213 files**. Both configurations retain
`singleQuote`, `sortImports`, and `ignorePatterns` in `.oxfmtrc.json`.

- Full lint selection: **188 files** in both variants, verified by comparing
  `oxlint src scripts --debug=files` output byte-for-byte.
- Baseline source-only lint selection: **133 files**, an additional overlapping
  pass removed from the final pipeline.
- Bun check: **209 files**; source/script tests: **517 tests in 55 files**, identical
  between variants. The new benchmark document was added after the timed snapshots;
  the delivered formatter scan therefore includes one additional Markdown file.

## Results

| Comparison        | Baseline command                       | Final command                                                 | Baseline median | Final median |
| ----------------- | -------------------------------------- | ------------------------------------------------------------- | --------------: | -----------: |
| Formatter         | `bun run format` → oxfmt               | `bun run format` → Bun fmt                                    |        50.31 ms |     25.03 ms |
| Checker and lint  | `bun run lint` (type-aware + compiler) | `bun run typecheck && bun run lint` (type-aware, no compiler) |       390.08 ms |    407.94 ms |
| Complete pipeline | `bun run checks`                       | `bun run checks`                                              |      1708.02 ms |   1395.78 ms |

The checker split was **17.86 ms slower** in this sample. It is an explicit tooling
preference, not a proven speed improvement. The complete pipeline improved by
312.24 ms (about 18%) with the duplicate source-only lint pass removed and the
formatter changed. Earlier measurements against older tooling (537 vs 15 ms for
formatting, approximately 507 vs 414 ms for split vs combined checking) are not
comparable to this updated stack and were not reused as evidence.

Baseline pipeline:

```text
oxfmt → prisma format → source-only combined lint/check → full combined lint/check → bun test
```

Final pipeline:

```text
bun fmt → prisma format → bun check → full type-aware lint → bun test src scripts
```

### Raw wall times (milliseconds)

The first value in each sequence is the discarded warm-up.

| Comparison | Variant  | Six wall times                                       |
| ---------- | -------- | ---------------------------------------------------- |
| formatter  | baseline | 53.58, 50.62, 50.24, 51.46, 50.31, 49.98             |
| formatter  | final    | 30.32, 26.86, 25.26, 24.85, 25.03, 24.85             |
| checker    | baseline | 419.26, 369.19, 421.49, 389.07, 419.95, 390.08       |
| checker    | final    | 403.01, 431.75, 407.94, 403.50, 425.19, 398.59       |
| pipeline   | baseline | 1662.86, 1698.17, 1708.02, 1688.27, 1709.87, 1726.71 |
| pipeline   | final    | 1429.06, 1405.70, 1383.95, 1395.78, 1395.89, 1392.72 |

## Diagnostic probes

In the disposable final copy, create one temporary source file at a time under
`scripts/`, run the corresponding real package command, and delete the probe:

```ts
// bun run typecheck rejects TS2322:
export const validationTypeProbe: number = 'intentional type error';
```

```ts
// bun run lint rejects typescript(restrict-template-expressions):
export const validationLintProbe = `${new URL('https://example.com')}`;
```

Both commands exited nonzero with the expected diagnostic. Probes were removed
before the final benchmarks and validation. No lint rules or overrides were
removed; only Oxlint’s duplicate compiler check was disabled. No application
semantics changed.
