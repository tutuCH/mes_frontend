
> **Target:** New codebase (React + shadcn/ui + Tailwind CSS)

> **Scope:** Profile management, password change, language/theme settings, subscription management

  

---

  

# 1. Page Summary

  

| Field | Value |

|-------|-------|

| **Page name** | Settings Page (設定頁面) |

| **Primary goal** | Allow users to manage personal information, security settings, app preferences, and subscription |

| **Route/path** | `/settings` |

| **Key entities** | User, UserProfile, Subscription, SubscriptionPlan, PasswordChangeRequest |

| **Dependencies** | AuthContext (user data, refreshUserData), useSubscription hook, subscriptionApi, i18next |

  

---

  

# 2. Information Architecture

  

## Major Regions (Top to Bottom)

  

| Region | Purpose | Appears When |

|--------|---------|--------------|

| **Page Header** | Displays page title and description | Always |

| **Tabs Navigation** | Toggle between Personal and Subscription settings | Always |

| **Personal Info Tab** | User profile, password, language, theme, logout | When "personal" tab active |

| **Subscription Tab** | Current subscription status, plan selection, management | When "subscription" tab active |

  

## Personal Info Tab Internal Structure

  

| Sub-region | Purpose | Appears When |

|------------|---------|--------------|

| **Alert Banner** | Success/error feedback | After form submission |

| **Personal Information Card** | Username, email form with save button | Always |

| **Application Settings Card** | Language toggle, theme toggle, logout button | Always |

| **Password Change Dialog** | Modal form for changing password | When "Change Password" clicked |

  

## Subscription Tab Internal Structure

  

| Sub-region | Purpose | Appears When |

|------------|---------|--------------|

| **Alert Banner** | Success/error feedback | After actions |

| **Current Status Card** | Subscription details, manage/cancel buttons | When has active subscription |

| **No Subscription Card** | Empty state message | When no active subscription |

| **Plan Selection Card** | Available plans grid with subscribe buttons | When no active subscription |

| **Cancel Confirmation Dialog** | Warning before canceling subscription | When "Cancel" clicked |

  

---

  

# 3. Layout & Grid

  

| Property | Value |

|----------|-------|

| **Overall layout type** | Centered, max-width container |

| **Max width** | `max-w-6xl` (72rem / 1152px) |

| **Side padding** | `p-6` (1.5rem / 24px) |

| **Header spacing** | `mb-8` (2rem / 32px) after title |

| **Tab list width** | `max-w-md` (28rem / 448px) |

| **Card spacing** | `space-y-6` (1.5rem) between cards |

| **Form grid** | `grid-cols-2` on md breakpoint for username/email |

| **Plan grid** | `grid-cols-2` on md, `grid-cols-3` on lg |

| **Z-index layers** | Dialog (50), Tabs (10), Card (1) |

  

---

  

# 4. Visual Design Tokens (Extracted)

  

## 4.1 Color Palette

  

| Token | HEX/RGB | Usage | States |

|-------|---------|-------|--------|

| `--primary` / `#0052FF` | Electric Blue | Primary buttons | Hover: `brightness-110` |

| `--destructive` / `#EF4444` | Red | Cancel buttons, error states | Hover: `bg-destructive` |

| `--background` / `#FAFAFA` | Warm off-white | Page background | N/A |

| `--card` / `#FFFFFF` | White | Card backgrounds | N/A |

| `--muted` / `#F1F5F9` | Slate-100 | Tab list background | N/A |

| `--border` / `#E2E8F0` | Slate-200 | Borders | N/A |

| `--foreground` / `#0F172A` | Slate-900 | Primary text | N/A |

| `--muted-foreground` / `#64748B` | Slate-500 | Secondary text, descriptions | N/A |

  

### Status Badge Colors

  

| Status | Badge Variant | Icon |

|--------|--------------|------|

| Active | `default` (blue/primary) | Check icon |

| Trialing | `secondary` (gray) | Check icon |

| Past Due | `destructive` (red) | AlertTriangle icon |

| Canceled | `outline` (gray border) | X icon |

| Inactive | `outline` (gray border) | X icon |

  

## 4.2 Typography

  

| Name | Font Size | Line Height | Weight | Usage |

|------|-----------|-------------|--------|-------|

| Page Title | 30px (1.875rem / `text-3xl`) | 1.2 | 700 (`font-bold`) | Main heading |

| Section Title | 24px (1.5rem / `text-2xl`) | 1.3 | 600 (`font-semibold`) | Card titles |

| Card Title | 16px+ (`text-lg`) | 1.5 | 600 (`font-semibold`) | Sub-headers |

| Body | 14px (0.875rem / `text-sm`) | 1.5 | 400 (`font-normal`) | Form labels, descriptions |

| Input | 14px (0.875rem) | 1.5 | 400 | Form inputs |

  

**Font families:**

- Display: `'Calistoga', Georgia, serif` (not used in settings)

- Sans: `'Inter', system-ui, sans-serif`

- Mono: `'JetBrains Mono', monospace` (not used in settings)

  

## 4.3 Elevation & Effects

  

| Effect | Value |

|--------|-------|

| **Card border** | `border` (1px solid `--border`) |

| **Border radius** | `--radius: 0.5rem` (8px) |

| **Tab list background** | `bg-muted` with `rounded-lg` |

| **Tab trigger active** | `bg-background` with `shadow` |

| **Button focus** | `ring-2 ring-ring ring-offset-2` |

| **Error input border** | `border-destructive` |

| **Disabled opacity** | `disabled:opacity-50` |

  

---

  

# 5. Component Inventory

  

## 5.1 SettingsPage (Main Container)

  

| Property | Value |

|----------|-------|

| **Location** | Main page component |

| **Props/data inputs** | None (uses i18n hook) |

| **Visual description** | Centered container with header + Card containing Tabs |

| **Variants** | N/A |

| **States** | Static, no local state |

| **Accessibility** | Semantic HTML, proper heading hierarchy |

  

## 5.2 PersonalInfoSection (Tab Content)

  

| Property | Value |

|----------|-------|

| **Location** | First tab content |

| **Props/data inputs** | None (uses AuthContext) |

| **Visual description** | Vertical stack of Cards: Personal Info + App Settings |

| **Variants** | N/A |

| **States** | Loading (i18n ready), Updating, Error, Success |

| **Accessibility** | Form labels, error announcements, ARIA attributes |

  

## 5.3 SubscriptionSection (Tab Content)

  

| Property | Value |

|----------|-------|

| **Location** | Second tab content |

| **Props/data inputs** | None (uses useSubscription hook) |

| **Visual description** | Current status card + plan grid (if no subscription) |

| **Variants** | Has subscription / No subscription |

| **States** | Loading, Error, Success, Creating checkout, Opening portal, Cancelling |

| **Accessibility** | Status badges, loading announcements |

  

## 5.4 Password Change Dialog

  

| Property | Value |

|----------|-------|

| **Location** | Modal overlay |

| **Props/data inputs** | `open` (boolean), `onOpenChange` (function) |

| **Visual description** | Centered dialog with 3 password inputs |

| **Variants** | N/A |

| **States** | Open, Closed, Submitting, Validation errors |

| **Accessibility** | Focus trap, labelled inputs, error announcements |

  

## 5.5 Cancel Subscription Dialog

  

| Property | Value |

|----------|-------|

| **Location** | Modal overlay |

| **Props/data inputs** | `open` (boolean), `onOpenChange` (function) |

| **Visual description** | Warning dialog with cancel confirmation |

| **Variants** | N/A |

| **States** | Open, Closed, Cancelling |

| **Accessibility** | Warning text, focus trap, destructive button styling |

  

## 5.6 Alert Banner

  

| Property | Value |

|----------|-------|

| **Location** | Top of each tab content |

| **Props/data inputs** | `variant` (default/destructive), children |

| **Visual description** | Colored banner with icon + text |

| **Variants** | Success (default), Error (destructive with red text) |

| **States** | Visible (when message exists), Hidden (null) |

| **Accessibility** | Role="alert", auto-announced to screen readers |

  

---

  

# 6. Detailed Region Specs

  

## 6.1 Page Header

  

```

div.container.max-w-6xl.mx-auto.p-6

├── div.mb-8

│ ├── h1.text-3xl.font-bold.tracking-tight

│ │ └── "{t('settings.title')}" // "設定" or "Settings"

│ └── p.text-muted-foreground.mt-2

│ └── "{t('settings.description')}"

```

  

**Spacing:** `p-6` (24px), `mb-8` (32px), `mt-2` (8px)

**Alignment:** Left-aligned

**Copy:**

- Title: "設定" (zh-TW) / "Settings" (en)

- Description: "管理您的個人資料、應用程式偏好設定和訂閱"

  

## 6.2 Tabs Navigation

  

```

Card.w-full

└── Tabs (defaultValue="personal")

├── div.border-b.px-6.py-3

│ └── TabsList.grid.w-full.max-w-md.grid-cols-2

│ ├── TabsTrigger (value="personal")

│ │ └── "{t('settings.tabs.personal')}" // "個人設定"

│ └── TabsTrigger (value="subscription")

│ └── "{t('settings.tabs.subscription')}" // "訂閱設定"

```

  

**Spacing:** `px-6 py-3` (24px/12px)

**Width:** `max-w-md` (448px)

**Copy:** "個人設定" (Personal), "訂閱設定" (Subscription)

**Interaction:** Click to switch tabs, active tab has `bg-background` + shadow

  

## 6.3 Alert Banner

  

```

Alert.{cn(

updateMessage.type === 'error' && "border-destructive/50 text-destructive dark:border-destructive"

)}

└── AlertDescription

└── {updateMessage.text}

```

  

**Conditional:** Only renders when `updateMessage !== null`

**Error variant:** `border-destructive/50 text-destructive`

**Success variant:** Default styling

**Placement:** Top of tab content, `space-y-6` before other elements

**Auto-dismiss:** No auto-dismiss (user must take action or navigate away)

  

## 6.4 Personal Information Card

  

```

Card

├── CardHeader

│ ├── CardTitle: "{t('personalSettings.personalInfo.title')}" // "個人資訊"

│ └── CardDescription: "{t('personalSettings.personalInfo.description')}"

└── CardContent

└── form.space-y-4

├── div.grid.gap-4.md:grid-cols-2

│ ├── div.space-y-2 (Username)

│ │ ├── Label.htmlFor="username"

│ │ │ └── "{t('personalSettings.personalInfo.username')}"

│ │ ├── Input (id="username", register)

│ │ │ └── validation: required, minLength: 2

│ │ └── p.text-sm.text-destructive (error)

│ │ └── {errors.username.message}

│ └── div.space-y-2 (Email)

│ ├── Label.htmlFor="email"

│ │ └── "{t('personalSettings.personalInfo.email')}"

│ ├── Input (type="email", register)

│ │ └── validation: required, pattern: email regex

│ └── p.text-sm.text-destructive (error)

│ └── {errors.email.message}

└── div.flex.gap-2

├── Button (type="submit", disabled={!isDirty || isUpdating})

│ ├── {isUpdating ? <Loader2 animate-spin /> : <Save />}

│ └── {isUpdating ? "更新中..." : "保存更改"}

└── Button (type="button", variant="outline", onClick=openPasswordDialog)

├── <Key />

└── "更改密碼"

```

  

**Spacing:** `space-y-4` (1rem), `gap-4` (1rem), `gap-2` (0.5rem)

**Grid:** `grid-cols-2` on md+ breakpoint

**Icons:** Save (16px), Key (16px), Loader2 (16px, spinning when loading)

**Validation:**

- Username: required, min 2 chars

- Email: required, email pattern

- Save button: disabled unless form is dirty

  

## 6.5 Application Settings Card

  

```

Card

├── CardHeader

│ ├── CardTitle: "{t('personalSettings.appSettings.title')}" // "應用程式設定"

│ └── CardDescription: "{t('personalSettings.appSettings.description')}"

└── CardContent.space-y-4

├── div.flex.items-center.justify-between (Language)

│ ├── div

│ │ ├── h4.text-sm.font-medium: "{t('personalSettings.appSettings.language.title')}"

│ │ └── p.text-sm.text-muted-foreground: "當前語言: {currentLanguage}"

│ └── Button (variant="outline", onClick=toggleLanguage)

│ ├── <Languages />

│ └── "{t('personalSettings.appSettings.language.switch')}" // "切換語言"

├── div.flex.items-center.justify-between (Theme)

│ ├── div

│ │ ├── h4.text-sm.font-medium: "{t('personalSettings.appSettings.theme.title')}"

│ │ └── p.text-sm.text-muted-foreground: "當前主題: {currentTheme}"

│ └── Button (variant="outline", onClick=toggleTheme)

│ ├── {isDarkMode ? <Sun /> : <Moon />}

│ └── {isDarkMode ? "淺色模式" : "深色模式"}

└── div.flex.items-center.justify-between.pt-4.border-t (Logout)

├── div

│ ├── h4.text-sm.font-medium: "{t('personalSettings.appSettings.logout.title')}"

│ └── p.text-sm.text-muted-foreground: "{t('personalSettings.appSettings.logout.description')}"

└── Button (variant="outline", onClick=logout)

├── className: "border-destructive text-destructive hover:bg-destructive"

├── <LogOut />

└── "{t('personalSettings.appSettings.logout.button')}" // "登出"

```

  

**Spacing:** `space-y-4` (1rem)

**Language toggle cycles:** zh-TW → zh-CN → en → zh-TW...

**Theme toggle:** Local state only (placeholder, not persisted)

**Logout button:** Destructive styling (red border/text)

**Icons:** Languages (16px), Sun/Moon (16px), LogOut (16px)

  

## 6.6 Password Change Dialog

  

```

Dialog (open={passwordDialogOpen}, onOpenChange={setPasswordDialogOpen})

└── DialogContent

├── DialogHeader

│ ├── DialogTitle: "{t('personalSettings.passwordDialog.title')}" // "更改密碼"

│ └── DialogDescription: "{t('personalSettings.passwordDialog.description')}"

├── form (onSubmit=handleSubmit)

│ └── div.space-y-4.py-4

│ ├── div.space-y-2 (Current Password)

│ │ ├── Label.htmlFor="currentPassword"

│ │ ├── Input (type="password", register)

│ │ │ └── validation: required

│ │ └── p.text-sm.text-destructive (error)

│ ├── div.space-y-2 (New Password)

│ │ ├── Label.htmlFor="newPassword"

│ │ ├── Input (type="password", register)

│ │ │ └── validation: required, minLength: 8

│ │ └── p.text-sm.text-destructive (error)

│ └── div.space-y-2 (Confirm Password)

│ ├── Label.htmlFor="confirmPassword"

│ ├── Input (type="password", register)

│ │ └── validation: required, validate: matches newPassword

│ └── p.text-sm.text-destructive (error)

└── DialogFooter

├── Button (variant="outline", type="button", onClick=close)

│ └── "{t('personalSettings.passwordDialog.cancel')}" // "取消"

└── Button (type="submit", disabled={isChangingPassword})

├── {isChangingPassword ? <Loader2 animate-spin /> : null}

└── {isChangingPassword ? "更改中..." : "更改密碼"}

```

  

**Spacing:** `space-y-4` inside form, `py-4` for form container

**Validation:**

- Current Password: required

- New Password: required, min 8 chars

- Confirm Password: required, must match new password

**Icons:** Loader2 (16px, spinning when submitting)

**On success:** Closes dialog, shows success alert, resets form

**On error:** Shows error alert, keeps dialog open

  

## 6.7 Current Subscription Status Card

  

```

Card

├── CardHeader

│ ├── CardTitle: "{t('subscription.currentStatus.title')}"

│ └── CardDescription: "{t('subscription.currentStatus.description')}"

└── CardContent

└── {isLoading ? (

├── div.flex.items-center.gap-2

│ ├── <Loader2 animate-spin />

│ └── "{t('subscription.loading')}"

) : hasActiveSubscription && subscription ? (

└── div.space-y-4

├── div.flex.items-center.gap-4

│ ├── div.flex.items-baseline.gap-1

│ │ ├── span.text-2xl.font-bold: "{formatPrice(plan.amount)}"

│ │ └── span.text-muted-foreground: "/ {interval}"

│ └── Badge (getStatusBadge(status))

│ ├── {icon}

│ └── {statusLabel}

├── p.text-sm.text-muted-foreground

│ └── "{currentPeriodStart} - {currentPeriodEnd}"

└── div.flex.gap-2

├── Button (onClick=manageSubscription, disabled={isOpeningPortal})

│ ├── {isOpeningPortal ? <Loader2 /> : <CreditCard />}

│ └── "{isOpeningPortal ? '開啟中...' : '管理訂閱'}"

└── Button (variant="outline", onClick=openCancelDialog)

├── className: "border-destructive text-destructive"

├── <X />

└── "{t('subscription.cancelSubscription')}"

) : (

└── div.text-center.py-6

├── p.text-muted-foreground: "{t('subscription.noActiveSubscription')}"

└── p.text-sm.text-muted-foreground: "{t('subscription.selectPlanToStart')}"

)}

```

  

**Spacing:** `space-y-4`, `gap-4`

**Icons:** Loader2 (16px), Check/X/AlertTriangle (12px in badge), CreditCard (16px)

**Status badge mapping:**

- `active`: default (blue), Check icon

- `trialing`: secondary (gray), Check icon

- `past_due`: destructive (red), AlertTriangle icon

- `canceled`: outline (gray), X icon

- `inactive`: outline (gray), X icon

**Date format:** `toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })`

**Price format:** TWD shows as `NT$ {price}`, others as `${price / 100}`

  

## 6.8 Plan Selection Card

  

```

Card (conditional: !hasActiveSubscription)

├── CardHeader

│ ├── CardTitle: "{t('subscription.planSelection.title')}"

│ └── CardDescription: "{t('subscription.planSelection.description')}"

└── CardContent

└── {plansError ? (

└── Alert (destructive)

├── <AlertTriangle />

└── {plansError}

) : plansLoading ? (

└── div.flex.items-center.justify-center.py-8

├── <Loader2 h-8 w-8 animate-spin />

└── "{t('subscription.loadingPlans')}"

) : (

└── div.grid.gap-6.md:grid-cols-2.lg:grid-cols-3

└── [plans.map(plan => (

└── Card (key={plan.id}).relative

├── CardHeader

│ └── CardTitle.flex.items-center.justify-between

│ ├── span: {plan.name}

│ └── div.text-right

│ ├── span.text-2xl.font-bold: "{formatPrice(plan.price)}"

│ └── span.text-muted-foreground.text-sm: "/{interval}"

└── CardContent.space-y-4

├── div.text-sm.text-muted-foreground

│ └── {plan.description}

├── ul.space-y-2 (features)

│ └── [plan.features.map(feature => (

│ └── li.flex.items-center.gap-2

│ ├── <Check className="text-primary" />

│ └── span.text-sm: {feature}

└── Button (className="w-full", onClick=subscribe, disabled=isCreating)

├── {isCreating ? <Loader2 animate-spin /> : <CreditCard />}

└── {isCreating ? "跳轉中..." : "立即升級"}

))]

)}

```

  

**Grid:** `grid-cols-1` → `md:grid-cols-2` → `lg:grid-cols-3`

**Card spacing:** `gap-6` (1.5rem)

**Plan card:** Nested Card component with no border

**Icons:** Check (16px, primary color), CreditCard (16px), Loader2 (16px)

**Button:** Full width (`w-full`)

**Loading:** Large spinner (`h-8 w-8`) centered with padding (`py-8`)

  

## 6.9 Cancel Subscription Dialog

  

```

Dialog (open={cancelDialogOpen}, onOpenChange={setCancelDialogOpen})

└── DialogContent

├── DialogHeader

│ ├── DialogTitle: "{t('subscription.cancelSubscription')}"

│ └── DialogDescription

│ ├── "{t('subscription.cancelConfirmation')}"

│ ├── "（{formatDate(currentPeriodEnd)}）"

│ └── "{t('subscription.cancelWarning')}"

└── DialogFooter

├── Button (variant="outline", onClick=close)

│ └── "{t('subscription.keepSubscription')}" // "保留訂閱"

└── Button (variant="destructive", onClick=confirmCancel, disabled=isCancelling)

├── {isCancelling ? <Loader2 animate-spin /> : null}

└── {isCancelling ? "取消中..." : "{t('subscription.actions.confirmCancel')}"}

```

  

**Variant:** Destructive (red) for confirm button

**Date formatting:** Shows period end date in parentheses

**Icons:** Loader2 (16px, spinning when cancelling)

**On confirm:** Calls API, closes dialog, shows success/error alert

  

---

  

# 7. Data & Behavior

  

## 7.1 Data Sources and Shape

  

### User Data Structure

  

```typescript

interface User {

id: string; // UUID from localStorage

email: string; // User email

username: string; // Display username

subscriptionStatus?: 'active' | 'inactive' | 'canceled' | 'past_due' | 'trialing';

subscriptionId?: string; // Stripe subscription ID

planType?: 'monthly' | 'yearly'; // Billing interval

subscriptionEndDate?: string; // ISO timestamp

}

```

  

### Subscription Data Structure

  

```typescript

interface SubscriptionResponse {

id: string; // Stripe subscription ID

status: string; // active, trialing, past_due, canceled, incomplete

currentPeriodStart: number; // Unix timestamp

currentPeriodEnd: number; // Unix timestamp

plan: {

id: string;

amount: number; // Price in cents (or TWD dollars)

currency: string; // usd, twd, etc.

interval: 'month' | 'year';

};

}

```

  

### Subscription Plan Structure

  

```typescript

interface SubscriptionPlan {

id: string; // Stripe lookup key

name: string; // Plan display name

price: number; // Price amount

currency: string; // usd, twd, etc.

interval: 'month' | 'year'; // Billing interval

description?: string; // Plan description

features: string[]; // Feature list

stripePlanId: string; // Same as id (lookup key)

}

```

  

### Password Change Request

  

```typescript

interface PasswordChangeRequest {

currentPassword: string;

newPassword: string;

}

```

  

### User Profile Update

  

```typescript

interface UserProfileUpdate {

username?: string;

email?: string;

}

```

  

## 7.2 API Endpoints

  

| Method | Endpoint | Purpose | Request Body | Response |

|--------|----------|---------|--------------|----------|

| GET | `/api/subscription/current` | Get current subscription | (auth header) | `SubscriptionResponse \| null` |

| GET | `/api/subscription/plans` | Get available plans | (auth header) | `SubscriptionPlan[]` |

| POST | `/api/subscription/create-checkout-session` | Create Stripe Checkout | `{lookupKey, successUrl, cancelUrl}` | `{url, sessionId}` |

| POST | `/api/subscription/create-portal-session` | Create Customer Portal | `{returnUrl}` | `{url}` |

| DELETE | `/api/subscription/{id}` | Cancel subscription | `{immediately: boolean}` | `void` |

| PUT | `/api/user/profile` | Update user profile | `{username?, email?}` | `void` |

| PUT | `/api/user/change-password` | Change password | `{currentPassword, newPassword}` | `void` |

  

**Authentication:** Bearer token in `Authorization` header from `localStorage.getItem('access_token')`

  

**Error handling (axios interceptor):**

- 401 → Clear auth data, redirect to `/login`

- Network errors → Logged but don't crash UI

  

## 7.3 Data Transformations

  

### Price Formatting

  

```typescript

function formatPrice(price: number, currency: string): string {

// TWD is stored in dollars, other currencies in cents

const displayPrice = currency.toUpperCase() === 'TWD' ? price : price / 100;

return currency.toUpperCase() === 'TWD' ? `NT$ ${displayPrice}` : `$${displayPrice}`;

}

```

  

### Date Formatting

  

```typescript

function formatDate(timestamp: number): string {

return new Date(timestamp * 1000).toLocaleDateString('zh-TW', {

year: 'numeric',

month: 'long',

day: 'numeric',

});

}

```

  

### Status Badge Mapping

  

```typescript

const statusMap = {

active: { label: 'Active', variant: 'default', icon: <Check /> },

trialing: { label: 'Trial', variant: 'secondary', icon: <Check /> },

past_due: { label: 'Past Due', variant: 'destructive', icon: <AlertTriangle /> },

canceled: { label: 'Canceled', variant: 'outline', icon: <X /> },

inactive: { label: 'Inactive', variant: 'outline', icon: <X /> },

};

```

  

## 7.4 Validation Rules

  

| Field | Validation | Error Message |

|-------|------------|---------------|

| **Profile - Username** | Required, min 2 chars | "用戶名為必填項", "用戶名至少需要2個字符" |

| **Profile - Email** | Required, email pattern | "電子郵件為必填項", "請輸入有效的電子郵件地址" |

| **Password - Current** | Required | "請輸入當前密碼" |

| **Password - New** | Required, min 8 chars | "請輸入新密碼", "密碼至少需要8個字符" |

| **Password - Confirm** | Required, must match new | "請確認新密碼", "密碼不匹配" |

  

**Email pattern:** `/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i`

  

## 7.5 Error Handling

  

| Scenario | Behavior | UI Feedback |

|----------|----------|-------------|

| Profile update success | Refresh user data, show success | Green alert with success message |

| Profile update failure | Log error, show error | Red alert with error message |

| Password change success | Close dialog, show success, reset form | Green alert |

| Password change failure | Keep dialog open, show error | Red alert |

| Subscription fetch failure | Show error state, empty subscription card | Red alert in subscription tab |

| Create checkout success | Redirect to Stripe Checkout | Window location change |

| Create checkout failure | Log error, show detailed error | Red alert with network/auth/payment hints |

| Open portal success | Redirect to Stripe Portal | Window location change |

| Cancel success | Refresh subscription, show success | Green alert |

| Cancel failure | Log error, show error | Red alert |

  

## 7.6 Loading Indicators

  

| Location | Style | Trigger |

|----------|-------|---------|

| Profile save | Spinner icon in button + "更新中..." text | `isUpdating === true` |

| Password submit | Spinner icon in button + "更改中..." text | `isChangingPassword === true` |

| Subscription load | Spinner + "載入中..." text | `isLoading === true` |

| Plans load | Centered large spinner + "載入方案中..." | `plansLoading === true` |

| Create checkout | Spinner in button + "跳轉中..." text | `isCreatingCheckout === true` |

| Open portal | Spinner in button + "開啟中..." text | `isOpeningPortal === true` |

| Cancel subscription | Spinner in button + "取消中..." text | `isCancelling === true` |

  

**Spinner component:** `<Loader2 className="h-4 w-4 animate-spin" />` (small) or `h-8 w-8` (large)

  

## 7.7 Empty States

  

| Component | Empty State | Copy |

|-----------|-------------|------|

| Subscription (no active) | Centered text with icon | "目前沒有活躍的訂閱", "選擇一個方案開始使用" |

| Plans list (error) | Error alert | "Failed to load plans" |

  

---

  

# 8. Responsive Behavior

  

## Breakpoints

  

| Breakpoint | Width | Changes |

|------------|-------|---------|

| **Mobile** | < 768px | Single column form, stacked buttons |

| **MD** | 768px+ | Profile form 2 columns, plans grid 2 columns |

| **LG** | 1024px+ | Plans grid 3 columns |

  

## Specific Responsive Changes

  

| Element | Mobile | Desktop |

|---------|--------|---------|

| Profile form | 1 column (`grid-cols-1`) | 2 columns (`md:grid-cols-2`) |

| Plans grid | 1 column | 2 columns (`md:grid-cols-2`) |

| Plans grid | 2 columns | 3 columns (`lg:grid-cols-3`) |

| Container padding | `p-6` (24px) | Same (`p-6`) |

| Tab list | Full width | `max-w-md` (448px) |

  

---

  

# 9. Accessibility & UX Checklist

  

## Keyboard Navigation

  

| Key | Action |

|-----|--------|

| `Tab` | Navigate through form fields, buttons, tabs |

| `Enter`/`Space` | Submit form, activate button |

| `Escape` | Close dialog (password or cancel) |

| `Arrow keys` | Navigate tabs (Radix Tabs default) |

  

**Focus order:** Page header → Tabs → Form fields → Action buttons

  

## Focus Styles

  

- All inputs: `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`

- All buttons: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`

- Tab triggers: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`

  

## Screen Reader Labels

  

- Tabs: Radix Tabs provides built-in ARIA

- Forms: All inputs have associated `<Label>` with `htmlFor`

- Dialogs: Radix Dialog provides focus trap and ARIA

- Alerts: `role="alert"` for auto-announcement

- Status badges: Icon + text for dual indication

  

## Focus Management

  

- **Dialog open:** Focus moves to first input

- **Dialog close:** Focus returns to trigger button

- **Tab change:** Focus moves to tab content

- **Form submit:** Focus stays on submit button (for repeated saves)

  

## Validation Feedback

  

- Errors: `text-destructive` color below input

- Error inputs: `border-destructive` + `focus-visible:ring-destructive`

- Success: Alert banner at top of tab content

- Disabled save button: When form not dirty (`!profileIsDirty`)

  

---

  

# 10. Analytics/Tracking

  

**No explicit analytics detected in source code.**

  

Recommend adding:

- Page view tracking on mount (Settings page)

- Tab switch tracking (Personal vs Subscription)

- Profile update events

- Password change events

- Subscription plan selection

- Checkout initiation

- Portal access

- Subscription cancellation

  

---

  

# 11. Acceptance Criteria (Testable)

  

## Visual Parity Checks

  

- [ ] Page title: "設定" or "Settings"

- [ ] Tabs navigation with 2 tabs: "個人設定" and "訂閱設定"

- [ ] Active tab has background color + shadow

- [ ] Cards have white background with border

- [ ] Form inputs have proper spacing (`space-y-2`)

- [ ] Buttons have icons (Save, Key, Languages, etc.)

- [ ] Alert banners show success/error with proper colors

- [ ] Plan cards show price + interval + features

- [ ] Status badges have icons (Check, X, AlertTriangle)

- [ ] Password dialog has 3 inputs stacked vertically

  

## Functional Parity Checks

  

- [ ] Page loads user data from AuthContext on mount

- [ ] i18n ready check prevents flash of missing translations

- [ ] Profile form pre-fills with current username/email

- [ ] Save button disabled unless form is dirty

- [ ] Profile update calls API and refreshes user data

- [ ] Password dialog opens when "Change Password" clicked

- [ ] Password validation matches all rules (length, confirmation)

- [ ] Password change success closes dialog and shows alert

- [ ] Language toggle cycles through zh-TW → zh-CN → en

- [ ] Theme toggle shows sun/moon icon (placeholder behavior)

- [ ] Logout calls AuthContext.logout() and redirects

- [ ] Subscription tab loads current subscription on mount

- [ ] Active subscription shows plan details + badges

- [ ] "Manage Subscription" opens Stripe portal

- [ ] "Cancel" opens confirmation dialog

- [ ] Cancel subscription shows warning with period end date

- [ ] No subscription shows plan selection grid

- [ ] Plan cards display price, description, features

- [ ] "Subscribe" button creates checkout and redirects

- [ ] All API calls use Bearer token from localStorage

  

## Form Validation Parity

  

- [ ] Username required: shows error message

- [ ] Username min 2 chars: shows error message

- [ ] Email required: shows error message

- [ ] Email invalid format: shows error message

- [ ] Current password required: shows error

- [ ] New password required: shows error

- [ ] New password min 8 chars: shows error

- [ ] Confirm password required: shows error

- [ ] Confirm password mismatch: shows error

  

## Loading State Parity

  

- [ ] Profile save shows spinner + "更新中..."

- [ ] Password submit shows spinner + "更改中..."

- [ ] Subscription load shows spinner + "載入中..."

- [ ] Plans load shows centered large spinner

- [ ] Create checkout shows spinner + "跳轉中..."

- [ ] Open portal shows spinner + "開啟中..."

- [ ] Cancel shows spinner + "取消中..."

  

## Error Handling Parity

  

- [ ] Profile update failure shows red alert

- [ ] Password change failure shows red alert (keeps dialog open)

- [ ] Subscription load failure shows red alert

- [ ] Plans load failure shows red alert with icon

- [ ] Checkout creation failure shows detailed error

- [ ] Portal open failure shows detailed error

  

## Responsive Parity

  

- [ ] Mobile: Form fields stacked (1 column)

- [ ] Desktop: Form fields side-by-side (2 columns)

- [ ] Mobile: Plans grid 1 column

- [ ] Tablet: Plans grid 2 columns

- [ ] Desktop: Plans grid 3 columns

- [ ] Tab list maintains max-width on desktop

  

## Edge Cases

  

- [ ] Empty username/email: Form pre-fills correctly

- [ ] No subscription: Shows empty state message

- [ ] Subscription past_due: Shows destructive badge

- [ ] Subscription canceled: Shows outline badge

- [ ] Plans API fails: Shows error alert

- [ ] Backend not running: Graceful degradation, null subscription

- [ ] Token expires during session: Redirects to login

  

---

  

# 12. Open Questions / Unknowns

  

| Question | How to Confirm |

|----------|----------------|

| **Exact subscription plan IDs** | Check Stripe Dashboard or backend config |

| **Plan features content** | Confirmed from backend API response |

| **Success/cancel URL handling** | Are `/subscription/success` and `/subscription/cancel` pages implemented? |

| **Theme persistence** | Is theme preference saved to localStorage or backend? |

| **Max subscription count per user** | Can user have multiple subscriptions? |

| **Subscription renewal behavior** | What happens when subscription auto-renews? |

| **Payment failure handling** | How are failed payments communicated to user? |

| **Plan upgrade/downgrade** | Can user change plan without canceling? |

| **Billing history** | Is there a billing history page/section? |

| **Password strength requirements** | Only min 8 chars, or complexity rules? |

  

---

  

# 13. Implementation Files Reference

  

## Source Files (For Reference During Migration)

  

| File | Purpose |

|------|---------|

| `src/pages/settings.tsx` | Main settings page with tabs |

| `src/sections/settings/personal-info-section.tsx` | Personal info tab content |

| `src/sections/settings/subscription-section.tsx` | Subscription tab content |

| `src/hooks/useSubscription.ts` | Subscription state management hook |

| `src/api/subscriptionServices.ts` | Subscription API calls |

| `src/contexts/AuthContext.tsx` | User data, logout, refresh |

| `src/i18n/locales/en.json` | English translations |

| `src/i18n/locales/zh-TW.json` | Traditional Chinese translations |

| `src/i18n/locales/zh-CN.json` | Simplified Chinese translations |

| `src/components/ui/tabs.tsx` | Radix Tabs wrapper |

| `src/components/ui/input.tsx` | Form input component |

| `src/components/ui/button.tsx` | Button with variants |

| `src/components/ui/card.tsx` | Card container component |

| `src/components/ui/dialog.tsx` | Modal dialog component |

| `src/components/ui/label.tsx` | Form label component |

| `src/components/ui/alert.tsx` | Alert banner component |

  

## Target Implementation Checklist

  

When implementing, ensure:

  

1. **Install dependencies:** `react-hook-form`, `@radix-ui/react-tabs`, `@radix-ui/react-dialog`

2. **Copy types:** User, SubscriptionResponse, SubscriptionPlan, PasswordChangeRequest interfaces

3. **Implement useSubscription hook:** Or adapt to your state management

4. **Create AuthContext equivalent:** For user data and logout

5. **Build components:** Start with PersonalInfoSection (simpler), then SubscriptionSection

6. **Add form validation:** Use react-hook-form with same rules

7. **Implement API layer:** Match all endpoints and error handling

8. **Add i18n:** Configure i18next with provided locale files

9. **Apply Tailwind config:** Copy color tokens and spacing

10. **Test dialogs:** Ensure focus traps and ARIA attributes

11. **Handle Stripe redirects:** Checkout success/cancel pages

12. **Implement theme toggle:** Replace placeholder with actual theme switching