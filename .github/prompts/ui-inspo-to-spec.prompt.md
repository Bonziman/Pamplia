# UI Inspiration → Pamplia Spec (Dashboard-first)

## Goal
Match the *feel* of the provided dashboard inspirations: clean, modern, card-based layouts with strong hierarchy and calm spacing. Not “bare minimal”—premium minimal.

## What the inspo has (patterns to copy)
1) **Clear hierarchy**
- Page title + short subtitle
- Primary action button on the right
- Secondary controls as small pills/selects (period, filters)

2) **Card grid system**
- Soft background page
- White cards with subtle border + gentle shadow
- Consistent padding and radii
- Cards grouped into a balanced grid (2–4 columns depending on screen)

3) **Information density without clutter**
- Top: 3–6 KPI cards
- Middle: one strong chart or calendar block + a list/table block
- Right rail: “needs attention” + quick actions

4) **Tables are calm**
- Light header background
- Clear rows, minimal borders
- Status pills (confirmed/pending/cancelled/done)

5) **Calendar is the hero when needed**
- Clear weekly view
- Events as soft-colored blocks with strong time label

## Pamplia constraints
- Chakra UI + existing theme tokens.
- Avoid big redesign / new pages.
- Prefer refactors that *reduce* custom CSS.

## Dashboard Overview (target layout)
Desktop (lg+):
- Row 1: Title + primary action
- Row 2: KPI grid (4 cards)
- Row 3: 2-column layout
  - Left (2/3): Revenue chart (or other key chart)
  - Right (1/3): Today agenda card + “Needs attention” card
- Row 4: Period activity stats as compact cards (or a simple table)

Mobile:
- Stack sections; keep KPI cards 1-column.

## “Clean data” expectations
- Never show placeholders like “Walk-in” if real client name exists.
- Prefer 24h time display.
- Currency display as `DH`/`MAD` consistently.

## Next tickets (1–2 days each)
1) Dashboard Overview layout pass (grid + right rail)
- File: [frontend/src/pages/DashboardOverviewPage.tsx](../../frontend/src/pages/DashboardOverviewPage.tsx)
- Acceptance: KPIs + agenda + chart read cleanly in one screen on desktop.

2) Reduce ad-hoc CSS by moving card/table styles into theme or Chakra components
- Files: [frontend/src/pages/Dashboard.css](../../frontend/src/pages/Dashboard.css), [frontend/src/theme.ts](../../frontend/src/theme.ts)

3) Calendar view visual polish (spacing + event blocks)
- File: [frontend/src/components/AppointmentCalendar.tsx](../../frontend/src/components/AppointmentCalendar.tsx)

4) Public booking page parity (remove dummy times, use availability)
- File: [frontend/src/pages/BookingPage.tsx](../../frontend/src/pages/BookingPage.tsx)
