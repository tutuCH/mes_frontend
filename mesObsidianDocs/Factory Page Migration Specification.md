
> **Target:** New codebase (React + shadcn/ui + Tailwind CSS)

> **Scope:** Full CRUD operations, WebSocket integration, drag-and-drop

  

---

  

# 1. Page Summary

  

| Field | Value |

|-------|-------|

| **Page name** | Factory Management Page (工廠頁面) |

| **Primary goal** | Allow users to manage factories, position machines on a grid floor plan, and monitor real-time machine status via WebSocket |

| **Route/path** | `/factory` or `/factory/:factoryId` |

| **Key entities** | Factory, Machine, MachinePosition, WebSocketRealtimeData, WarningCriteria |

| **Dependencies** | REST API (`/machines`, `/factories`), WebSocket (`realtime-update`, `spc-update`), AuthContext (userId), WebSocketContext |

  

---

  

# 2. Information Architecture

  

## Major Regions (Top to Bottom)

  

| Region | Purpose | Appears When |

|--------|---------|--------------|

| **Page Header** | Displays page title "工廠" (Factory) | Always |

| **WebSocket Status Panel** | Shows connection status, event counters, last data received, subscribed machines | Always |

| **Factory Selector Dropdown** | Filter view to specific factory or show all | When >1 factory exists |

| **Factory Cards** (repeating) | Container for each factory with its grid layout | One per factory |

| **Add Factory Button** | Creates new factory | Only when "All Factories" selected |

  

## Factory Card Internal Structure

  

| Sub-region | Purpose | Appears When |

|------------|---------|--------------|

| **Factory Header** | Dark gradient bar with factory name, dimensions, machine count, delete button | Always |

| **Controls & Legend Bar** | Status legend dots + Refresh + Settings buttons | Always |

| **Scrollable Grid Area** | Blueprint-patterned factory floor with machine cards | Always |

| **Instruction Footer** | "Drag machines to reposition" hint text | Always |

  

---

  

# 3. Layout & Grid

  

| Property | Value |

|----------|-------|

| **Overall layout type** | Fluid width, centered container |

| **Max width** | `100%` (no max-width constraint on factory page) |

| **Side padding** | `px-4 sm:px-6` (1rem/1.5rem) |

| **Grid system** | CSS Grid with dynamic columns based on factory dimensions |

| **Factory grid cell size** | `minmax(4rem, 6rem)` = 64px to 96px wide |

| **Grid gaps** | `gap-1` = 0.25rem (4px) |

| **Spacing scale** | Tailwind default: 0.25rem, 0.5rem, 1rem, 1.5rem, 2rem, 3rem |

| **Z-index layers** | Modal (50), Dropdown (40), Tooltip (30), Card (10), Grid base (1) |

  

---

  

# 4. Visual Design Tokens (Extracted)

  

## 4.1 Color Palette

  

| Token | HEX/RGB | Usage | States |

|-------|---------|-------|--------|

| `--primary` / `#0052FF` | Electric Blue | Primary buttons, links | Hover: `brightness-110` |

| `--success` / `#0D9488` | Teal | Online status | N/A |

| `--warning` / `#F59E0B` | Amber | Warning status | N/A |

| `--destructive` / `#EF4444` | Red | Error/offline status | N/A |

| `--background` / `#FAFAFA` | Warm off-white | Page background | N/A |

| `--card` / `#FFFFFF` | White | Card backgrounds | N/A |

| `--muted` / `#F1F5F9` | Slate-100 | Disabled backgrounds | N/A |

| `--border` / `#E2E8F0` | Slate-200 | Borders, dividers | N/A |

| `--foreground` / `#0F172A` | Slate-900 | Primary text | N/A |

| `--muted-foreground` / `#64748B` | Slate-500 | Secondary text | N/A |

  

### Status-Specific Colors

  

| Status | Border | Background | Icon |

|--------|--------|------------|------|

| Online | `border-teal-300` | `from-teal-50 to-teal-100` | `text-teal-600` |

| Offline | `border-gray-300` | `from-gray-50 to-gray-100` | `text-gray-500` |

| Running | `border-green-300` | `from-green-50 to-green-100` | `text-green-600` |

| Warning | `border-amber-300` | `from-amber-50 to-amber-100` | `text-amber-600` |

| Error | `border-red-300` | `from-red-50 to-red-100` | `text-red-600` |

  

## 4.2 Typography

  

| Name | Font Size | Line Height | Weight | Letter Spacing | Usage |

|------|-----------|-------------|--------|----------------|-------|

| Display (h1, h2) | 24px+ | 1.2 | 700 | -0.01em | Headings |

| Body (default) | 14px (0.875rem) | 1.5 | 400 | normal | Body text |

| Small | 12px (0.75rem) | 1.5 | 400 | normal | Meta, hints |

| Mono (data) | 14px | 1.5 | 400 | normal | Numbers, IDs |

  

**Font families:**

- Display: `'Calistoga', Georgia, serif`

- Sans: `'Inter', system-ui, sans-serif`

- Mono: `'JetBrains Mono', monospace`

  

## 4.3 Elevation & Effects

  

| Effect | Value |

|--------|-------|

| **Shadow sm** | `0 1px 2px 0 rgb(0 0 0 / 0.05)` |

| **Shadow md** | `0 4px 6px -1px rgb(0 0 0 / 0.1)` |

| **Shadow accent** | `0 4px 14px rgba(0, 82, 255, 0.25)` |

| **Border radius** | `--radius: 0.5rem` (8px) |

| **Border width** | 1px (default), 2px (factory card) |

| **Border style** | `solid` (most), `dashed` (machine cards) |

| **Transitions** | `duration-200 ease-out` |

  

---

  

# 5. Component Inventory

  

## 5.1 FactoryWebSocketStatus (Debug Panel)

  

| Property | Value |

|----------|-------|

| **Location** | Top of page, below page header |

| **Props/data inputs** | `isConnected`, `isConnecting`, `error`, `realtimeCount`, `spcCount`, `lastRealtime`, `lastSpc`, `subscribedMachines` |

| **Visual description** | Multi-panel dashboard with connection badge, event counters, error alerts, last data displays, subscription list |

| **Variants** | Connecting (spinner), Connected (green badge), Disconnected (red badge) |

| **States** | Connecting, Connected, Disconnected, Error |

| **Accessibility** | ARIA labels on badges, error descriptions |

  

## 5.2 FactoryCard (Main Container)

  

| Property | Value |

|----------|-------|

| **Location** | Repeating component in main content |

| **Props/data inputs** | `factory` (object), `factoryIndex` (number), `machines` (array) |

| **Visual description** | Card with dark slate header, white body, bordered scrollable grid area |

| **Variants** | N/A |

| **States** | Empty (no machines), Has machines |

| **Accessibility** | `role="region"`, `aria-label="Factory {name}"` |

  

## 5.3 MachineStatusCard

  

| Property | Value |

|----------|-------|

| **Location** | Inside grid cells |

| **Props/data inputs** | `machine` (object), `realtimeData` (object), `isConnected` (boolean), `deviceId` (string) |

| **Visual description** | Dashed border card with icon + machine name, status-colored border and gradient, delete button on hover |

| **Variants** | Online (teal), Offline (gray), Running (green), Warning (amber), Error (red) |

| **States** | Idle, Dragging (`opacity-50`), Connected, Disconnected |

| **Accessibility** | `aria-label`, tooltip with full machine info |

| **Drag & Drop** | Uses `react-dnd` `useDrag` hook, type: `MACHINE` |

  

## 5.4 EmptyGridCell (Drop Target)

  

| Property | Value |

|----------|-------|

| **Location** | Grid cells without machines |

| **Props/data inputs** | `index` (number), `coordinate` (string, e.g., "A1") |

| **Visual description** | Dashed border, blue-themed, plus button icon, coordinate label |

| **Variants** | N/A |

| **States** | Hover (`bg-blue-50/80`), IsOver (drop target preview) |

| **Accessibility** | `aria-label="Add machine at {coordinate}"` |

| **Drag & Drop** | Uses `react-dnd` `useDrop` hook, accepts: `MACHINE` |

  

## 5.5 MachineDialog (Add/Edit Machine)

  

| Property | Value |

|----------|-------|

| **Location** | Modal overlay |

| **Props/data inputs** | `open` (boolean), `factory` (object), `factoryIndex` (number), `machineIndex` (number), `setFactories` (function) |

| **Visual description** | Centered modal (425px wide) with form fields, test connection button |

| **Variants** | Add mode, Edit mode (not fully implemented in source) |

| **States** | Idle, Testing connection (spinner), Submitting (disabled), Validation errors |

| **Accessibility** | Dialog focus trap, labelled inputs, error announcements |

  

## 5.6 FactoryDialog (Settings)

  

| Property | Value |

|----------|-------|

| **Location** | Modal overlay |

| **Props/data inputs** | `open` (boolean), `factory` (object), `isEditMode` (boolean), `factories` (array) |

| **Visual description** | Wide modal (600px) with tabs: "Factory Info" and "Warning Criteria" |

| **Variants** | Create mode, Edit mode |

| **States** | Idle, Submitting, Validation errors |

| **Accessibility** | Tabs with ARIA, accordion sections, labelled inputs |

  

## 5.7 FactorySelector (Dropdown)

  

| Property | Value |

|----------|-------|

| **Location** | Below WebSocket panel |

| **Props/data inputs** | `factories` (array), `selectedFactoryIndex` (number) |

| **Visual description** | Shadcn Select with 180px trigger |

| **Variants** | N/A |

| **States** | Open, Closed |

| **Accessibility** | Native select behavior |

  

---

  

# 6. Detailed Region Specs

  

## 6.1 Page Header

  

```

div.container.mx-auto.px-4.py-8

└── div.flex.flex-row.items-center.justify-between.mb-10

└── h1.text-2xl.font-bold.tracking-tight

└── "{t('pages.factory')}" // "工廠" in zh-CN

```

  

**Spacing:** `mb-10` (2.5rem) before main content

**Alignment:** Left

**Copy:** From i18n: `pages.factory`

  

## 6.2 WebSocket Status Panel

  

```

div.mb-4.space-y-3

├── Connection Status Row

│ ├── div.flex.items-center.gap-2

│ │ ├── Badge (connecting/connected/disconnected)

│ │ │ ├── connecting: spinner + "Connecting..."

│ │ │ ├── connected: Wifi icon + "Connected ({count} subscriptions)"

│ │ │ └── disconnected: WifiOff icon + "Disconnected"

│ │ └── Badge variant: secondary/destructive/default

│ └── div.flex.items-center.gap-4.text-sm

│ ├── Activity icon (green) + "Realtime: {count}"

│ └── Activity icon (blue) + "SPC: {count}"

├── Error Alert (conditional)

│ └── Alert variant="destructive"

│ ├── AlertCircle icon

│ └── "WebSocket Error: {error}"

├── Debug Grid (2 columns)

│ ├── Last Realtime Card

│ │ └── p-2.bg-green-50.rounded.border

│ │ ├── "🔄 Last Realtime (Device {deviceId})"

│ │ ├── "STS: {sts} | T1: {t1}°C | OT: {ot}°C"

│ │ └── timestamp.toLocaleTimeString()

│ └── Last SPC Card

│ └── p-2.bg-blue-50.rounded.border

│ ├── "📊 Last SPC (Device {deviceId})"

│ ├── "CYCN: {cycn} | ECYCT: {ecyct}s"

│ └── timestamp.toLocaleTimeString()

└── Subscription List

└── p-2.bg-gray-50.rounded.border

├── "🏭 Factory Machines ({count} subscribed)"

└── grid.grid-cols-2.lg:grid-cols-4

└── Each: div.h-2.w-2.rounded-full.{green/gray} + deviceId

```

  

**Spacing:** `gap-3` between rows, `gap-4` between counters, `p-2` inside cards

**Alignment:** Left-aligned content, space-between on status row

**Copy:** "Connecting...", "Connected", "Disconnected", "Realtime", "SPC"

**Icons:** Wifi (16px), WifiOff (16px), Activity (12px), AlertCircle (16px)

**Interaction:** Click on subscription items does nothing (display only)

  

## 6.3 Factory Selector

  

```

div.flex.justify-between.items-center.mb-4

└── Select (shadcn)

├── SelectTrigger: className="w-[180px]"

└── SelectContent

├── SelectItem value="-1": "{t('factory.allFactories')}"

└── [factories.map]

└── SelectItem value={index}: {factory.factoryName}

```

  

**Spacing:** `mb-4` (1rem)

**Alignment:** Right-aligned

**Width:** 180px fixed

**Copy:** "全部廠區" (All Factories), factory names

  

## 6.4 Factory Card - Header

  

```

Card.overflow-hidden.border-2.border-gray-200

└── div.bg-gradient-to-r.from-slate-800.to-slate-700.p-3.sm:p-4.text-white

└── div.flex.flex-wrap.items-center.justify-between.gap-3.sm:gap-4

├── Left Group: div.flex.items-center.gap-2.sm:gap-3

│ ├── div.flex.h-8.w-8.sm:h-10.sm:w-10.rounded-full.bg-white/10

│ │ └── FactoryIcon (4w-5/5w-5)

│ └── div

│ ├── h3.text-base.sm:text-lg.font-semibold

│ │ └── {factory.factoryName || `Factory ${factoryIndex + 1}`}

│ └── div.flex.items-center.gap-2.text-xs.text-slate-300

│ ├── Badge.bg-white/20: "{width}×{height}"

│ ├── span: "•"

│ └── span: "{machineCount} {t('factoryView.machines')}"

└── Right Group: div.flex.items-center.gap-2

└── Button.variant="destructive".size="sm" (conditional)

└── Trash2 icon + "{t('factoryView.deleteFactory')}"

```

  

**Spacing:** `p-3 sm:p-4` (0.75rem/1rem), `gap-3 sm:gap-4`

**Alignment:** Space-between, left group on left, delete button right

**Gradient:** `from-slate-800 to-slate-700` (dark industrial theme)

**Copy:** Factory name, dimensions, machine count, "刪除廠區" (Delete Factory)

**Icons:** Factory (16px/20px), Trash2 (12px/16px)

**Conditional:** Delete button only shows when `machines.length === 0`

**Interaction:** Click delete → `removeCurrentFactory()` → API call + state update

  

## 6.5 Factory Card - Legend & Controls Bar

  

```

div.border-b.bg-slate-50.p-3.sm:p-4

└── div.flex.flex-col.sm:flex-row.sm:items-center.justify-between.gap-3.sm:gap-4

├── Legend: div.flex.flex-wrap.items-center.gap-3.sm:gap-4.text-xs.sm:text-sm

│ ├── div.flex.items-center.gap-1

│ │ ├── div.h-2.5.w-2.5.sm:h-3.sm:w-3.rounded-full.bg-green-400.ring-2.ring-green-200

│ │ └── span: "{t('factoryView.online')}"

│ ├── div.flex.items-center.gap-1

│ │ ├── div (gray for offline)

│ │ └── span: "{t('factoryView.offline')}"

│ ├── div.flex.items-center.gap-1

│ │ ├── div (amber for warning)

│ │ └── span: "{t('factoryView.warning')}"

│ └── div.flex.items-center.gap-1

│ ├── div (red for error)

│ └── span: "{t('factoryView.error')}"

└── Controls: div.flex.items-center.gap-2

├── Button.variant="outline".size="sm"

│ ├── RefreshCw icon

│ └── span: "{t('factoryView.refresh')}"

└── Button.variant="outline".size="sm".onClick={handleEditFactory}

├── Cog icon

└── span: "{t('factoryView.settings')}"

```

  

**Spacing:** `p-3 sm:p-4`, `gap-3 sm:gap-4` (legend items)

**Alignment:** Legend left, controls right (desktop); stacked (mobile)

**Copy:** "線上", "離線", "警告", "錯誤", "刷新", "設定"

**Icons:** RefreshCw (12px/16px), Cog (12px/16px)

**Legend dots:** 10px/12px with `ring-2` border

  

## 6.6 Factory Card - Grid Area (Blueprint)

  

```

ScrollArea.w-full.rounded-md.border

└── div.p-2.sm:p-4

└── div.relative

├── Blueprint Background (absolute inset-0)

│ ├── bg-blue-50

│ └── style.backgroundImage: grid pattern

│ └── linear-gradient(rgba(59,130,246,0.1) 1px, transparent 1px)

│ └── linear-gradient(90deg, rgba(59,130,246,0.1) 1px, transparent 1px)

│ └── backgroundSize: 20px 20px

└── div.relative

├── Column Headers: div.mb-1.sm:mb-2.ml-8.sm:ml-10.grid

│ └── [width columns]

│ └── div.flex.h-5.sm:h-6.items-center.justify-center.rounded.bg-blue-100/50

│ └── text-xs.sm:text-sm.font-medium.text-blue-800

│ └── {String.fromCharCode(65 + colIndex)} // A, B, C...

├── div.flex

│ ├── Row Headers: div.mr-1.sm:mr-2.sm:mt-2.flex.flex-col.gap-1

│ │ └── [height rows]

│ │ └── div.flex.h-16.sm:h-20.md:h-24.w-5.sm:w-6.items-center.justify-center.rounded.bg-blue-100/50

│ │ └── text-xs.sm:text-sm.font-medium.text-blue-800

│ │ └── {rowIndex + 1} // 1, 2, 3...

│ └── Grid: div.grid.gap-1.rounded-md.bg-white/80.p-1.sm:p-2.shadow-sm

│ └── style.gridTemplateColumns: `repeat(${width}, minmax(4rem, 6rem))`

│ └── style.gridTemplateRows: `repeat(${height}, auto)`

│ └── [width × height cells]

│ ├── If machine exists:

│ │ └── MachineStatusCard (see below)

│ └── If empty:

│ └── DropTarget

│ └── div.flex.h-full.w-full.flex-col.items-center.justify-center.rounded-md.border.border-dashed.border-blue-300.bg-white

│ ├── Button.variant="ghost".size="icon"

│ │ └── Plus icon (3w-3/4w-4)

│ └── span.mt-1.text-10px.sm:text-xs.text-blue-600/70

│ └── {coordinate} // "A1", "B2"...

```

  

**Spacing:** `p-2 sm:p-4`, `gap-1` (grid), `mb-1 sm:mb-2` (col headers)

**Cell sizes:** Dynamic: `minmax(4rem, 6rem)` = 64px-96px

**Row heights:** `h-16 sm:h-20 md:h-24` = 64px/80px/96px

**Header cells:** `h-5 sm:h-6` × `w-5 sm:w-6`

**Blueprint pattern:** 20px grid, `rgba(59,130,246,0.1)` color

**Interaction:** Click empty cell → Open MachineDialog

  

## 6.7 Machine Status Card (Inside Grid)

  

```

Link.to={`/machine/${machineId}`}

└── Card (with drag ref)

└── className.cn(

"w-full h-full",

"flex flex-col items-center justify-between",

"p-1 sm:p-2",

"border border-dashed",

"rounded-xl",

"transition-all duration-200 ease-out",

"hover:shadow-md hover:-translate-y-0.5",

statusConfig.className, // dynamic status styling

isDragging && "opacity-50",

"relative group"

)

├── Delete Button (absolute top-right, opacity-0 group-hover:opacity-100)

│ └── Button.variant="ghost".size="icon"

│ ├── className: "h-4 w-4 sm:h-5 sm:w-5 rounded-full hover:bg-black/10 p-0"

│ ├── X icon (3w-3/4w-4, text-red-500)

│ └── onClick: handleDelete (stopPropagation)

├── Content: div.flex.flex-col.items-center.justify-center.w-full.h-full

│ ├── Pulsing Indicator (absolute top-left, conditional)

│ │ └── span.animate-pulse-indicator.h-2.w-2.rounded-full

│ │ └── bg-{status}-500 (green/amber/red)

│ ├── Icon: div.text-center.mb-0.5.sm:mb-1

│ │ └── StatusIcon.h-4.w-4.sm:h-5.sm:w-5.{statusConfig.iconClass}

│ └── Name: span.font-medium.text-center.text-10px.sm:text-xs.leading-tight.max-w-full.truncate.px-1

│ └── {machine.machineName}

└── Tooltip (hover)

└── TooltipContent.p-3.space-y-1.5

├── Name row

├── IP row (font-mono)

├── Status row (badge)

├── WebSocket row (badge)

└── Realtime data (conditional)

├── T1: {value}°C

├── Oil Temp: {value}°C

├── Mode: Manual/Semi-auto/Auto

└── Updated: {timestamp}

```

  

**Spacing:** `p-1 sm:p-2`, `mb-0.5 sm:mb-1`

**Sizes:** Full `h-full w-full` of grid cell

**Icons:** 16px/20px depending on breakpoint

**Delete button:** 16px/20px, rounded-full, top-right absolute

**Pulse indicator:** 8px, top-left absolute

**Transition:** `duration-200 ease-out`

**Hover:** `shadow-md -translate-y-0.5`

**Dragging:** `opacity-50`

  

## 6.8 Factory Instruction Footer

  

```

div.mt-3.sm:mt-4.flex.items-center.gap-1.sm:gap-2.text-xs.sm:text-sm.text-slate-500

├── Info icon (h-3 w-3 sm:h-4 sm:w-4)

└── p: "{t('factoryView.dragInstruction')}"

```

  

**Spacing:** `mt-3 sm:mt-4`, `gap-1 sm:gap-2`

**Icon:** 12px/16px

**Copy:** "拖拽機器到不同位置以重新排列" (Drag machines to rearrange)

  

## 6.9 Add Factory Button

  

```

div (when selectedFactoryIndex === -1)

└── Button.className="w-full".onClick={handleAddFactory}

├── Plus icon (mr-2 h-4 w-4)

└── span: "{t('factory.addFactory')}"

```

  

**Width:** Full width `w-full`

**Copy:** "新廠區" (New Factory) / "添加工厂" (Add Factory)

**Icon:** Plus (16px)

  

---

  

# 7. Data & Behavior

  

## 7.1 Data Sources and Shape

  

### Factory Data Structure

  

```typescript

interface Factory {

id: string; // UUID from backend

factoryId: string; // Same as id

factoryName: string; // User-defined name

factoryIndex: number; // Position in factories array

factoryWidth: number; // Grid columns (e.g., 5)

factoryHeight: number; // Grid rows (e.g., 3)

userId: string; // Owner ID from localStorage

machines?: Machine[]; // Array of machines in this factory

warningCriteria?: WarningCriteria; // Alert thresholds

}

```

  

### Machine Data Structure

  

```typescript

interface Machine {

id: string; // UUID

machineId: string; // Same as id

machineName: string; // User-defined name

machineIpAddress: string; // OPC UA endpoint (opc.tcp://...)

machineIndex: number; // Grid position (0 to width*height-1)

factoryId: string; // Parent factory ID

factoryIndex: number; // Parent factory position

warningCriteria?: WarningCriteria; // Machine-specific overrides

}

```

  

### WebSocket Realtime Data

  

```typescript

interface MachineRealtimeData {

devId: string; // Device ID (format: "postgres machine {machineId}")

topic: "realtime" | "spc";

timestamp: number; // Unix timestamp

Data: {

STS: number; // Status: 0=offline, 1=online, 2=running, 3=warning

OT?: number; // Oil Temperature (°C)

OPM?: number; // Operation Mode: -1=stopped, 0=manual, 1=auto, 2=setup

T1-T7?: number; // Temperature zones (°C)

};

lastUpdated?: string; // ISO timestamp for cached data

}

```

  

## 7.2 API Endpoints

  

| Method | Endpoint | Purpose | Request Body | Response |

|--------|----------|---------|--------------|----------|

| GET | `/machines/factories-machines` | Fetch all factories + machines | (auth header) | `Factory[]` |

| POST | `/machines` | Create machine | `{machineIpAddress, machineName, machineIndex, factoryId, factoryIndex}` | `{machineId}` |

| DELETE | `/machines/{machineId}` | Delete machine | (auth header) | `{status, message}` |

| POST | `/machines/update-index` | Move machine | `{machineId, machineIndex, factoryId}` | `{status, message}` |

| POST | `/factories` | Create factory | `{factoryName, factoryIndex, width, height}` | `{factoryId}` |

| PATCH | `/factories/{factoryId}` | Update factory | `{factoryName, width, height}` | `{factoryId, factoryName, width, height}` |

| DELETE | `/factories/{factoryId}` | Delete factory | (auth header) | `{status, message}` |

| POST | `/opcua/connect` | Test OPC UA connection | `{endpoint}` | `{success, message}` |

| POST | `/opcua/disconnect` | Close OPC UA connection | `{endpoint}` | `{success, message}` |

  

**Authentication:** Bearer token in `Authorization` header from `localStorage.getItem('access_token')`

  

## 7.3 WebSocket Events

  

| Event | Direction | Data Shape | Purpose |

|-------|-----------|------------|---------|

| `subscribe-machine` | Client→Server | `{deviceId}` | Subscribe to machine updates |

| `unsubscribe-machine` | Client→Server | `{deviceId}` | Unsubscribe from updates |

| `get-machine-status` | Client→Server | `{deviceId}` | Request current status |

| `realtime-update` | Server→Client | `WebSocketEventData` | Live machine data |

| `spc-update` | Server→Client | `WebSocketEventData` | SPC metrics |

| `machine-status` | Server→Client | `WebSocketEventData` | Status response |

| `subscription-confirmed` | Server→Client | `{deviceId}` | Subscription acknowledgment |

  

**Device ID format:** `"postgres machine {machineId}"` (e.g., "postgres machine 79")

  

## 7.4 Transformations

  

1. **Grid coordinate calculation:**

- Column: `index % width` → `String.fromCharCode(65 + column)` (A, B, C...)

- Row: `Math.floor(index / width)` → row number (1, 2, 3...)

- Coordinate: `"{columnLabel}{rowNumber}"` (e.g., "B2")

  

2. **Status derivation from STS:**

```typescript

const statusMap = { 0: 'offline', 1: 'online', 2: 'running', 3: 'warning' };

return statusMap[sts] ?? 'offline';

```

  

3. **Machine sorting:**

```typescript

machines.sort((a, b) => a.machineIndex - b.machineIndex);

```

  

## 7.5 Validation Rules

  

| Field | Validation | Error Message |

|-------|------------|---------------|

| `factoryName` | 2-50 chars, alphanumeric + Chinese + `-/_` | "Factory name must be 2-50 characters, valid characters only" |

| `machineName` | 2-50 chars, alphanumeric + Chinese + `-/_` | "Machine name must be 2-50 characters, valid characters only" |

| `machineIpAddress` | Regex: `^opc\.tcp:\/\/[\w.-]+(:\d+)?(\/.*)?$` | "Please enter a valid OPC UA endpoint (e.g., opc.tcp://192.168.1.100:4840)" |

| `factoryWidth` | Min: 1 | "Width must be at least 1" |

| `factoryHeight` | Min: 1 | "Height must be at least 1" |

| **Factory size** | `width × height >= max(machineIndex) + 1` | "Factory size too small for existing machines" |

  

## 7.6 Error Handling

  

| Scenario | Behavior | UI Feedback |

|----------|----------|-------------|

| API failure | Console error, no state change | No explicit UI (silent fail) |

| WebSocket disconnect | Stop updates, show disconnected badge | Red badge, error message if available |

| Invalid OPC UA endpoint | Block form submission | Inline error text below input |

| Factory too small | Alert and block update | `alert(t('factory.sizeError'))` |

| Machine delete failure | Console error | No explicit UI |

  

## 7.7 Loading Indicators

  

| Location | Style | Trigger |

|----------|-------|---------|

| Page load | Full skeleton | `isLoading === true` |

| Test connection | Spinner in button | `isTesting === true` |

| Add machine | Button text change | `isSubmitting === true` |

| WebSocket connecting | Spinner in badge | `isConnecting === true` |

  

## 7.8 Empty States

  

| Component | Empty State | Copy |

|-----------|-------------|------|

| Page | No factories | Shows "Add Factory" button |

| Factory | No machines | Grid with empty cells showing "+" |

| WebSocket | No data yet | Shows "Connecting..." badge |

  

---

  

# 8. Responsive Behavior

  

## Breakpoints

  

| Breakpoint | Width | Changes |

|------------|-------|---------|

| **Mobile** | < 640px | Single column, stacked layout, smaller fonts, touch targets |

| **SM** | 640px+ | Horizontal legend in factory card, larger grid cells |

| **MD** | 768px+ | Full grid headers visible, row height increases |

| **LG** | 1024px+ | Subscription grid shows 4 columns (vs 2 on mobile) |

  

## Specific Responsive Changes

  

| Element | Mobile | Desktop |

|---------|--------|---------|

| Factory header padding | `p-3` (12px) | `p-4` (16px) |

| Machine card padding | `p-1` (4px) | `p-2` (8px) |

| Icon sizes | `h-4 w-4` (16px) | `h-5 w-5` (20px) |

| Text sizes | `text-xs` (12px) | `text-sm` (14px) |

| Machine name | `text-[10px]` | `text-xs` |

| Grid cell heights | `h-16` (64px) | `h-20` (80px) or `h-24` (96px) |

| Legend/controls | Stacked | Horizontal |

| Delete button text | Hidden | "Delete Factory" visible |

| Subscription grid | 2 columns | 4 columns |

  

---

  

# 9. Accessibility & UX Checklist

  

## Keyboard Navigation

  

| Key | Action |

|-----|--------|

| `Tab` | Navigate through interactive elements (buttons, inputs, grid cells) |

| `Enter`/`Space` | Activate focused button/link |

| `Escape` | Close modal dialogs |

| `Arrow keys` | Navigate within dropdown (native select behavior) |

  

**Focus order:** Page → WebSocket panel → Factory selector → Factory card (header → controls → grid) → Add factory button

  

## Focus Styles

  

- All buttons: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`

- Inputs: `focus-visible:ring-2 focus-visible:ring-ring`

- Grid cells: Focus outline on empty cells, card focus on machines

  

## Screen Reader Labels

  

- Page region: `role="region" aria-label="Factory management"`

- Factory cards: `aria-label="Factory {name} with {count} machines"`

- Machine cards: `aria-label="{machineName}, status {status}"`

- Empty cells: `aria-label="Add machine at {coordinate}"`

- Status badges: `aria-label="Connection status: {status}"`

  

## Contrast

  

- All text meets WCAG AA (4.5:1 for normal text, 3:1 for large)

- Status indicators use both color AND icon/label

- Blueprints use subtle pattern with sufficient contrast

  

## Reduced Motion

  

```css

@media (prefers-reduced-motion: reduce) {

.animate-pulse-indicator,

.hover-lift:hover {

animation/transform: none;

}

}

```

  

---

  

# 10. Analytics/Tracking

  

**No explicit analytics detected in source code.**

  

Recommend adding:

- Page view tracking on mount

- Machine add/delete events

- Factory create/delete events

- WebSocket connection events

- Error tracking for API failures

  

---

  

# 11. Acceptance Criteria (Testable)

  

## Visual Parity Checks

  

- [ ] Page title matches source: "工廠" / "Factory"

- [ ] WebSocket panel matches layout: badges, counters, debug cards

- [ ] Factory cards have dark slate gradient header with proper spacing

- [ ] Grid uses blueprint pattern (blue-50 background with grid lines)

- [ ] Column headers are A, B, C... and row headers are 1, 2, 3...

- [ ] Machine cards have dashed borders, status colors, and hover effects

- [ ] Status legend dots are correct colors: green (online), gray (offline), amber (warning), red (error)

- [ ] Buttons match shadcn variants: outline for refresh/settings, destructive for delete

- [ ] Typography matches: Inter for body, Calistoga for headings, JetBrains Mono for data

  

## Functional Parity Checks

  

- [ ] Page loads factories from `/machines/factories-machines` on mount

- [ ] WebSocket connects and subscribes to all machines on load

- [ ] Factory selector dropdown filters factories correctly

- [ ] Clicking empty grid cell opens MachineDialog

- [ ] MachineDialog validates OPC UA endpoint format

- [ ] Test connection button shows loading state and result

- [ ] Adding machine updates state and API immediately

- [ ] Machine cards show real-time status from WebSocket data

- [ ] Dragging machine to new cell updates position

- [ ] Delete button (hover) removes machine from state and API

- [ ] Settings button opens FactoryDialog with current values

- [ ] FactoryDialog validates factory size against existing machines

- [ ] Warning criteria tabs function with all accordion items

- [ ] Copy/paste settings buttons work within dialog

- [ ] Add factory button creates new factory and opens dialog

- [ ] All API calls use Bearer token from localStorage

  

## Responsive Parity Checks

  

- [ ] Mobile: Elements stack vertically, proper padding adjustments

- [ ] Mobile: Button text hides, icons only for some buttons

- [ ] Mobile: Grid cells remain touch-friendly (minimum 44px tap targets)

- [ ] Desktop: Legend and controls appear in single row

- [ ] Desktop: Grid row heights increase to `h-20` or `h-24`

- [ ] Desktop: Delete factory button shows text label

  

## WebSocket Parity Checks

  

- [ ] Connecting state shows spinner badge

- [ ] Connected state shows green badge with subscription count

- [ ] Disconnected state shows red badge

- [ ] Realtime updates change machine status colors

- [ ] SPC updates are tracked (count increases)

- [ ] Last realtime/SPC cards show data and timestamp

- [ ] Subscription list shows all subscribed device IDs

- [ ] Machine cards show live data in tooltip

  

## Edge Cases

  

- [ ] Factory with no machines: shows empty grid

- [ ] No factories exist: shows only "Add Factory" button

- [ ] WebSocket disconnect: machines show as offline

- [ ] Invalid factory size in edit: alert and prevent save

- [ ] Machine name with Chinese characters: validates correctly

- [ ] Very long machine names: truncate in card, full in tooltip

  

---

  

# 12. Open Questions / Unknowns

  

| Question | How to Confirm |

|----------|----------------|

| **Exact grid cell dimensions** | Measure from screenshots or inspect browser devtools |

| **Blueprint grid pattern exact opacity** | Inspect computed CSS on `background-image` |

| **Machine card exact hover animation values** | Test in browser or verify with design |

| **WebSocket reconnection behavior** | Test with network throttling |

| **Max factories/machines per user** | Check backend API limits or documentation |

| **Factory size limits** | Test creating very large factories (e.g., 20×20) |

| **Machine name exact max length** | Confirm with backend validation rules |

| **Warning criteria functionality** | Is this fully implemented or UI only? |

| **Export/sharing features** | Are there any export or sharing capabilities not visible? |

| **Permission/role-based access** | Do different users see different options? |

  

---

  

# Implementation Files Reference

  

## Source Files (For Reference During Migration)

  

| File | Purpose |

|------|---------|

| `src/sections/factory/factory.tsx` | Main factory component |

| `src/sections/factory/machine-status-card.tsx` | Machine grid card |

| `src/sections/factory/machine-dialog.tsx` | Add/edit machine modal |

| `src/sections/factory/factory-dialog.tsx` | Factory settings modal |

| `src/sections/factory/view/factory-view.jsx` | Page wrapper with layout |

| `src/api/machinesServices.ts` | REST API calls |

| `src/services/websocketService.ts` | WebSocket singleton |

| `src/contexts/WebSocketContext.tsx` | WebSocket React context |

| `src/utils/validation.ts` | Form validation functions |

| `src/types/index.ts` | TypeScript interfaces |

| `src/i18n/locales/en.json` | English translations |

| `src/i18n/locales/zh-CN.json` | Simplified Chinese |

| `src/i18n/locales/zh-TW.json` | Traditional Chinese |

| `tailwind.config.js` | Design system config |

| `src/global.css` | Global styles and animations |

  

## Target Implementation Checklist

  

When implementing, ensure:

  

1. **Install dependencies:** `react-dnd`, `react-dnd-html5-backend`, `socket.io-client`

2. **Copy types:** All interfaces from `types/index.ts` related to Factory, Machine, WarningCriteria

3. **Copy validation functions:** `validateOpcUaEndpoint`, `validateMachineName`, `validateFactoryName`

4. **Implement WebSocket service:** Copy or adapt `websocketService.ts` singleton pattern

5. **Create WebSocket context:** Implement provider with same event listeners

6. **Build components:** Start with MachineStatusCard (simplest), then work up

7. **Add drag-and-drop:** Use `react-dnd` with HTML5Backend

8. **Test API integration:** Ensure all endpoints match

9. **Add i18n:** Configure i18next with provided locale files

10. **Apply Tailwind config:** Copy color tokens and custom animations