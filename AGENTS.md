# AGENTS.md

This file guides automated coding agents working in `mes_frontend`.
It summarizes commands, conventions, and key patterns.

## Project Commands
- Install deps: `npm install`
- Dev server: `npm run dev` (Vite, http://localhost:5173)
- Production build: `npm run build` (runs `tsc -b` then `vite build`)
- Lint: `npm run lint` (ESLint flat config)
- Preview build: `npm run preview`

### Tests
- Test runner: Vitest.
- All tests: `npm run test`
- Watch mode: `npm run test:watch`
- Single test: `npm run test -- <pattern>`

## Language & Tooling
- React 19 + TypeScript (strict) + Vite.
- Module resolution: `moduleResolution: "bundler"`.
- Path alias: `@/` maps to `src/`.
- ESLint uses `@eslint/js`, `typescript-eslint`, `react-hooks`, `react-refresh`.
- No Prettier config found; keep formatting consistent with the file.

## Code Style & Formatting
- Indentation: 2 spaces.
- Quotes: single quotes in TS/TSX.
- Semicolons: most files omit; some legacy files include them—match local style.
- Trailing commas: use when it improves diff clarity; follow existing patterns.
- Prefer `const` and `function` components; avoid `var`.
- Use `type` imports (`import type { Foo } from ...`) for types.
- Keep React components as named exports (`export function Name`).
- Keep files focused; split UI, hooks, utils, and services.
- Only add comments when a non-obvious block needs explanation.

## Imports Order
- React/React hooks first.
- Third‑party libraries next.
- Internal aliases (`@/...`) after externals.
- Local relative imports last.
- Group imports with a blank line between groups if multiple groups exist.

## React & Components
- Functional components with hooks; avoid class components.
- Hooks at top-level, no conditional hooks.
- Use `react-hook-form` for complex forms.
- Use shadcn/ui components in `src/components/ui/`.
- Use Tailwind utility classes for styling.
- Avoid native emoji; use `lucide-react` icons instead.
- Prefer `cn` from `src/lib/utils` to compose class names.

## State Management
- Global state uses Redux Toolkit slices in `src/store/slices/`.
- Use `useDispatch<AppDispatch>` and `useSelector`.
- Prefer `createAsyncThunk` for async flows.
- Keep slice state serializable.

## API & Error Handling
- API client lives in `src/services/api.ts`.
- `api` handles token injection and common error toasts.
- Use `skipErrorToast: true` when the caller handles messaging.
- Prefer `toast` from `sonner` for user notifications.
- Log with `createLogger` (`src/utils/logger`) when appropriate.
- Handle fetch errors explicitly (network errors become user-facing toasts).

## WebSocket & Realtime Data
- WebSocket connection is global via `GlobalWebSocketManager`.
- Do NOT disconnect sockets on component unmount.
- Use `socketService` for subscribe/unsubscribe and event listeners.
- Always use field mapping utilities (`src/utils/fieldMapping.ts`) on socket data.
- Use `deviceId` for WebSocket operations, `id` for REST.

## Internationalization
- i18n uses `react-i18next` with `common` namespace.
- Components: `const { t } = useTranslation('common')`.
- Utilities/services: use `t` from `src/utils/i18n.ts`.
- Translation files live in `src/locales/{en,zh-TW,zh-CN}/common.json`.

## Types & Data Modeling
- Central API types are in `src/types/api.ts`.
- Prefer importing types from `@/types/api`.
- Avoid `any`; if necessary, justify and localize it.
- Use `Record<string, T>` for dynamic key maps.
- Use `Partial<T>` for patch payloads and update merges.

## Naming Conventions
- Files: `PascalCase` for components, `camelCase` for hooks/utils.
- Components: `PascalCase`.
- Hooks: `useXyz` prefix.
- Redux slices: `fooSlice.ts`.
- CSS classes: Tailwind utilities; avoid custom CSS unless required.

## Error Boundaries & Resilience
- Use `src/components/ui/ErrorBoundary` for high-level failures.
- Prefer graceful fallback UI with meaningful copy.
- Use `retryWithBackoff` for retryable async flows.

## Data & Field Mapping
- Normalize backend payloads through `normalizeRealtimeData`/`normalizeSPCData`.
- Use `mapToMachineStatus`/`mapToOpMode` when translating statuses.
- Keep mapping logic in `src/utils/fieldMapping.ts`.

## Files & Layout
- Routes live in `src/pages/`.
- Layout wrappers live in `src/layouts/`.
- Factory UI components: `src/components/factory/`.
- Machine detail UI: `src/components/machine/`.
- SPC charts/logic: `src/components/spc/` + `src/utils/spcCalculator.ts`.
- Services live in `src/services/`.
- Hooks live in `src/hooks/`.

## UI/UX
- Use shadcn/ui primitives; customize with Tailwind.
- Use `sonner` toasts for user feedback.
- Keep forms accessible (`label` + `id` pairs).
- Use `LoadingScreen` or local spinners for async loads.

## Miscellaneous
- Keep auth routes outside `GlobalWebSocketManager`.
- Token key is `auth_token` in `localStorage`.
- Follow `AuthContext` patterns for login/logout.
- Avoid creating docs outside `/mesObsidianDocs` for documentation tasks.

## Adding New Scripts
- Update `package.json` scripts and note in this file.
- Prefer `npm` scripts over ad-hoc shell commands.

## Git Hygiene (for agents)
- Do not commit unless explicitly asked.
- Keep diffs minimal and focused on the requested change.

## When Unsure
- Match the surrounding file style.
- Ask for clarification on API behavior or UI copy.
- Keep changes consistent with existing patterns.

## Reference Files
- `package.json` (scripts/dependencies)
- `eslint.config.js` (lint rules)
- `tsconfig.app.json` (TS compiler rules)
- `src/services/api.ts` (error handling patterns)
- `src/services/socket.ts` (WebSocket service)
- `src/utils/fieldMapping.ts` (data normalization)
- `src/components/ui/` (design system)
- `CLAUDE.md` (architecture overview)

## Rule Files
- `.cursor/rules/`, `.cursorrules`, and `.github/copilot-instructions.md` not present.
- If added later, summarize them here.

## Important notes
- when testing backend api, whenever there's a need for auth token, use the following account to call login api to retrieve auth token
  testing account
    - email: tuchenhsien@gmail.com
    - password: abc123
