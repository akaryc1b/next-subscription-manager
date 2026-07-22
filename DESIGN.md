# Subscription Manager — DESIGN.md

## 1. Visual theme and atmosphere

Subscription Manager is a focused personal SaaS workspace, not a generic admin template.

The interface should feel precise, quiet, technical, and immediately usable. It is dark-first, with a light theme that keeps the same structure and contrast hierarchy. The visual language combines:

- Linear-inspired near-black surfaces, compact spacing, and a single lavender accent.
- Vercel-inspired flat panels, hairline borders, and typography-led hierarchy.
- Stripe-inspired numeric clarity and tabular figures for usage, dates, and counts.
- Raycast-inspired compact controls, dense navigation, and restrained active states.

The application must avoid decorative UI that competes with data. Do not use large atmospheric gradients, floating glass cards, oversized empty hero areas, or repeated KPI-card walls.

### Product personality

- Premium but restrained.
- Dense but not cramped.
- Technical but readable.
- Calm by default; urgency is reserved for renewal and security states.
- Task-oriented: every screen should make the next action obvious.

## 2. Color palette and roles

### Dark theme

| Token | Value | Role |
| --- | --- | --- |
| Canvas | `#0b0b0d` | App background |
| Surface 1 | `#111214` | Sidebar, header, primary panels |
| Surface 2 | `#17181b` | Nested rows and hovered surfaces |
| Surface 3 | `#1d1e22` | Selected controls and lifted menus |
| Hairline | `#27282d` | Default borders and dividers |
| Hairline strong | `#3a3c43` | Focused and emphasized borders |
| Ink | `#f5f6f7` | Primary text |
| Ink secondary | `#c8cad0` | Secondary text |
| Ink muted | `#8b8f98` | Captions and helper text |
| Ink disabled | `#60636b` | Disabled text |
| Accent | `#5e6ad2` | Primary actions and active navigation |
| Accent hover | `#6f7be0` | Hovered primary action |
| Accent soft | `rgba(94,106,210,.14)` | Selected rows and soft emphasis |
| Success | `#3fb950` | Healthy and active status |
| Warning | `#d29922` | Renewal attention and warnings |
| Danger | `#f85149` | Critical security and destructive action |
| Info | `#58a6ff` | Informational state |

### Light theme

| Token | Value | Role |
| --- | --- | --- |
| Canvas | `#f6f7f8` | App background |
| Surface 1 | `#ffffff` | Sidebar, header, primary panels |
| Surface 2 | `#f1f2f4` | Nested rows and hover |
| Surface 3 | `#e9eaed` | Selected controls |
| Hairline | `#dedfe3` | Default borders |
| Hairline strong | `#b9bcc4` | Focused borders |
| Ink | `#17181b` | Primary text |
| Ink secondary | `#3d4047` | Secondary text |
| Ink muted | `#70747d` | Captions and helper text |
| Accent | `#5e6ad2` | Primary actions and active navigation |

### Color rules

- Accent purple is the only brand color. Do not add decorative cyan or pink gradients.
- Semantic colors are only for meaningful state, never decoration.
- Most hierarchy should come from spacing, typography, surface level, and borders.
- Charts and numeric summaries should prefer neutral ink plus one accent highlight.

## 3. Typography rules

Use `Inter`, `Geist`, or the system sans stack. Use the mono stack only for tokens, IDs, IP addresses, dates when helpful, and technical labels.

| Role | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- |
| Page title | 28–32px | 600 | 1.15 | `-0.035em` |
| Section title | 15–16px | 600 | 1.35 | `-0.015em` |
| Card metric | 24–30px | 600 | 1.1 | `-0.035em` |
| Body | 14px | 400 | 1.5 | `0` |
| Small body | 13px | 400 | 1.45 | `0` |
| Caption | 11–12px | 500 | 1.35 | `0` |
| Technical label | 10–11px | 500 | 1.3 | `0.06em` |
| Button | 13px | 500 | 1 | `-0.01em` |

### Typography rules

- Use sentence case. Do not uppercase headings.
- Use uppercase only for very small technical taxonomy labels.
- Apply tabular figures to metrics, dates, quotas, IP addresses, and counts.
- Keep descriptions short. UI copy should explain the data, not explain the interface.

## 4. Component styling

### Buttons

- Default height: 36px. Compact height: 32px. Large height: 40px.
- Radius: 8px.
- Primary button: accent fill, white text, no glow, no floating transform.
- Secondary button: Surface 2 with hairline border.
- Ghost button: transparent, muted text, Surface 2 on hover.
- Destructive button: danger fill only for confirmed destructive actions.
- Focus: 2px accent ring with 2px offset.

### Panels and cards

- Standard radius: 10px or 12px.
- Border: 1px hairline.
- Shadow: none in dark mode; extremely subtle in light mode.
- Avoid card nesting. Rows inside a panel should use dividers or Surface 2, not another full card.
- Panel headers should be compact and aligned with their content.

### Navigation

- Desktop sidebar width: 240–256px; collapsed width: 68–76px.
- Active item: Accent soft background, bright text, and a 2px accent indicator.
- Navigation is grouped by user intent, not implementation type.
- Labels should be: Overview, Subscriptions, Renewals, Configurations, Activity, Settings.

### Tables and data lists

- Use row-based layouts for subscriptions, renewals, configuration assets, logs, and security events.
- Header rows are compact, muted, and may use technical-label typography.
- Row height: 44–56px depending on content.
- Primary identifier on the left; state and action on the right.
- Use dividers instead of separate cards for every row.

### Badges

- Radius: 5–6px, not full pill unless it is a filter chip.
- Height: 20–22px.
- Use soft semantic background and readable foreground.
- Badges communicate state only.

### Inputs

- Height: 38–40px.
- Radius: 8px.
- Surface 1 background and hairline border.
- Focus uses hairline strong plus accent ring.
- Avoid overly large labels and helper blocks.

## 5. Layout principles

### App shell

- The sidebar and utility header form the persistent workspace chrome.
- The content canvas is flat and scrollable; it should not look like a floating rounded browser window.
- Desktop content padding: 24–32px.
- Tablet content padding: 20–24px.
- Mobile content padding: 16px with bottom navigation safe-area spacing.
- Maximum content width: 1440px.

### Page hierarchy

Every primary screen follows this order:

1. Compact page header with title, one-sentence context, and actions.
2. Optional metric strip or filter bar.
3. Primary task panel.
4. Secondary context panels.
5. Empty states only where data is absent.

### Dashboard information architecture

The dashboard is a working overview, not a report gallery.

1. Portfolio headline and current health.
2. One compact metric strip for subscriptions, requests, configurations, and risk signals.
3. Renewal queue as the primary operational panel.
4. Portfolio status and usage ratios as secondary context.
5. Recent activity and security events as dense lists.

### Spacing scale

Use a 4px base grid:

- 4px micro gap
- 8px compact gap
- 12px control gap
- 16px standard gap
- 20px panel padding on desktop
- 24px major layout gap
- 32px page-section gap
- 48px only for major empty-state breathing room

## 6. Depth and elevation

- Prefer flat surface hierarchy over blur and shadow.
- Sidebar and header use Surface 1.
- Main panels use Surface 1.
- Nested rows and filters use Surface 2.
- Menus and dialogs use Surface 3 plus a controlled shadow.
- Do not use backdrop blur on normal panels.
- Do not place blurred color orbs behind the application.

## 7. Do and do not

### Do

- Make the most important list or action visually dominant.
- Keep metrics compact and comparable.
- Use row density suitable for operational data.
- Show dates, quotas, and counts with tabular figures.
- Make active navigation obvious without glow.
- Use responsive layouts that preserve priority.
- Reuse shared primitives so all pages stay consistent.

### Do not

- Do not build every section as a separate oversized card.
- Do not use glassmorphism, liquid orbs, scanlines, or terminal decoration.
- Do not add gradients to small components.
- Do not use large rounded rectangles around simple headings.
- Do not use vague labels such as “Assets” when “Subscriptions” or “Renewals” is clearer.
- Do not add decorative copy or fake functionality.
- Do not change business logic, API behavior, authentication, permissions, or data structures during UI work.

## 8. Responsive behavior

### Desktop ≥ 1024px

- Persistent sidebar.
- Utility header aligned with content.
- Two-column dashboard where the primary panel is wider.
- Dense tables and row lists.

### Tablet 768–1023px

- Sidebar becomes a drawer.
- Two-column metric strip may wrap to 2×2.
- Main dashboard panels stack when width becomes constrained.

### Mobile < 768px

- Bottom navigation remains available.
- Header is 52–56px tall.
- Page title remains compact; actions wrap below when necessary.
- Metric strip becomes two columns.
- Data rows become stacked but retain identifier → metadata → state order.
- Minimum touch target: 44px.
- Avoid horizontal scrolling except for genuine tables.

## 9. Agent prompt guide

When editing UI in this repository:

1. Read this file before changing layout or components.
2. Preserve all current behavior and data access.
3. Start from information architecture, then spacing, then component styling.
4. Use shared components from `src/components/ui` rather than page-specific visual one-offs.
5. Keep Accent `#5e6ad2` as the only brand color.
6. Prefer flat panels, hairline borders, 8–12px radii, and compact controls.
7. Review desktop, tablet, and mobile behavior before completing the task.
8. Reject generic admin-dashboard patterns that create walls of identical cards.
