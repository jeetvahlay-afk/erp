import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Coffee,
  Cpu,
  Paintbrush,
  Route,
  Shield,
  SlidersHorizontal,
  WalletCards,
  Wrench,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { asArray, getApiError } from '../lib/api';
import {
  ErrorState,
  LoadingState,
  MetricCard,
  PageHeader,
  StatusBadge,
} from '../components/ui/EnterpriseUI';

const options = [
  {
    type: 'appearance',
    name: 'Appearance & Theme',
    description: 'Profile-backed colors, typography, layout density, and system surfaces.',
    icon: Paintbrush,
    path: '/settings/appearance',
    personal: true,
  },
  {
    type: 'accounts',
    name: 'Accounts & Integrations',
    description: 'Payment, messaging, and external third-party service connections.',
    icon: Shield,
    path: '/accounts-config',
  },
  {
    type: 'breaks',
    name: 'Break Automation',
    description: 'Reusable break types, durations, and workforce break policy settings.',
    icon: Coffee,
    path: '/break-config',
  },
  {
    type: 'daily-breaks',
    name: 'Daily Break Schedule',
    description: 'Monitor daily employee breaks, durations, and live break records.',
    icon: Coffee,
    path: '/manage-breaks',
  },
  {
    type: 'shifts',
    name: 'Shift Management',
    description: 'Shift schedules, grace periods, rosters, and employee assignments.',
    icon: Wrench,
    path: '/manage-shift',
  },
  {
    type: 'routes',
    name: 'Route Configuration',
    description: 'Configure and assign sidebar navigation menu access for each employee.',
    icon: Route,
    path: '/manage-routes',
    personal: true,
  },
  {
    type: 'salary',
    name: 'Salary Configuration',
    description: 'Employee salary structure, base compensation, allowances, and deductions.',
    icon: WalletCards,
    path: '/salary-config',
    personal: true,
  },
];

const ConfigurationList = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [state, setState] = useState({ loading: true, error: '' });

  const load = async () => {
    setState({ loading: true, error: '' });
    try {
      const { data } = await api.get('/api/settings');
      setRecords(asArray(data));
      setState({ loading: false, error: '' });
    } catch (error) {
      setState({
        loading: false,
        error: getApiError(error, 'Unable to load system configurations'),
      });
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (state.loading) return <LoadingState label="Loading system configuration…" />;
  if (state.error) return <ErrorState message={state.error} retry={load} />;

  const configuredCount = options.filter((opt) => {
    const record = records.find((item) => item.type === opt.type);
    return opt.personal || Boolean(record && Object.keys(record.config || {}).length);
  }).length;

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Page Header */}
      <PageHeader
        title="Configuration List"
        breadcrumbs={['System & Config', 'Configuration List']}
      />

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
        <MetricCard
          label="Configured Services"
          value={`${configuredCount} / ${options.length}`}
          helper="Operational subsystems"
          icon={CheckCircle2}
          tone="green"
        />
        <MetricCard
          label="Pending Setup"
          value={options.length - configuredCount}
          helper="Requires administrator review"
          icon={SlidersHorizontal}
          tone={options.length - configuredCount > 0 ? 'amber' : 'green'}
        />
        <MetricCard
          label="System Architecture"
          value="TeamHub 3.0"
          helper="Enterprise cloud runtime"
          icon={Cpu}
          tone="blue"
        />
      </div>

      {/* 3. Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {options.map((option) => {
          const Icon = option.icon;
          const record = records.find((item) => item.type === option.type);
          const configured =
            option.personal || Boolean(record && Object.keys(record.config || {}).length);

          return (
            <div
              key={option.type}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:border-blue-300 transition-all hover:shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
                    <Icon size={22} />
                  </div>
                  <StatusBadge tone={configured ? 'success' : 'warning'}>
                    {configured ? 'Configured' : 'Needs Setup'}
                  </StatusBadge>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">{option.name}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{option.description}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">
                  {configured ? 'Active in workspace' : 'Pending initial setup'}
                </span>
                <button
                  type="button"
                  onClick={() => navigate(option.path)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer shadow-2xs"
                >
                  Manage
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConfigurationList;