# Dependency release-age policy

Use the Bun version pinned in `.bun-version`. `bunfig.toml` requires newly resolved
releases to be at least three days old (`minimumReleaseAge = "3d"`). Existing
`bun.lock` resolutions replay with `bun install --frozen-lockfile`; adding this
policy does not update dependencies. Release age reduces exposure to newly
published compromised packages; it is not a package safety guarantee.

For an urgent security update, review the specific release and record the reason,
review evidence, and removal date in the update PR. Temporarily add only that exact
`package@version` under `[install]` in `bunfig.toml`, for example:

```toml
minimumReleaseAgeExcludes = ["example-package@1.2.3"]
```

Resolve and review the intended update and lockfile diff, then remove the exception
once the release is three days old. Never exempt a whole package, switch registries,
or add lifecycle-script trust to bypass the waiting period. No exceptions are
currently configured. See the [Bun 1.4.4 release notes](https://bun.com/blog/bun-v1.4.4#minimumreleaseage-supports-units-and-per-version-exclusions).

`bun test scripts/__tests__/dependency-release-age.test.ts` verifies the policy
through real Bun installs against a disposable localhost registry. It uses isolated
configuration, home, and cache directories, no registry credentials, and publication
timestamps relative to the test’s clock: a four-day-old release is eligible, while
two-day-old and one-hour-old releases must wait. It also checks an exact-version
exception and replays its frozen lock with the exception removed and cache cleared.
The fixture needs permission to bind a localhost port and uses `tar` to build its
local package archives; it runs as part of `bun run checks`.
