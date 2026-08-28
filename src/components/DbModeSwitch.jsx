// OFFLINE-MODE FEATURE
// Delete this file (and its usages in UserLoginForm.jsx / UserHeader.jsx)
// to remove the online/offline DB-mode switch from the UI.
import React, { useEffect, useState } from 'react';

const OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'supabase', label: 'Cloud' },
  { value: 'mysql', label: 'Local' },
];

export default function DbModeSwitch({ compact = false }) {
  const [override, setOverride] = useState(null);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    try {
      const res = await fetch('/api/dev-tools/db-mode');
      if (!res.ok) return;
      const data = await res.json();
      setOverride(data.override ?? 'auto');
      setActive(data.active);
    } catch {
      // Silently ignore - this is a dev convenience feature only.
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleSelect = async (mode) => {
    if (loading || mode === (override ?? 'auto')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/dev-tools/db-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      if (res.ok) {
        const data = await res.json();
        setOverride(data.override ?? 'auto');
        setActive(data.active);
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  };

  if (active === null) return null;

  return (
    <div className={compact ? 'flex items-center gap-2' : 'flex flex-col gap-1.5'}>
      {!compact && (
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
          Data Source
        </span>
      )}
      <div className="inline-flex items-center rounded-full bg-slate-100 p-0.5 gap-0.5">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={loading}
            onClick={() => handleSelect(opt.value)}
            className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-colors disabled:opacity-50 ${
              (override ?? 'auto') === opt.value
                ? 'bg-[#0A1C5C] text-white'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            title={opt.value === 'auto' ? `Auto-detected: ${active}` : undefined}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
        Using: {active === 'mysql' ? 'Local MySQL' : 'Supabase'}
      </span>
    </div>
  );
}
