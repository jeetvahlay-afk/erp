import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import PageLoader from './components/common/PageLoader';
import { ADMIN_ROLES, HR_ROLES, RECRUITMENT_ROLES } from './lib/access';

const Layout = lazy(() => import('./components/Layout'));
const Login = lazy(() => import('./pages/Login'));
const PasswordRecovery = lazy(() => import('./pages/PasswordRecovery'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const EmployeeDashboard = lazy(() => import('./pages/EmployeeDashboard'));
const HRDashboard = lazy(() => import('./pages/HRDashboard'));
const EmployeeAttendance = lazy(() => import('./pages/EmployeeAttendance'));
const ManageEmployee = lazy(() => import('./pages/ManageEmployee'));
const AddEmployee = lazy(() => import('./pages/AddEmployee'));
const EditEmployee = lazy(() => import('./pages/EditEmployee'));
const ManageRoles = lazy(() => import('./pages/ManageRoles'));
const EmployeeDetails = lazy(() => import('./pages/EmployeeDetails'));
const AccountsConfig = lazy(() => import('./pages/AccountsConfig'));
const ConfigurationList = lazy(() => import('./pages/ConfigurationList'));
const ManageShift = lazy(() => import('./pages/ManageShift'));
const BreakConfig = lazy(() => import('./pages/BreakConfig'));
const ManageRoutes = lazy(() => import('./pages/ManageRoutes'));
const ManageAttendance = lazy(() => import('./pages/ManageAttendance'));
const AttendanceRegister = lazy(() => import('./pages/AttendanceRegister'));
const ManageDailyBreaks = lazy(() => import('./pages/ManageDailyBreaks'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const ManageLeaves = lazy(() => import('./pages/ManageLeaves'));
const ManageProfileRequests = lazy(() => import('./pages/ManageProfileRequests'));
const ManagePayrolls = lazy(() => import('./pages/ManagePayrolls'));
const SalaryConfiguration = lazy(() => import('./pages/SalaryConfiguration'));
const Leaves = lazy(() => import('./pages/Leaves'));
const MyPayroll = lazy(() => import('./pages/MyPayroll'));
const TakeBreak = lazy(() => import('./pages/TakeBreak'));
const AttendanceDetail = lazy(() => import('./pages/AttendanceDetail'));
const ManageInterviews = lazy(() => import('./pages/ManageInterviews'));
const InterviewDetails = lazy(() => import('./pages/InterviewDetails'));
const ManageDepartments = lazy(() => import('./pages/ManageDepartments'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const EmployeeWorkspacePage = lazy(() => import('./pages/EmployeeWorkspacePage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const AppearanceSettings = lazy(() => import('./pages/AppearanceSettings'));
const MyWorkReport = lazy(() => import('./pages/MyWorkReport'));
const ManageWorkReports = lazy(() => import('./pages/ManageWorkReports'));
const WorkReportDetails = lazy(() => import('./pages/WorkReportDetails'));
const Forbidden = lazy(() => import('./pages/errors/Forbidden'));
const NotFound = lazy(() => import('./pages/errors/NotFound'));

const App = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<PasswordRecovery />} />
      <Route path="/reset-password" element={<PasswordRecovery reset />} />
      <Route path="/unauthorized" element={<Forbidden />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard/employee" element={<EmployeeDashboard />} />
          <Route path="profile" element={<UserProfile />} />
          <Route path="settings/appearance" element={<AppearanceSettings />} />
          <Route path="attendance" element={<EmployeeAttendance />} />
          <Route path="leaves" element={<Leaves />} />
          <Route path="my-payroll" element={<MyPayroll />} />
          <Route path="take-break" element={<TakeBreak />} />
          <Route path="my-documents" element={<EmployeeWorkspacePage type="documents" />} />
          <Route path="announcements" element={<EmployeeWorkspacePage type="announcements" />} />
          <Route path="birthdays" element={<EmployeeWorkspacePage type="birthdays" />} />
          <Route path="events" element={<EmployeeWorkspacePage type="events" />} />
          <Route path="tasks" element={<TasksPage view="my" />} />
          <Route path="tasks/assigned" element={<TasksPage view="assigned" />} />
          <Route path="tasks/completed" element={<TasksPage view="completed" />} />
          <Route path="tasks/pending" element={<TasksPage view="pending" />} />
          <Route path="tasks/today" element={<TasksPage view="today" />} />
          <Route path="tasks/calendar" element={<TasksPage view="calendar" />} />
          <Route path="tasks/kanban" element={<TasksPage view="kanban" />} />
          <Route path="my-work-report" element={<MyWorkReport />} />

          <Route element={<ProtectedRoute allowedRoles={ADMIN_ROLES} allowedPermissions={['employees.read']} />}>
            <Route path="dashboard/admin" element={<AdminDashboard />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={HR_ROLES} allowedPermissions={['employees.read', 'attendance.read', 'leaves.read']} />}>
            <Route path="dashboard/hr" element={<HRDashboard />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={HR_ROLES} allowedPermissions={['attendance.read']} />}>
            <Route path="manage-attendance" element={<ManageAttendance />} />
            <Route path="attendance-register" element={<AttendanceRegister />} />
            <Route path="admin/attendance/:id" element={<AttendanceDetail />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={HR_ROLES} allowedPermissions={['leaves.read']} />}>
            <Route path="manage-leaves" element={<ManageLeaves />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={RECRUITMENT_ROLES} allowedPermissions={['recruitment.read']} />}>
            <Route path="manage-interviews" element={<ManageInterviews />} />
            <Route path="interview/:id" element={<InterviewDetails />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={ADMIN_ROLES} allowedPermissions={['payroll.read']} />}>
            <Route path="payrolls" element={<ManagePayrolls />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={ADMIN_ROLES} allowedPermissions={['payroll.write']} />}>
            <Route path="salary-config" element={<SalaryConfiguration />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={ADMIN_ROLES} allowedPermissions={['employees.read']} />}>
            <Route path="manage-employee" element={<ManageEmployee />} />
            <Route path="employee/:id" element={<EmployeeDetails />} />
            <Route path="work-reports" element={<ManageWorkReports />} />
            <Route path="work-reports/:userId" element={<WorkReportDetails />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={ADMIN_ROLES} allowedPermissions={['employees.create']} />}>
            <Route path="add-employee" element={<AddEmployee />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={ADMIN_ROLES} allowedPermissions={['employees.write']} />}>
            <Route path="edit-employee/:id" element={<EditEmployee />} />
            <Route path="profile-requests" element={<ManageProfileRequests />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={ADMIN_ROLES} allowedPermissions={['departments.read']} />}>
            <Route path="manage-departments" element={<ManageDepartments />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={ADMIN_ROLES} allowedPermissions={['roles.read']} />}>
            <Route path="manage-roles" element={<ManageRoles />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={ADMIN_ROLES} allowedPermissions={['audit.read']} />}>
            <Route path="audit-logs" element={<AuditLogs />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={ADMIN_ROLES} allowedPermissions={['settings.read']} />}>
            <Route path="manage-routes" element={<ManageRoutes />} />
            <Route path="configurations" element={<ConfigurationList />} />
            <Route path="accounts-config" element={<AccountsConfig />} />
            <Route path="manage-shift" element={<ManageShift />} />
            <Route path="break-config" element={<BreakConfig />} />
            <Route path="manage-breaks" element={<ManageDailyBreaks />} />
          </Route>

          <Route path="404" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  </Suspense>
);

export default App;
