import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../api/client';
import { Eye, EyeOff, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { AssessmentPortalHeader, AssessmentWatermark } from './AssessmentPortalHeader';

// Roles and departments derived dynamically from assessmentQuestions.json
const DEFAULT_DEPARTMENTS = [
  'Business Development & Support',
  'Technology',
  'Marketing & Creative',
  'Analytics & Data',
  'IT Sales',
];

const DEFAULT_POSITIONS = [
  { value: 'digital_marketing', label: 'Digital Marketing Executive', department: 'Marketing & Creative' },
  { value: 'content_creator', label: 'Content Creator', department: 'Marketing & Creative' },
  { value: 'video_editor', label: 'Video Editor', department: 'Marketing & Creative' },
  { value: 'graphic_designer', label: 'Graphic Designer', department: 'Marketing & Creative' },
  { value: 'data_analyst', label: 'Data Analyst', department: 'Analytics & Data' },
  { value: 'business_development_associate', label: 'Business Development Associate', department: 'Business Development & Support' },
  { value: 'customer_support_associate', label: 'Customer Support Associate', department: 'Business Development & Support' },
  { value: 'it_sales_executive', label: 'IT Sales Executive', department: 'IT Sales' },
  { value: 'frontend_developer', label: 'Frontend Developer', department: 'Technology' },
  { value: 'fullstack_developer', label: 'Fullstack Developer', department: 'Technology' },
  { value: 'backend_developer', label: 'Backend Developer', department: 'Technology' },
];

const AssessmentRegister = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    driveLocation: 'Ahmedabad',
    department: '',
    positionAppliedFor: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    mobileNumber: '',
    religion: '',
    currentLocation: '',
    candidateType: 'Fresher',
    course: '',
    college: '',
    totalExperience: '',
  });

  const [positions, setPositions] = useState(DEFAULT_POSITIONS);
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);
  const [departmentDetails, setDepartmentDetails] = useState([]);
  const [locations, setLocations] = useState(['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Remote', 'Mumbai', 'Pune', 'Bangalore']);
  const [cvFile, setCvFile] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [matchedDailyCandidate, setMatchedDailyCandidate] = useState(null);
  const [verifyingDaily, setVerifyingDaily] = useState(false);
  const [lookupMessage, setLookupMessage] = useState('');

  // Auto-verify and pull existing profile from Daily Candidate Update by Email + Mobile Number
  const checkDailyCandidate = async (overrideEmail, overridePhone) => {
    const email = (overrideEmail !== undefined ? overrideEmail : formData.email || '').trim().toLowerCase();
    const phone = (overridePhone !== undefined ? overridePhone : formData.mobileNumber || '').trim();
    const cleanDigits = phone.replace(/\D/g, '');

    if (!email || !email.includes('@') || cleanDigits.length < 10) {
      return;
    }

    try {
      setVerifyingDaily(true);
      setLookupMessage('');
      const res = await axios.post('/api/assessment/lookup-daily-candidate', {
        email,
        mobileNumber: phone,
      });

      if (res.data?.found && res.data?.candidate) {
        const dc = res.data.candidate;
        setMatchedDailyCandidate(dc);
        setLookupMessage(`Matched existing Daily Candidate: ${dc.fullName}`);
        setFormData((prev) => ({
          ...prev,
          fullName: prev.fullName || dc.fullName || '',
          driveLocation: dc.driveLocation || prev.driveLocation || 'Ahmedabad',
          department: dc.department || prev.department || '',
          positionAppliedFor: dc.positionAppliedFor || prev.positionAppliedFor || '',
          candidateType: dc.candidateType || prev.candidateType || 'Fresher',
          course: dc.course || prev.course || '',
          college: dc.college || prev.college || '',
          totalExperience: dc.totalExperience || prev.totalExperience || '',
          religion: dc.religion || prev.religion || '',
          currentLocation: dc.currentLocation || prev.currentLocation || '',
        }));
      } else {
        setMatchedDailyCandidate(null);
        if (res.data?.message) {
          setLookupMessage(res.data.message);
        }
      }
    } catch (err) {
      console.warn('Daily candidate lookup check failed:', err?.message);
    } finally {
      setVerifyingDaily(false);
    }
  };

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await axios.get('/api/assessment/metadata');
        const raw = res.data?.data;
        const data = (raw && raw.positions) ? raw : (raw?.data || raw);
        if (data?.positions && Array.isArray(data.positions) && data.positions.length > 0) {
          setPositions(data.positions);
        }
        if (data?.departments && Array.isArray(data.departments) && data.departments.length > 0) {
          setDepartments(data.departments.filter((d) => d !== 'All Departments'));
        }
        if (data?.departmentDetails && Array.isArray(data.departmentDetails)) {
          setDepartmentDetails(data.departmentDetails.filter((d) => d.name !== 'All Departments'));
        }
        if (data?.driveLocations && Array.isArray(data.driveLocations)) {
          setLocations(data.driveLocations);
        }
      } catch (err) {
        console.warn('Metadata fetch fallback to bundled JSON structure:', err.message);
      }
    };
    fetchMetadata();
  }, []);

  // Filter positions dynamically based on selected department from assessmentQuestions.json
  const filteredPositions = useMemo(() => {
    if (!formData.department) {
      return [];
    }
    const deptInfo = departmentDetails.find((d) => d.name === formData.department);
    if (deptInfo && Array.isArray(deptInfo.positions) && deptInfo.positions.length > 0) {
      return deptInfo.positions;
    }
    return positions.filter((p) => p.department === formData.department);
  }, [formData.department, positions, departmentDetails]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'department') {
      setFormData((prev) => ({
        ...prev,
        department: value,
        positionAppliedFor: '', // Reset position when department changes
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    if (error) setError('');
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setCvFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.department) {
      return setError('Please select a department.');
    }
    if (!formData.positionAppliedFor) {
      return setError('Please select the position applied for.');
    }
    if (!formData.fullName.trim()) {
      return setError('Full name is required.');
    }
    if (!formData.email.trim()) {
      return setError('Gmail address is required.');
    }
    if (!formData.password) {
      return setError('Password is required.');
    }
    if (formData.password.length < 10) {
      return setError('Password must be at least 10 characters long.');
    }
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match.');
    }
    if (!formData.mobileNumber.trim()) {
      return setError('Mobile number is required.');
    }

    try {
      setLoading(true);
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        data.append(key, formData[key] || '');
      });
      if (cvFile) {
        data.append('cv', cvFile);
      }

      const res = await axios.post('/api/assessment/register', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const candidate = res.data?.data?.data || res.data?.data;
      const targetEmail = candidate?.email || formData.email.trim().toLowerCase();
      const targetCode = candidate?.candidateCode || '';

      sessionStorage.setItem('assessment_candidate_code', targetCode);
      sessionStorage.setItem('assessment_candidate_email', targetEmail);
      sessionStorage.setItem('assessment_drive_location', formData.driveLocation);

      navigate('/assessment/verify', {
        state: {
          candidateCode: targetCode,
          fullName: candidate?.fullName || formData.fullName,
          email: targetEmail,
          positionAppliedFor: candidate?.positionAppliedFor,
          driveLocation: formData.driveLocation,
          devOtp: candidate?.devOtp,
        },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#fafafa] flex flex-col font-sans text-gray-800">
      <AssessmentWatermark />

      {/* TOP HEADER */}
      <AssessmentPortalHeader location={`${formData.driveLocation} candidate portal`} />

      {/* MAIN CONTAINER */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xs border border-slate-200/90 border-t-4 border-t-blue-600 p-6 sm:p-10">
          
          {/* Card Header */}
          <div className="mb-8">
            <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1.5">
              {formData.driveLocation.toUpperCase()} · RECRUITMENT DRIVE
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Candidate registration
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
              Enter your details below to register for the candidate assessment portal.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center space-x-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {matchedDailyCandidate && (
            <div className="mb-6 p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 flex items-start space-x-3 text-xs sm:text-sm">
              <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold flex items-center space-x-1.5">
                  <span>Candidate verified from Daily Candidate Update</span>
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Matched & Linked</span>
                </div>
                <p className="text-blue-700 text-xs mt-1 leading-relaxed">
                  Welcome back, <strong>{matchedDailyCandidate.fullName}</strong>! We have verified your Mobile Number &amp; Email and loaded your profile details ({matchedDailyCandidate.department || 'Technology'} · {matchedDailyCandidate.driveLocation || 'Ahmedabad'}). Please enter your password below to begin your assessment desk session.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              
              {/* ROW 1 */}
              {/* Col 1: Drive location */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Drive location
                </label>
                <select
                  name="driveLocation"
                  value={formData.driveLocation}
                  onChange={handleChange}
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer"
                >
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Col 2: Department */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Department
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer"
                >
                  <option value="">Select department</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* ROW 2 */}
              {/* Col 1: Position applied for */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Position applied for
                </label>
                <select
                  name="positionAppliedFor"
                  value={formData.positionAppliedFor}
                  onChange={handleChange}
                  required
                  disabled={!formData.department}
                  className={`w-full h-10 px-3.5 rounded-lg border text-sm transition focus:outline-none cursor-pointer ${
                    !formData.department
                      ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                      : 'border-slate-200 bg-white text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                >
                  <option value="">
                    {formData.department ? 'Select position' : 'Select department first'}
                  </option>
                  {filteredPositions.map((pos) => (
                    <option key={pos.value} value={pos.value}>
                      {pos.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Col 2: Full name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full name
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Rahul Sharma"
                  required
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>

              {/* ROW 3 */}
              {/* Col 1: Gmail */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Gmail
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={() => checkDailyCandidate()}
                  placeholder="e.g. rahul.sharma@gmail.com"
                  required
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>

              {/* Col 2: Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-0.5">
                  Password
                </label>
                <span className="block text-[11px] text-slate-500 font-normal mb-1.5">
                  (minimum 10 characters)
                </span>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={10}
                    placeholder="Enter password (min 10 chars)"
                    className="w-full h-10 px-3.5 pr-10 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* ROW 4 */}
              {/* Col 1: Confirm password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="Re-enter password"
                    className="w-full h-10 px-3.5 pr-10 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Col 2: Mobile number */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Mobile number
                  </label>
                  <button
                    type="button"
                    onClick={() => checkDailyCandidate()}
                    disabled={verifyingDaily || !formData.email || !formData.mobileNumber}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 cursor-pointer"
                  >
                    {verifyingDaily ? (
                      <span>Checking...</span>
                    ) : matchedDailyCandidate ? (
                      <span className="text-emerald-600 flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 inline" />
                        <span>Daily Candidate Linked</span>
                      </span>
                    ) : (
                      <span>Verify Daily Candidate</span>
                    )}
                  </button>
                </div>
                <input
                  type="tel"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  onBlur={() => checkDailyCandidate()}
                  placeholder="e.g. +91 98765 43210"
                  required
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>

              {/* ROW 5 */}
              {/* Col 1: Religion */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Religion
                </label>
                <input
                  type="text"
                  name="religion"
                  value={formData.religion}
                  onChange={handleChange}
                  placeholder="e.g. Optional"
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>

              {/* Col 2: Current location */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Current location
                </label>
                <input
                  type="text"
                  name="currentLocation"
                  value={formData.currentLocation}
                  onChange={handleChange}
                  placeholder="e.g. Vadodara or Ahmedabad"
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>

              {/* ROW 6 */}
              {/* Col 1: Candidate type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Candidate type
                </label>
                <select
                  name="candidateType"
                  value={formData.candidateType}
                  onChange={handleChange}
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer"
                >
                  <option value="Fresher">Fresher</option>
                  <option value="Experienced">Experienced</option>
                </select>
              </div>

              {/* Col 2: CV / Attachment */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-0.5">
                  CV / Attachment
                </label>
                <span className="block text-[11px] text-slate-500 font-normal mb-1.5">
                  (PDF, DOC, DOCX; max 30 MB)
                </span>
                <div className="w-full h-10 px-2.5 rounded-lg border border-slate-200 bg-white flex items-center text-xs text-slate-600 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,image/*"
                    onChange={handleFileChange}
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-1 file:px-2.5 file:rounded file:border file:border-slate-200 file:text-xs file:font-medium file:bg-slate-100 hover:file:bg-slate-200 file:cursor-pointer cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* NOTICE BANNER */}
            <div
              style={{
                backgroundColor: 'color-mix(in srgb, var(--erp-primary, #2563eb) 8%, transparent)',
                borderLeftColor: 'var(--erp-primary, #2563eb)',
              }}
              className="mt-8 p-4 rounded-md border-l-4 text-xs text-gray-700 leading-relaxed"
            >
              <strong className="font-bold text-gray-900">
                Remember your registered Gmail address and password.
              </strong>{' '}
              They will be used to log in and access your assessment.
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-4 flex items-center justify-between">
              <Link
                to="/assessment/signin"
                className="text-xs text-gray-500 hover:text-[var(--erp-primary,#2563eb)] transition"
              >
                Already registered? <span className="font-semibold underline">Sign in</span>
              </Link>
              <button
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: 'var(--erp-primary, #2563eb)',
                }}
                className="px-8 py-2.5 rounded-md text-white font-bold text-sm shadow-xs transition hover:opacity-90 disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'Please wait...' : 'Continue'}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 py-5 text-center text-xs text-gray-500">
        Your information is used only for the recruitment process.
      </footer>
    </div>
  );
};

export default AssessmentRegister;
