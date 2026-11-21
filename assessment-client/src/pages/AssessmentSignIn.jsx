import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from '../api/client';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { AssessmentPortalHeader, AssessmentWatermark } from './AssessmentPortalHeader';

const AssessmentSignIn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifiedSuccessMessage, setVerifiedSuccessMessage] = useState(
    location.state?.verified ? 'Gmail verified successfully. Please sign in to access your assessment.' : ''
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      return setError('Please enter both your Gmail address and your password.');
    }

    try {
      setLoading(true);
      const res = await axios.post('/api/assessment/login', {
        email: email.trim(),
        password: password.trim(),
      });
      const payload = res.data || {};
      const candidate =
        payload.candidate ||
        payload.data?.candidate ||
        payload.data ||
        payload;
      const candidateCode =
        candidate?.candidateCode ||
        payload.candidateCode ||
        payload.data?.candidateCode;

      if (candidateCode) {
        // Step 3 complete -> proceed to Step 4: Declaration
        navigate(`/assessment/${candidateCode}/intro`);
      } else {
        setError('Unable to load candidate assessment record.');
      }
    } catch (err) {
      if (err.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        const cData = err.response.data.data;
        navigate('/assessment/verify', {
          state: {
            candidateCode: cData?.candidateCode,
            email: cData?.email || email,
          },
        });
        return;
      }
      setError(err.response?.data?.message || 'Invalid Gmail address or password. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#fafafa] flex flex-col font-sans text-gray-800">
      <AssessmentWatermark />
      <AssessmentPortalHeader location="Candidate Assessment Desk" />

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div
          style={{ borderTopColor: 'var(--erp-primary, #2563eb)' }}
          className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 border-t-4 p-8 sm:p-10"
        >
          <div className="text-center mb-6">
            <div
              style={{ color: 'var(--erp-primary, #2563eb)' }}
              className="text-xs font-bold uppercase tracking-wider mb-2"
            >
              STEP 3 OF 6 · ASSESSMENT DESK SIGN IN
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Assessment Desk Sign In</h1>
            <p className="text-xs text-gray-500 mt-1">
              Sign in with your registered Gmail address and password to start your assessment
            </p>
          </div>

          {verifiedSuccessMessage && (
            <div className="mb-5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs text-center font-medium">
              {verifiedSuccessMessage}
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center space-x-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Gmail Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. candidate@gmail.com"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--erp-primary,#2563eb)]/20 focus:border-[var(--erp-primary,#2563eb)] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--erp-primary,#2563eb)]/20 focus:border-[var(--erp-primary,#2563eb)] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: 'var(--erp-primary, #2563eb)' }}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm shadow-md transition hover:opacity-90 disabled:opacity-60 flex items-center justify-center space-x-2 cursor-pointer"
            >
              {loading ? (
                <span>Verifying credentials...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Assessment Desk</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <Link
              to="/assessment/register"
              className="text-xs text-gray-500 hover:text-[var(--erp-primary,#2563eb)] transition"
            >
              Don't have an ID yet? <span className="font-semibold underline">Register here</span>
            </Link>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-6 text-center text-xs text-gray-400">
        For technical assistance, contact your recruiter.
      </footer>
    </div>
  );
};

export default AssessmentSignIn;
