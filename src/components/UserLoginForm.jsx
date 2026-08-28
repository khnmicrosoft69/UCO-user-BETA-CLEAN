import React, { useState, useEffect, useRef } from 'react';

export default function UserLoginForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [office, setOffice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Ref where GIS will render its button directly
  const googleButtonRef = useRef(null);

  useEffect(() => {
    const clientId = import.meta.env.PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    // Always update the window callback so the latest React state closure is used
    window.handleGoogleResponse = async (response) => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: response.credential }),
        });
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem('user', JSON.stringify(data.user));
          window.location.href = '/';
        } else {
          setError(data.message || 'Google sign-in failed');
        }
      } catch {
        setError('An error occurred during Google sign-in. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    const initGoogleButton = () => {
      if (!window.google) return;

      // Always re-initialize so GIS always holds the freshest callback reference.
      // GIS is designed to be called once per page load — calling it multiple
      // times only logs a warning but is safe and ensures the callback is current.
      window.google.accounts.id.disableAutoSelect();
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: window.handleGoogleResponse,
        auto_select: false,
      });

      if (googleButtonRef.current) {
        // Clear the container before re-rendering to avoid duplicate buttons
        googleButtonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          width: 330,
          text: 'continue_with',
        });
      }
    };

    // Don't append the GSI script more than once
    const existingScript = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    );

    if (existingScript) {
      if (window.google) {
        initGoogleButton();
      } else {
        existingScript.addEventListener('load', initGoogleButton);
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initGoogleButton;
    document.head.appendChild(script);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/login' : '/api/register';
    const body = isLogin
      ? { email, password }
      : { email, password, fullName, office };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = '/';
      } else {
        setError(data.message || 'Authentication failed');
      }
    } catch {
      setError('A network error occurred. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 p-10 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-blue-900/10 dark:shadow-slate-950/20 border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-500">

      <div className="text-center">
        <div className="flex justify-center mb-6">
          <img
            src="/images/uco-logo.png"
            alt="AdZU UCO Logo"
            className="w-20 h-auto object-contain drop-shadow-md dark:brightness-110"
          />
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
          {isLogin ? 'User Login' : 'Create Account'}
        </h2>
        <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">
          {isLogin ? 'Sign in to manage your requests' : 'Register to start submitting requests'}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-rose-950/20 border border-red-200 dark:border-rose-900/30 rounded-2xl">
          <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs font-semibold text-red-600 dark:text-rose-400">{error}</p>
        </div>
      )}

      {/* Google Sign-In button rendered directly by GIS */}
      <div className="space-y-3">
        <div className="flex justify-center" ref={googleButtonRef}>
          {/* Fallback if Client ID is missing */}
          {!import.meta.env.PUBLIC_GOOGLE_CLIENT_ID && (
            <div className="w-full text-center text-xs text-rose-500 font-bold bg-rose-50 p-3 rounded-xl border border-rose-100">
              Google Client ID is missing in .env
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-600">
          or
        </span>
        <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {!isLogin && (
          <>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-2xl text-slate-900 dark:text-slate-100 font-medium text-sm focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                Office / Department
              </label>
              <input
                type="text"
                value={office}
                onChange={(e) => setOffice(e.target.value)}
                placeholder="Office of Admissions"
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-2xl text-slate-900 dark:text-slate-100 font-medium text-sm focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                required
              />
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@adzu.edu.ph"
            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-2xl text-slate-900 dark:text-slate-100 font-medium text-sm focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-2xl text-slate-900 dark:text-slate-100 font-medium text-sm focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-5 bg-[#0A1C5C] dark:bg-indigo-600 text-white rounded-[1.5rem] font-black text-sm tracking-[0.15em] uppercase shadow-xl shadow-blue-900/20 dark:shadow-indigo-900/10 hover:bg-blue-900 dark:hover:bg-indigo-700 hover:-translate-y-1 active:scale-95 transition-all duration-300 mt-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-3"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {isLogin ? 'Signing In...' : 'Registering...'}
            </>
          ) : (isLogin ? 'Sign In' : 'Register')}
        </button>
      </form>

      <div className="text-center pt-2">
        <button
          onClick={() => { setIsLogin(!isLogin); setError(''); }}
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors uppercase tracking-widest"
        >
          {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
        </button>
      </div>

      <p className="text-center text-[10px] font-medium text-slate-400 dark:text-slate-500">
        UCO Media Request System - User Portal
      </p>
    </div>
  );
}
