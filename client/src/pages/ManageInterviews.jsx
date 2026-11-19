import { useEffect, useMemo, useState } from 'react';
import { Download, Edit3, Plus, Trash2, UserCheck, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { asArray, getApiError } from '../lib/api';
import { downloadCsv } from '../lib/export';
import { feedback } from '../lib/feedback';
import {
  Avatar, EmptyState, ErrorState, formatDate, formatNumber, LoadingState, MetricCard, Modal,
  PageHeader, SearchInput, StatusBadge, TableShell, ToolbarButton,
} from '../components/ui/EnterpriseUI';

const STATUSES = ['Scheduled', '1st Round Pending', '1st Round Completed', '2nd Round Pending', '2nd Round Completed', 'Selected', 'Rejected', 'Joined', 'Not Joined', 'Training'];
const emptyForm = { candidateName: '', email: '', phoneNumber: '', candidatePost: '', status: 'Scheduled', interviewDate: '', interviewTime: '', firstRoundBy: '', secondRoundBy: '', remarks: '' };

const ManageInterviews = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [funnel, setFunnel] = useState({});
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState('kanban');
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [recordResponse, dashboardResponse] = await Promise.all([api.get('/api/interviews'), api.get('/api/dashboard/recruitment')]);
      setRecords(asArray(recordResponse.data)); setFunnel(dashboardResponse.data.funnel || {});
    } catch (requestError) { setError(getApiError(requestError, 'Unable to load recruitment records')); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => records.filter((record) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [record.candidateName, record.email, record.phoneNumber, record.candidatePost].some((value) => String(value || '').toLowerCase().includes(query));
    return matchesSearch && (!status || record.status === status);
  }), [records, search, status]);

  const openCreate = () => { setSelected('new'); setForm(emptyForm); };
  const openEdit = (record) => { setSelected(record); setForm({ ...emptyForm, ...record, interviewDate: record.interviewDate ? new Date(record.interviewDate).toISOString().slice(0, 10) : '' }); };
  const save = async () => {
    if (!form.candidateName.trim()) { feedback.error('Candidate name is required.'); return; }
    setSubmitting(true);
    try {
      if (selected === 'new') await api.post('/api/interviews', form);
      else await api.put(`/api/interviews/${selected._id}`, form);
      feedback.success(selected === 'new' ? 'Candidate added' : 'Candidate updated'); setSelected(null); load();
    } catch (requestError) { feedback.error(getApiError(requestError, 'Unable to save candidate')); }
    finally { setSubmitting(false); }
  };
  const remove = async (record) => {
    const accepted = await feedback.confirm(`Delete recruitment record for ${record.candidateName}?`, { title: 'Delete candidate record', confirmLabel: 'Delete', tone: 'danger' });
    if (!accepted) return;
    try { await api.delete(`/api/interviews/${record._id}`); feedback.success('Candidate record deleted'); load(); }
    catch (requestError) { feedback.error(getApiError(requestError, 'Unable to delete candidate')); }
  };

  const updateCandidateStatus = async (record, newStatus) => {
    try {
      await api.put(`/api/interviews/${record._id}`, { ...record, status: newStatus });
      feedback.success(`Status updated to ${newStatus}`);
      load();
    } catch (requestError) {
      feedback.error(getApiError(requestError, 'Unable to update candidate status'));
    }
  };

  const COLUMNS = [
    { title: 'Scheduled',            color: '#6366f1', bg: '#eef2ff', statuses: ['Scheduled'] },
    { title: '1st Round Pending',    color: '#f59e0b', bg: '#fffbeb', statuses: ['1st Round Pending'] },
    { title: '1st Round Completed',  color: '#3b82f6', bg: '#eff6ff', statuses: ['1st Round Completed'] },
    { title: '2nd Round Pending',    color: '#8b5cf6', bg: '#f5f3ff', statuses: ['2nd Round Pending'] },
    { title: '2nd Round Completed',  color: '#06b6d4', bg: '#ecfeff', statuses: ['2nd Round Completed'] },
    { title: 'Selected',             color: '#10b981', bg: '#ecfdf5', statuses: ['Selected'] },
    { title: 'Rejected',             color: '#ef4444', bg: '#fef2f2', statuses: ['Rejected'] },
    { title: 'Joined',               color: '#14b8a6', bg: '#f0fdfa', statuses: ['Joined'] },
    { title: 'Not Joined',           color: '#64748b', bg: '#f8fafc', statuses: ['Not Joined'] },
    { title: 'Training',             color: '#f97316', bg: '#fff7ed', statuses: ['Training'] },
  ];

  const handleDragStart = (e, record) => {
    setDraggingId(record._id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('recordId', record._id);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverCol(null);
  };

  const handleDragOver = (e, colTitle) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colTitle);
  };

  const handleDrop = async (e, col) => {
    e.preventDefault();
    const recordId = e.dataTransfer.getData('recordId');
    const record = records.find((r) => r._id === recordId);
    const newStatus = col.statuses[0];
    setDraggingId(null);
    setDragOverCol(null);
    if (!record || record.status === newStatus) return;
    await updateCandidateStatus(record, newStatus);
  };

  const renderKanban = () => {
    return (
      <div className="erp-kanban" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', padding: '4px 0 8px' }}>
        {COLUMNS.map((col) => {
          const items = filtered.filter((record) => col.statuses.includes(record.status));
          const isOver = dragOverCol === col.title;
          return (
            <section
              key={col.title}
              onDragOver={(e) => handleDragOver(e, col.title)}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, col)}
              style={{
                border: `1px solid ${isOver ? col.color : 'var(--erp-border)'}`,
                borderTop: `3px solid ${col.color}`,
                borderRadius: '8px',
                background: isOver ? col.bg : 'var(--erp-surface-hover)',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '300px',
                boxShadow: isOver ? `0 0 0 2px ${col.color}33, var(--erp-shadow-sm)` : 'var(--erp-shadow-xs)',
                transition: 'all 0.15s ease',
              }}
            >
              <header style={{ borderBottom: '1px solid var(--erp-border)', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: col.bg, borderTopLeftRadius: '5px', borderTopRightRadius: '5px' }}>
                <strong style={{ fontSize: '11px', color: col.color, fontWeight: '800' }}>{col.title}</strong>
                <span style={{ fontSize: '10px', background: col.color, color: '#fff', padding: '2px 7px', borderRadius: '12px', fontWeight: 'bold' }}>{items.length}</span>
              </header>
              <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1 }}>
                {items.map((record) => {
                  const isDragging = draggingId === record._id;
                  return (
                    <div
                      key={record._id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, record)}
                      onDragEnd={handleDragEnd}
                      style={{
                        background: 'var(--erp-surface)',
                        border: '1px solid var(--erp-border)',
                        borderRadius: '6px',
                        padding: '10px 12px',
                        boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.18)' : 'var(--erp-shadow-xs)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '7px',
                        cursor: 'grab',
                        opacity: isDragging ? 0.45 : 1,
                        transform: isDragging ? 'scale(0.97)' : 'scale(1)',
                        transition: 'opacity 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
                        userSelect: 'none',
                      }}
                    >
                      {/* Card header: grip + avatar + name */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* 6-dot drag grip */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px', opacity: 0.3, flexShrink: 0, cursor: 'grab' }}>
                          {[0,1,2,3,4,5].map((i) => <div key={i} style={{ width: '3px', height: '3px', background: 'var(--erp-navy)', borderRadius: '50%' }} />)}
                        </div>
                        <Avatar user={record} size="xs" />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <button
                            type="button"
                            onClick={() => navigate(`/interview/${record._id}`)}
                            style={{ border: 0, background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer', width: '100%', lineHeight: 1 }}
                          >
                            <strong style={{ display: 'block', fontSize: '12px', color: 'var(--erp-navy)', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {record.candidateName}
                            </strong>
                          </button>
                          <span style={{ fontSize: '10px', color: 'var(--erp-muted)', display: 'block', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.candidatePost || 'Unspecified'}</span>
                        </div>
                      </div>
                      {/* Contact & interview details */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid #f1f5f9', paddingTop: '7px' }}>
                        {record.phoneNumber && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--erp-muted)' }}>
                            <span style={{ fontSize: '11px' }}>📞</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.phoneNumber}</span>
                          </div>
                        )}
                        {record.email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--erp-muted)' }}>
                            <span style={{ fontSize: '11px' }}>✉️</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.email}</span>
                          </div>
                        )}
                        {record.interviewDate && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--erp-muted)' }}>
                            <span style={{ fontSize: '11px' }}>📅</span>
                            <span>
                              <strong style={{ color: 'var(--erp-navy)', fontWeight: '600' }}>{formatDate(record.interviewDate)}</strong>
                              {record.interviewTime && (
                                <span style={{ marginLeft: '4px', color: 'var(--erp-primary)', fontWeight: '600' }}>@ {record.interviewTime}</span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
                        <button type="button" onClick={() => openEdit(record)} style={{ border: 0, background: 'transparent', color: 'var(--erp-primary)', fontSize: '10px', cursor: 'pointer', padding: 0, fontWeight: '600' }}>Edit</button>
                        <button type="button" onClick={() => remove(record)} style={{ border: 0, background: 'transparent', color: 'var(--erp-red)', fontSize: '10px', cursor: 'pointer', padding: 0, fontWeight: '600' }}>Delete</button>
                      </div>
                    </div>
                  );
                })}
                {!items.length && (
                  <div style={{
                    textAlign: 'center',
                    padding: '28px 12px',
                    color: isOver ? col.color : 'var(--erp-subtle)',
                    fontSize: '11px',
                    border: `1px dashed ${isOver ? col.color : 'var(--erp-border)'}`,
                    borderRadius: '6px',
                    background: isOver ? col.bg : 'transparent',
                    transition: 'all 0.15s ease',
                    fontWeight: isOver ? '700' : '400',
                  }}>
                    {isOver ? `↓ Drop here` : 'No candidates'}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    );
  };

  if (loading) return <LoadingState label="Loading recruitment records…" />;
  if (error) return <ErrorState message={error} retry={load} />;

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      <PageHeader
        title="Recruitment Management"
        breadcrumbs={['HR Management', 'Recruitment Pipeline']}
        actions={
          <>
            <ToolbarButton icon={Download} onClick={() => downloadCsv('recruitment.csv', filtered)}>
              Export CSV
            </ToolbarButton>
            <ToolbarButton primary icon={Plus} onClick={openCreate}>
              Add Candidate
            </ToolbarButton>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        <MetricCard label="Applications" value={formatNumber(funnel.applied)} helper="All recruitment records" icon={Users} tone="blue" />
        <MetricCard label="Shortlisted" value={formatNumber(funnel.shortlisted)} helper="Active interview pipeline" icon={Users} tone="amber" />
        <MetricCard label="Interviewed" value={formatNumber(funnel.interviewed)} helper="Completed interview stages" icon={Users} tone="purple" />
        <MetricCard label="Hired" value={formatNumber(funnel.hired)} helper="Joined or in training" icon={UserCheck} tone="green" />
      </div>

      {/* Recruitment Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <SearchInput value={search} onChange={setSearch} placeholder="Search candidate by name, post..." />
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUSES.map((item) => <option key={item}>{item}</option>)}
          </select>
          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-[#2563eb] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'kanban' ? 'bg-[#2563eb] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kanban
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'table' ? (
        <TableShell
          title="Candidate Pipeline"
          summary={`${filtered.length} matching candidates`}
          footer={<span>Showing {filtered.length} entries</span>}
        >
          {filtered.length ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-white text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 pl-4 sm:pl-5 pr-2.5">CANDIDATE</th>
                  <th className="py-2.5 px-2.5">POSITION</th>
                  <th className="py-2.5 px-2.5">INTERVIEW DATE</th>
                  <th className="py-2.5 px-2.5">CONTACT</th>
                  <th className="py-2.5 px-2.5">STATUS</th>
                  <th className="py-2.5 px-2.5">INTERVIEWERS</th>
                  <th className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((record) => (
                  <tr key={record._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 pl-4 sm:pl-5 pr-2.5">
                      <button
                        type="button"
                        onClick={() => navigate(`/interview/${record._id}`)}
                        className="flex items-center gap-3 text-left cursor-pointer"
                      >
                        <Avatar user={record} size="sm" />
                        <div>
                          <strong className="block text-slate-900 font-bold hover:text-blue-600 transition-colors">{record.candidateName}</strong>
                          <small className="text-slate-400 font-normal">{record.email || 'No email'}</small>
                        </div>
                      </button>
                    </td>
                    <td className="py-2.5 px-2.5 font-medium text-slate-700">{record.candidatePost || 'Unspecified'}</td>
                    <td className="py-2.5 px-2.5 text-slate-600">{formatDate(record.interviewDate)}</td>
                    <td className="py-2.5 px-2.5 text-slate-600">{record.phoneNumber || '—'}</td>
                    <td className="py-2.5 px-2.5"><StatusBadge>{record.status}</StatusBadge></td>
                    <td className="py-2.5 px-2.5 text-slate-600">{[record.firstRoundBy, record.secondRoundBy].filter(Boolean).join(', ') || '—'}</td>
                    <td className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button className="w-8 h-8 rounded-lg text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors cursor-pointer" type="button" onClick={() => openEdit(record)} title="Edit"><Edit3 size={14} /></button>
                        <button className="w-8 h-8 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer" type="button" onClick={() => remove(record)} title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="No candidates found" />
          )}
        </TableShell>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs overflow-hidden">
          {renderKanban()}
        </div>
      )}
      <Modal open={Boolean(selected)} title={selected === 'new' ? 'Add Candidate' : 'Edit Candidate'} subtitle="Recruitment pipeline details" onClose={() => setSelected(null)} footer={<><ToolbarButton onClick={() => setSelected(null)}>Cancel</ToolbarButton><ToolbarButton primary disabled={submitting} onClick={save}>{submitting ? 'Saving…' : 'Save Candidate'}</ToolbarButton></>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="text-xs font-semibold text-slate-700 block mb-1">Candidate Name <span className="text-rose-500">*</span></label><input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500" value={form.candidateName} onChange={(event) => setForm({ ...form, candidateName: event.target.value })} /></div>
          <div><label className="text-xs font-semibold text-slate-700 block mb-1">Position</label><input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500" value={form.candidatePost} onChange={(event) => setForm({ ...form, candidatePost: event.target.value })} /></div>
          <div><label className="text-xs font-semibold text-slate-700 block mb-1">Email</label><input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
          <div><label className="text-xs font-semibold text-slate-700 block mb-1">Phone</label><input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500" value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} /></div>
          <div><label className="text-xs font-semibold text-slate-700 block mb-1">Status</label><select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select></div>
          <div><label className="text-xs font-semibold text-slate-700 block mb-1">Interview Date</label><input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500" type="date" value={form.interviewDate} onChange={(event) => setForm({ ...form, interviewDate: event.target.value })} /></div>
          <div><label className="text-xs font-semibold text-slate-700 block mb-1">Interview Time</label><input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500" type="time" value={form.interviewTime} onChange={(event) => setForm({ ...form, interviewTime: event.target.value })} /></div>
          <div><label className="text-xs font-semibold text-slate-700 block mb-1">First Round By</label><input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500" value={form.firstRoundBy} onChange={(event) => setForm({ ...form, firstRoundBy: event.target.value })} /></div>
          <div className="sm:col-span-2"><label className="text-xs font-semibold text-slate-700 block mb-1">Second Round By</label><input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500" value={form.secondRoundBy} onChange={(event) => setForm({ ...form, secondRoundBy: event.target.value })} /></div>
          <div className="sm:col-span-2"><label className="text-xs font-semibold text-slate-700 block mb-1">Remarks</label><textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500" rows={3} value={form.remarks} onChange={(event) => setForm({ ...form, remarks: event.target.value })} /></div>
        </div>
      </Modal>
    </div>
  );
};

export default ManageInterviews;
