import React from 'react';

/**
 * MobileViewing Template for User Dashboard
 */
export const MobileFrame = ({ Header, children, isMenuOpen, setIsMenuOpen }) => (
  <div className="flex flex-col min-h-screen bg-slate-50 relative overflow-x-hidden">
    <Header onMenuToggle={() => setIsMenuOpen(!isMenuOpen)} />
    
    {/* Mobile Navigation Menu */}
    {isMenuOpen && (
      <div className="fixed inset-0 bg-[#0A1C5C] z-40 flex flex-col p-8 pt-24 animate-in fade-in slide-in-from-top duration-300">
        <nav className="flex flex-col gap-6">
          <a href="/history" className="text-2xl font-black text-white uppercase tracking-widest">My Requests</a>
          <button className="text-left text-2xl font-black text-white uppercase tracking-widest">Support</button>
          <div className="h-px bg-white/10 my-4"></div>
          <a href="/login" className="text-xl font-black text-blue-300 uppercase tracking-widest">Logout</a>
        </nav>
      </div>
    )}

    <main className="flex-1 p-4">
      {children}
    </main>
  </div>
);

export const MobileHeaderWrapper = ({ children }) => (
  <header className="flex items-center justify-between p-4 bg-[#0A1C5C] border-b border-blue-950 sticky top-0 z-50 font-sans shadow-xl">
    <div className="w-full flex items-center justify-between">
      {children}
    </div>
  </header>
);

export const MobileFormWrapper = ({ children }) => (
  <div className="space-y-6">
    {children}
  </div>
);

export const MobileHistoryWrapper = ({ children }) => (
  <div className="space-y-6">
    {children}
  </div>
);
