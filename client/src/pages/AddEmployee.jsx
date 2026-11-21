import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  Briefcase,
  Eye,
  EyeOff,
  GraduationCap,
  ImagePlus,
  Plus,
  Trash2,
  Upload,
  User,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { asArray, getApiError } from '../lib/api';
import { feedback } from '../lib/feedback';
import { PageHeader, ToolbarButton } from '../components/ui/EnterpriseUI';

const tabs = [
  { id: 'basic', label: 'Basic Information', icon: User },
  { id: 'bank', label: 'Bank Information', icon: Banknote },
  { id: 'family', label: 'Family Information', icon: Users },
  { id: 'education', label: 'Education Details', icon: GraduationCap },
  { id: 'experience', label: 'Experience', icon: Briefcase },
];

const AddEmployee = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('basic');
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [allowedRoutes] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    employeeId: '',
    joiningDate: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    company: '',
    department: '',
    designation: '',
    role: 'user',
    employmentType: 'Full Time',
    shift: '',
    bio: '',
    bankInformation: {
      bankName: '',
      accountName: '',
      accountNumber: '',
      ifscCode: '',
      branchName: '',
    },
    familyInformation: [],
    education: [],
    experience: [],
  });

  useEffect(() => {
    Promise.all([
      api.get('/api/roles'),
      api.get('/api/departments'),
      api.get('/api/settings/shifts'),
    ])
      .then(([roleResponse, departmentResponse, shiftResponse]) => {
        setRoles(asArray(roleResponse.data));
        setDepartments(asArray(departmentResponse.data));
        setShifts(asArray(shiftResponse.data));
      })
      .catch(() => feedback.error('Some employee form options could not be loaded.'));
  }, []);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview]
  );

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const addFamilyMember = () => {
    setForm((current) => ({
      ...current,
      familyInformation: [
        ...current.familyInformation,
        { name: '', relationship: '', phone: '', dob: '' },
      ],
    }));
  };
  const updateFamilyMember = (index, key, value) => {
    setForm((current) => {
      const updated = [...current.familyInformation];
      updated[index] = { ...updated[index], [key]: value };
      return { ...current, familyInformation: updated };
    });
  };
  const removeFamilyMember = (index) => {
    setForm((current) => ({
      ...current,
      familyInformation: current.familyInformation.filter((_, i) => i !== index),
    }));
  };

  const addEducation = () => {
    setForm((current) => ({
      ...current,
      education: [
        ...current.education,
        {
          institution: '',
          degree: '',
          fieldOfStudy: '',
          startDate: '',
          endDate: '',
          grade: '',
        },
      ],
    }));
  };
  const updateEducation = (index, key, value) => {
    setForm((current) => {
      const updated = [...current.education];
      updated[index] = { ...updated[index], [key]: value };
      return { ...current, education: updated };
    });
  };
  const removeEducation = (index) => {
    setForm((current) => ({
      ...current,
      education: current.education.filter((_, i) => i !== index),
    }));
  };

  const addExperience = () => {
    setForm((current) => ({
      ...current,
      experience: [
        ...current.experience,
        { company: '', designation: '', startDate: '', endDate: '', description: '' },
      ],
    }));
  };
  const updateExperience = (index, key, value) => {
    setForm((current) => {
      const updated = [...current.experience];
      updated[index] = { ...updated[index], [key]: value };
      return { ...current, experience: updated };
    });
  };
  const removeExperience = (index) => {
    setForm((current) => ({
      ...current,
      experience: current.experience.filter((_, i) => i !== index),
    }));
  };

  const submit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.password) {
      feedback.error('First name, last name, email, and password are required.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      feedback.error('Password and confirm password do not match.');
      return;
    }
    if (form.password.length < 8) {
      feedback.error('Password must contain at least 8 characters.');
      return;
    }
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (
        key === 'bankInformation' ||
        key === 'familyInformation' ||
        key === 'education' ||
        key === 'experience'
      ) {
        payload.append(key, JSON.stringify(value));
      } else if (key !== 'confirmPassword' && value !== '') {
        payload.append(key, value);
      }
    });
    payload.append('allowedRoutes', JSON.stringify(allowedRoutes));
    if (image) payload.append('profileImage', image);
    setSubmitting(true);
    try {
      const { data } = await api.post('/api/auth/register', payload);
      const createdEmployee = data?.user || data;
      feedback.success('Employee created successfully.');
      navigate(
        createdEmployee?._id ? `/employee/${createdEmployee._id}` : '/manage-employee',
        { replace: true }
      );
    } catch (requestError) {
      feedback.error(getApiError(requestError, 'Unable to create employee'));
    } finally {
      setSubmitting(false);
    }
  };

  const chooseImage = (file) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      feedback.error('Profile image must be below 4 MB.');
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const inputClass =
    'w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 transition-colors';
  const labelClass = 'block text-xs font-semibold text-slate-700 mb-1.5';

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Header */}
      <PageHeader
        title="Add New Employee"
        breadcrumbs={['HR Management', 'Employee Directory', 'Add Employee']}
        actions={
          <>
            <ToolbarButton icon={ArrowLeft} onClick={() => navigate('/manage-employee')}>
              Back
            </ToolbarButton>
            <ToolbarButton primary disabled={submitting} onClick={submit}>
              {submitting ? 'Saving…' : 'Save Employee'}
            </ToolbarButton>
          </>
        }
      />

      {/* 2. Navigation Tabs */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-1.5 flex items-center justify-between gap-1 overflow-hidden no-scrollbar">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={isActive ? { backgroundColor: 'var(--erp-primary, #2563eb)' } : undefined}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2 sm:px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon size={14} />
              <span className="truncate">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 sm:p-7">
        {/* TAB 1: BASIC INFORMATION */}
        {tab === 'basic' && (
          <div className="space-y-8">
            {/* Profile Image Section */}
            <div>
              <div className="mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Profile Image</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Optional photo for employee card and badge.
                </p>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                  {preview ? (
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImagePlus size={24} className="text-slate-400" />
                  )}
                </div>
                <div>
                  <strong className="block text-xs font-bold text-slate-800">
                    Upload employee photo
                  </strong>
                  <span className="block text-[11px] text-slate-400 mt-0.5 mb-2">
                    JPEG, PNG, or WebP up to 4 MB
                  </span>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer shadow-2xs">
                    <Upload size={13} />
                    <span>Choose File</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      hidden
                      onChange={(e) => chooseImage(e.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div>
              <div className="mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Account Credentials</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Basic details and system sign-in password.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className={inputClass}
                    value={form.firstName}
                    onChange={(e) => setField('firstName', e.target.value)}
                    placeholder="e.g. Alex"
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className={inputClass}
                    value={form.lastName}
                    onChange={(e) => setField('lastName', e.target.value)}
                    placeholder="e.g. Morgan"
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    className={inputClass}
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                    placeholder="e.g. alex.morgan@company.com"
                  />
                </div>
                <div>
                  <label className={labelClass}>Username</label>
                  <input
                    className={inputClass}
                    value={form.username}
                    onChange={(e) => setField('username', e.target.value)}
                    placeholder="e.g. amorgan"
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className={`${inputClass} pr-10`}
                      value={form.password}
                      onChange={(e) => setField('password', e.target.value)}
                      placeholder="Min 8 characters with letters & numbers"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={`${inputClass} pr-10`}
                      value={form.confirmPassword}
                      onChange={(e) => setField('confirmPassword', e.target.value)}
                      placeholder="Re-type password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Phone Number</label>
                  <input
                    className={inputClass}
                    value={form.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                    placeholder="+1 555-0100"
                  />
                </div>
                <div>
                  <label className={labelClass}>Employee ID</label>
                  <input
                    className={inputClass}
                    value={form.employeeId}
                    onChange={(e) => setField('employeeId', e.target.value)}
                    placeholder="Leave blank for auto-generation"
                  />
                </div>
              </div>
            </div>

            {/* Employment Details */}
            <div>
              <div className="mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Employment Details</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Roster, department assignment, and organizational role.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Joining Date</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={form.joiningDate}
                    onChange={(e) => setField('joiningDate', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Role</label>
                  <select
                    className={inputClass}
                    value={form.role}
                    onChange={(e) => setField('role', e.target.value)}
                  >
                    {roles
                      .filter((r) => r.isActive !== false)
                      .map((r) => (
                        <option key={r._id} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Department</label>
                  <select
                    className={inputClass}
                    value={form.department}
                    onChange={(e) => setField('department', e.target.value)}
                  >
                    <option value="">Select department</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Designation</label>
                  <input
                    className={inputClass}
                    value={form.designation}
                    onChange={(e) => setField('designation', e.target.value)}
                    placeholder="e.g. Senior Software Engineer"
                  />
                </div>
                <div>
                  <label className={labelClass}>Employment Type</label>
                  <select
                    className={inputClass}
                    value={form.employmentType}
                    onChange={(e) => setField('employmentType', e.target.value)}
                  >
                    {['Full Time', 'Part Time', 'Contract', 'Probation', 'Intern'].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Shift Schedule</label>
                  <select
                    className={inputClass}
                    value={form.shift}
                    onChange={(e) => setField('shift', e.target.value)}
                  >
                    <option value="">No shift assigned</option>
                    {shifts.map((s) => (
                      <option key={s.id || s._id} value={s.id || s._id}>
                        {s.shiftName || s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Company Entity</label>
                  <input
                    className={inputClass}
                    value={form.company}
                    onChange={(e) => setField('company', e.target.value)}
                    placeholder="e.g. TeamHub Technologies"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>About Employee</label>
                  <textarea
                    rows={3}
                    className={inputClass}
                    value={form.bio}
                    onChange={(e) => setField('bio', e.target.value)}
                    placeholder="Brief background or notes..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BANK INFORMATION */}
        {tab === 'bank' && (
          <div className="space-y-6">
            <div className="pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Bank Account Details</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Official bank coordinates for payroll disbursements.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Bank Name</label>
                <input
                  className={inputClass}
                  value={form.bankInformation.bankName}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      bankInformation: {
                        ...form.bankInformation,
                        bankName: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g. Chase Bank, HDFC"
                />
              </div>
              <div>
                <label className={labelClass}>Account Holder Name</label>
                <input
                  className={inputClass}
                  value={form.bankInformation.accountName}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      bankInformation: {
                        ...form.bankInformation,
                        accountName: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g. Alex Morgan"
                />
              </div>
              <div>
                <label className={labelClass}>Account Number</label>
                <input
                  className={inputClass}
                  value={form.bankInformation.accountNumber}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      bankInformation: {
                        ...form.bankInformation,
                        accountNumber: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g. 123456789"
                />
              </div>
              <div>
                <label className={labelClass}>IFSC / Routing Code</label>
                <input
                  className={inputClass}
                  value={form.bankInformation.ifscCode}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      bankInformation: {
                        ...form.bankInformation,
                        ifscCode: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g. CHAS0123456"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Branch Name</label>
                <input
                  className={inputClass}
                  value={form.bankInformation.branchName}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      bankInformation: {
                        ...form.bankInformation,
                        branchName: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g. Downtown Branch"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FAMILY INFORMATION */}
        {tab === 'family' && (
          <div className="space-y-6">
            <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Family Members</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Emergency contacts and dependents records.
                </p>
              </div>
              <ToolbarButton primary icon={Plus} onClick={addFamilyMember}>
                Add Member
              </ToolbarButton>
            </div>

            {form.familyInformation.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-3">Name</th>
                      <th className="py-3 px-3">Relationship</th>
                      <th className="py-3 px-3">Phone</th>
                      <th className="py-3 px-3">Date of Birth</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {form.familyInformation.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={item.name || ''}
                            onChange={(e) => updateFamilyMember(index, 'name', e.target.value)}
                            placeholder="Full name"
                            className={inputClass}
                          />
                        </td>
                        <td className="py-3 px-3">
                          <select
                            value={item.relationship || ''}
                            onChange={(e) => updateFamilyMember(index, 'relationship', e.target.value)}
                            className={inputClass}
                          >
                            <option value="">Select</option>
                            <option value="Spouse">Spouse</option>
                            <option value="Child">Child</option>
                            <option value="Parent">Parent</option>
                            <option value="Sibling">Sibling</option>
                            <option value="Other">Other</option>
                          </select>
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={item.phone || ''}
                            onChange={(e) => updateFamilyMember(index, 'phone', e.target.value)}
                            placeholder="Phone"
                            className={inputClass}
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="date"
                            value={item.dob || ''}
                            onChange={(e) => updateFamilyMember(index, 'dob', e.target.value)}
                            className={inputClass}
                          />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeFamilyMember(index)}
                            className="p-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400">
                No family information recorded yet.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: EDUCATION DETAILS */}
        {tab === 'education' && (
          <div className="space-y-6">
            <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Education Details</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Academic qualifications and degrees.
                </p>
              </div>
              <ToolbarButton primary icon={Plus} onClick={addEducation}>
                Add Education
              </ToolbarButton>
            </div>

            {form.education.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-3">Institution</th>
                      <th className="py-3 px-3">Degree</th>
                      <th className="py-3 px-3">Field of Study</th>
                      <th className="py-3 px-3">Start Date</th>
                      <th className="py-3 px-3">End Date</th>
                      <th className="py-3 px-3">Grade</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {form.education.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={item.institution || ''}
                            onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                            placeholder="College / School"
                            className={inputClass}
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={item.degree || ''}
                            onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                            placeholder="e.g. B.Tech, MBA"
                            className={inputClass}
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={item.fieldOfStudy || ''}
                            onChange={(e) => updateEducation(index, 'fieldOfStudy', e.target.value)}
                            placeholder="Major"
                            className={inputClass}
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="date"
                            value={item.startDate || ''}
                            onChange={(e) => updateEducation(index, 'startDate', e.target.value)}
                            className={inputClass}
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="date"
                            value={item.endDate || ''}
                            onChange={(e) => updateEducation(index, 'endDate', e.target.value)}
                            className={inputClass}
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={item.grade || ''}
                            onChange={(e) => updateEducation(index, 'grade', e.target.value)}
                            placeholder="Grade / GPA"
                            className={inputClass}
                          />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeEducation(index)}
                            className="p-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400">
                No education history recorded yet.
              </div>
            )}
          </div>
        )}

        {/* TAB 5: WORK EXPERIENCE */}
        {tab === 'experience' && (
          <div className="space-y-6">
            <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Work Experience</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Prior employment history and job titles.
                </p>
              </div>
              <ToolbarButton primary icon={Plus} onClick={addExperience}>
                Add Experience
              </ToolbarButton>
            </div>

            {form.experience.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-3">Company</th>
                      <th className="py-3 px-3">Designation</th>
                      <th className="py-3 px-3">Start Date</th>
                      <th className="py-3 px-3">End Date</th>
                      <th className="py-3 px-3">Description</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {form.experience.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={item.company || ''}
                            onChange={(e) => updateExperience(index, 'company', e.target.value)}
                            placeholder="Company name"
                            className={inputClass}
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={item.designation || ''}
                            onChange={(e) => updateExperience(index, 'designation', e.target.value)}
                            placeholder="Role / Title"
                            className={inputClass}
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="date"
                            value={item.startDate || ''}
                            onChange={(e) => updateExperience(index, 'startDate', e.target.value)}
                            className={inputClass}
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="date"
                            value={item.endDate || ''}
                            onChange={(e) => updateExperience(index, 'endDate', e.target.value)}
                            className={inputClass}
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={item.description || ''}
                            onChange={(e) => updateExperience(index, 'description', e.target.value)}
                            placeholder="Responsibilities"
                            className={inputClass}
                          />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeExperience(index)}
                            className="p-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400">
                No work experience recorded yet.
              </div>
            )}
          </div>
        )}

        {/* Bottom Save / Back buttons */}
        <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between">
          <ToolbarButton icon={ArrowLeft} onClick={() => navigate('/manage-employee')}>
            Cancel & Return
          </ToolbarButton>
          <ToolbarButton
            primary
            disabled={submitting}
            onClick={submit}
          >
            {submitting ? 'Saving…' : 'Save Employee'}
          </ToolbarButton>
        </div>
      </div>
    </div>
  );
};

export default AddEmployee;
