# UI Alignment Bug Fix

## Root causes corrected

1. **Filter controls stacked vertically on wide desktop screens**
   - The global form rule assigned `width: 100%` to every `.erp-filter-select`.
   - Inside a wrapping flex toolbar, each select therefore requested an entire row.
   - Table toolbars now use bounded flex widths and remain in one row while sufficient space exists.

2. **Profile labels and values appeared joined together**
   - Profile rows rendered an icon, content block, and action into a grid configured for only two columns.
   - The label and value were also inline elements.
   - Profile rows now use three explicit columns and block-level label/value content with wrapping for long data.

3. **Dark employee profile data was almost invisible**
   - The dark dashboard panel inherited light-card value colors.
   - Dark profile details now use dedicated high-contrast colors and consistent padding.

4. **KPI and panel bottoms did not align**
   - Cards were not flex columns, so helper text and footers ended at different vertical positions.
   - All KPI cards now stretch equally, and their footers anchor to the bottom.
   - Panels are now flex containers with flexible bodies.

5. **Attendance chart visually overstated small data**
   - Zero values were forced to a visible two-percent bar.
   - A single value of one became a full-height bar because the chart scale also became one.
   - Zeroes now render as zero, and the chart uses a truthful minimum visual scale without changing data.

6. **Long employee names could disturb header alignment**
   - Topbar names had no width boundary.
   - Names now truncate safely while full values remain available in the page content.

7. **Shared button classes could be overwritten**
   - Passing `className` to `ToolbarButton` replaced the required ERP button classes.
   - Custom classes are now merged with the standard button style.

## Pages directly corrected

- Admin Dashboard
- Employee Dashboard
- Employees List
- My Profile

## Global effect

The shared corrections also apply to every screen using:

- `Panel`
- `MetricCard`
- `TableShell`
- table filters
- profile detail lists
- dashboard grids
- column charts
- toolbar buttons

## Files changed

- `client/src/index.css`
- `client/src/components/ui/EnterpriseUI.jsx`
- `client/src/pages/EmployeeDashboard.jsx`
- `client/src/pages/ManageEmployee.jsx`
- `client/src/pages/UserProfile.jsx`
