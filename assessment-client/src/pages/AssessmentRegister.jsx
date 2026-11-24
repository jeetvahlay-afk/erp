import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../api/client';
import { Eye, EyeOff, AlertCircle, CheckCircle2, Sparkles, FileText, X } from 'lucide-react';
import { AssessmentPortalHeader, AssessmentWatermark } from './AssessmentPortalHeader';

const COUNTRY_CODES = [
  { code: '+91', country: 'IN', label: 'India (+91)' },
  { code: '+1', country: 'US', label: 'United States / Canada (+1)' },
  { code: '+44', country: 'GB', label: 'United Kingdom (+44)' },
  { code: '+971', country: 'AE', label: 'UAE (+971)' },
  { code: '+61', country: 'AU', label: 'Australia (+61)' },
  { code: '+65', country: 'SG', label: 'Singapore (+65)' },
  { code: '+966', country: 'SA', label: 'Saudi Arabia (+966)' },
  { code: '+49', country: 'DE', label: 'Germany (+49)' },
  { code: '+33', country: 'FR', label: 'France (+33)' },
  { code: '+81', country: 'JP', label: 'Japan (+81)' },
  { code: '+86', country: 'CN', label: 'China (+86)' },
  { code: '+977', country: 'NP', label: 'Nepal (+977)' },
  { code: '+880', country: 'BD', label: 'Bangladesh (+880)' },
  { code: '+94', country: 'LK', label: 'Sri Lanka (+94)' },
  { code: '+60', country: 'MY', label: 'Malaysia (+60)' },
];

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

  const [countryCode, setCountryCode] = useState('+91');
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

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const [positions, setPositions] = useState(DEFAULT_POSITIONS);
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);
  const [departmentDetails, setDepartmentDetails] = useState([]);
  const [locations, setLocations] = useState(['Ahmedabad', 'Vadodara']);
  const [cvFile, setCvFile] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [matchedDailyCandidate, setMatchedDailyCandidate] = useState(null);
  const [verifyingDaily, setVerifyingDaily] = useState(false);
  const [lookupMessage, setLookupMessage] = useState('');

  // Field validator helper
  const validateField = (name, value, allData = formData, file = cvFile, cCode = countryCode) => {
    switch (name) {
      case 'fullName': {
        const v = (value || '').trim();
        if (!v) return 'Full name is required.';
        if (v.length < 2) return 'Full name must be at least 2 characters.';
        if (!/^[a-zA-Z\s.'-]+$/.test(v)) return 'Full name should only contain letters and spaces.';
        return '';
      }
      case 'email': {
        const v = (value || '').trim().toLowerCase();
        if (!v) return 'Gmail address is required.';
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(v)) return 'Please enter a valid email address (e.g. name@gmail.com).';
        if (v.includes('@gmai.com') || v.includes('@gamil.com') || v.includes('@gmial.com')) {
          return 'Did you mean @gmail.com? Please check spelling.';
        }
        return '';
      }
      case 'mobileNumber': {
        const digits = (value || '').replace(/\D/g, '');
        if (!digits) return 'Mobile number is required.';
        if (cCode === '+91') {
          if (digits.length !== 10) return 'Indian mobile number must be exactly 10 digits.';
          if (!/^[6-9]/.test(digits)) return 'Indian mobile numbers must start with 6, 7, 8, or 9.';
        } else {
          if (digits.length < 7 || digits.length > 15) return 'Mobile number must be between 7 and 15 digits.';
        }
        return '';
      }
      case 'password': {
        if (!value) return 'Password is required.';
        if (value.length < 10) return 'Password must be at least 10 characters long.';
        if (!/[a-zA-Z]/.test(value)) return 'Password must contain at least one letter.';
        if (!/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value)) {
          return 'Password must contain at least one number or special character.';
        }
        return '';
      }
      case 'confirmPassword': {
        if (!value) return 'Please confirm your password.';
        if (value !== allData.password) return 'Passwords do not match.';
        return '';
      }
      case 'department': {
        if (!value) return 'Please select a department.';
        return '';
      }
      case 'positionAppliedFor': {
        if (!value) return 'Please select a position applied for.';
        return '';
      }
      case 'cv': {
        if (file) {
          const allowedExts = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'];
          const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
          if (!allowedExts.includes(ext)) return 'Invalid file format. Allowed: PDF, DOC, DOCX, PNG, JPG.';
          if (file.size > 30 * 1024 * 1024) return 'File size exceeds 30 MB limit.';
        }
        return '';
      }
      default:
        return '';
    }
  };

  const handleBlur = (fieldName) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    const err = validateField(fieldName, formData[fieldName], formData, cvFile, countryCode);
    setErrors((prev) => ({ ...prev, [fieldName]: err }));
  };

  const handleCountryCodeChange = (e) => {
    const newCode = e.target.value;
    setCountryCode(newCode);
    if (touched.mobileNumber) {
      const err = validateField('mobileNumber', formData.mobileNumber, formData, cvFile, newCode);
      setErrors((prev) => ({ ...prev, mobileNumber: err }));
    }
  };

  const handlePhoneChange = (e) => {
    let raw = e.target.value;
    // Keep only numbers
    const clean = raw.replace(/\D/g, '');
    const limited = countryCode === '+91' ? clean.slice(0, 10) : clean.slice(0, 15);
    setFormData((prev) => ({ ...prev, mobileNumber: limited }));

    if (touched.mobileNumber) {
      const err = validateField('mobileNumber', limited, formData, cvFile, countryCode);
      setErrors((prev) => ({ ...prev, mobileNumber: err }));
    }
    if (error) setError('');
  };

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
      const fullPhone = `${countryCode} ${cleanDigits}`;
      const res = await axios.post('/api/assessment/lookup-daily-candidate', {
        email,
        mobileNumber: fullPhone,
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
    const updated = {
      ...formData,
      [name]: value,
      ...(name === 'department' ? { positionAppliedFor: '' } : {}),
    };
    setFormData(updated);

    if (touched[name]) {
      const fieldErr = validateField(name, value, updated, cvFile, countryCode);
      setErrors((prev) => ({ ...prev, [name]: fieldErr }));
    }
    if (name === 'password' && touched.confirmPassword) {
      const matchErr = validateField('confirmPassword', formData.confirmPassword, updated, cvFile, countryCode);
      setErrors((prev) => ({ ...prev, confirmPassword: matchErr }));
    }
    if (error) setError('');
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCvFile(file);
      setTouched((prev) => ({ ...prev, cv: true }));
      const fileErr = validateField('cv', null, formData, file, countryCode);
      setErrors((prev) => ({ ...prev, cv: fileErr }));
    }
  };

  const handleRemoveFile = () => {
    setCvFile(null);
    setErrors((prev) => ({ ...prev, cv: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Mark all required fields as touched
    const allTouched = {
      fullName: true,
      email: true,
      mobileNumber: true,
      password: true,
      confirmPassword: true,
      department: true,
      positionAppliedFor: true,
      cv: Boolean(cvFile),
    };
    setTouched((prev) => ({ ...prev, ...allTouched }));

    // Run full validation suite
    const newErrors = {
      fullName: validateField('fullName', formData.fullName, formData, cvFile, countryCode),
      email: validateField('email', formData.email, formData, cvFile, countryCode),
      mobileNumber: validateField('mobileNumber', formData.mobileNumber, formData, cvFile, countryCode),
      password: validateField('password', formData.password, formData, cvFile, countryCode),
      confirmPassword: validateField('confirmPassword', formData.confirmPassword, formData, cvFile, countryCode),
      department: validateField('department', formData.department, formData, cvFile, countryCode),
      positionAppliedFor: validateField('positionAppliedFor', formData.positionAppliedFor, formData, cvFile, countryCode),
      cv: validateField('cv', null, formData, cvFile, countryCode),
    };

    setErrors(newErrors);

    const firstError = Object.values(newErrors).find(Boolean);
    if (firstError) {
      setError(firstError);
      return;
    }

    try {
      setLoading(true);
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key === 'mobileNumber') {
          const cleanDigits = formData.mobileNumber.replace(/\D/g, '');
          data.append('mobileNumber', `${countryCode} ${cleanDigits}`);
        } else {
          data.append(key, formData[key] || '');
        }
      });
      data.append('countryCode', countryCode);
      if (cvFile) {
        data.append('cv', cvFile);
      }

      const res = await axios.post('/api/assessment/register', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const payload = res.data || {};
      const candidate = payload.data?.data || payload.data || payload;
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

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Department <span className="text-rose-500">*</span>
                  </label>
                  {touched.department && !errors.department && formData.department && (
                    <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                    </span>
                  )}
                </div>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  onBlur={() => handleBlur('department')}
                  className={`w-full h-10 px-3.5 rounded-lg border text-sm text-slate-800 bg-white focus:outline-none transition cursor-pointer ${
                    touched.department && errors.department
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/20'
                      : touched.department && !errors.department && formData.department
                      ? 'border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                >
                  <option value="">Select department</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                {touched.department && errors.department && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.department}</span>
                  </p>
                )}
              </div>

              {/* ROW 2 */}
              {/* Col 1: Position applied for */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Position applied for <span className="text-rose-500">*</span>
                  </label>
                  {touched.positionAppliedFor && !errors.positionAppliedFor && formData.positionAppliedFor && (
                    <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                    </span>
                  )}
                </div>
                <select
                  name="positionAppliedFor"
                  value={formData.positionAppliedFor}
                  onChange={handleChange}
                  onBlur={() => handleBlur('positionAppliedFor')}
                  disabled={!formData.department}
                  className={`w-full h-10 px-3.5 rounded-lg border text-sm transition focus:outline-none cursor-pointer ${
                    !formData.department
                      ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                      : touched.positionAppliedFor && errors.positionAppliedFor
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/20 text-slate-800'
                      : touched.positionAppliedFor && !errors.positionAppliedFor && formData.positionAppliedFor
                      ? 'border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white text-slate-800'
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
                {touched.positionAppliedFor && errors.positionAppliedFor && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.positionAppliedFor}</span>
                  </p>
                )}
              </div>

              {/* Col 2: Full name */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Full name <span className="text-rose-500">*</span>
                  </label>
                  {touched.fullName && !errors.fullName && formData.fullName && (
                    <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    onBlur={() => handleBlur('fullName')}
                    placeholder="Enter your full name"
                    className={`w-full h-10 px-3.5 pr-9 rounded-lg border text-sm text-slate-800 focus:outline-none transition ${
                      touched.fullName && errors.fullName
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/20'
                        : touched.fullName && !errors.fullName && formData.fullName
                        ? 'border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                        : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  />
                  {touched.fullName && !errors.fullName && formData.fullName && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
                {touched.fullName && errors.fullName && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.fullName}</span>
                  </p>
                )}
              </div>

              {/* ROW 3 */}
              {/* Col 1: Gmail */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Gmail address <span className="text-rose-500">*</span>
                  </label>
                  {touched.email && !errors.email && formData.email && (
                    <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Valid email
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={() => {
                      handleBlur('email');
                      checkDailyCandidate();
                    }}
                    placeholder="Enter your Gmail address"
                    className={`w-full h-10 px-3.5 pr-9 rounded-lg border text-sm text-slate-800 focus:outline-none transition ${
                      touched.email && errors.email
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/20'
                        : touched.email && !errors.email && formData.email
                        ? 'border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                        : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  />
                  {touched.email && !errors.email && formData.email && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
                {touched.email && errors.email ? (
                  <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.email}</span>
                  </p>
                ) : (
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Verification code and assessment desk credentials will be sent to this address.
                  </span>
                )}
              </div>

              {/* Col 2: Password */}
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  {touched.password && !errors.password && formData.password && (
                    <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Strong
                    </span>
                  )}
                </div>
                <span className="block text-[11px] text-slate-500 font-normal mb-1.5">
                  (minimum 10 characters, letters & numbers)
                </span>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={() => handleBlur('password')}
                    placeholder="Enter password (min 10 chars)"
                    className={`w-full h-10 px-3.5 pr-10 rounded-lg border text-sm text-slate-800 focus:outline-none transition ${
                      touched.password && errors.password
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/20'
                        : touched.password && !errors.password && formData.password
                        ? 'border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                        : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Password Strength Pills */}
                <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px]">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium transition ${
                    formData.password.length >= 10 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {formData.password.length >= 10 ? '✓' : '○'} Min 10 characters
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium transition ${
                    /[a-zA-Z]/.test(formData.password) && /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(formData.password)
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {/[a-zA-Z]/.test(formData.password) && /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(formData.password) ? '✓' : '○'} Letter + Number/Symbol
                  </span>
                </div>
                {touched.password && errors.password && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.password}</span>
                  </p>
                )}
              </div>

              {/* ROW 4 */}
              {/* Col 1: Confirm password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Confirm password <span className="text-rose-500">*</span>
                  </label>
                  {touched.confirmPassword && !errors.confirmPassword && formData.confirmPassword && (
                    <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Matches
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={() => handleBlur('confirmPassword')}
                    placeholder="Re-enter password"
                    className={`w-full h-10 px-3.5 pr-10 rounded-lg border text-sm text-slate-800 focus:outline-none transition ${
                      touched.confirmPassword && errors.confirmPassword
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/20'
                        : touched.confirmPassword && !errors.confirmPassword && formData.confirmPassword
                        ? 'border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                        : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {touched.confirmPassword && errors.confirmPassword && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.confirmPassword}</span>
                  </p>
                )}
              </div>

              {/* Col 2: Mobile number with Country Code */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Mobile number <span className="text-rose-500">*</span>
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

                <div className="flex rounded-lg shadow-2xs">
                  {/* Country Code Select */}
                  <select
                    value={countryCode}
                    onChange={handleCountryCodeChange}
                    className="h-10 px-2.5 sm:px-3 rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition cursor-pointer shrink-0"
                    title="Select country calling code"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.country} ({c.code})
                      </option>
                    ))}
                  </select>

                  {/* Phone Input */}
                  <div className="relative flex-1">
                    <input
                      type="tel"
                      name="mobileNumber"
                      value={formData.mobileNumber}
                      onChange={handlePhoneChange}
                      onBlur={() => {
                        handleBlur('mobileNumber');
                        checkDailyCandidate();
                      }}
                      placeholder="Enter phone number"
                      maxLength={countryCode === '+91' ? 10 : 15}
                      className={`w-full h-10 px-3.5 pr-8 rounded-r-lg border text-sm text-slate-800 focus:outline-none transition ${
                        touched.mobileNumber && errors.mobileNumber
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/20'
                          : touched.mobileNumber && !errors.mobileNumber && formData.mobileNumber
                          ? 'border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                          : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      }`}
                    />
                    {touched.mobileNumber && !errors.mobileNumber && formData.mobileNumber && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-2.5 top-1/2 -translate-y-1/2" />
                    )}
                  </div>
                </div>

                {touched.mobileNumber && errors.mobileNumber ? (
                  <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.mobileNumber}</span>
                  </p>
                ) : (
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span>
                      {countryCode === '+91'
                        ? '10-digit Indian mobile number starting with 6, 7, 8, or 9'
                        : `Country code ${countryCode} · 7 to 15 digits`}
                    </span>
                    {formData.mobileNumber && (
                      <span className="font-mono text-slate-500">
                        {formData.mobileNumber.length} {countryCode === '+91' ? '/ 10' : 'digits'}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* ROW 5 */}
              {/* Col 1: Religion */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Religion <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  name="religion"
                  value={formData.religion}
                  onChange={handleChange}
                  placeholder="Enter religion"
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>

              {/* Col 2: Current location */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Current location <span className="text-slate-400 font-normal">(City/Town)</span>
                </label>
                <input
                  type="text"
                  name="currentLocation"
                  value={formData.currentLocation}
                  onChange={handleChange}
                  placeholder="Enter current city or town"
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
                  CV / Attachment <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <span className="block text-[11px] text-slate-500 font-normal mb-1.5">
                  (PDF, DOC, DOCX, PNG, JPG; max 30 MB)
                </span>
                
                {cvFile ? (
                  <div className="w-full h-10 px-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-center justify-between text-xs text-slate-700">
                    <div className="flex items-center space-x-2 truncate">
                      <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate font-medium">{cvFile.name}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        ({(cvFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-full transition cursor-pointer"
                      title="Remove selected file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className={`w-full h-10 px-2.5 rounded-lg border bg-white flex items-center text-xs text-slate-600 transition ${
                    touched.cv && errors.cv
                      ? 'border-rose-400 focus-within:ring-2 focus-within:ring-rose-500/20'
                      : 'border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20'
                  }`}>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,image/*"
                      onChange={handleFileChange}
                      className="w-full text-xs text-slate-600 file:mr-3 file:py-1 file:px-2.5 file:rounded file:border file:border-slate-200 file:text-xs file:font-medium file:bg-slate-100 hover:file:bg-slate-200 file:cursor-pointer cursor-pointer"
                    />
                  </div>
                )}
                {touched.cv && errors.cv && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.cv}</span>
                  </p>
                )}
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
