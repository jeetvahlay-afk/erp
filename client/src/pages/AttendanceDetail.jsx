import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coffee,
  Download,
  Edit3,
  LogIn,
  LogOut,
  Timer,
} from 'lucide-react';
import api, { asArray, getApiError } from '../lib/api';
import { downloadExcel } from '../lib/export';
import { feedback } from '../lib/feedback';
import {
  Avatar,
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  Modal,
  PageHeader,
  StatusBadge,
  ToolbarButton,
  formatDate,
  formatTime,
} from '../components/ui/EnterpriseUI';

const dateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const durationLabel = (minutes = 0) => {
  const total = Math.max(0, Number(minutes || 0));
  const hours = Math.floor(total / 60);
  const remainder = Math.round(total % 60);
  return hours ? `${hours}h ${remainder}m` : `${remainder}m`;
};

const toLocalInput = (value) =>
  value
    ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : '';

const daysInMonth = (month) => {
  if (!/^\d{4}-\d{2}$/.test(month)) return [];
  const [year, monthNumber] = month.split('-').map(Number);
  const count = new Date(year, monthNumber, 0).getDate();
  return Array.from({ length: count }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`);
};

const AttendanceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [breaks, setBreaks] = useState([]);
  const [month, setMonth] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({ status: 'Present', loginTime: '', logoutTime: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!id || id === 'undefined') {
      setError('A valid employee identifier is required.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const [employeeResponse, attendanceResponse, breakResponse] = await Promise.all([
        api.get(`/api/users/${id}`),
        api.get(`/api/attendance/user/${id}`),
        api.get(`/api/breaks/user/${id}`),
      ]);
      const attendanceRows = asArray(attendanceResponse.data);
      const breakRows = asArray(breakResponse.data);
      const anchor = dateKey(attendanceRows[0]?.date || breakRows[0]?.startTime || new Date());
      setEmployee(employeeResponse.data);
      setAttendance(attendanceRows);
      setBreaks(breakRows);
      setMonth((current) => current || anchor.slice(0, 7));
      setSelectedDate((current) => current || anchor);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load employee attendance details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const attendanceByDate = useMemo(
    () => new Map(attendance.map((item) => [dateKey(item.date), item])),
    [attendance]
  );

  const breaksByDate = useMemo(
    () =>
      breaks.reduce((map, item) => {
        const key = dateKey(item.startTime || item.createdAt);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(item);
        return map;
      }, new Map()),
    [breaks]
  );

  const calendarDays = useMemo(() => daysInMonth(month), [month]);
  const monthAttendance = useMemo(
    () => attendance.filter((item) => dateKey(item.date).startsWith(month)),
    [attendance, month]
  );
  const monthBreaks = useMemo(
    () => breaks.filter((item) => dateKey(item.startTime || item.createdAt).startsWith(month)),
    [breaks, month]
  );
  const selectedAttendance = attendanceByDate.get(selectedDate);
  const selectedBreaks = breaksByDate.get(selectedDate) || [];

  const formattedMonthTitle = useMemo(() => {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return '';
    const [year, m] = month.split('-').map(Number);
    const date = new Date(year, m - 1, 1);
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
  }, [month]);

  const changeMonth = (value) => {
    setMonth(value);
    const today = dateKey(new Date());
    setSelectedDate(today.startsWith(value) ? today : `${value}-01`);
  };

  const prevMonth = () => {
    if (!month) return;
    const [year, m] = month.split('-').map(Number);
    const prevDate = new Date(year, m - 2, 1);
    const nextKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    changeMonth(nextKey);
  };

  const nextMonth = () => {
    if (!month) return;
    const [year, m] = month.split('-').map(Number);
    const nextDate = new Date(year, m, 1);
    const nextKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    changeMonth(nextKey);
  };

  const openEdit = () => {
    if (!selectedAttendance) return;
    setEdit({
      status: selectedAttendance.status,
      loginTime: toLocalInput(selectedAttendance.loginTime),
      logoutTime: toLocalInput(selectedAttendance.logoutTime),
    });
    setEditing(true);
  };

  const saveAttendance = async () => {
    if (!selectedAttendance) return;
    setSubmitting(true);
    try {
      await api.patch(`/api/attendance/${selectedAttendance._id}`, {
        status: edit.status,
        loginTime: edit.loginTime || null,
        logoutTime: edit.logoutTime || null,
      });
      feedback.success('Attendance record updated successfully');
      setEditing(false);
      await loadData();
    } catch (requestError) {
      feedback.error(getApiError(requestError, 'Unable to update attendance'));
    } finally {
      setSubmitting(false);
    }
  };

  const metrics = useMemo(() => {
    const totalHours = monthAttendance.reduce(
      (total, item) => total + Number(item.totalHours || 0),
      0
    );
    return {
      recorded: monthAttendance.length,
      completed: monthAttendance.filter((item) => Number(item.totalHours || 0) >= 7).length,
      totalHours: totalHours.toFixed(1),
      breakMinutes: monthBreaks.reduce((total, item) => total + Number(item.actualDuration || 0), 0),
    };
  }, [monthAttendance, monthBreaks]);

  const exportMonth = () =>
    downloadExcel(
      `${employee?.employeeId || 'employee'}-attendance-${month}`,
      calendarDays.map((day) => {
        const record = attendanceByDate.get(day);
        const dayBreaks = breaksByDate.get(day) || [];
        return {
          Date: day,
          Status: record?.status || 'No record',
          'Punch In': record?.loginTime ? formatTime(record.loginTime) : '',
          'Punch Out': record?.logoutTime ? formatTime(record.logoutTime) : '',
          'Working Hours': Number(record?.totalHours || 0).toFixed(2),
          '7 Hour Target': Number(record?.totalHours || 0) >= 7 ? 'Completed' : 'Not completed',
          Breaks: dayBreaks.length,
          'Break Minutes': dayBreaks.reduce(
            (total, item) => total + Number(item.actualDuration || 0),
            0
          ),
        };
      })
    );

  if (loading) return <LoadingState label="Loading attendance history…" />;
  if (error) return <ErrorState message={error} retry={loadData} />;
  if (!employee) {
    return (
      <EmptyState
        title="Employee not found"
        message="This employee record is no longer available."
      />
    );
  }

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Header with Clean, Perfectly Aligned Controls */}
      <PageHeader
        title="Employee Attendance Detail"
        breadcrumbs={['Attendance Register', employee.name || 'Employee', 'Complete history']}
        actions={
          <div className="flex items-center gap-2.5">
            {/* Month Stepper Pill */}
            <div className="flex items-center bg-white border border-slate-200/90 rounded-xl shadow-2xs p-1">
              <button
                type="button"
                onClick={prevMonth}
                title="Previous month"
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
              >
                <ChevronLeft size={15} />
              </button>
              <div className="relative px-2.5 min-w-[125px] text-center">
                <span className="text-xs font-semibold text-slate-800">
                  {formattedMonthTitle}
                </span>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => changeMonth(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  title="Click to jump to another month"
                />
              </div>
              <button
                type="button"
                onClick={nextMonth}
                title="Next month"
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            <ToolbarButton icon={Download} onClick={exportMonth}>
              Excel Report
            </ToolbarButton>
            <ToolbarButton icon={ArrowLeft} onClick={() => navigate('/attendance-register')}>
              Back
            </ToolbarButton>
          </div>
        }
      />

      {/* 2. Employee Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-3.5 sm:p-4 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <Avatar user={employee} size="md" />
          <div>
            <h2 className="text-base font-bold text-slate-900">{employee.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {employee.designation || employee.role || 'Staff'} · {employee.employeeId || 'Vah0001'} ·{' '}
              {employee.department || 'Unassigned department'}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {employee.isActive === false ? 'Inactive' : 'Active'}
        </span>
      </div>

      {/* 3. KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        <MetricCard
          label="Recorded Days"
          value={metrics.recorded}
          helper="Attendance days recorded"
          icon={CalendarDays}
          tone="navy"
        />
        <MetricCard
          label="7+ Hour Days"
          value={metrics.completed}
          helper="Completed target hours"
          icon={CheckCircle2}
          tone="green"
        />
        <MetricCard
          label="Total Work Hours"
          value={`${metrics.totalHours} h`}
          helper="Recorded this month"
          icon={Timer}
          tone="blue"
        />
        <MetricCard
          label="Total Break Time"
          value={durationLabel(metrics.breakMinutes)}
          helper="Completed breaks taken"
          icon={Coffee}
          tone="orange"
        />
      </div>

      {/* 4. Calendar & Activity Log Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-4.5 items-start">
        {/* Left: Monthly Attendance Calendar */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Monthly Attendance</h2>
              <p className="text-xs text-slate-500 mt-0.5">Select a day to inspect its complete activity.</p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Green = 7+ hours
            </span>
          </div>

          <div className="p-3.5 sm:p-4">
            {/* Weekday Labels */}
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <span key={day} className="py-1">
                  {day}
                </span>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, index) => {
                const record = attendanceByDate.get(day);
                const dayBreaks = breaksByDate.get(day) || [];
                const completed = Number(record?.totalHours || 0) >= 7;
                const isSelected = selectedDate === day;
                const firstDayCol =
                  index === 0
                    ? new Date(`${calendarDays[0]}T12:00:00`).getDay() + 1
                    : undefined;

                return (
                  <button
                    type="button"
                    key={day}
                    style={firstDayCol ? { gridColumnStart: firstDayCol } : undefined}
                    onClick={() => setSelectedDate(day)}
                    className={`p-3 min-h-[85px] rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-blue-600 border-blue-600 bg-blue-50/40 shadow-xs'
                        : completed
                        ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50'
                        : record
                        ? 'border-amber-200 bg-amber-50/30 hover:bg-amber-50/60'
                        : 'border-slate-100 bg-slate-50/40 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
                        {Number(day.slice(-2))}
                      </span>
                      {completed && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    </div>

                    <div className="mt-1">
                      <p className="text-xs font-bold text-slate-900 leading-tight">
                        {record ? `${Number(record.totalHours || 0).toFixed(1)}h` : '—'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {record?.status || 'No record'}
                      </p>
                    </div>

                    {dayBreaks.length > 0 && (
                      <span className="text-xs text-amber-600 font-semibold flex items-center gap-0.5 mt-1">
                        <Coffee size={10} /> {dayBreaks.length} break{dayBreaks.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Selected Day Timeline & Activity */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden space-y-5 p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{formatDate(`${selectedDate}T12:00:00`)}</h2>
                <div className="relative">
                  <button
                    type="button"
                    title="Jump to date"
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    <Calendar size={14} />
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      setSelectedDate(e.target.value);
                      setMonth(e.target.value.slice(0, 7));
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="Jump to date"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Complete activity log</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge
                tone={
                  selectedAttendance?.isLatePenalty
                    ? 'danger'
                    : Number(selectedAttendance?.totalHours || 0) >= 7
                    ? 'success'
                    : selectedAttendance
                    ? 'warning'
                    : 'info'
                }
              >
                {selectedAttendance?.isLatePenalty
                  ? 'Half Day (3rd Late Cut)'
                  : selectedAttendance?.status || 'No attendance'}
              </StatusBadge>
              {selectedAttendance && (
                <button
                  type="button"
                  onClick={openEdit}
                  aria-label={`Edit attendance for ${selectedDate}`}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Edit3 size={14} />
                </button>
              )}
            </div>
          </div>

          {/* 4 Summary Pills */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <LogIn size={13} className="text-emerald-600" /> Punch In
              </span>
              <p className="text-sm font-bold text-slate-900 mt-1">
                {selectedAttendance?.loginTime ? formatTime(selectedAttendance.loginTime) : '—'}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <LogOut size={13} className="text-blue-600" /> Punch Out
              </span>
              <p className="text-sm font-bold text-slate-900 mt-1">
                {selectedAttendance?.logoutTime ? formatTime(selectedAttendance.logoutTime) : '—'}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <Timer size={13} className="text-indigo-600" /> Working Hours
              </span>
              <p className="text-sm font-bold text-slate-900 mt-1">
                {Number(selectedAttendance?.totalHours || 0).toFixed(2)} hrs
                {selectedAttendance?.isLatePenalty && (
                  <span className="block text-[11px] text-rose-600 font-medium">
                    (-4.5h 3rd late penalty cut)
                  </span>
                )}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <Coffee size={13} className="text-amber-600" /> Break Time
              </span>
              <p className="text-sm font-bold text-slate-900 mt-1">
                {durationLabel(
                  selectedBreaks.reduce((total, item) => total + Number(item.actualDuration || 0), 0)
                )}
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Day Timeline</h3>
            <div className="space-y-3 divide-y divide-slate-100">
              {selectedAttendance?.loginTime && (
                <div className="flex items-start gap-3 pt-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <ArrowUpRight size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900">Punched in</p>
                    <p className="text-xs text-slate-500">Work session started</p>
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    {formatTime(selectedAttendance.loginTime)}
                  </span>
                </div>
              )}

              {selectedBreaks.map((item) => (
                <div key={item._id} className="flex items-start gap-3 pt-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      item.isExceeded
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    <Coffee size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {String(item.breakType || 'Break').split(' [')[0]}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.status === 'Ongoing'
                        ? 'Break active'
                        : `${Number(item.actualDuration || 0)} of ${Number(item.allottedDuration || 0)}m`}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    {formatTime(item.startTime)}
                    {item.endTime ? ` – ${formatTime(item.endTime)}` : ''}
                  </span>
                </div>
              ))}

              {selectedAttendance?.logoutTime && (
                <div className="flex items-start gap-3 pt-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <ArrowDownRight size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900">Punched out</p>
                    <p className="text-[11px] text-slate-400">Work session completed</p>
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    {formatTime(selectedAttendance.logoutTime)}
                  </span>
                </div>
              )}

              {!selectedAttendance && !selectedBreaks.length && (
                <div className="py-6 text-center text-xs text-slate-400">
                  <Clock3 size={24} className="text-slate-300 mx-auto mb-2" />
                  No punch or break activity recorded for this day.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Edit Modal */}
      {editing && (
        <Modal
          open={editing}
          title="Edit Attendance"
          subtitle={`${employee.name} · ${formatDate(`${selectedDate}T12:00:00`)}`}
          onClose={() => setEditing(false)}
          size="sm"
          footer={
            <>
              <ToolbarButton onClick={() => setEditing(false)}>Cancel</ToolbarButton>
              <ToolbarButton primary disabled={submitting} onClick={saveAttendance}>
                {submitting ? 'Saving…' : 'Save Changes'}
              </ToolbarButton>
            </>
          }
        >
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Attendance Status</label>
              <select
                value={edit.status}
                onChange={(e) => setEdit({ ...edit, status: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                {['Present', 'Late', 'Half Day', 'Absent'].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Punch In Time</label>
              <input
                type="datetime-local"
                value={edit.loginTime}
                onChange={(e) => setEdit({ ...edit, loginTime: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Punch Out Time</label>
              <input
                type="datetime-local"
                value={edit.logoutTime}
                onChange={(e) => setEdit({ ...edit, logoutTime: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AttendanceDetail;
