# AGENTS.md

Guidance for coding agents operating in this repository.

## Project Snapshot

- Stack: Tauri v2 + React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui.
- Frontend source: `src/`.
- Backend source: `src-backend/`.
- Tauri/Rust source: `src-tauri/`.
- Package managers: `pnpm` (root app) and `bun` (`src-backend/`).
- TypeScript is in strict mode (`tsconfig.json`).
- Path alias: `@/*` -> `src/*`.

## Rule Files (Cursor / Copilot)

- No `.cursor/rules/` directory found.
- No `.cursorrules` file found.
- No `.github/copilot-instructions.md` file found.
- If any of these are added later, treat them as higher-priority project rules.

## Install & Setup Commands

- Install JS deps: `pnpm install`
- Install sidecar deps: `bun install` (run in `src-backend/`)
- Run web app only: `pnpm dev`
- Run sidecar backend (dev): `bun run dev` (run in `src-backend/`)
- Run Tauri desktop app (dev): `pnpm tauri dev`
- Build web app: `pnpm build`
- Preview web build: `pnpm preview`
- Build desktop app bundle: `pnpm tauri build`

## Lint / Typecheck / Test Commands

There is currently no dedicated ESLint or frontend test script in `package.json`.

- Typecheck frontend: `pnpm exec tsc --noEmit`
- Typecheck sidecar backend: `bunx tsc --noEmit` (run in `src-backend/`)
- Full frontend build check: `pnpm build`
- Rust compile check: `cargo check` (run in `src-tauri/`)
- Rust tests (all): `cargo test` (run in `src-tauri/`)
- Rust single test by name: `cargo test <test_name>`
- Rust single test by module filter: `cargo test <module_name>::`

Examples:

- `cargo test set_overlay_locked`
- `cargo test window_tests::`

If frontend tests are introduced later (Vitest/Jest), add commands here.

## Practical "Single Test" Guidance

- Frontend: no test runner configured yet, so no single-test command exists.
- Rust: use `cargo test <substring>` to run matching tests only.
- For noisy output, add `-- --nocapture` to Rust test commands.

## Build/Run Notes for Tauri

- Tauri config changes in `src-tauri/tauri.conf.json` require full app restart.
- Capability changes in `src-tauri/capabilities/*.json` require full app restart.
- Vite HMR does not apply Rust/backend changes; rerun `pnpm tauri dev` when needed.
- Sidecar code changes in `src-backend/` do not hot-reload inside a packaged Tauri sidecar process.
- Sidecar binaries for Tauri bundling should be placed under `src-tauri/binaries/` and referenced in `tauri.conf.json` `bundle.externalBin`.

## Code Organization Conventions

- Keep UI components in `src/components/ui/`.
- Keep app-level composition/state in `src/App.tsx` unless it grows too large.
- Keep shared helpers in `src/lib/`.
- Keep sidecar API/auth/chat code in `src-backend/src/`.
- Keep Tauri commands in `src-tauri/src/lib.rs` and register via `invoke_handler`.

## TypeScript Style Guidelines

- Prefer explicit domain types (`type`/`interface`) for state and props.
- Avoid `any`; use concrete types or generics.
- Keep reducer action types narrow and discriminated.
- Use `useCallback` for async handlers passed to child components.
- Use `useRef` for mutable handles (window/store instances).
- Check nullable refs before use.
- Use alias imports (`@/...`) for internal modules when practical.

## Imports & Module Conventions

- Group imports in this order:
  1) React / framework
  2) third-party packages
  3) local aliased imports (`@/...`)
- Keep import lists minimal; remove dead imports immediately.
- Prefer named imports unless default import is standard for the package.

## Naming Conventions

- Components: PascalCase (`TopBar`, `ChatPreview`).
- Hooks/handlers: camelCase (`handleToggleLock`, `applyLockState`).
- Constants: UPPER_SNAKE_CASE (`SETTINGS_FILE`).
- Types/interfaces: PascalCase (`WindowState`, `TopBarProps`).
- Rust commands/functions: snake_case (`set_overlay_locked`).

## Formatting Conventions

- Follow existing formatting in touched files.
- TS/TSX in app code currently uses semicolons; keep consistency per file.
- shadcn-generated files may use a slightly different style; do not mass-reformat.
- Keep lines readable; avoid dense nested ternaries.
- Prefer small, focused components over very long JSX blocks.

## Tailwind / Styling Conventions

- Use utility classes in JSX for component-local styling.
- Keep global/theme styles in `src/index.css` and Tailwind tokens in `tailwind.config.js`.
- Use `cn(...)` from `src/lib/utils.ts` for conditional classes.
- Reuse existing visual tokens and spacing patterns before introducing new ones.

## Error Handling & Async Behavior

- Wrap Tauri window/plugin calls in `try/catch` when failure is possible.
- Log actionable errors with context (`console.error("...", error)`).
- Avoid unhandled promises in event handlers; use `void` where appropriate.
- Keep state updates deterministic after async operations.

## Tauri-Specific Guidelines

- Any `window.*` API used from frontend must have matching capability permissions.
- When adding new window calls, update `src-tauri/capabilities/default.json`.
- When adding sidecars, keep `bundle.externalBin` in `src-tauri/tauri.conf.json` and `shell:allow-execute` in `src-tauri/capabilities/default.json` in sync.
- Sidecar spawn from frontend requires `@tauri-apps/plugin-shell` (JS) and `tauri-plugin-shell` (Rust plugin registration).
- Keep `invoke` command names and Rust command signatures in sync.
- Use debug-only MCP Bridge registration pattern already present in Rust.

## Rust Guidelines (src-tauri)

- Prefer `Result<_, String>` for simple command error surfacing to frontend.
- Gate platform-specific code with `#[cfg(...)]`.
- Keep unsafe blocks minimal and directly justified.
- Use `cargo fmt` style if Rust edits are substantial.

## What To Check Before Finishing a Change

- Frontend compiles: `pnpm build`
- Rust compiles when touched: `cargo check` in `src-tauri/`
- Sidecar typecheck passes when touched: `bunx tsc --noEmit` in `src-backend/`
- Capabilities updated for any new Tauri API usage.
- Sidecar permissions/config updated for any new sidecar process usage.
- No stale imports, dead code, or unused state/action variants.
- UI behavior validated for locked/unlocked flows.

## Agent Workflow Expectations

- Make the smallest safe change that solves the issue.
- Do not rewrite unrelated files.
- Preserve user-authored local changes.
- Prefer incremental refactors over broad rewrites.
- If introducing a new tool (lint/test), update this file with commands.
