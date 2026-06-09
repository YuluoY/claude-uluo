# Backend Admin Dashboard - Design & Implementation

## Design Plan

### Visual Identity
- **Color Palette**: Deep indigo primary (#4F46E5) with slate neutrals, vibrant accent gradients on stat cards (emerald, amber, rose, sky). Dark sidebar (#1E1B4B) creates visual depth and hierarchy.
- **Typography**: System font stack for crisp rendering. Inter-like proportions with clean letter-spacing.
- **Spacing & Layout**: 8px grid system. Generous whitespace for readability. CSS Grid for the overall shell, Flexbox for component internals.

### Layout Structure
```
+-------+--------------------------------------------+
|       |  Header (search, notifications, avatar)      |
| Side  +--------------------------------------------+
| bar   |  Stat Cards (4-up grid)                      |
|       +--------------------------------------------+
| (nav) |  Charts Row (line chart + pie/donut chart)   |
|       +--------------------------------------------+
|       |  Recent Orders Table                         |
+-------+--------------------------------------------+
```

### Component Breakdown

1. **Sidebar** - Dark background, logo/brand at top, nav links with icons and active state indicator, user info at bottom.

2. **Top Header** - Search input, notification bell with badge, user avatar with dropdown.

3. **Stat Cards** - 4 cards in a responsive grid. Each has a gradient background, icon, label, value, and trend indicator (up/down percentage).

4. **Charts Section** - Two charts side by side: a revenue line chart and a traffic sources donut chart. Uses Chart.js via CDN.

5. **Recent Orders Table** - Clean data table with status badges, zebra striping, hover states. Columns: Order ID, Customer, Product, Date, Amount, Status.

### Technical Choices
- **Pure HTML/CSS/JS** - No build step, single-file deployable.
- **Chart.js 4.x** - Lightweight, beautiful defaults, good animation.
- **CSS Custom Properties** - Theming via variables for easy color swaps.
- **SVG Icons** - Inline heroicons for zero-dependency iconography.
- **Responsive** - Sidebar collapses on mobile, grid adapts down to single column.

---

## Files Generated

| File | Description |
|------|-------------|
| `index.html` | Full dashboard with embedded CSS and JS |
