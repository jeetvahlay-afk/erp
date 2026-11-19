import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Banknote,
  Briefcase,
  Building,
  Calendar,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  Edit,
  Edit3,
  FileText,
  GraduationCap,
  Hourglass,
  IdCard,
  Info,
  LayoutGrid,
  Mail,
  Phone,
  Power,
  RotateCcw,
  ShieldAlert,
  Store,
  Trash2,
  Upload,
  User,
  Users,
} from 'lucide-react';
import api, { asArray, getApiError } from '../lib/api';
import { feedback } from '../lib/feedback';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  PageHeader,
  formatCurrency,
  formatDate,
  formatNumber,
  formatTime,
} from '../components/ui/EnterpriseUI';

const EmployeeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const docInputRef = useRef(null);
  const [offboardOpen, setOffboardOpen] = useState(false);
  const [offboardForm, setOffboardForm] = useState({ exitDate: '', reason: '', separationType: 'Resignation' });
  const [offboarding, setOffboarding] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const employeeResponse = await api.get(`/api/users/${id}`);
      setEmployee(employeeResponse.data);

      try {
        const attendanceResponse = await api.get(`/api/attendance/user/${id}`);
        setAttendance(asArray(attendanceResponse.data));
      } catch (err) {
        console.warn('Unable to load employee attendance:', err);
        setAttendance([]);
      }

      try {
        const leaveResponse = await api.get(`/api/leaves?userId=${id}`);
        setLeaves(asArray(leaveResponse.data));
      } catch (err) {
        console.warn('Unable to load employee leaves:', err);
        setLeaves([]);
      }

      try {
        const payrollResponse = await api.get(`/api/payroll?userId=${id}`);
        setPayrolls(asArray(payrollResponse.data));
      } catch (err) {
        console.warn('Unable to load employee payroll:', err);
        setPayrolls([]);
      }
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to load employee details'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const uploadDoc = async (file) => {
    if (!file) return;
    const payload = new FormData();
    payload.append('document', file);
    try {
      await api.post(`/api/users/${id}/documents`, payload);
      feedback.success('Document uploaded successfully.');
      load();
    } catch (err) {
      feedback.error(getApiError(err, 'Unable to upload document'));
    }
  };

  const downloadDoc = async (doc) => {
    try {
      const response = await api.get(`/api/users/${id}/documents/${doc._id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      feedback.error('Unable to download document');
    }
  };

  const deleteDoc = async (doc) => {
    const accepted = await feedback.confirm(`Are you sure you want to delete ${doc.name}?`, {
      title: 'Delete Document',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!accepted) return;
    try {
      await api.delete(`/api/users/${id}/documents/${doc._id}`);
      feedback.success('Document deleted successfully.');
      load();
    } catch (err) {
      feedback.error(getApiError(err, 'Unable to delete document'));
    }
  };

  const offboard = async () => {
    if (!offboardForm.exitDate) {
      feedback.error('Exit date is required.');
      return;
    }
    setOffboarding(true);
    try {
      await api.patch(`/api/users/${id}/status`, {
        isActive: false,
        exitDate: offboardForm.exitDate,
        exitReason: offboardForm.reason,
        separationType: offboardForm.separationType,
      });
      feedback.success(`${employee.name} has been offboarded successfully.`);
      setOffboardOpen(false);
      load();
    } catch (err) {
      feedback.error(getApiError(err, 'Unable to offboard employee'));
    } finally {
      setOffboarding(false);
    }
  };

  const reactivate = async () => {
    const ok = await feedback.confirm(`Reactivate ${employee?.name}?`, {
      title: 'Reactivate Employee',
      confirmLabel: 'Reactivate',
    });
    if (!ok) return;
    try {
      await api.patch(`/api/users/${id}/status`, { isActive: true });
      feedback.success(`${employee.name} has been reactivated.`);
      load();
    } catch (err) {
      feedback.error(getApiError(err, 'Unable to reactivate employee'));
    }
  };

  const stats = useMemo(
    () => ({
      attendance: attendance.length,
      hours: attendance.reduce((total, item) => total + Number(item.totalHours || 0), 0),
      approvedLeaves: leaves.filter((item) => item.status === 'Approved').length,
      pendingLeaves: leaves.filter((item) => item.status === 'Pending').length,
    }),
    [attendance, leaves]
  );

  const initials = useMemo(() => {
    if (!employee?.name) return 'SS';
    const parts = employee.name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }, [employee?.name]);

  if (loading) return <LoadingState label="Loading employee profile…" />;
  if (error) return <ErrorState message={error} retry={load} />;
  if (!employee) return <EmptyState title="Employee not found" />;

  const latestPayroll = payrolls[0];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'bank', label: 'Bank & Family', icon: Banknote },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'experience', label: 'Experience', icon: CalendarDays },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* Page Header */}
      <PageHeader
        title="Employee Details"
        breadcrumbs={['Employees', employee.name]}
        actions={
          <>
            <button
              type="button"
              onClick={() => navigate('/manage-employee')}
              className="border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer transition"
            >
              <ArrowLeft size={14} className="text-slate-500" />
              <span>Back</span>
            </button>

            {employee.isActive ? (
              <button
                type="button"
                onClick={() => {
                  setOffboardForm({ exitDate: '', reason: '', separationType: 'Resignation' });
                  setOffboardOpen(true);
                }}
                className="border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer transition"
              >
                <Power size={14} />
                <span>Offboard</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={reactivate}
                className="border border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-600 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer transition"
              >
                <RotateCcw size={14} />
                <span>Reactivate</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate(`/edit-employee/${employee._id}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-3.5 py-1.5 text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition active:scale-[0.98]"
            >
              <Edit size={14} />
              <span>Edit Employee</span>
            </button>
          </>
        }
      />

      {/* Main 2-Column Responsive Layout: Left Profile Column (4 cols) + Right Workspace (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-4.5 items-start">
        {/* ================= LEFT COLUMN: Profile + Key Info Cards ================= */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Identity & Key Info */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {/* Theme-bound Cover Banner */}
            <div
              className="h-20 relative"
              style={{
                background:
                  'linear-gradient(135deg, var(--erp-primary, #2563eb) 0%, color-mix(in srgb, var(--erp-primary, #2563eb) 75%, black) 100%)',
              }}
            />

            {/* Profile Avatar & Info */}
            <div className="px-4 sm:px-5 pt-0 pb-4 text-center relative -mt-10">
              <div className="inline-flex w-20 h-20 rounded-full bg-slate-900 ring-4 ring-white text-white font-bold text-xl items-center justify-center shadow-sm overflow-hidden">
                {employee?.profileImage ? (
                  <img
                    src={employee.profileImage}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>

              <h2 className="text-lg font-bold text-slate-900 mt-3 leading-snug truncate">
                {employee.name}
              </h2>
              <div className="text-xs text-slate-500 capitalize mt-0.5 font-medium">
                {employee.designation || employee.role || 'Super Admin'}
              </div>

              {/* Status Pill Badge */}
              <div className="mt-2.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    employee.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      employee.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                  <span>{employee.isActive ? 'Active' : 'Inactive'}</span>
                </span>
                {!employee.isActive && employee.exitDate && (
                  <p className="text-xs text-rose-500 font-medium mt-1">
                    Exited {formatDate(employee.exitDate)}
                  </p>
                )}
              </div>

              {/* Key Attributes List */}
              <div className="mt-5 pt-1 border-t border-slate-100 text-xs text-slate-700 divide-y divide-slate-100 text-left">
                <div className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-2 text-slate-500">
                    <IdCard size={15} className="text-slate-400 shrink-0" />
                    Employee ID
                  </span>
                  <span className="font-semibold text-slate-900">{employee.employeeId || 'Vah0001'}</span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-2 text-slate-500">
                    <Building size={15} className="text-slate-400 shrink-0" />
                    Department
                  </span>
                  <span className="font-semibold text-slate-900">{employee.department || 'Unassigned'}</span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-2 text-slate-500">
                    <Briefcase size={15} className="text-slate-400 shrink-0" />
                    Employment Type
                  </span>
                  <span className="font-semibold text-slate-900">{employee.employmentType || 'Full Time'}</span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-2 text-slate-500">
                    <Calendar size={15} className="text-slate-400 shrink-0" />
                    Joining Date
                  </span>
                  <span className="font-semibold text-slate-900">
                    {formatDate(employee.joiningDate || employee.createdAt)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-2 text-slate-500">
                    <Store size={15} className="text-slate-400 shrink-0" />
                    Company
                  </span>
                  <span className="font-semibold text-slate-900">{employee.company || 'TeamHub ERP'}</span>
                </div>
              </div>

              {/* Action Buttons: Call & Send Email */}
              <div className="grid grid-cols-2 gap-2.5 mt-4 pt-2">
                <button
                  type="button"
                  onClick={() => employee.phone && (window.location.href = `tel:${employee.phone}`)}
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200/90 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  <Phone size={14} className="text-slate-500" />
                  <span>Call</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (employee.email) {
                      navigate(`/mail/compose?to=${encodeURIComponent(employee.email)}`);
                    }
                  }}
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  <Mail size={14} />
                  <span>Send Email</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Basic Information */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <User size={15} className="text-blue-600" />
              <span>Basic Information</span>
            </div>

            <div className="text-xs text-slate-700 space-y-1 divide-y divide-slate-100">
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500">Phone</span>
                <span className="font-semibold text-slate-900">{employee.phone || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500">Email</span>
                <span className="font-semibold text-slate-900 truncate max-w-[190px]">
                  {employee.email || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500">Gender</span>
                <span className="font-semibold text-slate-900">{employee.gender || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500">Birthday</span>
                <span className="font-semibold text-slate-900">{formatDate(employee.dob)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500">Blood Group</span>
                <span className="font-semibold text-slate-900">{employee.bloodGroup || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500">Address</span>
                <span className="font-semibold text-slate-900 truncate max-w-[190px]">
                  {employee.currentAddress || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Emergency Contact */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Phone size={15} className="text-blue-600" />
              <span>Emergency Contact</span>
            </div>

            <div className="text-xs text-slate-700 space-y-1 divide-y divide-slate-100">
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500">Name</span>
                <span className="font-semibold text-slate-900">{employee.emergencyName || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500">Phone</span>
                <span className="font-semibold text-slate-900">{employee.emergencyPhone || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: Tab Navigation + Content Sections ================= */}
        <div className="lg:col-span-8 space-y-5">
          {/* Top Horizontal Navigation Tab Bar - Full Width, No Horizontal Scroll */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs px-1 sm:px-2 pt-2 flex items-center justify-between w-full overflow-hidden">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={
                    isActive
                      ? {
                          borderColor: 'var(--erp-primary, #2563eb)',
                          color: 'var(--erp-primary, #2563eb)',
                        }
                      : undefined
                  }
                  className={`flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 pb-2.5 px-1 sm:px-2 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer border-b-2 ${
                    isActive
                      ? 'border-blue-600 text-blue-600 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    size={14}
                    style={isActive ? { color: 'var(--erp-primary, #2563eb)' } : undefined}
                    className={isActive ? 'text-blue-600 shrink-0' : 'text-slate-400 shrink-0'}
                  />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Overview Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Box 1: About Employee */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Info size={15} />
                    </div>
                    <h3 className="font-bold text-xs text-slate-900">About Employee</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/edit-employee/${employee._id}`)}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 transition cursor-pointer"
                  >
                    <Edit3 size={13} />
                    <span>Edit</span>
                  </button>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pt-1 font-normal">
                  {employee.bio || 'No employee biography has been added.'}
                </p>
              </div>

              {/* 3 Quick Horizontal Nav Cards: Bank, Family, Education */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  onClick={() => setActiveTab('bank')}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 flex items-center justify-between hover:border-blue-500 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Banknote size={17} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        Bank Information
                      </span>
                      <span className="text-xs text-slate-400 block truncate mt-0.5">
                        {employee.bankInformation?.bankName || '—'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-slate-400 group-hover:text-blue-600 transition shrink-0" />
                </div>

                <div
                  onClick={() => setActiveTab('bank')}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 flex items-center justify-between hover:border-blue-500 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                      <Users size={17} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        Family Information
                      </span>
                      <span className="text-xs text-slate-400 block truncate mt-0.5">
                        {employee.familyInformation?.length
                          ? `${employee.familyInformation.length} members`
                          : '—'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-slate-400 group-hover:text-blue-600 transition shrink-0" />
                </div>

                <div
                  onClick={() => setActiveTab('education')}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 flex items-center justify-between hover:border-blue-500 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                      <GraduationCap size={17} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        Education Details
                      </span>
                      <span className="text-xs text-slate-400 block truncate mt-0.5">
                        {employee.education?.length ? employee.education[0]?.degree : '—'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-slate-400 group-hover:text-blue-600 transition shrink-0" />
                </div>
              </div>

              {/* Row: Attendance & Leave (Left) + Experience (Right) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
                {/* Attendance & Leave Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-3.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <CalendarCheck size={15} />
                      </div>
                      <h4 className="font-bold text-xs text-slate-900">Attendance &amp; Leave</h4>
                    </div>

                    {/* 2x2 Clean Metric Grid with Full Uncut Labels */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3">
                        <div className="flex items-center justify-between text-blue-600 mb-1">
                          <Users size={16} />
                          <strong className="text-base font-bold text-slate-900">
                            {formatNumber(stats.attendance)}
                          </strong>
                        </div>
                        <span className="text-xs text-slate-600 font-medium block">Attendance Days</span>
                      </div>

                      <div className="bg-sky-50/60 border border-sky-100 rounded-xl p-3">
                        <div className="flex items-center justify-between text-sky-600 mb-1">
                          <Clock size={16} />
                          <strong className="text-base font-bold text-slate-900">
                            {stats.hours.toFixed(1)} h
                          </strong>
                        </div>
                        <span className="text-xs text-slate-600 font-medium block">Total Hours</span>
                      </div>

                      <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3">
                        <div className="flex items-center justify-between text-emerald-600 mb-1">
                          <CheckCircle2 size={16} />
                          <strong className="text-base font-bold text-slate-900">
                            {formatNumber(stats.approvedLeaves)}
                          </strong>
                        </div>
                        <span className="text-xs text-slate-600 font-medium block">Approved Leaves</span>
                      </div>

                      <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3">
                        <div className="flex items-center justify-between text-amber-600 mb-1">
                          <Hourglass size={16} />
                          <strong className="text-base font-bold text-slate-900">
                            {formatNumber(stats.pendingLeaves)}
                          </strong>
                        </div>
                        <span className="text-xs text-slate-600 font-medium block">Pending Leaves</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Experience Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-3.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Briefcase size={15} />
                      </div>
                      <h4 className="font-bold text-xs text-slate-900">Experience</h4>
                    </div>

                    <div className="pl-4 pt-1 border-l-2 border-blue-600 relative space-y-3">
                      <div className="relative">
                        <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <strong className="text-xs font-bold text-slate-900 block capitalize">
                              {employee.designation || employee.role || 'Super Admin'}
                            </strong>
                            <span className="text-xs text-slate-500 block mt-0.5">
                              {employee.company || 'TeamHub ERP'} · {employee.employmentType || 'Full Time'}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-slate-400 shrink-0">
                            {formatDate(employee.joiningDate || employee.createdAt, {
                              month: 'short',
                              year: 'numeric',
                            })}{' '}
                            – Present
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row: Recent Attendance (Left) + Latest Payroll (Right) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
                {/* Recent Attendance Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 flex flex-col justify-between min-h-[190px]">
                  <div>
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Calendar size={15} />
                        </div>
                        <h4 className="font-bold text-xs text-slate-900">Recent Attendance</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/attendance')}
                        className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                      >
                        View All
                      </button>
                    </div>

                    {attendance.length ? (
                      <div className="divide-y divide-slate-100 text-xs">
                        {attendance.slice(0, 2).map((record) => (
                          <div key={record._id} className="py-2.5 flex items-center justify-between gap-2">
                            <div>
                              <strong className="text-slate-900 block text-xs font-semibold">
                                {formatDate(record.date)}
                              </strong>
                              <span className="text-xs text-slate-500 block mt-0.5">
                                {formatTime(record.loginTime)} – {formatTime(record.logoutTime)} ·{' '}
                                {Number(record.totalHours || 0).toFixed(2)} hrs
                              </span>
                            </div>
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0">
                              {record.status || 'Present'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-xs text-slate-400">No attendance records found</div>
                    )}
                  </div>
                </div>

                {/* Latest Payroll Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 flex flex-col justify-between min-h-[190px]">
                  <div>
                    <div className="flex items-center gap-2.5 mb-3.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <CreditCard size={15} />
                      </div>
                      <h4 className="font-bold text-xs text-slate-900">Latest Payroll</h4>
                    </div>

                    {latestPayroll ? (
                      <div className="grid grid-cols-2 gap-3 text-center text-xs pt-1">
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                          <span className="text-xs text-slate-500 block">Month</span>
                          <strong className="text-sm font-bold text-slate-900 block mt-1">
                            {latestPayroll.month}
                          </strong>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                          <span className="text-xs text-slate-500 block">Net Pay</span>
                          <strong className="text-sm font-bold text-slate-900 block mt-1">
                            {formatCurrency(latestPayroll.netSalary)}
                          </strong>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center py-5 px-2">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-2">
                          <FileText size={18} className="text-blue-600" />
                        </div>
                        <h5 className="font-bold text-xs text-slate-900">No payroll records</h5>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                          Payroll history will appear once processed.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Row: Employee Documents Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <FileText size={15} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">Employee Documents</h4>
                      <p className="text-xs text-slate-500">
                        Employment contract, certificates, and ID proofs
                      </p>
                    </div>
                  </div>

                  <div>
                    <input
                      type="file"
                      ref={docInputRef}
                      hidden
                      accept=".pdf,.png,.jpg,.jpeg,.txt"
                      onChange={(event) => uploadDoc(event.target.files?.[0])}
                    />
                    <button
                      type="button"
                      onClick={() => docInputRef.current?.click()}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
                    >
                      <Upload size={14} />
                      <span>Upload Document</span>
                    </button>
                  </div>
                </div>

                {employee.documents && employee.documents.length ? (
                  <div className="divide-y divide-slate-100 text-xs">
                    {employee.documents.map((doc, idx) => (
                      <div
                        key={doc._id || idx}
                        className="py-3 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText size={16} className="text-blue-600 shrink-0" />
                          <div className="min-w-0">
                            <strong className="text-xs text-slate-900 block truncate">
                              {doc.name}
                            </strong>
                            <span className="text-xs text-slate-500 block mt-0.5">
                              {doc.size ? `${(Number(doc.size) / 1024).toFixed(1)} KB` : 'Unknown size'} ·{' '}
                              {formatDate(doc.date)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => downloadDoc(doc)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer"
                            title="Download"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteDoc(doc)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-6 px-2 rounded-xl bg-slate-50/50 border border-dashed border-slate-200">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                      <FileText size={18} className="text-slate-400" />
                    </div>
                    <h5 className="font-bold text-xs text-slate-900">No documents uploaded</h5>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Employment documents will appear here once uploaded.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Personal Tab Content */}
          {activeTab === 'personal' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Personal Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div><span className="text-slate-500 block">Full Name</span><strong className="text-slate-900 text-sm">{employee.name}</strong></div>
                <div><span className="text-slate-500 block">Email</span><strong className="text-slate-900 text-sm">{employee.email}</strong></div>
                <div><span className="text-slate-500 block">Phone</span><strong className="text-slate-900 text-sm">{employee.phone || '—'}</strong></div>
                <div><span className="text-slate-500 block">Gender</span><strong className="text-slate-900 text-sm">{employee.gender || '—'}</strong></div>
                <div><span className="text-slate-500 block">Date of Birth</span><strong className="text-slate-900 text-sm">{formatDate(employee.dob)}</strong></div>
                <div><span className="text-slate-500 block">Blood Group</span><strong className="text-slate-900 text-sm">{employee.bloodGroup || '—'}</strong></div>
                <div className="sm:col-span-2"><span className="text-slate-500 block">Current Address</span><strong className="text-slate-900">{employee.currentAddress || '—'}</strong></div>
                <div className="sm:col-span-2"><span className="text-slate-500 block">Permanent Address</span><strong className="text-slate-900">{employee.permanentAddress || '—'}</strong></div>
              </div>
            </div>
          )}

          {/* Tab 3: Bank & Family Content */}
          {activeTab === 'bank' && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Bank Information</h3>
                {employee.bankInformation && (employee.bankInformation.bankName || employee.bankInformation.accountNumber) ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div><span className="text-slate-500 block">Bank Name</span><strong className="text-slate-900 text-sm">{employee.bankInformation.bankName}</strong></div>
                    <div><span className="text-slate-500 block">Account Holder</span><strong className="text-slate-900 text-sm">{employee.bankInformation.accountName}</strong></div>
                    <div><span className="text-slate-500 block">Account Number</span><strong className="text-slate-900 text-sm">{employee.bankInformation.accountNumber}</strong></div>
                    <div><span className="text-slate-500 block">IFSC Code</span><strong className="text-slate-900 text-sm">{employee.bankInformation.ifscCode}</strong></div>
                    <div><span className="text-slate-500 block">Branch</span><strong className="text-slate-900 text-sm">{employee.bankInformation.branchName}</strong></div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No bank information recorded.</p>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Family Information</h3>
                {employee.familyInformation?.length ? (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-500">
                          <th className="py-2.5">Name</th>
                          <th className="py-2.5">Relationship</th>
                          <th className="py-2.5">Phone</th>
                          <th className="py-2.5">DOB</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {employee.familyInformation.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-2.5 font-semibold text-slate-900">{item.name}</td>
                            <td className="py-2.5 text-slate-600">{item.relationship}</td>
                            <td className="py-2.5 text-slate-600">{item.phone || '—'}</td>
                            <td className="py-2.5 text-slate-600">{item.dob ? formatDate(item.dob) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No family information recorded.</p>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Education Tab Content */}
          {activeTab === 'education' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Education Details</h3>
              {employee.education?.length ? (
                <div className="space-y-3">
                  {employee.education.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-start justify-between">
                      <div>
                        <strong className="text-xs text-slate-900 block font-bold">{item.degree} {item.fieldOfStudy ? `in ${item.fieldOfStudy}` : ''}</strong>
                        <span className="text-xs text-slate-500 block mt-0.5">{item.institution}</span>
                        <span className="text-xs text-slate-400 block mt-1">
                          {item.startDate ? formatDate(item.startDate) : '—'} – {item.endDate ? formatDate(item.endDate) : 'Present'}
                        </span>
                      </div>
                      {item.grade && (
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block">Grade/GPA</span>
                          <strong className="text-xs text-slate-900 font-bold">{item.grade}</strong>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No education details recorded.</p>
              )}
            </div>
          )}

          {/* Tab 5: Experience Tab Content */}
          {activeTab === 'experience' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Past Work Experience</h3>
              {employee.experience?.length ? (
                <div className="space-y-3">
                  {employee.experience.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                      <strong className="text-xs text-slate-900 block font-bold">{item.designation}</strong>
                      <span className="text-xs text-slate-500 block mt-0.5">{item.company}</span>
                      <span className="text-xs text-slate-400 block mt-1">
                        {item.startDate ? formatDate(item.startDate) : '—'} – {item.endDate ? formatDate(item.endDate) : 'Present'}
                      </span>
                      {item.description && <p className="text-xs text-slate-600 mt-2 leading-relaxed">{item.description}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No past experience details recorded.</p>
              )}
            </div>
          )}

          {/* Tab 6: Documents Tab Content */}
          {activeTab === 'documents' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-900">All Uploaded Documents</h3>
                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition"
                >
                  <Upload size={14} /> <span>Upload Document</span>
                </button>
              </div>

              {employee.documents?.length ? (
                <div className="divide-y divide-slate-100 text-xs">
                  {employee.documents.map((doc, idx) => (
                    <div key={doc._id || idx} className="py-3 flex items-center justify-between">
                      <div>
                        <strong className="text-xs text-slate-900 block font-semibold">{doc.name}</strong>
                        <span className="text-xs text-slate-500">
                          {doc.size ? `${(Number(doc.size) / 1024).toFixed(1)} KB` : 'Unknown size'} · {formatDate(doc.date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => downloadDoc(doc)} className="text-blue-600 hover:text-blue-800 p-1 cursor-pointer">
                          <Download size={15} />
                        </button>
                        <button type="button" onClick={() => deleteDoc(doc)} className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No documents uploaded.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Offboard Employee Modal */}
      <Modal
        open={offboardOpen}
        title="Offboard Employee"
        subtitle={`Mark ${employee?.name} as separated from the organization.`}
        onClose={() => setOffboardOpen(false)}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setOffboardOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={offboarding}
              onClick={offboard}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {offboarding ? 'Processing…' : 'Confirm Offboard'}
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Separation Type
            </label>
            <select
              value={offboardForm.separationType}
              onChange={(e) => setOffboardForm({ ...offboardForm, separationType: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-200/90 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            >
              {['Resignation', 'Termination', 'Retirement', 'Contract End', 'Absconding', 'Other'].map(
                (t) => (
                  <option key={t}>{t}</option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Exit Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={offboardForm.exitDate}
              onChange={(e) => setOffboardForm({ ...offboardForm, exitDate: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-200/90 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Reason / Remarks
            </label>
            <textarea
              rows={3}
              value={offboardForm.reason}
              onChange={(e) => setOffboardForm({ ...offboardForm, reason: e.target.value })}
              placeholder="Optional notes about the separation…"
              className="w-full px-3.5 py-2.5 border border-slate-200/90 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-xs text-rose-700 leading-relaxed flex items-start gap-2.5">
            <ShieldAlert size={16} className="text-rose-500 shrink-0 mt-0.5" />
            <span>
              This will mark the employee as <strong>Inactive</strong> and revoke their system access. This action can be reversed at any time.
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EmployeeDetails;
