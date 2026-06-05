---
name: ui-typography-rules
description: Guidelines for typography styling. Enforces standard Tailwind CSS text sizes and prohibits custom text sizes and tracking classes.
---

# UI Typography Rules

This skill enforces consistent typography practices across the client application. It ensures standard Tailwind CSS text size utility classes are used exclusively, and bans custom text sizes and tracking utility classes.

## Guidelines

### 1. Default Tailwind CSS Font Sizes Only
Always use standard Tailwind CSS classes to size text. Do NOT use arbitrary values (e.g. `text-[10px]`, `text-[13px]`, `text-[11px]`) or inline styling (`style={{ fontSize: ... }}`).

**Allowed classes:**
- `text-xs` (0.75rem / 12px)
- `text-sm` (0.875rem / 14px)
- `text-base` (1rem / 16px)
- `text-lg` (1.125rem / 18px)
- `text-xl` (1.25rem / 20px)
- `text-2xl` (1.5rem / 24px)
- `text-3xl` (1.875rem / 30px)
- `text-4xl` (2.25rem / 36px)
- `text-5xl` (3rem / 48px)
- `text-6xl` (3.75rem / 60px)

**Banned practices:**
- `text-[10px]` &rarr; Use `text-xs`
- `text-[11px]` &rarr; Use `text-xs`
- `text-[13px]` &rarr; Use `text-xs` or `text-sm`
- `text-[15px]` &rarr; Use `text-sm` or `text-base`
- `text-[0.7rem]` &rarr; Use `text-xs`

### 2. No Tracking (Letter-Spacing) Classes
Do NOT use any tracking utility classes. Let the default font tracking settings handle the letter spacing.

**Banned classes:**
- `tracking-tighter`
- `tracking-tight`
- `tracking-normal`
- `tracking-wide`
- `tracking-wider`
- `tracking-widest`

## Examples of Refactoring

### Typography Sizes Refactoring
```diff
- <span className="text-[10px] text-muted-foreground">
+ <span className="text-xs text-muted-foreground">
```

### Tracking Class Removal
```diff
- <h1 className="text-4xl font-extrabold tracking-tight">
+ <h1 className="text-4xl font-extrabold">
```
