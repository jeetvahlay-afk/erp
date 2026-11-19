import { useEffect, useState } from 'react';
import { Edit2, Mail, Send, Server } from 'lucide-react';
import api, { asArray, getApiError } from '../lib/api';
import { feedback } from '../lib/feedback';
import {
  Avatar,
  ErrorState,
  LoadingState,
  Modal,
  PageHeader,
  StatusBadge,
  TableShell,
  ToolbarButton,
} from '../components/ui/EnterpriseUI';

const providerSettings = {
  hostinger: { smtpHost: 'smtp.hostinger.com', smtpPort: '465', smtpSecure: true },
  google: { smtpHost: 'smtp.gmail.com', smtpPort: '465', smtpSecure: true },
  custom: { smtpHost: '', smtpPort: '587', smtpSecure: false },
};

const MailConfig = () => {
  const [employees, setEmployees] = useState([]);
  const [editing, setEditing] = useState(null);
  const [state, setState] = useState({ loading: true, error: '', saving: false, testing: '' });

  const load = async () => {
    try {
      const { data } = await api.get('/api/mailbox/config/employees');
      setEmployees(asArray(data));
      setState((current) => ({ ...current, loading: false, error: '' }));
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: getApiError(error, 'Unable to load employee email accounts'),
      }));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    const config = editing.mailConfig;
    if (
      !config.smtpHost?.trim() ||
      !config.smtpPort ||
      !config.smtpUser?.trim() ||
      !config.smtpPassword
    ) {
      return feedback.error('SMTP host, port, email, and password are required.');
    }
    setState((current) => ({ ...current, saving: true }));
    try {
      const { data } = await api.put(`/api/mailbox/config/${editing._id}`, config);
      setEmployees((items) =>
        items.map((item) => (item._id === editing._id ? { ...item, mailConfig: data } : item))
      );
      setEditing(null);
      feedback.success('Employee SMTP account saved successfully.');
    } catch (error) {
      feedback.error(getApiError(error, 'Unable to save SMTP account'));
    } finally {
      setState((current) => ({ ...current, saving: false }));
    }
  };

  const test = async (employee) => {
    setState((current) => ({ ...current, testing: employee._id }));
    try {
      const { data } = await api.post(`/api/mailbox/config/${employee._id}/test`);
      feedback.success(data.message || 'SMTP connection test succeeded.');
    } catch (error) {
      feedback.error(getApiError(error, 'SMTP connection test failed'));
    } finally {
      setState((current) => ({ ...current, testing: '' }));
    }
  };

  if (state.loading) return <LoadingState label="Loading employee email accounts…" />;
  if (state.error) return <ErrorState message={state.error} retry={load} />;

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      <PageHeader
        title="Employee SMTP Configuration"
        breadcrumbs={['Configuration', 'Mail Configuration']}
      />

      {/* Info Callout Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Mail size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Per-Employee Email Sending</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Every staff member can use their own custom SMTP email account for outbound notifications and system tasks.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Server size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Supported Mail Providers</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Fast presets for Google Workspace / Gmail App Passwords, Hostinger Webmail, and custom SMTP servers.
            </p>
          </div>
        </div>
      </div>

      {/* Table Shell */}
      <TableShell
        title="Employee SMTP Accounts"
        summary="Each employee has separate SMTP credentials. Passwords remain encrypted at rest."
      >
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200/80 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Email Account</th>
                <th className="py-3 px-4">Provider</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Connection Test</th>
                <th className="py-3 px-4 text-right">Configure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((employee) => {
                const configured = Boolean(
                  employee.mailConfig?.smtpHost &&
                  employee.mailConfig?.smtpUser &&
                  employee.mailConfig?.smtpPassword
                );
                return (
                  <tr key={employee._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar user={employee} size="xs" />
                        <div>
                          <strong className="block text-slate-900 font-semibold">{employee.name}</strong>
                          <span className="text-[11px] text-slate-400">
                            {employee.employeeId || employee.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {employee.mailConfig?.smtpUser || <span className="text-slate-400">Not configured</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-600 capitalize">
                      {configured ? employee.mailConfig.smtpProvider || 'custom' : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge tone={configured ? 'success' : 'warning'}>
                        {configured ? 'Configured' : 'Needs Setup'}
                      </StatusBadge>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        disabled={!configured || state.testing === employee._id}
                        onClick={() => test(employee)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Send size={12} />
                        {state.testing === employee._id ? 'Testing…' : 'Send Test'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setEditing({
                            ...employee,
                            mailConfig: {
                              smtpProvider: 'hostinger',
                              ...providerSettings.hostinger,
                              ...employee.mailConfig,
                            },
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all cursor-pointer"
                      >
                        <Edit2 size={12} />
                        {configured ? 'Edit SMTP' : 'Configure'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </TableShell>

      {/* Edit Modal */}
      {editing && (
        <Modal
          open={Boolean(editing)}
          title="Configure Employee SMTP"
          subtitle={editing?.name || ''}
          onClose={() => setEditing(null)}
          size="sm"
          footer={
            <>
              <ToolbarButton onClick={() => setEditing(null)}>Cancel</ToolbarButton>
              <ToolbarButton primary icon={Mail} disabled={state.saving} onClick={save}>
                {state.saving ? 'Saving…' : 'Save SMTP Account'}
              </ToolbarButton>
            </>
          }
        >
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Email Provider</label>
              <select
                value={editing?.mailConfig?.smtpProvider || 'hostinger'}
                onChange={(event) =>
                  setEditing({
                    ...editing,
                    mailConfig: {
                      ...editing.mailConfig,
                      smtpProvider: event.target.value,
                      ...providerSettings[event.target.value],
                    },
                  })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="hostinger">Hostinger Webmail</option>
                <option value="google">Google / Gmail (App Password)</option>
                <option value="custom">Custom SMTP Server</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Email / SMTP Username *</label>
              <input
                type="email"
                value={editing?.mailConfig?.smtpUser || ''}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    mailConfig: { ...editing.mailConfig, smtpUser: e.target.value },
                  })
                }
                placeholder="employee@yourcompany.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Password / App Password *</label>
              <input
                type="password"
                value={editing?.mailConfig?.smtpPassword || ''}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    mailConfig: { ...editing.mailConfig, smtpPassword: e.target.value },
                  })
                }
                placeholder="Enter email account password"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
              />
              <p className="text-[11px] text-slate-400">
                For Google, generate a 16-character App Password. Masked values keep existing secrets.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">SMTP Host *</label>
                <input
                  value={editing?.mailConfig?.smtpHost || ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      mailConfig: { ...editing.mailConfig, smtpHost: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">SMTP Port *</label>
                <input
                  type="number"
                  value={editing?.mailConfig?.smtpPort || ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      mailConfig: { ...editing.mailConfig, smtpPort: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 pt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(editing?.mailConfig?.smtpSecure)}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    mailConfig: { ...editing.mailConfig, smtpSecure: e.target.checked },
                  })
                }
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500/20"
              />
              <div>
                <span className="text-xs font-semibold text-slate-700">Use SSL / TLS</span>
                <p className="text-[11px] text-slate-400">Enabled for port 465; disabled for STARTTLS 587.</p>
              </div>
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MailConfig;
