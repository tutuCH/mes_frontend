# I18n Missing Keys Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add missing i18n keys to all locale `common.json` files so UI strings resolve correctly.

**Architecture:** Update static translation dictionaries in `src/locales/*/common.json` with the missing keys found in code usage. Keep structure consistent with existing JSON nesting and naming patterns.

**Tech Stack:** React 19, TypeScript, i18next JSON dictionaries.

### Task 1: Update English locale keys

**Files:**
- Modify: `src/locales/en/common.json`

**Step 1: Identify missing keys in English locale**

Use the missing-key list from the debug report to locate key paths.

**Step 2: Add missing keys with English strings**

Add each missing key with appropriate English values.

**Step 3: Validate JSON formatting**

Ensure valid JSON and consistent ordering/indentation.

**Step 4: Verify keys cover login/auth/settings/common/machine**

Re-check key coverage for `login.*`, `auth.*`, `settings.payment.*`, `common.unlimited`, `machine.name`.

**Step 5: Commit**

```bash
git add src/locales/en/common.json
git commit -m "fix: add missing en locale keys"
```

### Task 2: Update zh-TW locale keys

**Files:**
- Modify: `src/locales/zh-TW/common.json`

**Step 1: Identify missing keys in zh-TW locale**

Use the same key list to locate key paths.

**Step 2: Add missing keys with English fallback strings**

Add each missing key using English strings temporarily, per requirement.

**Step 3: Validate JSON formatting**

Ensure valid JSON and consistent ordering/indentation.

**Step 4: Verify keys cover login/auth/settings/common/machine**

Re-check key coverage for `login.*`, `auth.*`, `settings.payment.*`, `common.unlimited`, `machine.name`.

**Step 5: Commit**

```bash
git add src/locales/zh-TW/common.json
git commit -m "fix: add missing zh-TW locale keys"
```

### Task 3: Update zh-CN locale keys

**Files:**
- Modify: `src/locales/zh-CN/common.json`

**Step 1: Identify missing keys in zh-CN locale**

Use the same key list to locate key paths.

**Step 2: Add missing keys with English fallback strings**

Add each missing key using English strings temporarily, per requirement.

**Step 3: Validate JSON formatting**

Ensure valid JSON and consistent ordering/indentation.

**Step 4: Verify keys cover login/auth/settings/common/machine**

Re-check key coverage for `login.*`, `auth.*`, `settings.payment.*`, `common.unlimited`, `machine.name`.

**Step 5: Commit**

```bash
git add src/locales/zh-CN/common.json
git commit -m "fix: add missing zh-CN locale keys"
```
