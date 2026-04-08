# UI/UX Design Guide — Super Reader Championship

This document defines the design principles, patterns, and conventions for the Super Reader Championship app. Every decision here is grounded in the five personas defined in `docs/personas.md`.

---

## Design Philosophy

**Simple by default, detailed on demand.**

This app replaces a spreadsheet. The spreadsheet had *all the data, all the time* — and that worked for power users but overwhelmed everyone else. The app's job is to surface the right data at the right time for the right person.

When persona needs conflict, bias toward the simpler presentation with a clear path to the complex one. The Casual should never feel lost; The Competitor should never feel data-starved. Progressive disclosure bridges the gap.

---

## Core Principles

### 1. Progressive Disclosure Over Feature Flags

Don't hide features — layer them. Every screen should have a clear, minimal default state and an obvious way to see more.

| Layer | What belongs here | Who it's for |
|-------|-------------------|--------------|
| **Glanceable** | Rank, total points, book count, primary action | The Casual |
| **Scannable** | Challenge progress bars, point breakdowns, recent activity | The Competitor, The Explorer |
| **Deep-dive** | Per-book scoring math, full letter/genre/country gaps, series tracking | The Tracker, The Explorer, The Competitor |

**Pattern:** Use expandable rows, collapsible sections, and drill-through links — not separate pages or modes — to move between layers.

### 2. The 30-Second Rule

The Casual should be able to log a book in under 30 seconds. That means:

- **Minimal required fields:** Title, author, pages, fiction/nonfiction, genre, status. Everything else is optional.
- **Smart defaults:** Status defaults to "Completed." Fiction defaults to true. Pages auto-fill from book search.
- **Bonus/deduction fields use progressive disclosure:** Collapsed by default with a "Add bonuses" affordance, not a wall of empty dropdowns.
- **Score preview updates live** as fields change, so The Competitor can optimize without a separate step.

### 3. Scoring Transparency

The scoring system is the soul of the competition. Different personas need different levels of visibility:

- **Leaderboard:** Show total points prominently, but offer expandable breakdowns (pre-bonus total, bonuses earned, season bonuses) for those who want them.
- **Book entry:** The score preview component should break down every calculation step — base points, page points, each bonus, deductions, multipliers — so The Competitor can verify and The Casual can ignore.
- **Rules page:** Present scoring rules in plain language with worked examples, not just raw percentages. "A 300-page fiction book earns 0.71 base + 2.28 page points = 2.99 pre-bonus" is more useful than "fiction_base: 0.71, first_100_rate: 0.0028."

### 4. Encourage, Don't Discourage

A reading competition should motivate everyone, not just the top 3.

- **Leaderboard:** Show "books completed" alongside points. Consider showing personal-best comparisons ("Your best month!" or "New genre unlocked!") rather than only rank.
- **Rank display:** Top 3 get podium treatment (gold/silver/bronze). Beyond that, avoid emphasizing the gap — show rank without dramatizing distance from first place.
- **Activity over standing:** Recent books read, new countries explored, and challenge milestones are engaging for all personas. Raw point deltas are only interesting to The Competitor.
- **Empty states:** When a player has no books logged, the message should be inviting ("Ready to start? Add your first book") not clinical ("No entries found").

### 5. Admin ≠ Enterprise

The Organizer is a friend running a book club, not a SaaS administrator.

- **Approachable language:** "Scoring rules" not "Configuration." "Players" not "User management."
- **Sensible defaults:** Scoring config should ship with working defaults. The Organizer should be able to launch a season without touching a single scoring field.
- **Impact communication:** When the admin changes scoring rules, show what will change: "This will affect X existing entries. Scores will be recalculated." Not silent updates, not scary confirmation dialogs.
- **Contained complexity:** Admin features live in their own tab group (`/admin/*`) with a clear boundary. Admin never leaks into player-facing UI.

---

## Layout & Navigation

### Responsive Strategy

| Viewport | Navigation | Content width |
|----------|-----------|---------------|
| **Mobile** (< md) | Bottom tab bar (5 tabs max) | Full width, padding `px-4` |
| **Desktop** (≥ md) | Fixed left sidebar (w-64) | `ml-64`, content area uses `max-w` constraints per page |

- The bottom tab bar prioritizes primary actions: Leaderboard, My Books, Add Book (action button), Rules, and contextual items (Admin if admin, Account).
- The sidebar mirrors these with room for org switching and sign-out.
- "Add Book" is an **action**, not a page — it opens the `BookEntryPanel` dialog/sheet globally from any screen.

### Page Hierarchy

```
Leaderboard (home)        ← The default. Everyone lands here.
├── Player profile        ← Drill-through from leaderboard row
My Books                  ← Personal book list + challenge progress
Rules                     ← Scoring explanation
Settings                  ← Profile, external links, preferences
Admin/                    ← Admin-only section
├── Settings              ← Org metadata
├── Players               ← Member management
├── Genres                ← Genre CRUD
├── Scoring               ← Scoring rule editor
├── Flagged               ← Moderation queue
└── Import                ← Bulk data import
```

### Depth Rule

Most player-facing flows should be **≤ 2 taps deep** from the tab bar. Leaderboard → Player profile is one drill-through. My Books → Edit entry opens a panel, not a new page. Avoid nested navigation stacks.

---

## Component Patterns

### Cards

Cards are the primary content container. Use them for:
- Book entries (cover thumbnail, title, author, points, status badge)
- Leaderboard rows (on mobile — each player is a tappable card)
- Challenge progress summaries

**Card behavior:**
- Tappable cards should have hover/press states and clear affordances (chevron, "View details")
- Cards can expand inline to reveal detail (preferred over navigating away)
- Dense data tables (desktop leaderboard) are acceptable on desktop but should collapse to cards on mobile

### Panels & Sheets

For creation and editing flows:
- **Mobile:** Bottom sheet sliding up (using the Dialog/Sheet component)
- **Desktop:** Centered dialog or side panel

The `BookEntryPanel` is the canonical example — a global panel that can be opened from any screen to add or edit a book entry.

### Data Tables

The leaderboard is the most data-dense view. Design priorities:
- **Default columns:** Rank, name, points, books completed
- **Expandable columns:** Challenge progress (letters, genres, countries), series, fun stats
- **Mobile:** Collapse to card view with summary stats; expand for detail
- **Sortable:** Allow sorting by points, books, pages, countries, series
- **Searchable:** Filter by player name

### Progress Indicators

Challenge progress (genre grid, alphabet grid, country count) should use:
- **Pip bars** for quick scanning (filled vs total)
- **Grids** for gap analysis (which letters/genres are covered vs missing)
- **Counts with context** ("12/26 letters" with the ability to see which ones)

### Chips & Tags

For multi-select categorization (bonuses, deductions):
- Use toggle chips, not dropdowns, for bonus/deduction selection — they're scannable and fast
- Active chips get a filled state; available chips stay outlined
- Group chips by category (bonuses, hometown, deductions) with subtle section breaks

---

## Color & Visual Language

### Brand Palette

The app uses an **indigo/violet gradient** as its signature color. This appears in:
- Active nav items
- Podium ranks (gold/amber for 1st, indigo for 2nd, orange/bronze for 3rd)
- Key action buttons (Add Book)
- Background gradient on the app shell

### Semantic Colors

| Purpose | Color family | Usage |
|---------|-------------|-------|
| Rank 1 / Gold | Amber | Podium, badges, highlights |
| Rank 2 / Silver | Indigo | Podium, badges |
| Rank 3 / Bronze | Orange | Podium, badges |
| Success / Completed | Green | Status badges, completion indicators |
| In Progress | Blue | "Currently reading" status |
| Warning / DNF | Amber/Yellow | "Did not finish" status |
| Destructive | Red | Delete actions, error states |
| Muted | Gray | Secondary text, disabled states, empty states |

### Typography

- **Font:** Geist Sans (loaded via `next/font`)
- **Hierarchy:** Use font weight and size, not color alone, to establish hierarchy. Bold for primary data (points, rank), regular for labels, muted color for secondary info.
- **Numbers:** Tabular figures for anything that aligns in columns (points, page counts, rankings). Ensure numbers in tables don't cause layout shift.

---

## Interaction Patterns

### Form Design (Book Entry)

The book entry form serves all five personas differently. Progressive disclosure makes this work:

**Always visible (The Casual's path):**
1. Book search (auto-fills title, author, pages, cover)
2. Fiction / Nonfiction toggle
3. Genre picker
4. Status (defaults to Completed)
5. Score preview (live, non-interactive)
6. Save button

**Expandable sections (The Tracker / Competitor's path):**
- Bonuses section (collapsed, shows count when populated: "2 bonuses")
- Deduction selector
- Hometown bonus
- Series name
- Rating (stars)
- Date finished
- Pages read override

### Leaderboard Interaction

- **Default view:** Podium (top 3) + simplified table (rank, name, points, books)
- **Tap/click player row:** Navigate to player profile with full stats
- **Desktop expansion:** Inline row expansion showing challenge progress, fun stats
- **Sort controls:** Accessible but not prominent — most users want the default (points desc)

### Error & Empty States

- **Empty book list:** Warm illustration or icon + "Add your first book" CTA
- **Empty leaderboard:** "Waiting for readers to join" with invite code display
- **Form validation:** Inline, real-time. Red border + helper text under the field. Never alert boxes.
- **Network errors:** Toast notification (via Sonner) with retry option. Don't blank the screen.

---

## Accessibility Guidelines

- All interactive elements must be keyboard-navigable
- Color is never the sole indicator of state — pair with icons, labels, or patterns
- Touch targets minimum 44x44px on mobile
- Form inputs have visible labels (not placeholder-only)
- Contrast ratios meet WCAG AA minimum (4.5:1 for normal text)
- Loading states use skeleton screens, not spinners, for content areas
- Screen reader text for icon-only buttons (e.g., the Add Book action)

---

## Persona-Specific Cheat Sheet

Use this as a quick reference when building or reviewing any feature:

| Persona | Primary need | Design response |
|---------|-------------|-----------------|
| **The Organizer** | Setup should be fast, rule changes should be safe | Sensible defaults, impact previews, contained admin section |
| **The Competitor** | Scoring must be transparent and comparable | Score breakdowns, rank deltas, expandable leaderboard stats |
| **The Casual** | Everything should be simple and fast | Minimal required fields, 30-second book entry, encouraging tone |
| **The Explorer** | Challenge progress must be visible and specific | Gap analysis grids, progress bars, "X remaining" counts |
| **The Tracker** | Data must be accurate and editable | Full metadata support, easy editing, cross-season history |

**When these conflict:** Start with The Casual's simplicity, then layer in depth for others. A collapsed section costs The Casual nothing but gives The Competitor everything.
