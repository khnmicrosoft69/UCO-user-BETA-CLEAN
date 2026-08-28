import React from 'react';

/**
 * DesktopViewing Template for User Dashboard
 */
export const DesktopFrame = ({ Header, children }) => (
  <div className="flex flex-col min-h-screen bg-slate-50">
    <Header />
    <main className="flex-1 w-full max-w-7xl mx-auto p-8">
      {children}
    </main>
  </div>
);

export const DesktopHeaderWrapper = ({ children }) => (
  <header className="flex items-center justify-between p-6 bg-[#0A1C5C] border-b border-blue-950 sticky top-0 z-50 font-sans shadow-2xl">
    <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
      {children}
    </div>
  </header>
);

export const DesktopFormWrapper = ({ children }) => (
  <div className="max-w-5xl mx-auto space-y-8">
    {children}
  </div>
);

export const DesktopHistoryWrapper = ({ children }) => (
  <div className="space-y-8">
    {children}
  </div>
);
