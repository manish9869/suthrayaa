# Admin portal — design system

**Direction:** calm, dense and trustworthy. The console shares the storefront's palette (violet actions, peach and gold accents), but it's tuned for long working sessions: a soft lilac canvas with white cards, a deep-indigo sidebar, tighter radii, and smaller type for dense tables. It has a light theme (the default) and a dark theme, switched from the header.

## Theming

The admin palette is scoped, so it never leaks into the storefront (and the storefront's branding overrides never reach the admin):

- **Light:** the `.admin` class on the admin wrappers (dashboard layout, `AuthShell`, `AccessDenied`) redefines every token.
- **Dark:** adding `.dark` next to `.admin` switches to the dark palette. The choice is stored per browser.
- **Portals:** dialogs, sheets and popovers render inside the themed wrapper (via `PortalContainerContext`), so they pick up the same tokens.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#f7f5fc` | `#0f0c1d` | Canvas |
| `--card` | `#ffffff` | `#171329` | Cards, tables, dialogs |
| `--primary` | `#6d4aff` | `#8f74ff` | Primary actions, active nav, focus |
| `--secondary` | `#efeaff` | `#241d42` | Active page chip, secondary buttons |
| `--muted-foreground` | `#6b6485` | `#a49cc0` | Secondary text |
| `--mint` / `--gold` / `--peach` / `--teal` / `--sky` | status colours | brighter variants | Status dots, charts |
| `--destructive` | `#e5484d` | — | Delete, errors |
| `--sidebar` | `#1c1642` | — | The storefront footer's ink, in both themes |
| `--radius` | `0.9rem` | — | Base radius; cards are squared off to `0.5rem` in dark mode |

**Charts** use `--chart-1…5`: violet, peach, gold, teal, lilac.

## Layout

```
┌────────────┬──────────────────────────────────────────────┐
│  Sidebar   │  Top bar: breadcrumb · ⌘K search · theme · me │
│  (ink)     ├──────────────────────────────────────────────┤
│  grouped   │  PageHeader  (title, description | actions)  │
│  NAV with  │  Filters row (search, selects, segmented)    │
│  icons     │  Content: GLASS_PANEL table / card grid      │
│            │  Pagination                                  │
└────────────┴──────────────────────────────────────────────┘
```

- **Sidebar:** groups are Overview, Catalog, Sales, Content, Communications and Administration. The sidebar collapses to icons, and becomes a `Sheet` on mobile.
- **Every page starts with `PageHeader`:** the title and a one-line description on the left, primary actions on the right. Use one primary (filled) action per page.
- **Content width:** fluid. Grids go `md:grid-cols-2 2xl:grid-cols-3` for cards; tables sit in `GLASS_PANEL` (`lib/admin-ui.ts`).

## Components and patterns

| Pattern | Component | Rules |
|---|---|---|
| Page title row | `PageHeader` | Title in sentence case; the description states counts or purpose ("12 coupons · 9 active") |
| Data tables | `Table` + `SortableTh` + `DataTablePagination` | Sort and paginate client-side (`useSortableData`, `usePaginated`); an empty row says what to change ("No coupons match these filters") |
| Filters | `Input` with a search icon, `Select`, `SegmentedControl` | Filters sit above the table in one row that wraps on mobile |
| Status | `StatusDot` (`mint` = live/active/paid, `muted` = hidden/inactive, others for warnings) | Label and colour always appear together, never colour alone |
| Create and edit | `Dialog` with a form and `DialogFooter` holding the primary button | The same dialog handles create and edit ("New X" / "Edit X", "Create" / "Save changes") |
| Destructive actions | Ghost icon button, destructive colour on hover, then `confirm()` | Say what happens: "Delete … This can't be undone." Prefer deactivate or unsubscribe where a record matters |
| Empty states | `EmptyState` (icon, title, one sentence, optional action) | Explain how the list gets filled |
| Loading | `PageLoader` | Never a blank page |
| Feedback | `sonner` toasts | Success: past tense ("Coupon updated"). Errors: specific, from the API message when available |
| Permission gating | `<ProtectedRoute permission>` for pages, `<Can permission>` for controls | Hide what the admin can't do; don't show disabled mystery buttons |
| Schema-driven forms | `SettingsGroupForm`, `ContentFieldsForm` | New settings or content fields appear without UI work; lists support add, remove and reorder |
| Images | Upload button, URL field and thumbnail | Uploads under 4 MB; the server re-encodes to WebP |

## Typography

The console uses the same fonts as the storefront (Plus Jakarta Sans for UI, Fraunces only for rare display numbers), at denser sizes:

| Element | Size |
|---|---|
| Page title | `text-2xl font-semibold tracking-tight` |
| Section title | `text-lg font-semibold` |
| Body and tables | `text-sm` |
| Meta | `text-xs text-muted-foreground` |
| Codes (coupons, order numbers) | `font-mono` |

## Interaction

- **Motion:** only functional motion (dialogs, sheets, toasts, skeletons), with no decorative animation in the console.
- **Keyboard:** ⌘K opens page search. Dialogs trap focus, and every icon-only button has an `aria-label` or `title`.
- **Unsaved changes:** editors that hold a draft (Storefront Content) show Save and Discard, and warn before leaving.
- **Instant feedback:** toggles (publish, active, enabled) apply immediately and confirm with a toast; there's no separate Save step for a single toggle.

## Writing style

- Plain and specific: "Publish", "Hide", "Unsubscribe", "Reset to original".
- Descriptions explain where the change shows up ("Shown under the hero banner", "live on the storefront within a minute").
- Point to where related things live ("Section headings are set in Site Settings → Homepage").
