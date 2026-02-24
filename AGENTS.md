# AGENTS.md

Guidance for coding agents operating in this repository.

## Project Snapshot

- Stack: Tauri v2 + React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui.
- Frontend source: `src/`.
- Backend source: `src-backend/` (Bun + Hono + Twurple).
- Tauri/Rust source: `src-tauri/`.
- Package managers: `pnpm` (root app) and `bun` (`src-backend/`).
- TypeScript is in strict mode with `noUnusedLocals`, `noUnusedParameters`.
- Path alias: `@/*` -> `src/*`.


## Install & Setup Commands

- Install JS deps: `pnpm install`
- Install sidecar deps: `bun install` (run in `src-backend/`)
- Run web app only: `pnpm dev`
- Run sidecar backend (dev): `bun run dev` (run in `src-backend/`)
- Run Tauri desktop app (dev): `pnpm tauri dev`
- Build web app: `pnpm build`
- Build sidecar binary: `bun run build:sidecar` (run in `src-backend/`)
- Build desktop app bundle: `pnpm tauri build`

## Lint / Typecheck / Test Commands

- Typecheck frontend: `pnpm exec tsc --noEmit`
- Typecheck sidecar backend: `bunx tsc --noEmit` (run in `src-backend/`)
- Full frontend build check: `pnpm build`
- Rust compile check: `cargo check` (run in `src-tauri/`)
- Rust tests (all): `cargo test` (run in `src-tauri/`)
- Rust single test: `cargo test <test_name>` or `cargo test <module>::`
- Rust test with output: `cargo test <name> -- --nocapture`

No ESLint or frontend test runner configured yet.

## Code Organization

- UI components: `src/components/ui/` (shadcn-generated).
- App-level state: `src/App.tsx`.
- Shared helpers: `src/lib/`.
- Sidecar API: `src-backend/src/index.ts`.
- Tauri commands: `src-tauri/src/lib.rs`, registered via `invoke_handler`.

## TypeScript Style

- Prefer `type` for simple shapes, `interface` for props/extendable types.
- Avoid `any`; use concrete types or generics.
- Use discriminated unions for reducer actions.
- Use `useCallback` for async handlers passed to children.
- Check nullable refs before use (`if (ref.current)`).
- Use alias imports (`@/...`) for internal modules.

## Imports Order

1. React / framework (`react`, `react-dom`)
2. Third-party packages (`@tauri-apps/...`, `hono`)
3. Local aliased imports (`@/...`)
4. Relative imports (`./foo`)

Remove unused imports immediately—TS strict mode will error.

## Naming Conventions

- Components: PascalCase (`TopBar`, `ChatPreview`)
- Hooks/handlers: camelCase (`handleToggleLock`, `ensureSidecarReady`)
- Constants: UPPER_SNAKE_CASE (`SIDECAR_HEALTH_URL`)
- Types/interfaces: PascalCase (`ChatMessage`, `TopBarProps`)
- Rust functions: snake_case (`now_ms`, `run`)
- File names: match primary export (`sidecar.ts`, `button.tsx`)

## Formatting

- Follow existing style in touched files.
- TS/TSX uses semicolons; keep consistency.
- shadcn files omit semicolons—do not mass-reformat.
- Keep lines readable; avoid dense nested ternaries.

## React / Component Patterns

- Use `React.forwardRef` for reusable UI components (shadcn pattern).
- Set `displayName` on forwarded components: `Button.displayName = "Button"`.
- Use `cn()` from `@/lib/utils` for conditional class merging.
- Prefer small, focused components over long JSX blocks.

## Tailwind / Styling

- Use utility classes in JSX for component-local styling.
- Theme tokens: `src/index.css` (CSS variables) + `tailwind.config.js`.
- Reuse existing color tokens (`primary`, `accent`, `destructive`) before adding new ones.
- Use responsive/variant utilities via `class-variance-authority` for component variants.

## Error Handling & Async

- Wrap Tauri/invoke calls in `try/catch` when failure is possible.
- Log errors with context: `console.error("[sidecar]", error)`.
- Use `void` for fire-and-forget async in handlers: `void onToggleLock()`.
- Keep state updates deterministic after async operations.

## Tauri-Specific Guidelines

- Any `window.*` API from frontend requires capability permissions.
- Update `src-tauri/capabilities/default.json` for new window calls.
- Sidecar spawn requires `shell:allow-spawn` permission with `sidecar: true`.
- Keep `tauri.conf.json` `bundle.externalBin` in sync with sidecar binary names.
- Use `__TAURI_INTERNALS__` to detect Tauri runtime at JS level.

## Rust Guidelines

- Prefer `Result<_, String>` for command errors surfaced to frontend.
- Gate platform code with `#[cfg(target_os = "windows")]`.
- Keep `unsafe` blocks minimal and justified.
- Use `cargo fmt` for substantial Rust edits.
- Use `Arc<AtomicBool>` for thread-safe state shared across callbacks.

## Sidecar / Backend Patterns

- Sidecar runs on `127.0.0.1:3187` by default (configurable via `--port`).
- Health endpoint: `GET /health` returns `{ ok: true }`.
- Use `fetch` from frontend to communicate; poll for readiness.
- Log sidecar output with `[sidecar]` prefix for traceability.

## Pre-Commit Checklist

- [ ] `pnpm build` succeeds (frontend compiles)
- [ ] `cargo check` passes (if Rust touched, run in `src-tauri/`)
- [ ] `bunx tsc --noEmit` passes (if sidecar touched, run in `src-backend/`)
- [ ] Capabilities updated for new Tauri API usage
- [ ] No stale imports or unused variables
- [ ] Sidecar binary path matches `tauri.conf.json` if new sidecar added

## Agent Workflow

- Make the smallest safe change that solves the issue.
- Do not rewrite unrelated files.
- Preserve user-authored local changes.
- Prefer incremental refactors over broad rewrites.
- If introducing a new tool (lint/test), update this file.
