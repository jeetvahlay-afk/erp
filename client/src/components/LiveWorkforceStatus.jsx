import { useEffect, useMemo, useState } from 'react';
import { Activity, Coffee, Edit3, RefreshCw } from 'lucide-react';
import api, { asArray, getApiError } from '../lib/api';
import {
  Avatar, EmptyState, ErrorState, LoadingState, StatusBadge, TableShell, ToolbarButton, formatTime,
} from './ui/EnterpriseUI';

const durationLabel = (milliseconds) => {
  const seconds = Math.max(0, Math.floor(Number(milliseconds || 0) / 1000));
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

const LiveWorkforceStatus = ({ onEditAttendance }) => {
  const [live, setLive] = useState({ generatedAt: null, rows: [] });
  const [clock, setClock] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get('/api/attendance/live');
      setLive({ generatedAt: data?.generatedAt || null, rows: asArray(data?.rows) });
      setClock(Date.now());
      setError('');
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to load live workforce status'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const refresh = window.setInterval(load, 15000);
    const ticker = window.setInterval(() => setClock(Date.now()), 1000);
    return () => { window.clearInterval(refresh); window.clearInterval(ticker); };
  }, []);

  const counts = useMemo(() => ({
    working: live.rows.filter((row) => row.workState === 'Working').length,
    breaks: live.rows.filter((row) => row.workState === 'On Break').length,
    out: live.rows.filter((row) => row.workState === 'Punched Out').length,
    late: live.rows.filter((row) => row.attendance?.status === 'Late').length,
  }), [live.rows]);

  const sortedRows = useMemo(
    () => [...live.rows].sort((a, b) => Number(b.workState === 'On Break') - Number(a.workState === 'On Break')),
    [live.rows],
  );

  const attendanceTone = (attendanceStatus) => {
    if (attendanceStatus === 'Present') return 'success';
    if (attendanceStatus === 'Late' || attendanceStatus === 'Half Day') return 'warning';
    if (attendanceStatus === 'Absent') return 'danger';
    return 'info';
  };

  const liveValue = (row, field) => {
    const elapsed = live.generatedAt ? Math.max(0, clock - new Date(live.generatedAt).getTime()) : 0;
    if (field === 'workingMilliseconds') return Number(row[field] || 0) + (row.attendance?.loginTime && !row.attendance?.logoutTime && !row.activeBreak ? elapsed : 0);
    if (field === 'breakMilliseconds') return Number(row[field] || 0) + (row.activeBreak ? elapsed : 0);
    return Number(row[field] || 0);
  };

  if (loading) return <LoadingState label="Loading live workforce status…" />;
  if (error && !live.rows.length) return <ErrorState message={error} retry={load} />;

  return (
    <TableShell className="erp-live-attendance" title="Live Workforce Status" summary={`${counts.working} working · ${counts.breaks} on break · ${counts.out} punched out · ${counts.late} late · updates every 15 seconds`} toolbar={<ToolbarButton icon={RefreshCw} onClick={load}>Refresh Live Data</ToolbarButton>}>
      {sortedRows.length ? <table><thead><tr><th>Employee</th><th>Live Status</th><th>Attendance</th><th>Punch In</th><th>Working Time</th><th>Total Break</th><th>Current Break</th><th>Shift Progress</th><th style={{ width: 60, textAlign: 'center' }}>Action</th></tr></thead><tbody>{sortedRows.map((row) => { const working = liveValue(row, 'workingMilliseconds'); const breakTime = liveValue(row, 'breakMilliseconds'); const progress = Math.min(100, (working / (9 * 3600000)) * 100); const currentBreak = row.activeBreak && Math.max(0, clock - new Date(row.activeBreak.startTime).getTime()); return <tr key={row.employee?._id}><td><div className="erp-person-cell"><Avatar user={row.employee} size="sm" /><div><strong>{row.employee?.name}</strong><span>{row.employee?.employeeId || 'No ID'} · {row.employee?.department || 'Unassigned'}</span></div></div></td><td><StatusBadge tone={row.workState === 'Working' ? 'success' : row.workState === 'On Break' ? 'warning' : row.workState === 'Punched Out' ? 'info' : 'danger'}>{row.workState}</StatusBadge></td><td><StatusBadge tone={attendanceTone(row.attendance?.status)}>{row.attendance?.status || 'No record'}</StatusBadge></td><td>{row.attendance?.loginTime ? formatTime(row.attendance.loginTime) : '—'}</td><td><div className="erp-live-duration"><Activity size={14} /><strong>{durationLabel(working)}</strong></div></td><td><div className="erp-live-duration"><Coffee size={14} /><strong>{durationLabel(breakTime)}</strong></div></td><td>{row.activeBreak ? <div className="erp-active-break"><strong>{String(row.activeBreak.breakType || 'Break').split(' [')[0]}</strong><span>{durationLabel(currentBreak)} elapsed</span></div> : '—'}</td><td><div className="erp-shift-progress"><div><i style={{ width: `${progress}%` }} /></div><span>{progress.toFixed(0)}% of 9h</span></div></td><td style={{ textAlign: 'center' }}><button className="erp-icon-btn" type="button" disabled={!row.attendance} onClick={() => onEditAttendance?.({ ...row.attendance, user: row.employee })} aria-label={`Edit ${row.employee?.name || 'employee'} attendance`}><Edit3 size={14} /></button></td></tr>; })}</tbody></table> : <EmptyState title="No active employees" message="Live workforce activity will appear after employees become active." />}
    </TableShell>
  );
};

export default LiveWorkforceStatus;
