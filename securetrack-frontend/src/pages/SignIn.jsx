import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AtSign, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import api from '../api';

function SignIn() {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); 
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswordHelp, setShowPasswordHelp] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!identifier.trim() || !password) {
      setError('Please enter your username or email, and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Auto-detect: if input contains '@' it's an email, otherwise treat as username
      const isEmail = identifier.includes('@');
      const payload = isEmail
        ? { email: identifier.trim(), password }
        : { username: identifier.trim(), password };

      const response = await api.post('/auth/login', payload, {
        skipAuthRedirect: true,
      });
      const { token, role } = response.data;

      if (!token) {
        throw new Error('No token returned by the server.');
      }

      localStorage.setItem('token', token);
      
      if (role) {
        localStorage.setItem('role', role);
        const userRole = role.toUpperCase();

        if (userRole.includes('INSPECTOR')) {
          navigate('/app/inspector-dashboard');
        } else if (userRole.includes('DRIVER')) {
          navigate('/app/driver');
        } else {
          navigate('/app/dashboard');
        }
      } else {
        navigate('/app/dashboard');
      }

    } catch (err) {
      if (err.response) {
        const status = err.response.status;
        if (status === 401 || status === 403) {
          setError('Invalid username/email or password. Please try again.');
        } else {
          setError('Unable to sign in. Please try again shortly.');
        }
      } else if (err.request) {
        setError('Cannot reach the SecureTrack SL server. Check your connection.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative isolate flex min-h-[100svh] flex-col items-center justify-center overflow-x-hidden bg-gradient-to-br from-[#0B3A5A] via-[#123c5e] to-[#0a2c47] px-4 py-6 sm:px-6 sm:py-8">
      
      {/* Background Decorative Glowing Orbs */}
      <div className="pointer-events-none absolute -left-[10%] -top-[10%] h-[500px] w-[500px] rounded-full bg-sky-400/10 blur-[120px]"></div>
      <div className="pointer-events-none absolute -bottom-[10%] -right-[10%] h-[500px] w-[500px] rounded-full bg-white/5 blur-[120px]"></div>

      <main className="z-10 w-full max-w-[420px]">
        {/* Logo and Titles */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 rounded-full border border-white/15 bg-white/10 p-2 shadow-lg">
            <img 
              src="/clogo.jpeg" 
              alt="SecureTrack Logo" 
              width={112}
              height={112}
              className="h-24 w-24 rounded-full object-cover sm:h-28 sm:w-28"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            SecureTrack SL
          </h1>
          <p className="mt-1 text-sm font-medium text-sky-100/90">
            Sri Lanka Customs Authority
          </p>
          <p className="mt-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200/70 sm:text-xs">
            <span className="h-px w-6 bg-sky-300/30"></span>
            Container Monitoring
            <span className="h-px w-6 bg-sky-300/30"></span>
          </p>
        </div>

        {/* Sign-in Card */}
        <div className="rounded-2xl border border-white/20 bg-white p-6 shadow-[0_16px_48px_rgba(0,0,0,0.2)] sm:p-8">
          <h2 className="mb-5 text-center text-xl font-bold text-slate-900">
            Welcome Back
          </h2>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="identifier" className="block text-sm font-semibold text-slate-700 ml-1">
                Username or Email
              </label>
              <div className="relative group">
                <AtSign size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#0B3A5A]" />
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your username or email"
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-gray-300 bg-slate-50 py-3 pl-11 pr-4 text-base text-slate-900 transition-colors placeholder:text-slate-400 focus:border-[#0B3A5A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B3A5A]/15 sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPasswordHelp((visible) => !visible)}
                  aria-expanded={showPasswordHelp}
                  aria-controls="password-help"
                  className="text-xs font-semibold text-[#0B3A5A] hover:text-sky-600 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative group">
                <Lock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#0B3A5A]" />
                
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-gray-300 bg-slate-50 py-3 pl-11 pr-12 text-base text-slate-900 transition-colors placeholder:text-slate-400 focus:border-[#0B3A5A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B3A5A]/15 sm:text-sm"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {showPasswordHelp && (
              <div id="password-help" role="status" className="rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm text-slate-700">
                To recover access to your account, contact your SecureTrack administrator for help resetting your password.
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-red-100 bg-red-50 p-3" role="alert">
                <div className="flex-1 text-sm font-medium text-red-600">
                  {error}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-[#0B3A5A] py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#0a2f4a] focus:outline-none focus:ring-4 focus:ring-[#0B3A5A]/20 disabled:pointer-events-none disabled:opacity-70"
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In'}
              {!isSubmitting && (
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              )}
            </button>
          </form>
        </div>
      </main>

      <p className="z-10 mt-6 max-w-[420px] text-center text-xs leading-relaxed text-sky-100/60">
        © 2026 Sri Lanka Customs Authority. All rights reserved.
      </p>
    </div>
  );
}

export default SignIn;
