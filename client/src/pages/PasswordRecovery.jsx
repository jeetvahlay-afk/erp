import { useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Loader2, Mail } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { getApiError } from '../lib/api';

const PasswordRecovery = ({ reset = false }) => {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setError(''); setMessage('');
    if (reset && password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try { const { data } = await api.post(reset ? '/api/auth/reset-password' : '/api/auth/forgot-password', reset ? { token: params.get('token') || '', password } : { email }); setMessage(data.message); }
    catch (requestError) { setError(getApiError(requestError, 'Unable to complete password recovery')); }
    finally { setLoading(false); }
  };
  return <main className="erp-login-page"><section className="erp-login-brand-panel"><div className="erp-login-brand"><span className="erp-brand-mark"><i /><i /><i /><i /></span><strong>TeamHub ERP</strong></div><div><p>Secure account recovery</p><h1>Restore access to your workforce account.</h1><span>Reset links expire after 30 minutes and can only be used once.</span></div><small>Protected access · Audited actions · Enterprise controls</small></section><section className="erp-login-form-panel"><form className="erp-login-card" onSubmit={submit}><h2>{reset ? 'Create New Password' : 'Forgot Password'}</h2><p>{reset ? 'Choose a secure password with at least one letter and number.' : 'Enter your account email to receive a secure reset link.'}</p>{error && <div className="erp-login-error" role="alert"><AlertCircle size={17} /><span>{error}</span></div>}{message && <div className="erp-login-success" role="status"><CheckCircle2 size={17} /><span>{message}</span></div>}{reset ? <><label><span>New Password</span><div><KeyRound size={17} /><input type="password" minLength="8" required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter new password" /></div></label><label><span>Confirm Password</span><div><KeyRound size={17} /><input type="password" minLength="8" required autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm new password" /></div></label></> : <label><span>Email Address</span><div><Mail size={17} /><input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email address" /></div></label>}<button className="erp-login-submit" type="submit" disabled={loading || Boolean(message)}>{loading ? <><Loader2 className="animate-spin" size={17} /> Please wait…</> : reset ? 'Reset Password' : 'Send Reset Link'}</button><Link className="erp-login-link" to="/login">Back to sign in</Link></form></section></main>;
};
export default PasswordRecovery;
