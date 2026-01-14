# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MES (Manufacturing Execution System) Dashboard - A real-time factory monitoring system built with React, TypeScript, and Vite. Features include factory floor visualization, machine monitoring, OEE metrics, SPC (Statistical Process Control) analysis, alarm management, and multi-language support (English, Traditional Chinese, Simplified Chinese).

## Development Commands

```bash
# Start dev server (default: http://localhost:5173)
npm run dev

# Type-check and build for production
npm run build

# Lint code
npm run lint

# Preview production build locally
npm run preview
```

## Environment Setup

Copy `.env.example` to `.env.development` or `.env.production` and configure:
- `VITE_API_URL` - Backend API endpoint (default: http://localhost:3000)
- `VITE_WS_URL` - WebSocket server URL (default: http://localhost:3000)
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID (optional for SSO)

## Architecture

### State Management

**Redux Toolkit** is used for global state management with the following slices:
- `machineSlice` - Machine data, status updates, realtime metrics
- `factorySlice` - Factory configurations, subscribed machines
- `userSlice` - User management data (admin features)
- `alarmSlice` - Alarm history and active alarms

Access state via `useSelector` and dispatch actions via `useDispatch<AppDispatch>`.

### WebSocket Architecture

**Critical**: WebSocket connection is managed globally and persists across the entire application:

1. **GlobalWebSocketManager** (`src/components/GlobalWebSocketManager.tsx`) - Wraps protected routes in `App.tsx`, initializes the WebSocket connection once at startup
2. **socketService** (`src/services/socket.ts`) - Singleton service managing Socket.IO connection with:
   - Auto-reconnection logic
   - Keep-alive ping mechanism (30s intervals)
   - Machine subscription tracking
   - Auth token integration
3. **useRealtimeData** hook (`src/hooks/useRealtimeData.ts`) - Connects to socket, subscribes to all machines, processes events (realtime-update, spc-update, machine-status, machine-alert, alarm-update)

**WebSocket Events Flow**:
- Backend emits: `realtime-update`, `spc-update`, `machine-status`, `machine-alert`, `alarm-update`
- Frontend emits: `subscribe-machine`, `unsubscribe-machine`, `ping`
- Connection lifecycle: connect → subscribe to machines → receive updates → persist globally

**Important**: Do NOT disconnect WebSocket on component unmount. The connection is shared across all pages and managed by GlobalWebSocketManager.

### Authentication & Routing

- **AuthContext** (`src/context/AuthContext.tsx`) - Manages user session, JWT token storage, login/logout
- **api.ts** (`src/services/api.ts`) - REST API client with automatic token injection, error handling, toast notifications
- Auth routes (login, signup, etc.) are OUTSIDE GlobalWebSocketManager - no WebSocket before authentication
- Protected routes are INSIDE GlobalWebSocketManager - WebSocket connects after successful login
- Token stored in localStorage as `auth_token`, used for both REST API and WebSocket auth

### Data Flow & Field Mapping

Backend and frontend use different field naming conventions. The **fieldMapping** utilities (`src/utils/fieldMapping.ts`) normalize data:
- `normalizeRealtimeData()` - Maps backend realtime fields to frontend format
- `normalizeSPCData()` - Maps backend SPC fields to frontend format
- `mapToMachineStatus()` - Converts status codes to machine states
- `mapToOpMode()` - Converts operation mode codes

**Always use field mapping utilities when processing WebSocket events or API responses.**

### Internationalization (i18n)

- **i18next** with react-i18next for translations
- Default language: Traditional Chinese (`zh-TW`)
- Translation files: `src/locales/{en,zh-TW,zh-CN}/common.json`
- Use `useTranslation()` hook in components: `const { t } = useTranslation('common')`
- For utilities/services, use `t()` from `src/utils/i18n.ts`
- LanguageContext provides language switching via `useLanguage()` hook

### UI Components

Using **shadcn/ui** components (Radix UI primitives + Tailwind CSS):
- All UI components in `src/components/ui/`
- Styled with Tailwind utility classes and `class-variance-authority`
- Toast notifications via `sonner` library
- Path alias `@/` points to `src/` directory

### Key Utilities

- `src/utils/gridUtils.ts` - Grid coordinate calculations for factory floor layout
- `src/utils/spcCalculator.ts` - Statistical Process Control calculations (control limits, capability indices)
- `src/utils/nelsonRules.ts` & `src/utils/westernElectricRules.ts` - SPC rule violation detection
- `src/utils/positionUtils.ts` - Machine positioning utilities for factory floor
- `src/utils/exportExcel.ts` - Export data to Excel using xlsx library

## Important Patterns

### Machine Identification

Machines have TWO identifiers:
- `id` - Database primary key (number)
- `deviceId` - Machine name used for WebSocket subscriptions (string)

**Always use `deviceId` for WebSocket operations** and `id` for REST API operations.

### Error Handling

API errors are automatically handled by `api.ts`:
- 401 Unauthorized → Clear token, redirect to `/login`
- 403 Forbidden → Show permission error toast
- 404 Not Found → Show not found error
- 500+ Server errors → Show generic server error

Errors display toast notifications by default. Use `skipErrorToast: true` option to suppress.

### Realtime Updates

When working with realtime data:
1. Subscribe to machines via `socketService.subscribeToMachine(deviceId)`
2. Listen for events via `socketService.on(eventName, callback)`
3. Use field mapping to normalize incoming data
4. Update Redux store via `updateMachineStatus` action
5. Unsubscribe on cleanup via `socketService.unsubscribeFromMachine(deviceId)`

### Component Structure

- `src/pages/` - Top-level route components
- `src/components/factory/` - Factory floor visualization components
- `src/components/dashboard/` - Dashboard metrics and tiles
- `src/components/machine/` - Machine detail view components
- `src/components/spc/` - Statistical Process Control charts and analysis
- `src/components/auth/` - Authentication-related components
- `src/layouts/` - Layout wrappers (DashboardLayout with navigation)

## Type Definitions

Comprehensive TypeScript types in `src/types/api.ts`:
- API request/response types
- WebSocket event payloads
- User, Factory, Machine interfaces
- Historical data query parameters

Always import types from `@/types/api` when working with API/WebSocket data.

### Important Note
- avoid using native emoji, use lucide-react icon instead
- for all documents generation and retrieval, always do under the folder /MES Dashboard
