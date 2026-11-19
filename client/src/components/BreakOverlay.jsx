import { useState } from 'react';
import { Coffee, Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck, Square, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

const BreakOverlay = () => {
  const { activeBreak, timeLeft, elapsedExceeded, endBreakTimer } = useAuth();
  const [showVerify, setShowVerify] = useState(false);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (!activeBreak) return null;

  const closeVerification = () => {
    setShowVerify(false);
    setPassword('');
    setError('');
  };

  const handleVerifyAndEnd = async (event) => {
    event?.preventDefault();
    setVerifying(true);
    setError('');
    try {
      await api.post('/api/auth/verify', { password });
      await api.put(`/api/breaks/end/${activeBreak._id}`, {});
      endBreakTimer();
      closeVerification();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Verification failed. Check your password and try again.');
    } finally {
      setVerifying(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const exceeded = timeLeft <= 0;
  const progress = timeLeft > 0
    ? Math.max(0, Math.min(100, (timeLeft / (Number(activeBreak.allottedDuration || 1) * 60)) * 100))
    : 100;

  return (
    <div className={`erp-break-overlay ${exceeded ? 'is-exceeded' : ''}`}>
      <section className="erp-break-overlay-card">
        <div className="erp-break-overlay-icon"><Coffee size={27} /></div>
        <p className="erp-eyebrow">{String(activeBreak.breakType || 'Break').split(' [')[0]}</p>
        <h1>{exceeded ? `-${formatTime(elapsedExceeded)}` : formatTime(timeLeft)}</h1>
        <strong>{exceeded ? 'Break limit exceeded' : 'Time remaining'}</strong>
        <p className="erp-break-overlay-message">
          {exceeded
            ? 'Your allotted break time has ended. Verify your identity and return to work.'
            : 'The workspace stays locked while the break is active.'}
        </p>
        <button type="button" className="erp-break-resume" onClick={() => setShowVerify(true)}>
          <Square size={15} fill="currentColor" /> Return to work
        </button>
      </section>

      <div className="erp-break-progress" aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>

      {showVerify && (
        <div className="erp-modal-layer" role="dialog" aria-modal="true" aria-labelledby="break-verification-title">
          <button type="button" className="erp-modal-backdrop" aria-label="Close verification" onClick={closeVerification} />
          <section className="erp-modal size-sm">
            <header>
              <div>
                <h2 id="break-verification-title">Identity Verification</h2>
                <p>Confirm your password before resuming the shift.</p>
              </div>
              <button type="button" onClick={closeVerification} aria-label="Close"><X size={19} /></button>
            </header>
            <form className="erp-modal-content" onSubmit={handleVerifyAndEnd}>
              <div className="erp-verification-icon"><LockKeyhole size={23} /></div>
              <label className="erp-field">
                <span>Password</span>
                <div className={`erp-password-field ${error ? 'has-error' : ''}`}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </label>
              {error && <div className="erp-inline-error"><ShieldCheck size={14} />{error}</div>}
              <div className="erp-form-actions">
                <button type="button" className="erp-btn erp-btn-secondary" onClick={closeVerification}>Cancel</button>
                <button type="submit" className="erp-btn erp-btn-primary" disabled={verifying || !password}>
                  {verifying ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                  Verify & Resume
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

export default BreakOverlay;
