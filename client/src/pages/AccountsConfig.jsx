import { useEffect, useState } from 'react';
import { CreditCard, Globe, KeyRound, Lock, Save, Shield, Smartphone } from 'lucide-react';
import api, { getApiError } from '../lib/api';
import { feedback } from '../lib/feedback';
import { ErrorState, LoadingState, PageHeader, ToolbarButton } from '../components/ui/EnterpriseUI';

const initialForm = { paymentGatewayId: '', paymentGatewaySecret: '', smsApiKey: '', thirdPartyApiUrl: '' };

const AccountsConfig = () => {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/settings/accounts');
      setForm({ ...initialForm, ...(data || {}) });
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to load accounts configuration'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/settings/accounts', form);
      feedback.success('Accounts configuration saved successfully.');
    } catch (requestError) {
      feedback.error(getApiError(requestError, 'Unable to save configuration'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Loading account integrations…" />;
  if (error) return <ErrorState message={error} retry={load} />;

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      <PageHeader
        title="Accounts & Integrations"
        breadcrumbs={['Configuration', 'Accounts & Integrations']}
        actions={
          <ToolbarButton primary icon={Save} disabled={saving} onClick={submit}>
            {saving ? 'Saving…' : 'Save Configuration'}
          </ToolbarButton>
        }
      />

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Integration Credentials</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Sensitive values are encrypted at rest and masked when retrieved.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <Lock size={12} />
            Encrypted Storage
          </span>
        </div>

        <form onSubmit={submit} className="p-5 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <CreditCard size={14} className="text-slate-400" /> Payment Gateway ID
              </label>
              <input
                name="paymentGatewayId"
                value={form.paymentGatewayId}
                onChange={(e) => setForm({ ...form, paymentGatewayId: e.target.value })}
                placeholder="Enter payment gateway key ID"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <KeyRound size={14} className="text-slate-400" /> Payment Gateway Secret
              </label>
              <input
                type="password"
                name="paymentGatewaySecret"
                value={form.paymentGatewaySecret}
                onChange={(e) => setForm({ ...form, paymentGatewaySecret: e.target.value })}
                placeholder="Enter new secret (or leave blank to keep unchanged)"
                autoComplete="new-password"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <Smartphone size={14} className="text-slate-400" /> SMS Provider API Key
              </label>
              <input
                type="password"
                name="smsApiKey"
                value={form.smsApiKey}
                onChange={(e) => setForm({ ...form, smsApiKey: e.target.value })}
                placeholder="Enter SMS API token / key"
                autoComplete="new-password"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <Globe size={14} className="text-slate-400" /> Third-Party API Base URL
              </label>
              <input
                type="url"
                name="thirdPartyApiUrl"
                value={form.thirdPartyApiUrl}
                onChange={(e) => setForm({ ...form, thirdPartyApiUrl: e.target.value })}
                placeholder="Enter third-party API base URL"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={load}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Reset to Stored
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save size={14} />
              {saving ? 'Saving Changes…' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountsConfig;
