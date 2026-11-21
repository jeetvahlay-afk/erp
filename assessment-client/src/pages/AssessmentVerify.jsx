import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import axios from '../api/client';
import { Mail, CheckCircle2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { AssessmentPortalHeader, AssessmentWatermark } from './AssessmentPortalHeader';

const AssessmentVerify = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const stateData = location.state || {};

  const storedCode = sessionStorage.getItem('assessment_candidate_code') || '';
  const storedEmail = sessionStorage.getItem('assessment_candidate_email') || '';
  const storedLocation = sessionStorage.getItem('assessment_drive_location') || 'Ahmedabad';

  const [candidateCode, setCandidateCode] = useState(stateData.candidateCode || storedCode);
  const [email, setEmail] = useState(stateData.email || storedEmail);
  const [driveLocation, setDriveLocation] = useState(stateData.driveLocation || storedLocation);
  const [otp, setOtp] = useState(stateData.devOtp || '');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState(
    stateData.devOtp
      ? `A 6-digit confirmation code was sent to ${stateData.email || storedEmail || 'your Gmail'}. (Dev code: ${stateData.devOtp})`
      : (stateData.email || storedEmail)
      ? `A 6-digit confirmation code was sent to ${stateData.email || storedEmail}.`
      : ''
  );
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');

    const targetEmail = (email || storedEmail).trim();
    const targetCode = (candidateCode || storedCode).trim();

    if (!targetEmail && !targetCode) {
      return setError('Please provide your registered Gmail address.');
    }

    const cleanOtp = String(otp).trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      return setError('Please enter the 6-digit verification code.');
    }

    try {
      setLoading(true);
      const res = await axios.post('/api/assessment/verify-email', {
        candidateCode: targetCode,
        email: targetEmail,
        otp: cleanOtp,
      });

      if (res.data?.success) {
        setVerifiedSuccess(true);
        // Step 2 complete -> proceed to Step 3: Assessment Desk Sign In
        setTimeout(() => {
          navigate('/assessment/signin', {
            state: {
              email: targetEmail,
              candidateCode: res.data?.data?.data?.candidateCode || res.data?.data?.candidateCode || targetCode,
              verified: true,
            },
          });
        }, 1200);
      } else {
        setError(res.data?.message || 'Verification failed. Please check the code.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    const targetEmail = (email || storedEmail).trim();
    const targetCode = (candidateCode || storedCode).trim();

    if (!targetEmail && !targetCode) {
      return setError('Please enter your registered Gmail address below to resend the code.');
    }

    try {
      setResending(true);
      const res = await axios.post('/api/assessment/resend-otp', {
        candidateCode: targetCode,
        email: targetEmail,
      });
      setInfoMessage('A new verification code has been sent to your Gmail address.');
      const otpVal = res.data?.data?.data?.devOtp || res.data?.data?.devOtp;
      if (otpVal) {
        setOtp(otpVal);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#fafafa] flex flex-col font-sans text-gray-800">
      <AssessmentWatermark />
      <AssessmentPortalHeader location={`${driveLocation} candidate portal`} />

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-slate-100 border-t-4 border-t-blue-600 p-8 sm:p-12 text-center">
          
          {verifiedSuccess ? (
            <div className="animate-in fade-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-2xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">
                EMAIL VERIFIED
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-3">
                Gmail Confirmed
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mb-6">
                Redirecting to Assessment Desk Sign In...
              </p>
              <button
                onClick={() =>
                  navigate('/assessment/signin', {
                    state: { email, candidateCode, verified: true },
                  })
                }
                style={{ backgroundColor: 'var(--erp-primary, #2563eb)' }}
                className="px-6 py-2.5 rounded-lg text-white text-xs font-semibold flex items-center space-x-1.5 mx-auto hover:opacity-90 transition cursor-pointer"
              >
                <span>Continue to Desk Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div>
              <div
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--erp-primary, #2563eb) 12%, transparent)',
                  color: 'var(--erp-primary, #2563eb)',
                }}
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xs"
              >
                <Mail className="w-7 h-7" />
              </div>

              <div
                style={{ color: 'var(--erp-primary, #2563eb)' }}
                className="text-xs font-bold uppercase tracking-wider mb-2"
              >
                STEP 2 OF 6 · EMAIL VERIFICATION
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
                Confirm your Gmail
              </h1>

              <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto mb-6">
                Enter the 6-digit confirmation code sent to{' '}
                <strong className="text-gray-800">{email || 'your registered Gmail address'}</strong>.
              </p>

              {infoMessage && (
                <div className="mb-5 p-3 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-xs">
                  {infoMessage}
                </div>
              )}

              {error && (
                <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center justify-center space-x-2 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit code"
                    className="w-full text-center font-mono text-2xl tracking-[0.5em] px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:border-[var(--erp-primary,#2563eb)] focus:ring-2 focus:ring-[var(--erp-primary,#2563eb)]/20 transition"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.trim().length !== 6}
                  style={{ backgroundColor: 'var(--erp-primary, #2563eb)' }}
                  className="w-full py-3.5 rounded-xl text-white font-semibold text-sm shadow-sm transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Verifying...' : 'Verify & Proceed to Desk Sign In'}
                </button>

                <div className="pt-2 flex items-center justify-between text-xs text-gray-500">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="hover:text-[var(--erp-primary,#2563eb)] font-medium flex items-center space-x-1.5 transition disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                    <span>Resend code</span>
                  </button>

                  <Link
                    to="/assessment/signin"
                    state={{ email, candidateCode }}
                    className="hover:text-[var(--erp-primary,#2563eb)] font-medium underline"
                  >
                    Already verified? Sign In
                  </Link>
                </div>
              </form>
            </div>
          )}

        </div>
      </main>

      <footer className="relative z-10 py-6 text-center text-xs text-gray-400">
        For technical assistance, contact your recruiter.
      </footer>
    </div>
  );
};

export default AssessmentVerify;
