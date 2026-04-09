# Mobile Design Guide — Super Reader Championship

This app should feel as natural on a phone as a native app. Most users will interact with it on mobile — checking the leaderboard, logging a book, browsing what friends are reading. Desktop is the secondary experience for admins tweaking scoring rules or doing bulk imports.

This document covers mobile-specific patterns, PWA configuration, and responsive component decisions. General UI/UX principles live in `docs/ui-ux-design.md`.

---

## Design Philosophy for Mobile

**Phone-first, not phone-adapted.** Don't shrink desktop layouts — design for thumbs, small viewports, and intermittent attention spans first, then enhance for larger screens.

Three rules:

1. **Every primary action should be reachable with one thumb.** The bottom tab bar, the Add Book button, and entry-level navigation live in the thumb zone.
2. **Scrolling is the primary navigation gesture within a page.** Avoid horizontal scrolling for content (horizontal scrolling is acceptable for chip/tag rows). Use vertical stacking, not side-by-side layouts, when space is tight.
3. **Intermittent use is the norm.** Users will check the leaderboard for 10 seconds, log a book in 30 seconds, and close the app. Optimize for these micro-sessions, not sustained browsing.

---

## Viewport & Platform Configuration

### Meta Tags

Next.js handles the viewport meta automatically, but we should configure:

- **`theme-color`**: Match the app shell gradient (`#4f46e5` — indigo-600) so the mobile browser chrome blends with the header.
- **`apple-mobile-web-app-capable`**: Enable standalone mode on iOS for users who add to home screen.
- **`apple-mobile-web-app-status-bar-style`**: `black-translucent` to let content flow under the status bar with the gradient header.

### PWA Manifest

The app should ship a `manifest.json` (or `manifest.webmanifest`) that declares:

```json
{
  "name": "Super Reader Championship",
  "short_name": "Super Reader",
  "start_url": "/leaderboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4f46e5",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

This enables "Add to Home Screen" on both iOS and Android, giving the app a native-like launch experience without app store distribution. Service worker caching is a later optimization — the manifest alone provides the install prompt and standalone mode.

### Safe Area Insets

Modern iPhones have a home indicator bar and notch/Dynamic Island that overlap UI elements. The bottom tab bar and any fixed-bottom content must respect safe areas:

```css
/* Bottom tab bar */
padding-bottom: env(safe-area-inset-bottom, 0px);

/* Full-screen modals/sheets */
padding-top: env(safe-area-inset-top, 0px);
```

This is **critical** — without it, the bottom tab bar will be partially obscured on iPhones in standalone mode.

---

## Navigation on Mobile

### Bottom Tab Bar

The current implementation is solid. Key refinements:

| Concern | Current state | Target |
|---------|--------------|--------|
| **Safe area** | No inset padding | Add `pb-[env(safe-area-inset-bottom)]` |
| **Tab count** | 5-6 tabs (conditional admin) | Max 5 visible; admin users see 6, which is acceptable but tight |
| **Add Book action** | Gradient circle button | Good — visually distinct from nav tabs |
| **Haptic feedback** | None | Consider adding (future: via Vibration API) |
| **Active indicator** | Color only | Color + filled icon variant would improve clarity |

### Tab Item Touch Targets

Current tap targets are `px-3 py-2` on nav items and `px-3 py-1` on the Add button container. The Add button itself (the circle) is 44x44 which meets the minimum, but the nav tab items' overall touch area should be verified at **minimum 44x44px** per WCAG.

### Page Transitions

Avoid jarring full-page reloads. The `NavProgress` loading bar handles this well. For drill-throughs (leaderboard → player profile), consider keeping the destination page's scroll position when navigating back.

---

## Screen-by-Screen Mobile Patterns

### Leaderboard (Mobile)

This is the most visited screen and the most data-dense. The current layout shows all columns (Rank, Player, Books, Pages, Countries, Series, Points) in a single row. On a ~375px screen, this is extremely cramped.

**Recommendation: Card-based layout on mobile.**

```
┌──────────────────────────────┐
│  #1  Player Name       12.45 │  ← Rank, name, points (glanceable)
│      8 books · 2,450 pages   │  ← Summary stats
│      A-Z ████░░ 18/26        │  ← Challenge pip (scannable)
│      Genre █████ 7/9          │
│                          [v] │  ← Expand chevron
└──────────────────────────────┘
```

- **Default (collapsed):** Rank, name, points, book count, one-line challenge summary
- **Expanded:** Full challenge progress, countries, series, fun stats (same data as current `PlayerDetailPanel`)
- **Hide on mobile:** Pages column, Countries column, Series column as separate header cells. Fold these into the expanded panel.
- The current `hidden sm:flex` on the Pages column is the right pattern — extend it to Countries and Series columns.

### Podium (Mobile)

Current: three cards side-by-side with `gap-3 sm:gap-5`. On very small screens (320px), the three cards will be tight.

**Recommendations:**
- Reduce card `min-width` or font sizes at `< 375px` widths
- Consider: on very narrow screens, stack the podium vertically (1st, 2nd, 3rd as a list) with medals and scores. This is less visual but legible.
- The current layout works at 375px+ (iPhone SE and up).

### My Books / Player Profile (Mobile)

The `PlayerBooksView` component is long and dense. Mobile layout priorities:

1. **Stats row:** `grid-cols-2` (current) works well on mobile. 4 cards in 2×2.
2. **Rank context:** Single line, good as-is.
3. **Score breakdown:** Collapsible sections already work. The expand/collapse pattern is touch-friendly.
4. **Challenge grids:**
   - **Genre grid:** `grid-cols-2` works on mobile. Good.
   - **Alphabet grid:** `grid-cols-[repeat(13,1fr)]` is very tight on 320px screens (each cell ~20px). Consider `grid-cols-[repeat(9,1fr)]` or `grid-cols-[repeat(7,1fr)]` on mobile with wrapping. At 375px+ it's workable but cramped.
5. **Book list:** Cards are well-suited to mobile. The filter/sort toolbar (`flex-wrap`) works but is visually busy. Consider collapsing filters behind a single "Filter" button on mobile.

### Book Entry Panel (Mobile)

The `BookEntryPanel` is a `Dialog` — on mobile this should behave as a **bottom sheet** that slides up from the bottom, not a centered modal. This is more natural for mobile interaction (content near the thumb zone, swipe-to-dismiss).

Current implementation uses shadcn's `Dialog` which renders centered. Consider:
- Using `Sheet` (side="bottom") on mobile, `Dialog` on desktop
- Or configuring the Dialog to be full-height on mobile (`h-[100dvh]` or `h-[calc(100dvh-env(safe-area-inset-top))]`)
- Ensuring the scrollable form area has `-webkit-overflow-scrolling: touch` for smooth iOS scrolling

### Book Entry Form (Mobile)

Progressive disclosure is even more important on mobile:

- **Step 1 (visible):** Book search → auto-fills title, author, pages. Fiction toggle. Genre picker. Status.
- **Step 2 (collapsed):** "Add details" section containing bonuses, deduction, hometown, series, rating, date.
- **Score preview:** Should be sticky at the bottom of the panel (always visible as user scrolls through form), not inline in the middle of the form.

Form input sizing on mobile:
- All inputs minimum height `44px` (current `h-8` = 32px is too small for comfortable mobile tapping)
- Select dropdowns: use native `<select>` on mobile for OS-level pickers (dates, etc.) rather than custom popover-based selects
- Chip toggles for bonuses/deductions are excellent on mobile — better than dropdowns

### Admin Pages (Mobile)

Admin pages are secondary on mobile but should still be functional:
- `AdminTabs` horizontal scroll with `overflow-x-auto` and `-webkit-overflow-scrolling: touch`
- Admin forms should be single-column on mobile
- Scoring editor with many fields should use collapsible sections by category

---

## Touch Interactions

### Tap Targets

Minimum touch target sizes (per WCAG 2.2 / Apple HIG):
- **44x44px** minimum for all interactive elements
- **48x48px** preferred for primary actions
- **8px minimum spacing** between adjacent touch targets

Current violations to audit:
- Sort toggle button (`h-9 w-9` = 36x36) — should be at least 44x44
- Close buttons on search fields (`right-2.5`) — verify target size
- Challenge badge taps in leaderboard rows — very small
- Bottom tab bar items — verify overall touch area

### Gestures

- **Swipe-to-dismiss** on bottom sheets (book entry panel)
- **Pull-to-refresh** on the leaderboard (future: via framework or custom implementation)
- **Long-press** on book entry cards to see quick actions (edit, delete) — alternative to the current tap-to-open-panel flow
- **Avoid conflicting horizontal swipes** — don't use horizontal swipe for anything since it conflicts with iOS back navigation

### Scrolling

- **Momentum scrolling:** Ensure `-webkit-overflow-scrolling: touch` on scrollable containers (or use `overflow-y: auto` which enables it by default in modern iOS)
- **Scroll anchoring:** When expanding a leaderboard row, ensure the expanded content doesn't push the row off screen
- **Bottom tab clearance:** Content at the bottom of pages needs `pb-20` (current) to clear the tab bar. Verify this is enough with safe area insets added.

---

## Typography on Mobile

The base font (Geist Sans) renders well on mobile. Key adjustments:

| Element | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| Page title (h1) | `text-2xl` (24px) | `text-xl` or `text-2xl` | 24px is fine on mobile |
| Points display | `text-sm` (14px) | `text-sm` | Tabular figures critical |
| Secondary text | `text-xs` (12px) | `text-xs` | Floor — don't go smaller |
| Challenge labels | `text-[0.65rem]` (10.4px) | Consider `text-xs` (12px) | 10.4px is at the legibility threshold on mobile |

**Rule:** Never go below 12px (`text-xs`) for any text that users need to read. Decorative labels at 10px are acceptable only if paired with larger text that conveys the same information.

---

## Performance on Mobile

Mobile users are often on slower connections and less powerful devices.

### Image Optimization
- Book cover images should be served at appropriate sizes (not full-resolution). Use Next.js `<Image>` with `sizes` prop.
- Cover thumbnails in book cards: `56x80` display size → serve at 2x = `112x160` max.
- Podium covers (if added): serve at card width × 2x.

### Bundle Size
- Avoid importing entire icon libraries. `lucide-react` supports tree-shaking — import individual icons.
- The `cmdk` package (command palette) is desktop-only and could be dynamically imported.

### Loading States
- Skeleton screens for leaderboard rows and book cards (not spinners).
- The `loading.tsx` in the `(app)` route group should show a layout-matching skeleton.
- Avoid layout shift when data loads — reserve space for dynamic content.

### Reduce Re-renders
- Leaderboard and book list components should use `useMemo` for filtered/sorted data (current implementation does this well).
- Avoid re-mounting heavy components on tab navigation.

---

## Responsive Breakpoint Strategy

The app uses a single breakpoint (`md` = 768px) for the major layout shift (sidebar ↔ bottom tabs). This is fine for the current structure but consider:

| Breakpoint | Layout | Nav | Content |
|-----------|--------|-----|---------|
| `< 640px` (sm) | Mobile-first | Bottom tabs | Single column, cards, stacked |
| `640–767px` | Tablet-ish mobile | Bottom tabs | Some 2-col grids, more breathing room |
| `≥ 768px` (md) | Desktop | Sidebar | Multi-column where appropriate |

Key responsive adaptations per breakpoint:

- **< sm:** Leaderboard → card view. Alphabet grid → more columns per row or smaller cells. Filter toolbar → collapsed behind toggle.
- **sm–md:** Leaderboard → table with fewer columns. Alphabet grid → 13 cols works. Filter toolbar → visible.
- **≥ md:** Full table, sidebar, wider cards.

---

## Offline & Resilience (Future)

While not required for v1, keep these patterns in mind for mobile:

- **Optimistic UI for book entry:** Show the new book in the list immediately, sync in background. If it fails, show a retry toast.
- **Cache leaderboard data:** The leaderboard is read-heavy and rarely changes. A service worker or SWR-style cache could serve stale data instantly while revalidating.
- **Network error handling:** Mobile connections are flaky. All server actions should handle network failures gracefully with retry-able toast notifications (current Sonner setup supports this).

---

## Checklist for Mobile-Ready Components

When building or reviewing any component, verify:

- [ ] All interactive elements ≥ 44x44px touch target
- [ ] No text below 12px (`text-xs`) for readable content
- [ ] Layouts stack vertically on mobile (no horizontal scroll for content)
- [ ] Fixed elements (tab bar, sticky headers) respect safe area insets
- [ ] Form inputs ≥ 44px height on mobile
- [ ] Loading states use skeletons, not spinners
- [ ] Images use responsive sizes (not full-resolution on mobile)
- [ ] No hover-only interactions (everything works with tap)
- [ ] Expanded/collapsed states don't cause scroll position jumps
- [ ] Modals/sheets are bottom-anchored on mobile, not centered

---

## Persona Considerations for Mobile

| Persona | Mobile context | Design response |
|---------|---------------|-----------------|
| **The Casual** | Logs a book on the couch, checks leaderboard on the bus | 30-second book entry must work perfectly one-handed. Leaderboard should load fast and show rank at a glance. |
| **The Competitor** | Checks leaderboard multiple times daily on their phone | Leaderboard must be the fastest-loading, most polished screen. Point changes and rank movement should be immediately visible. |
| **The Explorer** | Browses challenge progress while at the bookstore | Challenge grids must be legible on mobile without zooming. "Missing letters/genres" text helps them pick their next book on the spot. |
| **The Tracker** | Logs books immediately after finishing, often on the couch | The book entry form must support detailed metadata entry on mobile without feeling tedious. Progressive disclosure is key. |
| **The Organizer** | Might check flagged entries or player status on mobile | Admin pages should be functional but don't need to be optimized for mobile — admin tasks are acceptable on desktop. |
