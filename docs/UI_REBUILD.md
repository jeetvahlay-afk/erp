# Enterprise UI and Feature Rebuild

Date: 17 July 2026

## Objective

This phase rebuilds TeamHub ERP around the compact Preadmin/SmartHR-style interface supplied as visual references. The implementation uses original React components and CSS rather than importing template code or assets.

The design is intentionally flat and operational:

- restrained 4–5 px corner radius
- white and light-grey work surfaces
- orange primary actions
- dark navy and teal supporting accents
- slim fixed sidebar and compact top bar
- dense data tables and small status indicators
- consistent 8/10/12/14 px spacing rhythm
- aligned page headers, filters, actions, cards and forms
- responsive and keyboard-accessible behavior

## Rebuilt application shell

- Responsive fixed sidebar with permission-aware navigation
- Collapsible dashboard groups for Admin, Employee, HR, Payroll, Recruitment and Attendance
- Compact top bar with global module search and `Ctrl+/` shortcut
- Live notification drawer
- Theme switcher and profile menu
- Route-level access protection using roles or explicit permissions
- Consistent footer, page header, breadcrumb and action placement

## Live dashboards

All dashboard values are calculated from MongoDB through `/api/dashboard/:view`. No employee names, candidate names, totals, charts or table rows are hardcoded in the client.

### Admin Dashboard

- Workforce, active/inactive and new-joiner statistics
- Present, late and absent summary
- Pending leave approvals
- Department distribution
- Weekly attendance chart
- Six-month payroll trend
- Payroll totals and payment progress
- Recent candidate pipeline

### Employee Dashboard

- Employee identity and employment details
- Current attendance and punch status
- Daily, weekly, monthly and yearly work hours
- Break minutes and overtime
- Leave entitlements, use and remaining balance
- Recent leave requests
- Latest payroll record
- Personal notifications

### HR Dashboard

- Headcount and attendance KPIs
- New joiners and late arrivals
- Department distribution
- Weekly attendance trend
- Pending leave approvals
- Upcoming interviews
- Recruitment funnel
- Current payroll cost

### Payroll Dashboard

- Gross payroll, deductions and net payable
- Average and highest salary
- Payment-state counts
- Salary-range distribution
- Six-month trend
- Processing pipeline
- Recent payroll records
- Live payroll generation controls

### Recruitment Dashboard

- Applied, shortlisted, interviewed, offered and hired funnel
- Candidate volume by position
- Recent candidates
- Upcoming interview schedule
- Conversion metrics based on live interview status

### Attendance Dashboard

- Active workforce, present, late and absent counts
- Attendance rate and missing-punch count
- Weekly attendance trend
- Average work hours and break minutes
- Today’s attendance records
- Late-arrival list

## Rebuilt operational screens

### Employees

- Flat KPI summary and dense employee table
- Server-backed search, filters, pagination and CSV export
- Add and edit employee forms
- Profile-image upload with protected avatar delivery
- Employment, reporting, personal and profile fields
- Employee details with expandable employment sections
- Per-employee permission matrix
- Route overrides
- Active/inactive management and soft deletion safeguards

### Attendance and Breaks

- Admin attendance table with date, department and status filters
- Employee attendance self-service view
- Individual attendance detail with workday and break drill-down
- Attendance correction workflow for authorized staff
- Daily attendance dashboards
- Break timer, identity verification, break types and policy configuration
- Break approval and overstay reporting

### Leave

- Employee leave balance cards derived from configured policy and approved usage
- Employee leave list and application workflow
- Admin/HR approval queue with review notes
- Status, leave-type and employee filters
- Attachment support through authenticated downloads
- Overlapping-leave protection on the server

### Payroll

- Payroll list with month/status filters and exports
- Employee self-service payslip view
- Salary-component configuration
- Idempotent payroll generation
- Processing status and payment-state views
- Print/PDF and CSV output

### Recruitment

- Candidate pipeline and status filters
- Add/edit/delete candidate workflows
- Candidate details page
- Interview dates and upcoming schedule
- Round owner, email status, joining, training and compensation details
- Recruitment analytics derived from candidate status

### Administration

- Roles and descriptions
- Granular permission matrix
- Route overrides
- Departments
- Shifts and assignments
- Profile-change approvals
- Audit log viewer
- Secure account/integration settings
- SMTP account configuration and test-email action

## Data integrity policy

The UI intentionally does not show template sample employees, candidates, invoices, projects or AI-assistant content. When a database collection has no records, the screen renders a clear empty state. This prevents screenshots or demo values from being mistaken for business data.

Features shown in the visual references were added only where the project has a real domain model and secure server workflow. Unrelated template-only modules such as fake invoice feeds or a simulated AI assistant were not represented as functioning ERP features.

## New reusable client architecture

- `components/ui/EnterpriseUI.jsx` — panels, metrics, tables, modals, charts, status badges and common states
- `hooks/useLiveData.js` — reusable API loading state
- `lib/access.js` — role and permission evaluation
- `lib/export.js` — CSV and print helpers
- Centralized flat design tokens in `src/index.css`
- Lazy-loaded page routes through `App.jsx`

## Server additions supporting the UI

- Six dashboard aggregation views
- Permission-aware authorization helper
- Expanded employee profile and permission schema
- Protected profile-image upload and delivery
- Paginated employee attendance history
- Attendance correction endpoint
- Live recruitment, payroll, leave and attendance aggregations

## Responsive behavior

The desktop layout preserves the dense reference presentation. At tablet and mobile sizes:

- the sidebar becomes an overlay drawer
- dashboard columns collapse predictably
- tables retain horizontal scrolling
- filters wrap without breaking alignment
- forms become one column
- modals stay within the viewport

## Verification

The UI phase passed ESLint, unit tests, production build, server tests, JavaScript syntax checks and dependency audits. See `docs/UI_VALIDATION.md` for exact results and limitations.
