import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from '../api/client';
import { Mail, CheckCircle2, AlertCircle, RefreshCw, ArrowRight, Copy, Check, Clipboard } from 'lucide-react';
import { AssessmentPortalHeader, AssessmentWatermark } from './AssessmentPortalHeader';

const AssessmentVerify = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const stateData = location.state || {};

  const urlEmail = searchParams.get('email') || '';
  const urlCandidateCode = searchParams.get('candidateCode') || '';

  const storedCode = sessionStorage.getItem('assessment_candidate_code') || '';
  const storedEmail = sessionStorage.getItem('assessment_candidate_email') || '';
  const storedLocation = sessionStorage.getItem('assessment_drive_location') || 'Ahmedabad';

  const initialCode = urlCandidateCode || stateData.candidateCode || storedCode;
  const initialEmail = urlEmail || stateData.email || storedEmail;

  const [candidateCode, setCandidateCode] = useState(initialCode);
  const [email, setEmail] = useState(initialEmail);
  const [driveLocation, setDriveLocation] = useState(stateData.driveLocation || storedLocation);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [pastedStatus, setPastedStatus] = useState(false);

  const [infoMessage, setInfoMessage] = useState(
    initialEmail
      ? `A 6-digit verification code was sent to ${initialEmail}.`
      : ''
  );
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  // Sync state if URL params change
  useEffect(() => {
    if (urlEmail && !email) setEmail(urlEmail);
    if (urlCandidateCode && !candidateCode) setCandidateCode(urlCandidateCode);
  }, [urlEmail, urlCandidateCode]);

  // Robust clipboard copy with fallback
  const copyCode = async (text) => {
    if (!text) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
  };

  // Robust clipboard paste with automatic formatting/cleaning
  const pasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const cleaned = String(text || '').replace(/\D/g, '').slice(0, 6);
      if (cleaned) {
        setOtp(cleaned);
        setPastedStatus(true);
        setTimeout(() => setPastedStatus(false), 2000);
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');

    const targetEmail = (email || storedEmail).trim();
    const targetCode = (candidateCode || storedCode).trim();

    if (!targetEmail && !targetCode) {
      return setError('Please provide your registered Gmail address.');
    }

    const cleanOtp = String(otp).replace(/\D/g, '').trim();
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

      const isSuccess =
        res.data?.success === true ||
        res.data?.isEmailVerified === true ||
        res.data?.data?.isEmailVerified === true ||
        res.status === 200;

      if (isSuccess) {
        setVerifiedSuccess(true);
        const resolvedCode =
          res.data?.data?.candidateCode ||
          res.data?.candidateCode ||
          targetCode;

        sessionStorage.setItem('assessment_candidate_code', resolvedCode);
        sessionStorage.setItem('assessment_candidate_verified', 'true');

        // Step 2 complete -> proceed to Step 3: Assessment Desk Sign In
        setTimeout(() => {
          navigate('/assessment/signin', {
            state: {
              email: targetEmail,
              candidateCode: resolvedCode,
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
      await axios.post('/api/assessment/resend-otp', {
        candidateCode: targetCode,
        email: targetEmail,
      });
      setInfoMessage('A new verification code has been sent to your Gmail address.');
      setOtp('');
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
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onPaste={(e) => {
                      e.preventDefault();
                      const text = (e.clipboardData || window.clipboardData).getData('text');
                      const clean = String(text || '').replace(/\D/g, '').slice(0, 6);
                      if (clean) setOtp(clean);
                    }}
                    placeholder="Enter 6-digit code"
                    className="w-full text-center font-mono text-2xl tracking-[0.5em] px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:border-[var(--erp-primary,#2563eb)] focus:ring-2 focus:ring-[var(--erp-primary,#2563eb)]/20 transition pr-20"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={pasteCode}
                    title="Paste code from clipboard"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold px-2.5 py-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-slate-100 flex items-center gap-1 transition cursor-pointer"
                  >
                    <Clipboard size={13} />
                    <span>{pastedStatus ? 'Pasted!' : 'Paste'}</span>
                  </button>
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
