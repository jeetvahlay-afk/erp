import { useEffect, useState } from 'react';
import { Mail, Save, Settings2 } from 'lucide-react';
import api, { getApiError } from '../lib/api';
import { feedback } from '../lib/feedback';
import { ErrorState, LoadingState, PageHeader, ToolbarButton } from '../components/ui/EnterpriseUI';

const MailSettings = () => {
  const [state, setState] = useState({
    loading: true,
    error: '',
    data: { displayName: '', signature: '', accountId: '', isEnabled: true },
  });

  const load = async () => {
    try {
      const { data } = await api.get('/api/mailbox/config');
      setState({ loading: false, error: '', data });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: getApiError(error, 'Unable to load mail settings'),
      }));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    try {
      const { data } = await api.put('/api/mailbox/config', {
        displayName: state.data.displayName,
        signature: state.data.signature,
      });
      setState((current) => ({ ...current, data }));
      feedback.success('Mail settings saved successfully.');
    } catch (error) {
      feedback.error(getApiError(error, 'Unable to save mail settings'));
    }
  };

  if (state.loading) return <LoadingState label="Loading mail settings…" />;
  if (state.error) return <ErrorState message={state.error} retry={load} />;

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      <PageHeader
        title="Mail Settings"
        breadcrumbs={['Mail', 'Mail Settings']}
        icon={Settings2}
        actions={
          <ToolbarButton primary icon={Save} onClick={save}>
            Save Settings
          </ToolbarButton>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden max-w-3xl">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Mail size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Personal Mailbox Profile</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure your outgoing signature and sender display name.
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              state.data.isEnabled
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                : 'bg-rose-50 text-rose-700 border border-rose-200/60'
            }`}
          >
            {state.data.isEnabled ? 'Mailbox Active' : 'Mailbox Disabled'}
          </span>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Assigned Account</label>
            <input
              value={state.data.accountId || 'Assigned automatically'}
              disabled
              className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed"
            />
            <p className="text-[11px] text-slate-400">This account address is managed by ERP administration.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Sender Display Name</label>
            <input
              value={state.data.displayName || ''}
              onChange={(e) =>
                setState((current) => ({
                  ...current,
                  data: { ...current.data, displayName: e.target.value },
                }))
              }
              placeholder="e.g. John Doe | TeamHub HR"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Email Signature</label>
            <textarea
              rows={6}
              value={state.data.signature || ''}
              onChange={(e) =>
                setState((current) => ({
                  ...current,
                  data: { ...current.data, signature: e.target.value },
                }))
              }
              placeholder="Enter your professional sign-off and contact details..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <ToolbarButton primary icon={Save} onClick={save}>
              Save Settings
            </ToolbarButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MailSettings;
