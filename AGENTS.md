# AGENTS.md

## Cursor Cloud specific instructions

**owlplot** is a framework-agnostic TypeScript charting library organized as an npm workspaces monorepo. No backend services, databases, or Docker are required.

### Workspace packages

| Package | Path | Purpose |
|---|---|---|
| `@owlplot/core` | `packages/core` | Core chart computation (scales, axes, ticks, curves, scene graph) |
| `@owlplot/renderer-svg` | `packages/renderer-svg` | SVG DOM renderer (hover, tooltips, legends) |
| `owlplot-svg-playground` | `apps/svg-playground` | Vite demo app for visual chart testing |

### Key commands

See `package.json` scripts. Summary of the most useful ones:

- **Build all**: `npm run build` (build order: core → renderer-svg → playground)
- **Unit tests**: `npm run test` (Vitest, 158 tests across core/renderer-svg/playground)
- **Lint**: `npm run lint` (ESLint 9 + Prettier)
- **Dev server**: `npm run dev:demo` (Vite dev server at `http://localhost:5173/owlplot/`)
- **E2E tests**: `npm run test:e2e` (Playwright — requires `npx playwright install` first)

### Non-obvious caveats

- The `dev:demo` script auto-builds `@owlplot/core` and `@owlplot/renderer-svg` before starting Vite, so you don't need to run `npm run build` separately before `npm run dev:demo`.
- The Vite dev server serves under the `/owlplot/` base path (configured in `apps/svg-playground/vite.config.ts`), so navigate to `http://localhost:5173/owlplot/` not just `/`.
- There is no lockfile in the repo; `npm install` generates `package-lock.json` locally.
- The existing codebase has ~40 pre-existing Prettier formatting lint errors. These are not regressions.
- Vitest uses a workspace-style project config in root `vitest.config.ts` with `jsdom` environment for `renderer-svg` tests and `node` for the rest.
- Playwright browser binaries are not installed by default; run `npx playwright install` before `npm run test:e2e`.
