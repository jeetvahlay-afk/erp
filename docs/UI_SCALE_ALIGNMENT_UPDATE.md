# UI Scale and Alignment Update

## Objective

The interface is now calibrated for normal **100% browser zoom**. Users should not need to increase the browser zoom to 125% to obtain readable text or appropriately sized controls.

## Design-system changes

- Increased the desktop sidebar from 228px to 258px, with a 244px optimized width on smaller desktop screens.
- Increased header height, navigation row height, control height, content padding, and page spacing.
- Standardized readable typography across headings, breadcrumbs, cards, tables, forms, statuses, modals, popovers, detail views, and empty states.
- Applied a shared maximum content width and centered page alignment so headers, KPI sections, panels, and tables start and end on consistent vertical lines.
- Refined the neutral background, borders, navy text, orange primary actions, and supporting semantic colors.
- Preserved the compact enterprise character with restrained 5–6px corner radii.

## Universal KPI system

`MetricCard` is the shared KPI component used by My Payroll and every top-level KPI section. The same card structure is now used for:

- Admin, HR, employee, payroll, recruitment, and attendance dashboards
- Employee directory
- Department management
- Payroll records
- Salary configuration
- Leave balances and leave approval totals
- Attendance administration
- Recruitment pipeline
- Employee attendance

Secondary statistic boxes use the same border, typography, spacing, value hierarchy, and surface treatment.

## Responsive behavior

- Six-item KPI groups render as three columns on desktop, two on tablet, and one on mobile.
- Four-item KPI grids reduce to two columns at smaller desktop/tablet widths.
- Page actions, filters, forms, tables, and profile layouts reflow without requiring browser zoom.
- Mobile typography remains readable without creating excessive horizontal overflow.
