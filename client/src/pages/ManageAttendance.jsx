import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  Fingerprint,
  Layers,
  MoreVertical,
  RotateCcw,
  Search,
  Table,
  User,
  Users,
  UserX,
} from 'lucide-react';
import api, { asArray, getApiError } from '../lib/api';
import { downloadCsv } from '../lib/export';
import { feedback } from '../lib/feedback';
import { LoadingState, ErrorState, Modal, ToolbarButton } from '../components/ui/EnterpriseUI';

const toLocalInput = (value) =>
  value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';

const formatDateKey = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const ManageAttendance = ({ registerOnly = false }) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState(registerOnly ? 'sheet' : 'regular'); // 'regular' | 'sheet' | 'calendar'
  const [records, setRecords] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [kpis, setKpis] = useState({});
  const [activeTab, setActiveTab] = useState('Daily Attendance');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(() => new Date());

  // Filters
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All Departments');
  const [employeeFilter, setEmployeeFilter] = useState('All Employees');
  const [shiftFilter, setShiftFilter] = useState('All Shifts');
  const [statusFilter, setStatusFilter] = useState('All Status');

  // Table Selection & Pagination
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Edit Modal
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editForm, setEditForm] = useState({ status: 'Present', loginTime: '', logoutTime: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [recordRes, dashboardRes, usersRes] = await Promise.allSettled([
        api.get('/api/attendance'),
        api.get('/api/dashboard/attendance'),
        api.get('/api/users?limit=300'),
      ]);

      let apiRecords = [];
      if (recordRes.status === 'fulfilled') {
        apiRecords = asArray(recordRes.value.data);
      }

      if (usersRes.status === 'fulfilled') {
        const uData = usersRes.value.data;
        const uList = Array.isArray(uData) ? uData : asArray(uData?.users || uData?.items);
        setUsersList(uList);
      }

      if (dashboardRes.status === 'fulfilled') {
        setKpis(dashboardRes.value.data?.kpis || {});
      }

      const mappedRecords = apiRecords.map((r, i) => {
        const checkInDate = r.loginTime ? new Date(r.loginTime) : null;
        const checkOutDate = r.logoutTime ? new Date(r.logoutTime) : null;
        const rawDate = r.date || r.loginTime || r.createdAt;
        const parsedDate = rawDate ? new Date(rawDate) : (checkInDate || new Date());
        const dKey = formatDateKey(parsedDate);

        let workHoursStr = '—';
        if (checkInDate && checkOutDate) {
          const diffMs = Math.max(0, checkOutDate - checkInDate);
          const hrs = Math.floor(diffMs / 3600000);
          const mins = Math.floor((diffMs % 3600000) / 60000);
          workHoursStr = `${hrs}h ${String(mins).padStart(2, '0')}m`;
        } else if (r.totalHours) {
          const hrs = Math.floor(r.totalHours);
          const mins = Math.round((r.totalHours - hrs) * 60);
          workHoursStr = `${hrs}h ${String(mins).padStart(2, '0')}m`;
        }

        const userId = r.user?._id || r.user?.id || (typeof r.user === 'string' ? r.user : null);

        return {
          _id: r._id,
          userId,
          employeeId: r.user?.employeeId || `EMP${String(i + 1).padStart(3, '0')}`,
          name: r.user?.name || 'Staff Member',
          email: r.user?.email || 'staff@teamhub.com',
          avatar: r.user?.avatar || (r.user?.profileImage ? (r.user.profileImage.startsWith('http') ? r.user.profileImage : `/api/users/${userId}/avatar`) : ''),
          department: r.user?.department || 'General',
          shift: r.shift || 'General',
          date: parsedDate,
          dateKey: dKey,
          checkIn: checkInDate ? checkInDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—',
          checkOut: checkOutDate ? checkOutDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—',
          workHours: workHoursStr,
          totalHours: r.totalHours || 0,
          status: r.status || 'Present',
          rawRecord: r,
        };
      });

      setRecords(mappedRecords);
    } catch (requestError) {
      setRecords([]);
      setError(getApiError(requestError, 'Unable to load attendance records'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetFilters = () => {
    setSearch('');
    setDepartment('All Departments');
    setEmployeeFilter('All Employees');
    setShiftFilter('All Shifts');
    setStatusFilter('All Status');
    setPage(1);
  };

  // Distinct departments and employees across all records and users
  const uniqueDepartments = useMemo(() => {
    const depts = new Set();
    records.forEach((r) => r.department && depts.add(r.department));
    usersList.forEach((u) => u.department && depts.add(u.department));
    return [...depts].sort();
  }, [records, usersList]);

  const uniqueEmployeeNames = useMemo(() => {
    const names = new Set();
    records.forEach((r) => r.name && names.add(r.name));
    usersList.forEach((u) => u.name && names.add(u.name));
    return [...names].sort();
  }, [records, usersList]);

  // Combined master employee list (for Sheet View and complete roster)
  const allEmployees = useMemo(() => {
    const map = new Map();
    // Add all registered users
    usersList.forEach((u) => {
      const id = String(u._id || u.id || u.employeeId || '');
      if (id) {
        map.set(id, {
          userId: u._id || u.id,
          employeeId: u.employeeId || 'EMP',
          name: u.name || 'Staff Member',
          email: u.email || '',
          avatar: u.avatar || (u.profileImage ? (u.profileImage.startsWith('http') ? u.profileImage : `/api/users/${u._id}/avatar`) : ''),
          department: u.department || 'General',
          shift: u.shift || 'General',
        });
      }
    });

    // Add any employees from records who might not be in usersList
    records.forEach((r) => {
      const id = String(r.userId || r.employeeId);
      if (!map.has(id)) {
        map.set(id, {
          userId: r.userId,
          employeeId: r.employeeId,
          name: r.name,
          email: r.email,
          avatar: r.avatar,
          department: r.department,
          shift: r.shift,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [usersList, records]);

  // Filtered employees for Sheet View
  const filteredEmployees = useMemo(() => {
    return allEmployees.filter((emp) => {
      const matchesSearch =
        !search ||
        emp.name.toLowerCase().includes(search.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(search.toLowerCase()) ||
        emp.email.toLowerCase().includes(search.toLowerCase());

      const matchesDept =
        department === 'All Departments' || emp.department === department;

      const matchesEmp =
        employeeFilter === 'All Employees' || emp.name === employeeFilter;

      return matchesSearch && matchesDept && matchesEmp;
    });
  }, [allEmployees, search, department, employeeFilter]);

  // Filtered attendance records for Regular View
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      const matchesSearch =
        !search ||
        rec.name.toLowerCase().includes(search.toLowerCase()) ||
        rec.employeeId.toLowerCase().includes(search.toLowerCase()) ||
        rec.email.toLowerCase().includes(search.toLowerCase());

      const matchesDept =
        department === 'All Departments' || rec.department === department;

      const matchesEmp =
        employeeFilter === 'All Employees' || rec.name === employeeFilter;

      const matchesShift =
        shiftFilter === 'All Shifts' || rec.shift === shiftFilter;

      const matchesStatus =
        statusFilter === 'All Status' || rec.status === statusFilter;

      return matchesSearch && matchesDept && matchesEmp && matchesShift && matchesStatus;
    });
  }, [records, search, department, employeeFilter, shiftFilter, statusFilter]);

  // Attendance lookup by `${userId || employeeId}_${dateKey}`
  const attendanceLookup = useMemo(() => {
    const map = new Map();
    records.forEach((rec) => {
      if (rec.dateKey) {
        if (rec.userId) map.set(`${rec.userId}_${rec.dateKey}`, rec);
        if (rec.employeeId) map.set(`${rec.employeeId}_${rec.dateKey}`, rec);
      }
    });
    return map;
  }, [records]);

  // Paginated records for Regular View
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  // Sheet View Month & Days Calculations
  const sheetYear = selectedDate.getFullYear();
  const sheetMonth = selectedDate.getMonth();
  const daysInSheetMonth = useMemo(() => new Date(sheetYear, sheetMonth + 1, 0).getDate(), [sheetYear, sheetMonth]);
  const sheetDays = useMemo(() => {
    const list = [];
    for (let day = 1; day <= daysInSheetMonth; day++) {
      const d = new Date(sheetYear, sheetMonth, day);
      const dayOfWeek = d.getDay();
      list.push({
        dayNumber: day,
        date: d,
        dateKey: formatDateKey(d),
        dayName: WEEKDAY_NAMES[dayOfWeek],
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }
    return list;
  }, [sheetYear, sheetMonth, daysInSheetMonth]);

  // Calendar View Grid Calculations
  const calYear = selectedDate.getFullYear();
  const calMonth = selectedDate.getMonth();
  const calendarGrid = useMemo(() => {
    const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
    const daysInCurr = new Date(calYear, calMonth + 1, 0).getDate();
    const daysInPrev = new Date(calYear, calMonth, 0).getDate();

    const cells = [];

    // Leading days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrev - i;
      const d = new Date(calYear, calMonth - 1, dayNum);
      cells.push({
        date: d,
        dateKey: formatDateKey(d),
        dayNumber: dayNum,
        isCurrentMonth: false,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      });
    }

    // Days in current month
    for (let dayNum = 1; dayNum <= daysInCurr; dayNum++) {
      const d = new Date(calYear, calMonth, dayNum);
      cells.push({
        date: d,
        dateKey: formatDateKey(d),
        dayNumber: dayNum,
        isCurrentMonth: true,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      });
    }

    // Trailing days to finish full week row
    const remainder = (7 - (cells.length % 7)) % 7;
    for (let dayNum = 1; dayNum <= remainder; dayNum++) {
      const d = new Date(calYear, calMonth + 1, dayNum);
      cells.push({
        date: d,
        dateKey: formatDateKey(d),
        dayNumber: dayNum,
        isCurrentMonth: false,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      });
    }

    return cells;
  }, [calYear, calMonth]);

  const todayKey = useMemo(() => formatDateKey(new Date()), []);

  // Aggregation per date for Calendar cells (both Present and Absent)
  const calendarDateStats = useMemo(() => {
    const stats = new Map();

    // 1. Tally existing recorded attendance
    filteredRecords.forEach((r) => {
      if (!r.dateKey) return;
      if (!stats.has(r.dateKey)) {
        stats.set(r.dateKey, { present: 0, late: 0, halfDay: 0, absent: 0, total: 0 });
      }
      const entry = stats.get(r.dateKey);
      entry.total += 1;
      if (r.status === 'Present') entry.present += 1;
      else if (r.status === 'Late') entry.late += 1;
      else if (r.status === 'Half Day') entry.halfDay += 1;
      else if (r.status === 'Absent') entry.absent += 1;
    });

    // 2. Count absent employees for past and current work days across filtered employees
    const staffCount = filteredEmployees.length;
    if (staffCount > 0) {
      calendarGrid.forEach((cell) => {
        const dKey = cell.dateKey;
        if (!dKey) return;

        // Count for workdays on or before today
        if (dKey <= todayKey && !cell.isWeekend) {
          if (!stats.has(dKey)) {
            stats.set(dKey, { present: 0, late: 0, halfDay: 0, absent: 0, total: 0 });
          }
          const entry = stats.get(dKey);
          const attendedOrExplicit = entry.present + entry.late + entry.halfDay + entry.absent;
          const unrecordedAbsent = Math.max(0, staffCount - attendedOrExplicit);
          entry.absent += unrecordedAbsent;
          entry.total = entry.present + entry.late + entry.halfDay + entry.absent;
        }
      });
    }

    return stats;
  }, [filteredRecords, calendarGrid, filteredEmployees.length, todayKey]);

  // Selected date records for Calendar bottom roster (including both Present and Absent staff)
  const calSelectedDateKey = useMemo(() => formatDateKey(calendarSelectedDate), [calendarSelectedDate]);
  const isSelectedDateWeekend = useMemo(() => {
    const day = calendarSelectedDate.getDay();
    return day === 0 || day === 6;
  }, [calendarSelectedDate]);

  const calSelectedDateRecords = useMemo(() => {
    const isPastOrToday = calSelectedDateKey <= todayKey;

    return filteredEmployees.map((emp) => {
      // Find actual recorded attendance
      const existing =
        attendanceLookup.get(`${emp.userId}_${calSelectedDateKey}`) ||
        attendanceLookup.get(`${emp.employeeId}_${calSelectedDateKey}`);

      if (existing) {
        return existing;
      }

      // If no punch record exists: determine virtual status
      let status = 'Absent';
      if (!isPastOrToday) {
        status = 'Scheduled';
      } else if (isSelectedDateWeekend) {
        status = 'Off';
      }

      return {
        _id: `virtual_${emp.userId || emp.employeeId}_${calSelectedDateKey}`,
        userId: emp.userId,
        employeeId: emp.employeeId,
        name: emp.name,
        email: emp.email,
        avatar: emp.avatar,
        department: emp.department,
        shift: emp.shift,
        checkIn: '—',
        checkOut: '—',
        workHours: '—',
        status,
        dateKey: calSelectedDateKey,
        isVirtual: true,
      };
    }).filter((rec) => {
      if (statusFilter !== 'All Status' && rec.status !== statusFilter) {
        return false;
      }
      if (shiftFilter !== 'All Shifts' && rec.shift !== shiftFilter) {
        return false;
      }
      return true;
    });
  }, [
    filteredEmployees,
    calSelectedDateKey,
    todayKey,
    attendanceLookup,
    isSelectedDateWeekend,
    statusFilter,
    shiftFilter,
  ]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handlePrevDay = () => {
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 1));
  };

  const handleNextDay = () => {
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1));
  };

  const handleToday = () => {
    const now = new Date();
    setSelectedDate(now);
    setCalendarSelectedDate(now);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredRecords.map((r) => r._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // CSV Export handling
  const handleExport = () => {
    if (viewMode === 'sheet') {
      // Export Monthly Attendance Sheet Register
      const exportData = filteredEmployees.map((emp) => {
        const row = {
          'Employee ID': emp.employeeId,
          Name: emp.name,
          Department: emp.department,
        };

        let pCount = 0;
        let lCount = 0;
        let hdCount = 0;
        let aCount = 0;
        let totalHrs = 0;

        sheetDays.forEach((dayObj) => {
          const rec = attendanceLookup.get(`${emp.userId}_${dayObj.dateKey}`) || attendanceLookup.get(`${emp.employeeId}_${dayObj.dateKey}`);
          let statusText = '—';
          if (rec) {
            statusText = rec.status;
            if (rec.status === 'Present') pCount++;
            else if (rec.status === 'Late') lCount++;
            else if (rec.status === 'Half Day') hdCount++;
            else if (rec.status === 'Absent') aCount++;
            totalHrs += rec.totalHours || 0;
          } else if (dayObj.isWeekend) {
            statusText = 'WO';
          } else if (dayObj.dateKey <= todayKey) {
            statusText = 'Absent';
            aCount++;
          }
          row[`Day ${dayObj.dayNumber} (${dayObj.dayName})`] = statusText;
        });

        row['Total Present'] = pCount;
        row['Total Late'] = lCount;
        row['Total Half Day'] = hdCount;
        row['Total Absent'] = aCount;
        row['Total Hours'] = `${totalHrs.toFixed(1)} hrs`;
        return row;
      });

      downloadCsv(`attendance_sheet_${MONTH_NAMES[sheetMonth]}_${sheetYear}.csv`, exportData);
      feedback.success('Monthly attendance register exported');
      return;
    }

    if (viewMode === 'calendar') {
      const calExportData = calSelectedDateRecords.map((rec) => ({
        Date: rec.dateKey,
        'Employee ID': rec.employeeId,
        Name: rec.name,
        Department: rec.department,
        Shift: rec.shift,
        'Check In': rec.checkIn,
        'Check Out': rec.checkOut,
        'Work Hours': rec.workHours,
        Status: rec.status,
      }));
      downloadCsv(`attendance_calendar_${calSelectedDateKey}.csv`, calExportData);
      feedback.success(`Exported attendance for ${calSelectedDateKey}`);
      return;
    }

    // Default Regular View Export
    const exportData = filteredRecords.map((rec) => ({
      'Employee ID': rec.employeeId,
      Name: rec.name,
      Email: rec.email,
      Department: rec.department,
      Shift: rec.shift,
      Date: rec.dateKey,
      'Check In': rec.checkIn,
      'Check Out': rec.checkOut,
      'Work Hours': rec.workHours,
      Status: rec.status,
    }));
    downloadCsv('attendance_records.csv', exportData);
    feedback.success('Attendance records exported');
  };

  const handleMarkAttendance = async () => {
    try {
      await api.post('/api/attendance/punch', { action: 'in' });
      feedback.success('Attendance recorded successfully');
      load();
    } catch {
      feedback.info('Attendance checked in for today');
    }
  };

  const openEditModal = (rec) => {
    setSelectedRecord(rec);
    const raw = rec.rawRecord;
    setEditForm({
      status: rec.status,
      loginTime: toLocalInput(raw?.loginTime),
      logoutTime: toLocalInput(raw?.logoutTime),
    });
  };

  const saveEdit = async () => {
    setSubmitting(true);
    try {
      if (selectedRecord.rawRecord?._id) {
        await api.patch(`/api/attendance/${selectedRecord.rawRecord._id}`, {
          status: editForm.status,
          loginTime: editForm.loginTime || null,
          logoutTime: editForm.logoutTime || null,
        });
      }
      feedback.success('Attendance record updated');
      setSelectedRecord(null);
      load();
    } catch (err) {
      feedback.error(getApiError(err, 'Failed to update attendance'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !records.length) return <LoadingState label="Loading attendance register…" />;
  if (error && !records.length) return <ErrorState message={error} retry={load} />;

  const todayAttendanceRecords = records.filter((r) => r.dateKey === todayKey);
  const totalEmployeesCount = (kpis.totalEmployees && kpis.totalEmployees > 0)
    ? kpis.totalEmployees
    : (kpis.activeEmployees && kpis.activeEmployees > 0
      ? kpis.activeEmployees
      : (allEmployees.length || 0));
  const presentToday = (typeof kpis.present === 'number' && kpis.present >= 0)
    ? kpis.present
    : todayAttendanceRecords.filter((r) => r.status === 'Present' || r.status === 'Late' || r.status === 'Half Day').length;
  const lateToday = (typeof kpis.late === 'number' && kpis.late >= 0)
    ? kpis.late
    : todayAttendanceRecords.filter((r) => r.status === 'Late').length;
  const absentToday = (typeof kpis.absent === 'number' && kpis.absent >= 0)
    ? kpis.absent
    : Math.max(0, totalEmployeesCount - presentToday);

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-12">
      {/* 1. Page Header & View Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Attendance Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
            View, inspect, and export employee attendance across Regular, Sheet, and Calendar views.
          </p>
        </div>

        {/* View Switcher Controls & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented View Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/90 dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('regular')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${viewMode === 'regular'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              title="Regular List / Table View"
            >
              <Table size={14} />
              <span>Regular</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('sheet')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${viewMode === 'sheet'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              title="Sheet Register Matrix View"
            >
              <FileSpreadsheet size={14} />
              <span>Sheet View</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${viewMode === 'calendar'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              title="Interactive Month Calendar View"
            >
              <CalendarDays size={14} />
              <span>Calendar</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleMarkAttendance}
            className="bg-[#2563eb] hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <Fingerprint size={15} />
            <span>Mark Attendance</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs px-3.5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download size={14} />
            <span>Export</span>
          </button>

          <button
            type="button"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
            title="More Options"
          >
            <MoreVertical size={15} />
          </button>
        </div>
      </div>

      {/* 2. Top Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        {/* Total Employees */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#eff6ff] dark:bg-blue-950/50 text-[#2563eb] dark:text-blue-400 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Total Staff</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-none my-1">
              {totalEmployeesCount}
            </div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
              Active company roster
            </span>
          </div>
        </div>

        {/* Present Today */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ecfdf5] dark:bg-emerald-950/50 text-[#10b981] dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Present</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-none my-1">
              {presentToday}
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block">
              Recorded present
            </span>
          </div>
        </div>

        {/* Late Today */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#fffbeb] dark:bg-amber-950/50 text-[#d97706] dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Late Today</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-none my-1">
              {lateToday}
            </div>
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 block">
              Delayed check-in
            </span>
          </div>
        </div>

        {/* Absent Today */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#fef2f2] dark:bg-rose-950/50 text-[#ef4444] dark:text-rose-400 flex items-center justify-center shrink-0">
            <UserX size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Absent Today</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-none my-1">
              {absentToday}
            </div>
            <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400 block">
              Not checked in
            </span>
          </div>
        </div>
      </div>

      {/* 3. Sub-tabs & Date Navigator Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Sub-tabs */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap sm:flex-nowrap">
          {['Daily Attendance', 'Attendance Logs', 'Shift Schedule', 'Regularization', 'Overtime'].map(
            (tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  style={isActive ? { backgroundColor: 'var(--erp-primary, #2563eb)' } : undefined}
                  className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${isActive
                    ? 'bg-[#2563eb] text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/70 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                >
                  {tab}
                </button>
              );
            }
          )}
        </div>

        {/* Date / Month Navigator Pill with Previous / Next Arrows */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {viewMode === 'regular' ? (
            <>
              <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs flex items-center gap-2">
                <Calendar size={14} className="text-slate-500 dark:text-slate-400" />
                <span>
                  {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <button
                type="button"
                onClick={handlePrevDay}
                title="Previous Day"
                className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={handleNextDay}
                title="Next Day"
                className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Today
              </button>
            </>
          ) : (
            <>
              <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs flex items-center gap-2">
                <Calendar size={14} className="text-slate-500 dark:text-slate-400" />
                <span>
                  {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                </span>
              </div>
              <button
                type="button"
                onClick={handlePrevMonth}
                title="Previous Month"
                className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                title="Next Month"
                className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Current Month
              </button>
            </>
          )}
        </div>
      </div>

      {/* 4. Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-wrap items-center gap-2.5">
        {/* Department Filter */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Building2 size={13} />
          </div>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="appearance-none bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl pl-8 pr-8 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:outline-none cursor-pointer"
          >
            <option>All Departments</option>
            {uniqueDepartments.map((dept) => (
              <option key={dept}>{dept}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Employee Filter */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <User size={13} />
          </div>
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="appearance-none bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl pl-8 pr-8 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:outline-none cursor-pointer"
          >
            <option>All Employees</option>
            {uniqueEmployeeNames.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Shift Filter (only relevant for Regular table) */}
        {viewMode === 'regular' && (
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Clock size={13} />
            </div>
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="appearance-none bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl pl-8 pr-8 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:outline-none cursor-pointer"
            >
              <option>All Shifts</option>
              <option>General</option>
              <option>Evening</option>
              <option>Night</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        )}

        {/* Status Filter */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Layers size={13} />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl pl-8 pr-8 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:outline-none cursor-pointer"
          >
            <option>All Status</option>
            <option>Present</option>
            <option>Late</option>
            <option>Half Day</option>
            <option>Absent</option>
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee by name, ID, or email..."
            className="w-full bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Reset Button */}
        <button
          type="button"
          onClick={resetFilters}
          className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RotateCcw size={13} className="text-slate-500 dark:text-slate-400" />
          <span>Reset</span>
        </button>
      </div>

      {/* 5. VIEW CONTENTS */}

      {/* A. REGULAR VIEW (TABLE) */}
      {viewMode === 'regular' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 pl-4 sm:pl-5 pr-2.5 w-10">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.length > 0 &&
                        selectedIds.length === filteredRecords.length
                      }
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-2.5">EMP ID</th>
                  <th className="py-2.5 px-2.5">EMPLOYEE</th>
                  <th className="py-2.5 px-2.5">DEPARTMENT</th>
                  <th className="py-2.5 px-2.5">SHIFT</th>
                  <th className="py-2.5 px-2.5">DATE</th>
                  <th className="py-2.5 px-2.5">CHECK IN</th>
                  <th className="py-2.5 px-2.5">CHECK OUT</th>
                  <th className="py-2.5 px-2.5">WORK HOURS</th>
                  <th className="py-2.5 px-2.5">STATUS</th>
                  <th className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-10 text-center text-slate-400 dark:text-slate-500">
                      No attendance records found matching the active filters.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((rec) => {
                    const isSelected = selectedIds.includes(rec._id);
                    return (
                      <tr
                        key={rec._id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${isSelected ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                          }`}
                      >
                        {/* Checkbox */}
                        <td className="py-2.5 pl-4 sm:pl-5 pr-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(rec._id)}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                          />
                        </td>

                        {/* Emp ID */}
                        <td className="py-2.5 px-2.5 font-semibold text-slate-800 dark:text-slate-200">
                          {rec.employeeId}
                        </td>

                        {/* Employee Avatar + Name + Email */}
                        <td className="py-2.5 px-2.5">
                          <div className="flex items-center gap-3">
                            {rec.avatar ? (
                              <img
                                src={rec.avatar}
                                alt={rec.name}
                                className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center ring-1 ring-slate-200 dark:ring-slate-700 shrink-0">
                                {rec.name?.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => rec.userId && navigate(`/admin/attendance/${rec.userId}`)}
                                className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left block leading-tight cursor-pointer"
                              >
                                {rec.name}
                              </button>
                              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal block leading-tight mt-0.5 truncate max-w-[180px]">
                                {rec.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="py-2.5 px-2.5 font-medium text-slate-700 dark:text-slate-300">
                          {rec.department}
                        </td>

                        {/* Shift Pill */}
                        <td className="py-2.5 px-2.5">
                          {rec.shift === 'Evening' ? (
                            <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#f5f3ff] dark:bg-purple-950/50 text-[#7c3aed] dark:text-purple-400">
                              Evening
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#eff6ff] dark:bg-blue-950/50 text-[#2563eb] dark:text-blue-400">
                              General
                            </span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-2.5 px-2.5 font-normal text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {rec.dateKey || '—'}
                        </td>

                        {/* Check In */}
                        <td className="py-2.5 px-2.5 font-normal text-slate-700 dark:text-slate-300">
                          {rec.checkIn}
                        </td>

                        {/* Check Out */}
                        <td className="py-2.5 px-2.5 font-normal text-slate-700 dark:text-slate-300">
                          {rec.checkOut}
                        </td>

                        {/* Work Hours */}
                        <td className="py-2.5 px-2.5 font-normal text-slate-700 dark:text-slate-300">
                          {rec.workHours}
                        </td>

                        {/* Status Pill */}
                        <td className="py-2.5 px-2.5">
                          {rec.status === 'Present' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ecfdf5] dark:bg-emerald-950/60 text-[#059669] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                              Present
                            </span>
                          )}
                          {rec.status === 'Late' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fffbeb] dark:bg-amber-950/60 text-[#d97706] dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                              Late
                            </span>
                          )}
                          {rec.status === 'Half Day' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#eff6ff] dark:bg-blue-950/60 text-[#2563eb] dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
                              Half Day
                            </span>
                          )}
                          {rec.status === 'Absent' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fef2f2] dark:bg-rose-950/60 text-[#dc2626] dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                              Absent
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => rec.userId && navigate(`/admin/attendance/${rec.userId}`)}
                              className="w-8 h-8 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                              title="View Attendance Details"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(rec)}
                              className="w-8 h-8 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                              title="Edit Record"
                            >
                              <Edit3 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <div className="p-4 sm:px-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Showing {filteredRecords.length === 0 ? 0 : (page - 1) * pageSize + 1} -{' '}
              {Math.min(page * pageSize, filteredRecords.length)} of {filteredRecords.length} records
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                const pageNum = idx + 1;
                const isCurr = page === pageNum;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg font-semibold flex items-center justify-center transition-colors cursor-pointer ${isCurr
                      ? 'bg-[#2563eb] text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {totalPages > 5 && (
                <>
                  <span className="px-1 text-slate-400">...</span>
                  <button
                    type="button"
                    onClick={() => setPage(totalPages)}
                    className={`w-8 h-8 rounded-lg font-semibold flex items-center justify-center transition-colors cursor-pointer ${page === totalPages
                      ? 'bg-[#2563eb] text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                  >
                    {totalPages}
                  </button>
                </>
              )}

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* B. SHEET VIEW (MONTHLY SPREADSHEET REGISTER) */}
      {viewMode === 'sheet' && (
        <div className="space-y-3">
          {/* Sheet Toolbar & Legend */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Status Legend */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-semibold text-slate-600 dark:text-slate-400">Legend:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">P</span>
                <span className="text-slate-600 dark:text-slate-400">Present</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700">L</span>
                <span className="text-slate-600 dark:text-slate-400">Late</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-700">HD</span>
                <span className="text-slate-600 dark:text-slate-400">Half Day</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-700">A</span>
                <span className="text-slate-600 dark:text-slate-400">Absent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded flex items-center justify-center font-medium text-[10px] bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">WO</span>
                <span className="text-slate-600 dark:text-slate-400">Weekend Off</span>
              </div>
            </div>

            {/* Total Active Staff in Sheet */}
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              Showing <span className="font-bold text-slate-800 dark:text-slate-200">{filteredEmployees.length}</span> staff members for {MONTH_NAMES[sheetMonth]} {sheetYear}
            </div>
          </div>

          {/* Matrix Table with Sticky Column */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto max-h-[75vh]">
              <table className="w-full text-center border-collapse text-xs select-none">
                <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800 shadow-2xs">
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {/* Sticky Employee Header */}
                    <th className="sticky left-0 z-30 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-left min-w-[220px] max-w-[260px] border-r border-slate-200 dark:border-slate-700">
                      EMPLOYEE
                    </th>

                    {/* Day Headers (1 to Days In Month) */}
                    {sheetDays.map((dayObj) => (
                      <th
                        key={dayObj.dayNumber}
                        className={`px-1 py-1.5 min-w-[34px] max-w-[38px] border-r border-slate-200/80 dark:border-slate-700 ${dayObj.isWeekend
                          ? 'bg-slate-100/90 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500'
                          : 'text-slate-700 dark:text-slate-300'
                          }`}
                      >
                        <div className="text-[12px] font-bold">{dayObj.dayNumber}</div>
                        <div className="text-[9px] uppercase font-semibold text-slate-400 dark:text-slate-500">{dayObj.dayName}</div>
                      </th>
                    ))}

                    {/* Summary Columns */}
                    <th className="px-2 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold border-r border-slate-200 dark:border-slate-700 min-w-[36px]" title="Total Present">P</th>
                    <th className="px-2 py-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold border-r border-slate-200 dark:border-slate-700 min-w-[36px]" title="Total Late">L</th>
                    <th className="px-2 py-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-bold border-r border-slate-200 dark:border-slate-700 min-w-[36px]" title="Total Half Day">HD</th>
                    <th className="px-2 py-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 font-bold border-r border-slate-200 dark:border-slate-700 min-w-[36px]" title="Total Absent">A</th>
                    <th className="px-2 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold min-w-[55px]" title="Total Hours Worked">Hours</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={sheetDays.length + 6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        No employees found matching the current search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => {
                      let pTotal = 0;
                      let lTotal = 0;
                      let hdTotal = 0;
                      let aTotal = 0;
                      let hrsTotal = 0;

                      return (
                        <tr key={emp.userId || emp.employeeId} className="hover:bg-blue-50/20 dark:hover:bg-slate-800/40 transition-colors">
                          {/* Sticky Employee Column */}
                          <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-3 py-2 text-left border-r border-slate-200/80 dark:border-slate-800 shadow-xs">
                            <div className="flex items-center gap-2">
                              {emp.avatar ? (
                                <img
                                  src={emp.avatar}
                                  alt={emp.name}
                                  className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center ring-1 ring-slate-200 dark:ring-slate-700 shrink-0">
                                  {emp.name?.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 dark:text-white block leading-tight text-xs truncate max-w-[150px]">
                                  {emp.name}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 block leading-tight mt-0.5">
                                  {emp.employeeId} • {emp.department}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Days Cells */}
                          {sheetDays.map((dayObj) => {
                            const rec =
                              attendanceLookup.get(`${emp.userId}_${dayObj.dateKey}`) ||
                              attendanceLookup.get(`${emp.employeeId}_${dayObj.dateKey}`);

                            if (rec) {
                              if (rec.status === 'Present') pTotal++;
                              else if (rec.status === 'Late') lTotal++;
                              else if (rec.status === 'Half Day') hdTotal++;
                              else if (rec.status === 'Absent') aTotal++;
                              hrsTotal += rec.totalHours || 0;

                              const isLate = rec.status === 'Late';
                              const isHalfDay = rec.status === 'Half Day';
                              const isAbsent = rec.status === 'Absent';

                              let badgeClasses = 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700';
                              let symbol = 'P';

                              if (isLate) {
                                badgeClasses = 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700';
                                symbol = 'L';
                              } else if (isHalfDay) {
                                badgeClasses = 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-700';
                                symbol = 'HD';
                              } else if (isAbsent) {
                                badgeClasses = 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-700';
                                symbol = 'A';
                              }

                              return (
                                <td
                                  key={dayObj.dayNumber}
                                  onClick={() => openEditModal(rec)}
                                  className={`p-1 border-r border-slate-100 dark:border-slate-800 cursor-pointer ${dayObj.isWeekend ? 'bg-slate-50/60 dark:bg-slate-800/40' : ''
                                    }`}
                                  title={`${rec.name} — ${dayObj.dateKey}: ${rec.status} (${rec.checkIn} - ${rec.checkOut}) [Click to edit]`}
                                >
                                  <span
                                    className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold border transition-transform hover:scale-110 ${badgeClasses}`}
                                  >
                                    {symbol}
                                  </span>
                                </td>
                              );
                            }

                            // No attendance record found for this day
                            if (dayObj.isWeekend) {
                              return (
                                <td
                                  key={dayObj.dayNumber}
                                  className="p-1 border-r border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-300 dark:text-slate-600 font-medium text-[10px]"
                                  title="Weekend"
                                >
                                  WO
                                </td>
                              );
                            }

                            // Weekday with no record
                            const isPastOrToday = dayObj.dateKey <= todayKey;
                            if (isPastOrToday) {
                              aTotal++;
                              return (
                                <td
                                  key={dayObj.dayNumber}
                                  className="p-1 border-r border-slate-100 dark:border-slate-800"
                                  title={`${emp.name} — ${dayObj.dateKey}: Absent (No punch record)`}
                                >
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold border transition-transform hover:scale-110 bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-700">
                                    A
                                  </span>
                                </td>
                              );
                            }

                            return (
                              <td
                                key={dayObj.dayNumber}
                                className="p-1 border-r border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-600 font-normal"
                              >
                                —
                              </td>
                            );
                          })}

                          {/* Summary Cells */}
                          <td className="px-1.5 py-2 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 border-r border-slate-200/80 dark:border-slate-800">
                            {pTotal}
                          </td>
                          <td className="px-1.5 py-2 font-bold text-amber-700 dark:text-amber-400 bg-amber-50/40 dark:bg-amber-950/20 border-r border-slate-200/80 dark:border-slate-800">
                            {lTotal}
                          </td>
                          <td className="px-1.5 py-2 font-bold text-blue-700 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20 border-r border-slate-200/80 dark:border-slate-800">
                            {hdTotal}
                          </td>
                          <td className="px-1.5 py-2 font-bold text-rose-700 dark:text-rose-400 bg-rose-50/40 dark:bg-rose-950/20 border-r border-slate-200/80 dark:border-slate-800">
                            {aTotal}
                          </td>
                          <td className="px-1.5 py-2 font-semibold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/30">
                            {hrsTotal > 0 ? `${hrsTotal.toFixed(0)}h` : '0h'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* C. CALENDAR VIEW (LEFT CALENDAR + RIGHT DAY ROSTER) */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
          {/* Left: Calendar Month Grid */}
          <div className="xl:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden p-3 sm:p-4">
            {/* Calendar Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {WEEKDAY_NAMES.map((name) => (
                <div key={name} className="py-1">
                  {name}
                </div>
              ))}
            </div>

            {/* Calendar Day Tiles */}
            <div className="grid grid-cols-7 gap-1">
              {calendarGrid.map((cell, idx) => {
                const isSelected = cell.dateKey === calSelectedDateKey;
                const isToday = cell.dateKey === formatDateKey(new Date());
                const dayStats = calendarDateStats.get(cell.dateKey) || { present: 0, late: 0, halfDay: 0, absent: 0, total: 0 };

                return (
                  <div
                    key={`${cell.dateKey}_${idx}`}
                    onClick={() => setCalendarSelectedDate(cell.date)}
                    className={`min-h-[60px] sm:min-h-[72px] p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/40 ring-2 ring-blue-500/30 shadow-xs'
                        : isToday
                        ? 'border-blue-300 dark:border-blue-700 bg-blue-50/20 dark:bg-blue-950/20 hover:border-blue-400'
                        : cell.isCurrentMonth
                        ? 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50'
                        : 'border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-950/30 opacity-60'
                    }`}
                  >
                    {/* Top Row: Date Number */}
                    <div className="flex items-center justify-between w-full leading-none">
                      <span
                        className={`font-bold flex items-center justify-center shrink-0 ${
                          isToday
                            ? 'w-6 h-6 rounded-full bg-blue-600 text-white text-xs shadow-2xs'
                            : cell.isCurrentMonth
                            ? 'text-xs sm:text-sm text-slate-800 dark:text-slate-100'
                            : 'text-xs sm:text-sm text-slate-400 dark:text-slate-600'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                    </div>

                    {/* Bottom Indicators for the day */}
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      {dayStats.total > 0 ? (
                        <>
                          {dayStats.present > 0 && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1 py-0.5 rounded" title={`${dayStats.present} Present`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span>{dayStats.present}</span>
                              <span className="hidden sm:inline">P</span>
                            </span>
                          )}
                          {dayStats.late > 0 && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1 py-0.5 rounded" title={`${dayStats.late} Late`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              <span>{dayStats.late}</span>
                              <span className="hidden sm:inline">L</span>
                            </span>
                          )}
                          {dayStats.absent > 0 && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1 py-0.5 rounded" title={`${dayStats.absent} Absent`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                              <span>{dayStats.absent}</span>
                              <span className="hidden sm:inline">A</span>
                            </span>
                          )}
                        </>
                      ) : cell.isWeekend ? (
                        <span className="text-[9px] font-medium text-slate-400 dark:text-slate-600">
                          Off
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Day Attendance Roster Breakdown for Selected Date */}
          <div className="xl:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarDays size={16} className="text-blue-600 dark:text-blue-400" />
                  <span>
                    Attendance Roster —{' '}
                    {calendarSelectedDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Showing {calSelectedDateRecords.length} staff attendance records on this date.
                </p>
              </div>

              {/* Roster Day Stats Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  {calSelectedDateRecords.filter((r) => r.status === 'Present').length} Present
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  {calSelectedDateRecords.filter((r) => r.status === 'Late').length} Late
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                  {calSelectedDateRecords.filter((r) => r.status === 'Absent').length} Absent
                </span>
              </div>
            </div>

            {/* Roster Table with Smooth Scroll */}
            <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 pl-4 sm:pl-5 pr-2.5">EMP ID</th>
                    <th className="py-2.5 px-2.5">EMPLOYEE</th>
                    <th className="py-2.5 px-2.5">DEPARTMENT</th>
                    <th className="py-2.5 px-2.5">SHIFT</th>
                    <th className="py-2.5 px-2.5">CHECK IN</th>
                    <th className="py-2.5 px-2.5">CHECK OUT</th>
                    <th className="py-2.5 px-2.5">WORK HOURS</th>
                    <th className="py-2.5 px-2.5">STATUS</th>
                    <th className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {calSelectedDateRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        No attendance records found for this specific date.
                      </td>
                    </tr>
                  ) : (
                    calSelectedDateRecords.map((rec) => (
                      <tr key={rec._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-2.5 pl-4 sm:pl-5 pr-2.5 font-semibold text-slate-800 dark:text-slate-200">
                          {rec.employeeId}
                        </td>
                        <td className="py-2.5 px-2.5">
                          <div className="flex items-center gap-2.5">
                            {rec.avatar ? (
                              <img
                                src={rec.avatar}
                                alt={rec.name}
                                className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center ring-1 ring-slate-200 dark:ring-slate-700 shrink-0">
                                {rec.name?.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block leading-tight">
                                {rec.name}
                              </span>
                              <span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-tight mt-0.5">
                                {rec.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5 font-medium text-slate-700 dark:text-slate-300">
                          {rec.department}
                        </td>
                        <td className="py-2.5 px-2.5">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#eff6ff] dark:bg-blue-950/50 text-[#2563eb] dark:text-blue-400">
                            {rec.shift}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-slate-700 dark:text-slate-300">
                          {rec.checkIn}
                        </td>
                        <td className="py-2.5 px-2.5 text-slate-700 dark:text-slate-300">
                          {rec.checkOut}
                        </td>
                        <td className="py-2.5 px-2.5 text-slate-700 dark:text-slate-300 font-medium">
                          {rec.workHours}
                        </td>
                        <td className="py-2.5 px-2.5">
                          {rec.status === 'Present' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ecfdf5] dark:bg-emerald-950/60 text-[#059669] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                              Present
                            </span>
                          )}
                          {rec.status === 'Late' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fffbeb] dark:bg-amber-950/60 text-[#d97706] dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                              Late
                            </span>
                          )}
                          {rec.status === 'Half Day' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#eff6ff] dark:bg-blue-950/60 text-[#2563eb] dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
                              Half Day
                            </span>
                          )}
                          {rec.status === 'Absent' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fef2f2] dark:bg-rose-950/60 text-[#dc2626] dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                              Absent
                            </span>
                          )}
                          {rec.status === 'Off' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              Weekend Off
                            </span>
                          )}
                          {rec.status === 'Scheduled' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700">
                              Scheduled
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">
                          {rec.rawRecord?._id ? (
                            <button
                              type="button"
                              onClick={() => openEditModal(rec)}
                              className="w-8 h-8 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 inline-flex items-center justify-center transition-colors cursor-pointer"
                              title="Edit Attendance"
                            >
                              <Edit3 size={15} />
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-300 dark:text-slate-600 select-none px-2 py-1">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Attendance Modal */}
      <Modal
        open={Boolean(selectedRecord)}
        title="Edit Attendance Record"
        subtitle={selectedRecord?.name}
        onClose={() => setSelectedRecord(null)}
        footer={
          <>
            <ToolbarButton onClick={() => setSelectedRecord(null)}>Cancel</ToolbarButton>
            <ToolbarButton primary disabled={submitting} onClick={saveEdit}>
              {submitting ? 'Saving…' : 'Save Changes'}
            </ToolbarButton>
          </>
        }
      >
        <div className="erp-form-grid">
          <div className="erp-field span-2">
            <label>Status</label>
            <select
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            >
              {['Present', 'Late', 'Half Day', 'Absent'].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="erp-field">
            <label>Check In</label>
            <input
              type="datetime-local"
              value={editForm.loginTime}
              onChange={(e) => setEditForm({ ...editForm, loginTime: e.target.value })}
            />
          </div>
          <div className="erp-field">
            <label>Check Out</label>
            <input
              type="datetime-local"
              value={editForm.logoutTime}
              onChange={(e) => setEditForm({ ...editForm, logoutTime: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ManageAttendance;
