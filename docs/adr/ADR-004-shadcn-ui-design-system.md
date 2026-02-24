# ADR-004: Adopt shadcn/ui + Tailwind CSS as Component & Design System

**Status**: Accepted  
**Date**: 2026-02-24  
**Context**: InnovatEPAM Portal — UI/UX overhaul

## Decision

Adopt **shadcn/ui** as the component library and **Tailwind CSS v4** as the styling framework. All interactive UI elements (buttons, inputs, modals, dialogs, toasts, badges, cards) must be shadcn/ui components to ensure a consistent minimalist design language.

## Context

The MVP currently uses plain HTML elements with minimal inline CSS. As the portal grows (smart forms, evaluation workflows, admin dashboards), maintaining consistent UI quality with raw elements becomes increasingly difficult. We need a component-based approach that is:

- **Minimalist and modern** — clean whitespace, neutral palette, subtle borders
- **Composable** — every UI element is a reusable component
- **Accessible** — built-in ARIA, keyboard navigation, focus management
- **Lightweight** — no runtime JS bundle bloat (shadcn copies source into `src/components/ui`)

## Considered Options

| Option | Pros | Cons |
|--------|------|------|
| **shadcn/ui + Tailwind CSS** | Ownable source code, Radix primitives, minimal bundle, Next.js native | Requires Tailwind setup, manual updates |
| Material UI (MUI) | Rich components, strong community | Heavy runtime, opinionated theming, large bundle |
| Chakra UI | Good DX, accessible | Extra runtime provider, heavier than Tailwind |
| Plain Tailwind (no library) | Full control | Must build every component from scratch — slow |
| Keep raw HTML/CSS | No setup | Inconsistent, poor UX, no accessibility |

## Rationale

- **shadcn/ui** copies component source into `src/components/ui/` — zero runtime dependency, full ownership.
- Built on **Radix UI** primitives for accessibility (dialogs, popovers, tooltips get ARIA + keyboard for free).
- Tailwind CSS utility classes enforce consistent spacing, color, and typography without custom CSS.
- Minimalist **neutral** theme (zinc/slate palette) matches the desired clean, professional look.
- Proven integration with Next.js App Router, React 19, and TypeScript.

## Design Principles

1. **Minimalist palette**: Neutral grays (zinc/slate), single accent color, white backgrounds.
2. **Component-first**: Every interactive element is a shadcn component — no raw `<button>`, `<input>`, or `<dialog>`.
3. **Feedback via components**: Success/error messages use `Toast` (sonner); confirmation dialogs use `AlertDialog`; inline errors use form field descriptions.
4. **Spacing & typography**: Tailwind defaults — consistent `gap`, `p`, `text-` scales.
5. **Responsive**: Mobile-first, works on tablets and desktops.

## Components Required (MVP)

| Component | Usage |
|-----------|-------|
| `Button` | All actions (submit, login, accept, reject) |
| `Input` | Text fields (title, email, password) |
| `Textarea` | Description, comments |
| `Select` | Category picker |
| `Label` | Form field labels |
| `Card` | Idea cards in listing, detail sections |
| `Badge` | Status indicators (submitted, under_review, accepted, rejected) |
| `Dialog` / `AlertDialog` | Confirm destructive actions (reject idea) |
| `Toast` (sonner) | Success/error notifications |
| `Form` | react-hook-form integration wrapper |
| `Separator` | Visual dividers |
| `Dropdown Menu` | User menu (logout, profile) |

## Consequences

- **Tailwind CSS must be installed** as a project dependency (currently not present).
- Global CSS (`globals.css`) will be replaced with Tailwind base + shadcn theme variables.
- All existing pages must be refactored to use shadcn components instead of raw HTML.
- `src/components/ui/` directory will contain owned component source files.
- `components.json` config file required at project root for shadcn CLI.
- The smart-category-form feature (Phase 2) must also use shadcn components for dynamic fields.
- Bundle size impact is minimal — shadcn components are tree-shaken source code, not a runtime library.
