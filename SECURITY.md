# Security & Dependency Audit Policy

## Dependency Vulnerability Triage (2026-10-05)

### Findings Overview

Running `npm audit` reports 7 high-severity findings that all stem from a single shared upstream sub-dependency: `braces` (CVE-2024-4068 / [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)).

```
node_modules/braces
  chokidar  2.0.0 - 3.6.0
    tailwindcss  3.4.19
  micromatch  >=0.2.0
    fast-glob  *
      @next/eslint-plugin-next  >=14.3.0-canary.0
        eslint-config-next  16.3.8
```

### Reachability Analysis

| Package              | Path                                    | Context                        | Reachable in Production? |
| :------------------- | :-------------------------------------- | :----------------------------- | :----------------------- |
| `braces` (`<=3.0.3`) | via `chokidar` in `tailwindcss`         | Dev tool (PostCSS / CSS build) | **No** (Build-time only) |
| `braces` (`<=3.0.3`) | via `fast-glob` in `eslint-config-next` | Dev tool (CLI linter)          | **No** (Lint-time only)  |

- **Production Runtime Isolation:** None of these packages (`braces`, `chokidar`, `fast-glob`, `micromatch`) are imported or executed by Next.js application routes, serverless API handlers, or client bundles.
- **No Untrusted Input:** The app does not accept or evaluate user-supplied glob or brace expansion patterns.

### Why It Cannot Be Resolved via `npm audit fix`

1. `braces@3.0.3` is currently the latest release published on the `braces` 3.x release line.
2. `npm audit fix --force` would blindly force a major breaking upgrade to `tailwindcss@4` (which removes `tailwind.config.js` and requires a complete stylesheet redesign) and downgrade `eslint-config-next` to v14.
3. This is an upstream blocker across the Tailwind v3 and ESLint ecosystems.

### Ongoing Maintenance

- Re-check `npm audit` monthly to monitor for backported security patches in `micromatch` / `chokidar`.
- When migrating from Tailwind CSS v3 to v4 in a dedicated roadmap phase, this dependency chain will naturally retire.
