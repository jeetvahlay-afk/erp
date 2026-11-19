import { useEffect, useMemo, useState } from 'react';
import { Building2, Download, Edit3, Plus, Trash2, Users } from 'lucide-react';
import api, { asArray, getApiError } from '../lib/api';
import { downloadCsv } from '../lib/export';
import { feedback } from '../lib/feedback';
import {
  EmptyState,
  ErrorState,
  formatDate,
  formatNumber,
  LoadingState,
  MetricCard,
  Modal,
  PageHeader,
  SearchInput,
  StatusBadge,
  TableShell,
  ToolbarButton,
} from '../components/ui/EnterpriseUI';

const emptyForm = { name: '', code: '', headName: '', description: '' };

const ManageDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/departments');
      setDepartments(asArray(response.envelope?.data ?? response.data));
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to load departments'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return departments.filter(
      (dept) =>
        !query ||
        [dept.name, dept.code, dept.headName].some((val) =>
          String(val || '').toLowerCase().includes(query)
        )
    );
  }, [departments, search]);

  const activeCount = departments.filter((item) => item.isActive).length;
  const employeeCount = departments.reduce(
    (total, item) => total + Number(item.employeeCount || 0),
    0
  );

  const openCreate = () => {
    setSelected('new');
    setForm(emptyForm);
  };

  const openEdit = (dept) => {
    setSelected(dept);
    setForm({ ...emptyForm, ...dept });
  };

  const save = async () => {
    if (!form.name.trim()) {
      feedback.error('Department name is required.');
      return;
    }
    setSubmitting(true);
    try {
      if (selected === 'new') await api.post('/api/departments', form);
      else await api.put(`/api/departments/${selected._id}`, form);
      feedback.success(selected === 'new' ? 'Department created' : 'Department updated');
      setSelected(null);
      load();
    } catch (requestError) {
      feedback.error(getApiError(requestError, 'Unable to save department'));
    } finally {
      setSubmitting(false);
    }
  };

  const toggle = async (dept) => {
    try {
      await api.patch(`/api/departments/${dept._id}/toggle`);
      feedback.success('Department status updated');
      load();
    } catch (requestError) {
      feedback.error(getApiError(requestError, 'Unable to update department'));
    }
  };

  const remove = async (dept) => {
    const accepted = await feedback.confirm(
      `Delete ${dept.name}? This is only allowed when no employees are assigned.`,
      { title: 'Delete department', confirmLabel: 'Delete', tone: 'danger' }
    );
    if (!accepted) return;
    try {
      await api.delete(`/api/departments/${dept._id}`);
      feedback.success('Department deleted');
      load();
    } catch (requestError) {
      feedback.error(getApiError(requestError, 'Unable to delete department'));
    }
  };

  if (loading) return <LoadingState label="Loading departments…" />;
  if (error) return <ErrorState message={error} retry={load} />;

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Header */}
      <PageHeader
        title="Department Management"
        breadcrumbs={['Organization', 'Department Management']}
        actions={
          <>
            <ToolbarButton
              icon={Download}
              onClick={() => downloadCsv('departments.csv', filtered)}
            >
              Export
            </ToolbarButton>
            <ToolbarButton primary icon={Plus} onClick={openCreate}>
              Add Department
            </ToolbarButton>
          </>
        }
      />

      {/* 2. Top 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        <MetricCard
          label="Total Departments"
          value={formatNumber(departments.length)}
          helper="All organizational divisions"
          icon={Building2}
          tone="blue"
        />
        <MetricCard
          label="Active Divisions"
          value={formatNumber(activeCount)}
          helper="Available for assignment"
          icon={Building2}
          tone="green"
        />
        <MetricCard
          label="Assigned Staff"
          value={formatNumber(employeeCount)}
          helper="Current workforce headcount"
          icon={Users}
          tone="teal"
        />
        <MetricCard
          label="Inactive Divisions"
          value={formatNumber(departments.length - activeCount)}
          helper="Decommissioned or archived"
          icon={Building2}
          tone="red"
        />
      </div>

      {/* 3. Department Table */}
      <TableShell
        title="Departments Directory"
        summary={`${filtered.length} organizational divisions`}
        toolbar={
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name, code or head..."
          />
        }
        footer={<span>Showing {filtered.length} entries</span>}
      >
        {filtered.length ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-white text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 pl-4 sm:pl-5 pr-2.5">CODE</th>
                <th className="py-2.5 px-2.5">DEPARTMENT NAME</th>
                <th className="py-2.5 px-2.5">HEAD OF DEPARTMENT</th>
                <th className="py-2.5 px-2.5">EMPLOYEES</th>
                <th className="py-2.5 px-2.5">CREATED ON</th>
                <th className="py-2.5 px-2.5">STATUS</th>
                <th className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map((dept) => (
                <tr key={dept._id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 pl-4 sm:pl-5 pr-2.5 font-semibold text-slate-800">
                    {dept.code || '—'}
                  </td>
                  <td className="py-2.5 px-2.5 font-bold text-slate-900">{dept.name}</td>
                  <td className="py-2.5 px-2.5 text-slate-600">{dept.headName || '—'}</td>
                  <td className="py-2.5 px-2.5 font-semibold text-slate-800">
                    {formatNumber(dept.employeeCount)}
                  </td>
                  <td className="py-2.5 px-2.5 text-slate-500">{formatDate(dept.createdAt)}</td>
                  <td className="py-2.5 px-2.5">
                    <button
                      type="button"
                      onClick={() => toggle(dept)}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <StatusBadge>{dept.isActive ? 'Active' : 'Inactive'}</StatusBadge>
                    </button>
                  </td>
                  <td className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        className="w-8 h-8 rounded-lg text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors cursor-pointer"
                        type="button"
                        onClick={() => openEdit(dept)}
                        title="Edit Department"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        className="w-8 h-8 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                        type="button"
                        onClick={() => remove(dept)}
                        title="Delete Department"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title="No departments found"
            message="No departments match your search criteria."
          />
        )}
      </TableShell>

      {/* Add / Edit Modal */}
      <Modal
        open={Boolean(selected)}
        title={selected === 'new' ? 'Add Department' : 'Edit Department'}
        subtitle={selected === 'new' ? 'Create a new organizational division' : form.name}
        onClose={() => setSelected(null)}
        footer={
          <>
            <ToolbarButton onClick={() => setSelected(null)}>Cancel</ToolbarButton>
            <ToolbarButton primary disabled={submitting} onClick={save}>
              {submitting ? 'Saving…' : 'Save Department'}
            </ToolbarButton>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Department Name <span className="text-rose-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Engineering, Sales, HR"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Department Code
            </label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="e.g. ENG, SLS, HR"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Department Head (Optional)
            </label>
            <input
              value={form.headName}
              onChange={(e) => setForm({ ...form, headName: e.target.value })}
              placeholder="e.g. John Doe"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Description (Optional)
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description of the department's role..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ManageDepartments;