import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CreditCard,
  Droplet,
  Edit3,
  ImagePlus,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Palette,
  Phone,
  Send,
  Shield,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { asArray, getApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { feedback } from '../lib/feedback';
import {
  Avatar,
  EmptyState,
  ErrorState,
  formatDate,
  LoadingState,
  Modal,
  PageHeader,
  StatusBadge,
  ToolbarButton,
} from '../components/ui/EnterpriseUI';

const fields = [
  { name: 'firstName', label: 'First Name', icon: User },
  { name: 'lastName', label: 'Last Name', icon: User },
  {
    name: 'dob',
    label: 'Date of Birth',
    icon: Calendar,
    format: (value) => formatDate(value),
  },
  { name: 'bloodGroup', label: 'Blood Group', icon: Droplet },
  { name: 'email', label: 'Email Address', icon: Mail },
  { name: 'phone', label: 'Primary Phone', icon: Phone },
  { name: 'currentAddress', label: 'Current Address', icon: MapPin },
  { name: 'permanentAddress', label: 'Permanent Address', icon: MapPin },
  { name: 'emergencyName', label: 'Emergency Contact', icon: Shield },
  { name: 'emergencyPhone', label: 'Emergency Phone', icon: Phone },
];

const UserProfile = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [state, setState] = useState({ loading: true, error: '' });
  const [changeField, setChangeField] = useState(null);
  const [newValue, setNewValue] = useState('');
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setState({ loading: true, error: '' });
    try {
      const [profileResponse, requestResponse] = await Promise.all([
        api.get('/api/users/profile'),
        api.get('/api/profile-requests/my'),
      ]);
      setProfile(profileResponse.data);
      setRequests(asArray(requestResponse.data));
      setState({ loading: false, error: '' });
    } catch (error) {
      setState({
        loading: false,
        error: getApiError(error, 'Unable to load your profile'),
      });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pendingByField = useMemo(
    () =>
      new Map(
        requests
          .filter((request) => request.status === 'pending')
          .map((request) => [request.field, request])
      ),
    [requests]
  );

  const openChange = (field) => {
    setChangeField(field);
    setNewValue(profile?.[field.name] || '');
  };

  const submitChange = async () => {
    if (!String(newValue).trim()) {
      feedback.error('Please enter the requested value.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/profile-requests', {
        field: changeField.name,
        newValue,
        oldValue: profile?.[changeField.name] || '',
      });
      feedback.success('Profile change request submitted.');
      setChangeField(null);
      load();
    } catch (error) {
      feedback.error(getApiError(error, 'Unable to submit request'));
    } finally {
      setSubmitting(false);
    }
  };

  const changePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      feedback.error('New passwords do not match.');
      return;
    }
    if (
      passwords.newPassword.length < 8 ||
      !/[A-Za-z]/.test(passwords.newPassword) ||
      !/\d/.test(passwords.newPassword)
    ) {
      feedback.error('Use at least 8 characters with a letter and a number.');
      return;
    }
    setSubmitting(true);
    try {
      await api.put('/api/users/profile', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      feedback.success('Password updated. Sign in again.');
      await logout(false);
      navigate('/login', { replace: true });
    } catch (error) {
      feedback.error(getApiError(error, 'Unable to update password'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    const accepted = await feedback.confirm('End your current ERP session?', {
      title: 'Sign out',
      confirmLabel: 'Sign out',
      tone: 'danger',
    });
    if (!accepted) return;
    await logout(false);
    navigate('/login', { replace: true });
  };

  const uploadAvatar = async (file) => {
    if (!file) return;
    const payload = new FormData();
    payload.append('profileImage', file);
    try {
      await api.post('/api/users/profile/avatar', payload);
      feedback.success('Profile photo updated.');
      load();
    } catch (error) {
      feedback.error(getApiError(error, 'Unable to upload profile photo'));
    }
  };

  if (state.loading) return <LoadingState label="Loading your profile…" />;
  if (state.error) return <ErrorState message={state.error} retry={load} />;

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Header */}
      <PageHeader
        title="My Profile"
        breadcrumbs={['Account', 'My Profile']}
        actions={
          <div className="flex items-center gap-2">
            <ToolbarButton
              icon={LockKeyhole}
              onClick={() => {
                setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setPasswordOpen(true);
              }}
            >
              Change Password
            </ToolbarButton>
            <ToolbarButton
              icon={Palette}
              onClick={() => navigate('/settings/appearance')}
            >
              Appearance & Theme
            </ToolbarButton>
            <ToolbarButton
              icon={LogOut}
              danger
              onClick={handleLogout}
            >
              Sign Out
            </ToolbarButton>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-4.5 items-start">
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {/* Theme-bound gradient banner */}
          <div
            className="h-20 relative"
            style={{
              background:
                'linear-gradient(135deg, var(--erp-primary, #2563eb) 0%, color-mix(in srgb, var(--erp-primary, #2563eb) 75%, black) 100%)',
            }}
          />

          {/* Avatar & Main Info */}
          <div className="px-4 sm:px-5 pb-5 pt-0 relative flex flex-col items-center text-center -mt-10">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full ring-4 ring-white shadow-md overflow-hidden bg-slate-900 text-white flex items-center justify-center">
                <Avatar user={profile} size="xl" />
              </div>
              <label
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow-sm cursor-pointer transition-colors"
                title="Change Photo"
              >
                <ImagePlus size={14} />
                <input
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => uploadAvatar(e.target.files?.[0])}
                />
              </label>
            </div>

            <h2 className="text-lg font-bold text-slate-900 mt-3">{profile?.name}</h2>
            <p className="text-xs text-slate-500 font-medium capitalize">
              {profile?.designation || profile?.role || 'Team Member'}
            </p>

            <div className="mt-2.5">
              <StatusBadge tone={profile?.isActive === false ? 'danger' : 'success'}>
                {profile?.isActive === false ? 'Inactive' : 'Active Account'}
              </StatusBadge>
            </div>

            {/* Quick Specs */}
            <div className="w-full mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4 text-left">
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Employee ID
                </span>
                <strong className="text-xs font-semibold text-slate-800">
                  {profile?.employeeId || '—'}
                </strong>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Department
                </span>
                <strong className="text-xs font-semibold text-slate-800">
                  {profile?.department || 'Unassigned'}
                </strong>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Joined Date
                </span>
                <strong className="text-xs font-semibold text-slate-800">
                  {formatDate(profile?.joiningDate || profile?.createdAt)}
                </strong>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Employment
                </span>
                <strong className="text-xs font-semibold text-slate-800">
                  {profile?.employmentType || 'Full Time'}
                </strong>
              </div>
            </div>

            {/* Direct Appearance & Sign Out Actions */}
            <div className="w-full mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <button
                type="button"
                onClick={() => navigate('/settings/appearance')}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/60 transition cursor-pointer shadow-2xs"
              >
                <Palette size={15} />
                <span>Customize Appearance</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50/80 text-rose-600 text-xs font-semibold hover:bg-rose-100 transition cursor-pointer shadow-2xs"
              >
                <LogOut size={15} />
                <span>Sign Out of Account</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Info Sections */}
        <div className="lg:col-span-8 space-y-4">
          {/* Personal & Contact Information */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Personal & Contact Information
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click the edit icon to submit changes that require HR approval.
                </p>
              </div>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map((field) => {
                const Icon = field.icon;
                const pending = pendingByField.get(field.name);
                const raw = profile?.[field.name];
                const displayValue = raw
                  ? field.format
                    ? field.format(raw)
                    : String(raw)
                  : 'Not provided';

                return (
                  <div
                    key={field.name}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Icon size={15} />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {field.label}
                        </span>
                        <strong
                          className="block text-xs font-semibold text-slate-800 truncate"
                          title={displayValue}
                        >
                          {displayValue}
                        </strong>
                      </div>
                    </div>

                    <div>
                      {pending ? (
                        <StatusBadge tone="warning">Pending</StatusBadge>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openChange(field)}
                          className="p-1.5 rounded-lg border border-slate-200/80 text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-colors cursor-pointer"
                          title={`Request change to ${field.label}`}
                        >
                          <Edit3 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bank Information */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <CreditCard size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Bank Information</h3>
                <p className="text-xs text-slate-500">
                  Registered bank account for salary disbursal.
                </p>
              </div>
            </div>

            <div className="p-5">
              {profile?.bankInformation &&
              (profile.bankInformation.bankName || profile.bankInformation.accountNumber) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-3 rounded-xl bg-slate-50/60 border border-slate-100">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Bank Name
                    </span>
                    <strong className="text-xs font-semibold text-slate-800">
                      {profile.bankInformation.bankName || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50/60 border border-slate-100">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Account Holder
                    </span>
                    <strong className="text-xs font-semibold text-slate-800">
                      {profile.bankInformation.accountName || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50/60 border border-slate-100">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Account Number
                    </span>
                    <strong className="text-xs font-semibold text-slate-800">
                      {profile.bankInformation.accountNumber || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50/60 border border-slate-100">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      IFSC / Routing Code
                    </span>
                    <strong className="text-xs font-semibold text-slate-800">
                      {profile.bankInformation.ifscCode || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50/60 border border-slate-100">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Branch
                    </span>
                    <strong className="text-xs font-semibold text-slate-800">
                      {profile.bankInformation.branchName || '—'}
                    </strong>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-medium">
                  No bank information has been recorded yet.
                </p>
              )}
            </div>
          </div>

          {/* Profile Request History */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Profile Change Requests</h3>
              <p className="text-xs text-slate-500">
                Track HR approvals and statuses of your requested modifications.
              </p>
            </div>

            <div className="p-5">
              {requests.length ? (
                <div className="space-y-3">
                  {requests.map((request) => (
                    <div
                      key={request._id}
                      className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/40 flex items-center justify-between gap-3"
                    >
                      <div>
                        <strong className="text-xs font-bold text-slate-900 block capitalize">
                          {String(request.field || '').replace(/([A-Z])/g, ' $1')}
                        </strong>
                        <span className="text-[11px] text-slate-500">
                          {String(request.oldValue || '—')} → {String(request.newValue || '—')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge>{request.status}</StatusBadge>
                        <span className="text-[11px] text-slate-400">
                          {formatDate(request.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No profile change requests"
                  message="Requested field modifications will appear here."
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Change Field Request Modal */}
      <Modal
        open={Boolean(changeField)}
        title="Request Profile Change"
        subtitle={changeField?.label}
        onClose={() => setChangeField(null)}
        size="sm"
        footer={
          <>
            <ToolbarButton onClick={() => setChangeField(null)}>Cancel</ToolbarButton>
            <ToolbarButton
              primary
              icon={Send}
              disabled={submitting}
              onClick={submitChange}
            >
              {submitting ? 'Submitting…' : 'Submit Request'}
            </ToolbarButton>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700">
            Proposed New {changeField?.label}
          </label>
          <input
            type={changeField?.name === 'dob' ? 'date' : 'text'}
            value={newValue}
            onChange={(event) => setNewValue(event.target.value)}
            autoFocus
            className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
          />
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        open={passwordOpen}
        title="Change Password"
        subtitle="Updating your password will require signing in again."
        onClose={() => setPasswordOpen(false)}
        size="sm"
        footer={
          <>
            <ToolbarButton onClick={() => setPasswordOpen(false)}>Cancel</ToolbarButton>
            <ToolbarButton
              primary
              icon={LockKeyhole}
              disabled={submitting}
              onClick={changePassword}
            >
              {submitting ? 'Updating…' : 'Update Password'}
            </ToolbarButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Current Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
              value={passwords.currentPassword}
              onChange={(e) =>
                setPasswords((current) => ({ ...current, currentPassword: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              New Password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
              value={passwords.newPassword}
              onChange={(e) =>
                setPasswords((current) => ({ ...current, newPassword: e.target.value }))
              }
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Minimum 8 characters with letters and numbers.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
              value={passwords.confirmPassword}
              onChange={(e) =>
                setPasswords((current) => ({ ...current, confirmPassword: e.target.value }))
              }
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserProfile;
