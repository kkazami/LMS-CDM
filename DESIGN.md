---
name: Lumina LMS
description: Adaptive multi-tenant learning management system with institute-differentiated aesthetics and interactive coursework labs.
colors:
  primary: "#FF7517"
  primary-hover: "#EA580C"
  primary-subtle: "rgba(249, 115, 22, 0.10)"
  accent-ibe: "#D4A017"
  accent-ibe-hover: "#E0B84B"
  accent-ite: "#2563EB"
  accent-ite-hover: "#3B82F6"
  neutral-canvas: "#F8FAFC"
  neutral-surface: "#FFFFFF"
  neutral-elevated: "#FFFFFF"
  neutral-dark-canvas: "#0B0D13"
  neutral-dark-surface: "#141721"
  neutral-dark-elevated: "#1C2030"
  border-subtle: "#E2E8F0"
  border-dark: "rgba(255, 255, 255, 0.08)"
  text-primary: "#0F172A"
  text-secondary: "#475569"
  text-muted: "#94A3B8"
  text-dark-primary: "#F1F5F9"
  text-dark-secondary: "#94A3B8"
  text-dark-muted: "#64748B"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1.2
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.025em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  2xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  input-field:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "10px 14px"
  card-container:
    backgroundColor: "{colors.neutral-surface}"
    rounded: "{rounded.2xl}"
    padding: "24px"
---

# Design System: Lumina LMS

## Overview

**Creative North Star: "The Polymath Campus"**

Lumina LMS creates an immersive, high-utility academic environment tailored for multi-tenant higher education institutes. The interface balances high-density information architecture (course streams, grade matrices, interactive 3D simulations, and code playgrounds) with clean editorial breathing room. It does not feel like a generic corporate dashboard or an unstyled utility wireframe; it feels like an authentic digital campus workshop built for focused study and real academic progress.

Rather than imposing a single rigid color theme across all disciplines, the interface establishes a unified canvas geometry while allowing each Institute to assert its distinct academic identity through dynamic primary accents, tailored badges, and institute-specific tooling.

**Key Characteristics:**
- **Dynamic Institute Accentuation**: Core neutral structures remain universally clean, while institute themes inject energetic personality (`ics` computing orange, `ibe` business gold, `ite` education blue).
- **Dual-Mode Precision**: Complete first-class parity across light canvas (`#F8FAFC`) and deep obsidian dark mode (`#0B0D13` canvas, `#141721` surface).
- **Tactile Micro-Interactions**: Subtle scale compressions on press (`active:scale-[0.97]`), silky smooth 3D flashcard flips, and smooth entrance transitions.
- **Atomic Uniformity**: Reusable primitives guarantee consistent padding, border radii, and typography across all academic tools.

## Colors

The color palette is anchored on high-contrast neutrals with dynamic, route-bound institute accent swatches.

### Primary
- **ICS Computing Flame** (`#FF7517` / hover `#EA580C`): High-energy orange representing computing, logic, and technical labs. Used for primary buttons, active sidebar pills, focus rings, and metric highlights in ICS routes.

### Secondary (Institute Accents)
- **IBE Executive Gold** (`#D4A017` / hover `#E0B84B`): Prestigious gold/amber accent for Business and Entrepreneurship courses, financial trackers, and management tools.
- **ITE Academic Cobalt** (`#2563EB` / hover `#3B82F6`): Scholarly blue accent for Teacher Education, pedagogical materials, and academic certificates.

### Neutral
- **Canvas Slate** (`#F8FAFC` light / `#0B0D13` dark): Global background canvas that recedes behind active cards.
- **Card Surface** (`#FFFFFF` light / `#141721` dark): Primary content card and dashboard container background.
- **Elevated Surface** (`#FFFFFF` light / `#1C2030` dark): Modals, dropdown menus, and popovers.
- **Subtle Border** (`#E2E8F0` light / `rgba(255, 255, 255, 0.08)` dark): Crisp 1px structural dividing lines.
- **Text Primary** (`#0F172A` light / `#F1F5F9` dark): High-legibility headers and primary data points.
- **Text Secondary** (`#475569` light / `#94A3B8` dark): Body text, form labels, and descriptive metadata.
- **Text Muted** (`#94A3B8` light / `#64748B` dark): Timestamps, placeholder text, and passive icons.

### Named Rules
**The Institute Accent Rule.** Primary accent colors must only be resolved dynamically via the active institute context (`getInstituteTheme`). Hardcoded single-color overrides across institute boundaries are prohibited.
**The Dual-Surface Contrast Rule.** Surfaces in dark mode must always use tonal depth (`#0B0D13` canvas → `#141721` card → `#1C2030` elevated/menu) paired with `rgba(255,255,255,0.08)` hairline borders instead of harsh drop shadows.

## Typography

**Display & Body Font:** Apple System / BlinkMacSystemFont / Segoe UI / Roboto / Inter fallback
**Monospace Font:** UI Monospace / SFMono-Regular / Menlo / Monaco / Consolas

**Character:** Clean, crisp geometric sans-serif optimized for dense academic tables, course streams, and code grading.

### Hierarchy
- **Display** (800 weight, 1.875rem / 30px, 1.2 line-height): Top-level page titles, hero headers, and course banner titles.
- **Headline** (700 weight, 1.35rem / 22px, 1.3 line-height): Section headers, module titles, and modal headers.
- **Title** (600 weight, 1.125rem / 18px, 1.4 line-height): Card headers, syllabus item titles, and drawer titles.
- **Body** (400 weight, 0.875rem / 14px, 1.5 line-height): Descriptions, discussion streams, assignment prompts, and general UI copy (max line length ~70ch).
- **Label / Pill** (600 weight, 0.75rem / 12px, 0.025em letter-spacing): Badges, table column headers, form labels, and status tags.
- **Code / Monospace** (500 weight, 0.85rem / 13.6px, 1.6 line-height): CodeLab test outputs, terminal logs, course codes (e.g. `CS-101`), and student IDs.

### Named Rules
**The Strict Scannability Rule.** Data labels and metadata tags must use distinct `text-xs font-semibold` with uppercase or subtle tracking to distinguish them instantly from narrative paragraph text.

## Layout

The application employs a fluid yet disciplined structural grid designed for sticky navigation and zero layout shifting.

- **Sidebar Navigation**: Fixed/sticky desktop sidebar (72px collapsed, 288px expanded) with animated smooth transition (`transition-all duration-300`).
- **Topbar**: Sticky 64px (h-16) header housing global search, notifications bell, institute badge, theme switcher, and user avatar profile dropdown.
- **Content Canvas**: Max container width `max-w-7xl` or full-width fluid grid with standardized page padding (`px-4 py-6 md:px-8 md:py-8`).
- **Spacing Rhythm**: 4px base increment (`gap-1.5` for form field grouping, `gap-4` / `gap-6` for dashboard bento grids, `p-6` for cards).

## Elevation & Depth

Lumina LMS uses **tonal layering and hairline borders** as its primary depth mechanism rather than heavy, blurry drop shadows.

### Shadow Vocabulary
- **Subtle Surface (`shadow-xs` / `0 1px 2px 0 rgba(0, 0, 0, 0.05)`)**: Default at-rest card elevation against the background canvas.
- **Interactive Lift (`shadow-md` / `0 4px 6px -1px rgba(0, 0, 0, 0.1)`)**: Hover state on clickable cards, flashcards, and course tiles.
- **Elevated Overlay (`shadow-xl` / `0 20px 25px -5px rgba(0, 0, 0, 0.15)`)**: Modals, dropdown popovers, and floating toolbars.

### Named Rules
**The Flat-Resting Rule.** Cards and containers rest flat with a 1px border. Shadows are applied only to convey elevation in response to interaction (hover, active dragging, modal opening).

## Shapes

- **Base Radius (`rounded-md` / 6px - 8px)**: Action buttons, dropdown menu items, and segmented controls.
- **Field & Nav Radius (`rounded-xl` / 12px)**: Input fields, select dropdowns, search bars, and sidebar active navigation pills.
- **Container Radius (`rounded-2xl` / 16px - 24px)**: Dashboard cards, modal dialogs, course cards, and CodeLab panes.
- **Badge Radius (`rounded-full` / 9999px)**: Status badges, counter chips, and user avatars.

## Components

### Buttons
- **Shape:** Gently rounded rectangular (`rounded-md` / 8px).
- **Primary:** Dynamic institute background (`theme.colors.primary`), white text, `px-4 py-2 text-sm font-medium`. Smooth hover transition to `theme.colors.primaryHover`.
- **Secondary:** Clean white/dark-surface background, 1px subtle border (`theme.colors.border`), primary text.
- **Ghost:** Transparent background, subtle background fill on hover (`hover:bg-slate-100 dark:hover:bg-white/5`).
- **State Feedback:** Built-in loader spinner (`Loader2 animate-spin`) when `loading={true}`; tactile `active:scale-[0.97]` depression.

### Cards / Containers
- **Corner Style:** Smooth modern corners (`rounded-2xl` / 16px).
- **Background:** Crisp white (`#FFFFFF`) in light mode; obsidian surface (`#1A1D27` / `#141721`) in dark mode.
- **Border:** 1px hairline border (`border-slate-200` light / `border-white/5` dark).
- **Internal Padding:** `p-6` default (scalable to `p-4` on mobile).

### Inputs / Fields
- **Style:** `rounded-xl` (12px), 1px border (`border-slate-200` light / `border-[#3D4460]` dark), `px-3.5 py-2.5 text-sm`.
- **Focus:** Dynamic institute border color shift with `0 0 0 2px ${theme.colors.primary}33` focus glow ring.
- **Special Affordances:** Password toggle with eye icon and right-padding offset.

### Badges & Chips
- **Style:** `rounded-full` pill with `10%` opacity institute primary background (`${theme.colors.primary}1A`) and solid primary text (`theme.colors.primary`).
- **Typography:** `text-xs font-semibold px-2.5 py-1`.

### Navigation / Sidebar
- **Style:** Left-bordered active indicator (`border-l-[3px] border-[#F97316]` with `bg-orange-500/10` soft fill).
- **Transitions:** Smooth accordion expansions for course sub-items and 300ms width collapse/expand.

### Signature Components
- **CodeLab Activity Split-Pane**: Dark-themed Monaco-style editor alongside responsive test suite runner with live execution logs.
- **Spaced-Repetition Flashcard Deck**: 3D flip card (`preserve-3d`, `rotateY(180deg)`) with interactive self-rating buttons.

## Do's and Don'ts

### Do:
- **Do** always pass the dynamic `theme` prop to atomic components to preserve multi-institute color identity.
- **Do** provide both light and dark mode styles for all newly authored components using `dark:` variants.
- **Do** use `rounded-xl` for interactive fields and `rounded-2xl` for structural cards.
- **Do** implement `active:scale-[0.97]` on custom clickable interactive elements for tactile feel.
- **Do** use strict TypeScript interfaces matching Prisma models without using `any`.

### Don't:
- **Don't** hardcode static hex colors like `#FF7517` or `#2563EB` directly inside shared dashboard components; resolve them through `theme.colors`.
- **Don't** use heavy drop shadows on resting cards; rely on border hairlines and tonal surface shifts.
- **Don't** create separate duplicated components for different institutes; keep components in `packages/ui` or `src/components` and inject institute parameters.
- **Don't** disable or break keyboard focus rings; always maintain `:focus-visible` with `var(--focus-ring)`.
