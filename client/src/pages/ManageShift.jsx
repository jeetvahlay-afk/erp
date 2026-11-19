import { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck,
  Clock,
  Edit3,
  Moon,
  Plus,
  Sun,
  Trash2,
  Users,
} from 'lucide-react';
import api, { asArray, getApiError } from '../lib/api';
import { feedback } from '../lib/feedback';
import {
  Avatar,
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  Modal,
  PageHeader,
  SearchInput,
  StatusBadge,
  TableShell,
  ToolbarButton,
} from '../components/ui/EnterpriseUI';

const emptyShift = () => ({
  id: crypto.randomUUID(),
  shiftName: '',
  startTime: '',
  endTime: '',
  isNightShift: false,
});

const displayTime = (value) =>
  value
    ? new Date(`2000-01-01T${value}`).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '—';

const duration = (shift) => {
  if (!shift.startTime || !shift.endTime) return 0;
  const [sh, sm] = shift.startTime.split(':').map(Number);
  const [eh, em] = shift.endTime.split(':').map(Number);
  let minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes <= 0 || shift.isNightShift) minutes += 1440;
  return Number((minutes / 60).toFixed(1));
};

const ManageShift = () => {
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [state, setState] = useState({ loading: true, error: '', saving: false });
  const [editing, setEditing] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [search, setSearch] = useState('');

  const load = async () => {
    setState({ loading: true, error: '', saving: false });
    try {
      const [shiftResponse, userResponse] = await Promise.all([
        api.get('/api/settings/shifts'),
        api.get('/api/users'),
      ]);
      setShifts(asArray(shiftResponse.data));
      setEmployees(asArray(userResponse.data));
      setState({ loading: false, error: '', saving: false });
    } catch (error) {
      setState({
        loading: false,
        error: getApiError(error, 'Unable to load shift configuration'),
        saving: false,
      });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const persist = async (next) => {
    setState((current) => ({ ...current, saving: true }));
    try {
      await api.post('/api/settings/shifts', next);
      setShifts(next);
      feedback.success('Shift configuration saved.');
      setEditing(null);
    } catch (error) {
      feedback.error(getApiError(error, 'Unable to save shift configuration'));
    } finally {
      setState((current) => ({ ...current, saving: false }));
    }
  };

  const saveShift = () => {
    if (!editing.shiftName.trim() || !editing.startTime || !editing.endTime) {
      feedback.error('Shift name, start time, and end time are required.');
      return;
    }
    const next = shifts.some((shift) => shift.id === editing.id)
      ? shifts.map((shift) => (shift.id === editing.id ? editing : shift))
      : [...shifts, editing];
    persist(next.sort((a, b) => a.startTime.localeCompare(b.startTime)));
  };

  const removeShift = async (shift) => {
    const accepted = await feedback.confirm(
      `Delete "${shift.shiftName}"? Employees assigned to it will revert to standard hours.`,
      {
        title: 'Delete Shift',
        confirmLabel: 'Delete',
        tone: 'danger',
      }
    );
    if (!accepted) return;
    persist(shifts.filter((item) => item.id !== shift.id));
  };

  const openAssignModal = (shift) => {
    setAssigning(shift);
    const assignedIds = employees
      .filter((employee) => employee.shift === shift.id)
      .map((employee) => employee._id);
    setSelectedEmployees(assignedIds);
    setSearch('');
  };

  const toggleEmployee = (id) => {
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const saveAssignments = async () => {
    if (!assigning) return;
    setState((current) => ({ ...current, saving: true }));
    try {
      await api.post('/api/users/bulk-shift', {
        shiftId: assigning.id,
        employeeIds: selectedEmployees,
      });
      feedback.success('Employee shift assignments updated.');
      setAssigning(null);
      load();
    } catch (error) {
      feedback.error(getApiError(error, 'Unable to update shift assignments'));
      setState((current) => ({ ...current, saving: false }));
    }
  };

  const filteredEmployees = useMemo(
    () =>
      employees.filter((employee) =>
        `${employee.name} ${employee.employeeId} ${employee.department}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [employees, search]
  );

  if (state.loading) return <LoadingState label="Loading workforce shifts…" />;
  if (state.error) return <ErrorState message={state.error} retry={load} />;

  const totalAssignedStaff = employees.filter((e) => e.shift).length;

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Page Header */}
      <PageHeader
        title="Shift Management"
        breadcrumbs={['System & Config', 'Shift Management']}
        actions={
          <ToolbarButton primary icon={Plus} onClick={() => setEditing(emptyShift())}>
            Create Shift
          </ToolbarButton>
        }
      />

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
        <MetricCard
          label="Configured Shifts"
          value={shifts.length}
          helper="Active operational shift slots"
          icon={Clock}
          tone="blue"
        />
        <MetricCard
          label="Staff Assigned"
          value={totalAssignedStaff}
          helper={`${employees.length} total team members`}
          icon={Users}
          tone="green"
        />
        <MetricCard
          label="Roster Engine"
          value="Automated"
          helper="Automatic punch boundary sync"
          icon={CalendarCheck}
          tone="purple"
        />
      </div>

      {/* 3. Shifts Table */}
      <TableShell
        title="Configured Shifts"
        summary={`${shifts.length} shift${shifts.length === 1 ? '' : 's'} available for employee scheduling`}
        tools={false}
        footer={<span>Showing {shifts.length} workforce shifts</span>}
      >
        {shifts.length ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-white text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 pl-4 sm:pl-5 pr-2.5">SHIFT NAME</th>
                <th className="py-2.5 px-2.5">TIME WINDOW</th>
                <th className="py-2.5 px-2.5">DURATION</th>
                <th className="py-2.5 px-2.5">TYPE</th>
                <th className="py-2.5 px-2.5">ASSIGNED STAFF</th>
                <th className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {shifts.map((shift) => {
                const count = employees.filter((employee) => employee.shift === shift.id).length;
                return (
                  <tr key={shift.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 pl-4 sm:pl-5 pr-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                          {shift.isNightShift ? <Moon size={15} /> : <Sun size={15} />}
                        </div>
                        <div>
                          <strong className="block text-slate-900 font-bold leading-tight">
                            {shift.shiftName}
                          </strong>
                          <span className="text-[11px] text-slate-400">Standard roster</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-600">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Clock size={13} className="text-slate-400" />
                        <span>
                          {displayTime(shift.startTime)} – {displayTime(shift.endTime)}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700">
                        {duration(shift)} hrs
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5">
                      <StatusBadge tone={shift.isNightShift ? 'info' : 'success'}>
                        {shift.isNightShift ? 'Night Shift' : 'Day Shift'}
                      </StatusBadge>
                    </td>
                    <td className="py-2.5 px-2.5">
                      <button
                        type="button"
                        onClick={() => openAssignModal(shift)}
                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                      >
                        <Users size={14} />
                        <span>{count} staff assigned</span>
                      </button>
                    </td>
                    <td className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditing({ ...shift })}
                          className="p-1.5 rounded-lg border border-slate-200/80 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 transition-colors cursor-pointer"
                          title="Edit Shift"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeShift(shift)}
                          className="p-1.5 rounded-lg border border-slate-200/80 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/50 transition-colors cursor-pointer"
                          title="Delete Shift"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title="No shifts configured"
            message="Create a day or night shift to start scheduling employees."
          />
        )}
      </TableShell>

      {/* Edit Shift Modal */}
      <Modal
        open={Boolean(editing)}
        title={editing?.id && shifts.some((s) => s.id === editing.id) ? 'Edit Shift' : 'Create Shift'}
        subtitle="Configure daily start and end working hours."
        onClose={() => setEditing(null)}
        size="sm"
        footer={
          <>
            <ToolbarButton onClick={() => setEditing(null)}>Cancel</ToolbarButton>
            <ToolbarButton primary disabled={state.saving} onClick={saveShift}>
              {state.saving ? 'Saving…' : 'Save Shift'}
            </ToolbarButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Shift Name</label>
            <input
              type="text"
              placeholder="e.g. General Shift, Night Operations"
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
              value={editing?.shiftName || ''}
              onChange={(e) => setEditing({ ...editing, shiftName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Start Time</label>
              <input
                type="time"
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                value={editing?.startTime || ''}
                onChange={(e) => setEditing({ ...editing, startTime: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">End Time</label>
              <input
                type="time"
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                value={editing?.endTime || ''}
                onChange={(e) => setEditing({ ...editing, endTime: e.target.value })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              checked={Boolean(editing?.isNightShift)}
              onChange={(e) => setEditing({ ...editing, isNightShift: e.target.checked })}
            />
            <span className="text-xs font-semibold text-slate-700">Night Shift (crosses midnight)</span>
          </label>
        </div>
      </Modal>

      {/* Assign Employees Modal */}
      <Modal
        open={Boolean(assigning)}
        title={`Assign Staff: ${assigning?.shiftName}`}
        subtitle="Select employees to work on this shift schedule."
        onClose={() => setAssigning(null)}
        footer={
          <>
            <ToolbarButton onClick={() => setAssigning(null)}>Cancel</ToolbarButton>
            <ToolbarButton primary disabled={state.saving} onClick={saveAssignments}>
              {state.saving ? 'Saving…' : `Save ${selectedEmployees.length} Assignments`}
            </ToolbarButton>
          </>
        }
      >
        <div className="space-y-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search employees by name, ID, department..."
          />
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200/80 rounded-xl">
            {filteredEmployees.map((emp) => {
              const checked = selectedEmployees.includes(emp._id);
              return (
                <label
                  key={emp._id}
                  className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleEmployee(emp._id)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <Avatar user={emp} size="sm" />
                    <div>
                      <strong className="block text-xs font-bold text-slate-900 leading-tight">
                        {emp.name}
                      </strong>
                      <span className="text-[11px] text-slate-400">
                        {emp.employeeId} · {emp.department || 'General'}
                      </span>
                    </div>
                  </div>
                  {checked && <StatusBadge tone="success">Assigned</StatusBadge>}
                </label>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ManageShift;