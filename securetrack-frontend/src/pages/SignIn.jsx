import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight } from 'lucide-react';
import api from '../api';

function SignIn() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Please enter both your username and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token, role } = response.data;

      if (!token) {
        throw new Error('No token returned by the server.');
      }

      localStorage.setItem('token', token);
      
      // Role එක පරීක්ෂා කර Inspector නම් inspector-dashboard වෙත යැවීම
      if (role) {
        localStorage.setItem('role', role);
        const userRole = role.toUpperCase();

        if (userRole.includes('INSPECTOR')) {
          navigate('/app/inspector-dashboard');
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
          setError('Invalid username or password. Please try again.');
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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#0B3A5A] via-[#123c5e] to-[#0a2c47] px-4 py-12">
      
      {/* Background Decorative Glowing Orbs */}
      <div className="pointer-events-none absolute -left-[10%] -top-[10%] h-[500px] w-[500px] rounded-full bg-sky-400/10 blur-[120px]"></div>
      <div className="pointer-events-none absolute -bottom-[10%] -right-[10%] h-[500px] w-[500px] rounded-full bg-white/5 blur-[120px]"></div>

      <div className="z-10 w-full max-w-md flex-col items-center justify-center">
        {/* Logo and Titles */}
        <div className="mb-10 flex flex-col items-center text-center tracking-wide">
          <div className="rounded-2xl bg-white/5 p-4 shadow-2xl backdrop-blur-sm border border-white/10 mb-4">
            <img 
              src="/clogo.jpeg" 
              alt="SecureTrack Logo" 
              className="h-40 w-40 rounded-full object-cover shadow-xl ring-4 ring-[#0B3A5A]/20"
            />
          </div>
          <h1 className="mt-2 text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
            SecureTrack SL
          </h1>
          <p className="mt-1.5 text-base font-medium text-sky-200">
            Sri Lanka Customs Authority
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm text-sky-300/70 uppercase tracking-widest font-semibold">
            <span className="h-px w-6 bg-sky-300/30"></span>
            Container Monitoring
            <span className="h-px w-6 bg-sky-300/30"></span>
          </p>
        </div>

        {/* Sign-in Card */}
        <div className="rounded-3xl bg-white/95 p-8 sm:p-10 shadow-[0_20px_60px_rgba(8,58,90,0.5)] backdrop-blur-md border border-white/20">
          <h2 className="mb-8 text-2xl font-bold text-slate-900 text-center">
            Welcome Back
          </h2>

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-sm font-semibold text-slate-700 ml-1">
                Username
              </label>
              <div className="relative group">
                <User size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#0B3A5A]" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50/50 py-3.5 pl-11 pr-4 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-[#0B3A5A] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0B3A5A]/10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <a href="#forgot-password" className="text-xs font-semibold text-[#0B3A5A] hover:text-sky-600 transition-colors">
                  Forgot password?
                </a>
              </div>
              <div className="relative group">
                <Lock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#0B3A5A]" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50/50 py-3.5 pl-11 pr-4 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-[#0B3A5A] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0B3A5A]/10"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 p-4 border border-red-100 flex items-start gap-3 animate-pulse" role="alert">
                <div className="flex-1 text-sm font-medium text-red-600">
                  {error}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B3A5A] py-3.5 text-lg font-bold tracking-wide text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#0a2f4a] hover:shadow-xl hover:shadow-[#0B3A5A]/30 focus:outline-none focus:ring-4 focus:ring-[#0B3A5A]/30 disabled:pointer-events-none disabled:opacity-70 mt-4"
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In'}
              {!isSubmitting && (
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              )}
            </button>
          </form>
        </div>
      </div>

      <p className="z-10 mt-10 text-xs font-medium tracking-wide text-sky-200/60">
        © 2026 Sri Lanka Customs Authority. All rights reserved.
      </p>
    </div>
  );
}

export default SignIn;