import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your email or username');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    setError('');
    const result = await login(identifier.trim(), password, remember);
    if (result.success) {
      navigate('/', { replace: true });
    } else {
      setError(result.error || 'Failed to sign in');
    }
    setIsLoading(false);
  };

  const handleGoogleLogin = () => {
    setError('Google Sign-In is not configured. Please sign in with your ERP account.');
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-white p-4 sm:p-8">
      {/* Inline styles to completely override browser autofill and focus-ring glitches */}
      <style>{`
        .erp-auth-input {
          width: 100% !important;
          background: transparent !important;
          border: none !important;
          border-bottom: 1px solid #d1d5db !important;
          border-radius: 0 !important;
          outline: none !important;
          box-shadow: none !important;
          padding: 10px 0 !important;
          font-size: 15px !important;
          color: #111827 !important;
          line-height: 1.5 !important;
          transition: border-color 0.15s ease !important;
        }
        .erp-auth-input:focus,
        .erp-auth-input:focus-visible {
          outline: none !important;
          box-shadow: none !important;
          border-bottom: 2px solid #2563eb !important;
        }
        .erp-auth-input::placeholder {
          color: #9ca3af !important;
          font-weight: 400 !important;
        }
        .erp-auth-input:-webkit-autofill,
        .erp-auth-input:-webkit-autofill:hover,
        .erp-auth-input:-webkit-autofill:focus,
        .erp-auth-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px white inset !important;
          -webkit-text-fill-color: #111827 !important;
          transition: background-color 5000s ease-in-out 0s !important;
        }
        .erp-auth-field,
        .erp-auth-field:focus,
        .erp-auth-field:focus-visible,
        .erp-auth-field:focus-within {
          outline: none !important;
          box-shadow: none !important;
        }
      `}</style>

      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-center">
        {/* Left column: Cartoon Characters (Ultra-HD, Crystal Clear) */}
        <div className="flex items-center justify-center p-4 lg:p-12 order-2 md:order-1">
          <div className="w-full max-w-[440px] lg:max-w-[480px] flex items-center justify-center">
            <img
              src="/auth-illustration.png"
              alt="Team Illustration"
              className="w-full h-auto object-contain select-none"
              style={{ maxHeight: '460px' }}
            />
          </div>
        </div>

        {/* Right column: Login Form */}
        <div className="flex flex-col items-center justify-center p-4 lg:p-12 order-1 md:order-2">
          <div className="w-full max-w-[360px] sm:max-w-[380px] flex flex-col items-center">
            {/* Spiral purple logo */}
            <div className="mb-3 flex items-center justify-center">
              <img
                src="/auth-logo.svg"
                alt="Logo"
                className="h-9 w-auto object-contain select-none"
              />
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-[28px] font-bold text-[#111827] mb-8 text-center tracking-tight">
              Welcome Back
            </h1>

            {/* Error banner */}
            {error && (
              <div
                className="w-full mb-5 px-3.5 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-md text-xs text-center"
                role="alert"
              >
                {error}
              </div>
            )}

            <form className="w-full" onSubmit={handleSubmit} noValidate>
              {/* Email / Username Input (clean underline style) */}
              <div className="mb-6 erp-auth-field">
                <input
                  type="text"
                  name="identifier"
                  autoComplete="username email"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Email address or username"
                  className="erp-auth-input"
                />
              </div>

              {/* Password Input (clean underline style with eye toggle) */}
              <div className="relative mb-3 erp-auth-field flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="erp-auth-input pr-8 tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-0 bottom-3 text-[#6b7280] hover:text-[#111827] focus:outline-none cursor-pointer p-0 bg-transparent border-0"
                  style={{ outline: 'none', boxShadow: 'none' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Remember Me and Forgot Password Row */}
              <div className="flex items-center justify-between text-[11px] sm:text-[12px] text-[#4b5563] mt-2 mb-7 select-none">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-300 accent-[#2563eb] cursor-pointer"
                  />
                  <span>Remember Me</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[#4b5563] hover:text-[#2563eb] transition-colors"
                >
                  Forgot Password
                </Link>
              </div>

              {/* Submit Button (Pill shaped, Royal Blue #2563eb) */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white font-medium text-[14px] sm:text-[15px] py-3 px-4 rounded-full transition-all duration-150 flex items-center justify-center cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed shadow-sm hover:shadow"
                style={{ outline: 'none', boxShadow: 'none' }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    <span>Logging in…</span>
                  </>
                ) : (
                  'Login'
                )}
              </button>

              {/* Login with Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2 mt-4 py-2 text-[13px] text-[#374151] hover:text-[#111827] font-medium transition-colors cursor-pointer bg-transparent border-0"
                style={{ outline: 'none', boxShadow: 'none' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.13z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                  />
                </svg>
                <span>Login With Google</span>
              </button>
            </form>

            {/* Bottom: Don't Have An Account ? Sign Up */}
            <div className="mt-12 text-center text-[12px] text-[#6b7280]">
              Don&apos;t Have An Account ?{' '}
              <span className="font-semibold text-[#111827] hover:underline cursor-pointer">
                Sign Up
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Login;
