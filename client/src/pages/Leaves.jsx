import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CalendarCheck2,
  CalendarDays,
  Download,
  HeartPulse,
  Paperclip,
  Plus,
  Umbrella,
} from 'lucide-react';
import api, { asArray, getApiError } from '../lib/api';
import { downloadCsv } from '../lib/export';
import { feedback } from '../lib/feedback';
import { useAuth } from '../context/AuthContext';
import {
  EmptyState,
  ErrorState,
  formatDate,
  LoadingState,
  MetricCard,
  Modal,
  PageHeader,
  StatusBadge,
  TableShell,
  ToolbarButton,
} from '../components/ui/EnterpriseUI';

const Leaves = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    leaveType: 'Sick Leave',
    startDate: '',
    endDate: '',
    reason: '',
    attachment: null,
  });

  const userBirthday = useMemo(() => {
    if (!user?.dob) return null;
    const d = new Date(user.dob);
    if (Number.isNaN(d.getTime())) return null;
    const month = d.getUTCMonth();
    const day = d.getUTCDate();
    const currentYear = new Date().getFullYear();
    const dateStr = `${currentYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const formatted = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    return { dateStr, formatted, month, day };
  }, [user?.dob]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [leaveResponse, dashboardResponse] = await Promise.all([
        api.get('/api/leaves/my-leaves'),
        api.get('/api/dashboard/employee'),
      ]);
      setLeaves(asArray(leaveResponse.data));
      setBalances(asArray(dashboardResponse.data.leaveBalances));
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to load leave records'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const downloadDoc = async (leave) => {
    try {
      const response = await api.get(`/api/leaves/${leave._id}/attachment`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', leave.attachment || `leave-document-${leave._id}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err) {
      feedback.error(getApiError(err, 'Unable to download leave document'));
    }
  };

  const submit = async () => {
    if (!form.startDate || !form.endDate || form.reason.trim().length < 3) {
      feedback.error('Select a valid date range and provide a reason.');
      return;
    }
    if (form.leaveType === 'Birthday Leave') {
      if (!userBirthday) {
        feedback.error('Date of birth is not registered on your profile. Please update your profile before applying for Birthday Leave.');
        return;
      }
      if (form.startDate !== form.endDate) {
        feedback.error('Birthday Leave can only be applied for a single day (your birthday).');
        return;
      }
      const sel = new Date(form.startDate);
      if (sel.getUTCMonth() !== userBirthday.month || sel.getUTCDate() !== userBirthday.day) {
        feedback.error(`Birthday Leave can only be applied on your birthday (${userBirthday.formatted}).`);
        return;
      }
    }
    const payload = new FormData();
    payload.append('leaveType', form.leaveType);
    payload.append('startDate', form.startDate);
    payload.append('endDate', form.endDate);
    payload.append('reason', form.reason);
    if (form.attachment) payload.append('attachment', form.attachment);
    setSubmitting(true);
    try {
      await api.post('/api/leaves', payload);
      feedback.success('Leave request submitted successfully');
      setOpen(false);
      setForm({
        leaveType: 'Sick Leave',
        startDate: '',
        endDate: '',
        reason: '',
        attachment: null,
      });
      load();
    } catch (requestError) {
      feedback.error(getApiError(requestError, 'Unable to submit leave request'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label="Loading leave records…" />;
  if (error) return <ErrorState message={error} retry={load} />;

  const icons = [HeartPulse, Umbrella, CalendarCheck2, CalendarDays];
  const tones = ['green', 'amber', 'purple', 'blue'];

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Page Header */}
      <PageHeader
        title="My Leaves"
        breadcrumbs={['Self Service', 'My Leaves']}
        actions={
          <>
            <ToolbarButton icon={Download} onClick={() => downloadCsv('my-leaves.csv', leaves)}>
              Export
            </ToolbarButton>
            <ToolbarButton primary icon={Plus} onClick={() => setOpen(true)}>
              Apply Leave
            </ToolbarButton>
          </>
        }
      />

      {/* 2. Leave Balance KPI Cards - 5 columns on desktop for perfect fit */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-3.5">
        {balances.map((balance, index) => {
          const BalanceIcon = icons[index % icons.length];
          return (
            <MetricCard
              key={balance.type}
              label={balance.type}
              value={String(balance.entitlement).padStart(2, '0')}
              helper={`Remaining: ${
                balance.remaining === null ? 'Unlimited' : String(balance.remaining).padStart(2, '0')
              }`}
              icon={BalanceIcon}
              tone={tones[index % tones.length]}
            />
          );
        })}
      </div>

      {/* 3. Leave History Table */}
      <TableShell
        title="Leave History"
        summary={`${leaves.length} submitted requests`}
        footer={<span>Showing {leaves.length} entries</span>}
      >
        {leaves.length ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 pl-4 pr-2">LEAVE TYPE</th>
                <th className="py-2.5 px-2">FROM</th>
                <th className="py-2.5 px-2">TO</th>
                <th className="py-2.5 px-2">DAYS</th>
                <th className="py-2.5 px-2">REASON</th>
                <th className="py-2.5 px-2">DOCUMENT</th>
                <th className="py-2.5 px-2">STATUS</th>
                <th className="py-2.5 px-2">REVIEW NOTE</th>
                <th className="py-2.5 pr-4 pl-2 text-right">SUBMITTED</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {leaves.map((leave) => {
                const days =
                  Math.floor((new Date(leave.endDate) - new Date(leave.startDate)) / 86400000) + 1;
                return (
                  <tr key={leave._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 pl-4 pr-2 font-bold text-slate-900 dark:text-white">
                      {leave.leaveType}
                    </td>
                    <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-400" />
                        <span>{formatDate(leave.startDate)}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-400" />
                        <span>{formatDate(leave.endDate)}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 font-semibold text-slate-800 dark:text-slate-200">
                      {days} day{days === 1 ? '' : 's'}
                    </td>
                    <td className="py-2.5 px-2 max-w-[200px] text-slate-600 dark:text-slate-300 truncate">
                      {leave.reason || '—'}
                    </td>
                    <td className="py-2.5 px-2 whitespace-nowrap">
                      {leave.attachment ? (
                        <button
                          type="button"
                          onClick={() => downloadDoc(leave)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 text-[11px] font-semibold hover:bg-blue-100 transition-colors cursor-pointer"
                          title="Download attached document"
                        >
                          <Download size={11} /> Document
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">No Document</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2">
                      <StatusBadge>{leave.status}</StatusBadge>
                    </td>
                    <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300 max-w-[200px] truncate">
                      {leave.adminResponse || '—'}
                    </td>
                    <td className="py-2.5 pr-4 pl-2 text-right text-slate-400 text-xs whitespace-nowrap">
                      {formatDate(leave.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title="No leave requests"
            message="Your leave requests will appear here after submission."
          />
        )}
      </TableShell>

      {/* Apply Leave Modal */}
      <Modal
        open={open}
        title="Apply New Leave"
        subtitle="Submit a date range and supporting reason"
        onClose={() => setOpen(false)}
        footer={
          <>
            <ToolbarButton onClick={() => setOpen(false)}>Cancel</ToolbarButton>
            <ToolbarButton primary disabled={submitting} onClick={submit}>
              {submitting ? 'Submitting…' : 'Submit Leave'}
            </ToolbarButton>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Leave Type</label>
            <select
              value={form.leaveType}
              onChange={(e) => {
                const nextType = e.target.value;
                if (nextType === 'Birthday Leave' && userBirthday) {
                  setForm({
                    ...form,
                    leaveType: nextType,
                    startDate: userBirthday.dateStr,
                    endDate: userBirthday.dateStr,
                  });
                } else {
                  setForm({ ...form, leaveType: nextType });
                }
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
            >
              {['Sick Leave', 'Casual Leave', 'Paid Leave', 'Unpaid Leave', 'Birthday Leave'].map(
                (item) => (
                  <option key={item}>{item}</option>
                )
              )}
            </select>
          </div>
          {form.leaveType === 'Birthday Leave' && (
            <div className="sm:col-span-2">
              {userBirthday ? (
                <div className="p-3 bg-pink-50 border border-pink-200/80 rounded-xl text-xs text-pink-700 flex items-center justify-between">
                  <span>🎂 <strong>Birthday Leave:</strong> Eligible only on your birthday ({userBirthday.formatted}).</span>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, startDate: userBirthday.dateStr, endDate: userBirthday.dateStr }))}
                    className="underline font-semibold ml-2 text-pink-800 hover:text-pink-900 cursor-pointer"
                  >
                    Select Birthday Date
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-700">
                  ⚠️ <strong>Date of birth required:</strong> Please update your date of birth in your user profile before applying for Birthday Leave.
                </div>
              )}
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Start Date</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">End Date</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Reason</label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Provide detailed reason for leave (e.g. Personal family function, medical appointment, emergency travel)..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Attachment (Optional)
            </label>
            <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer">
              <Paperclip size={14} className="text-slate-500" />
              <span>Choose Document</span>
              <input
                type="file"
                hidden
                accept="image/jpeg,image/png,application/pdf"
                onChange={(e) => setForm({ ...form, attachment: e.target.files?.[0] || null })}
              />
            </label>
            {form.attachment && (
              <span className="block text-xs font-medium text-emerald-600 mt-1">
                {form.attachment.name}
              </span>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Leaves;