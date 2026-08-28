import React, { useEffect, useState } from "react";
import { DesktopHeaderWrapper } from "./layout/DesktopViewing";
import { MobileHeaderWrapper } from "./layout/MobileViewing";

export default function UserHeader({ isMobile, onMenuToggle }) {
  const [user, setUser] = useState(null);
  const HeaderWrapper = isMobile ? MobileHeaderWrapper : DesktopHeaderWrapper;

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    document.cookie = "session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    window.location.href = '/login';
  };

  return (
    <HeaderWrapper>
      <div className="flex items-center gap-3 md:gap-5 flex-1">
        <a href="/" className="w-10 h-auto md:w-14 md:h-14 flex items-center justify-center">
          <img
            src="/images/uco-logo.png"
            alt="AdZU UCO Logo"
            className="w-7 md:w-30 h-auto object-contain drop-shadow-md"
          />
        </a>
        <div>
          <h1 className="text-sm md:text-xl font-black text-white tracking-tight leading-tight">
            University Communications Office
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse"></div>
            <p className="text-[9px] md:text-[10px] font-black text-blue-300/60 tracking-[0.2em] uppercase">
              User Portal
            </p>
          </div>
        </div>
      </div>

      {!isMobile ? (
        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-1">
            <a href="/history" className="px-4 py-2 text-[10px] font-black text-blue-200 uppercase tracking-widest hover:text-white transition-colors">
              My Requests
            </a>
            <a href="/" className="px-4 py-2 text-[10px] font-black text-blue-200 uppercase tracking-widest hover:text-white transition-colors">
              Dashboard
            </a>
          </nav>
          <div className="w-px h-6 bg-white/10"></div>
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] text-white uppercase ">
                  {user.fullName || 'User Account'}
                </p>
                <p className="text-[9px] font-bold text-blue-400">
                  {user.email}
                </p>
                <button 
                  onClick={handleLogout}
                  className="text-[8px] font-black text-rose-400 uppercase tracking-widest hover:text-rose-300 transition-colors mt-0.5"
                >
                  Logout
                </button>
              </div>
              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xs font-black shadow-lg border border-indigo-400/30">
                {(user.fullName || 'U').charAt(0).toUpperCase()}
              </div>
            </div>
          ) : (
            <a 
              href="/login"
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all"
            >
              Sign In
            </a>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {user ? (
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-[10px] font-black shadow-lg" onClick={onMenuToggle}>
              {(user.fullName || 'U').charAt(0).toUpperCase()}
            </div>
          ) : (
            <button onClick={onMenuToggle} className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center text-white text-[10px] font-black">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
          )}
        </div>
      )}
    </HeaderWrapper>
  );
}
