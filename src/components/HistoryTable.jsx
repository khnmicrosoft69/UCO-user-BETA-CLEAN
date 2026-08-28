import React, { useState, useEffect } from "react";
import { useResponsiveLayout } from "./layout/ResponsiveLayout";
import { DesktopHistoryWrapper } from "./layout/DesktopViewing";
import { MobileHistoryWrapper } from "./layout/MobileViewing";

export default function HistoryTable() {
  const { isMobile } = useResponsiveLayout();
  const HistoryWrapper = isMobile ? MobileHistoryWrapper : DesktopHistoryWrapper;

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (savedUser.id) {
      fetch(`/api/my-submissions?userId=${savedUser.id}`)
        .then(res => res.json())
        .then(data => {
          setSubmissions(data);
          setLoading(false);
        });
    }
  }, []);

  if (loading) return <div className="text-center py-12 animate-pulse text-slate-400 font-bold uppercase tracking-widest text-xs">Loading requests...</div>;

  return (
    <HistoryWrapper>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-[10px] text-slate-400 uppercase bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 font-black tracking-widest">Reference</th>
              <th className="px-6 py-4 font-black tracking-widest">Request Type</th>
              <th className="px-6 py-4 font-black tracking-widest">Service</th>
              <th className="px-6 py-4 font-black tracking-widest">Status</th>
              <th className="px-6 py-4 font-black tracking-widest">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {submissions.map((s) => (
              <tr key={s.id} className="hover:bg-indigo-50/30 transition-colors group">
                <td className="px-6 py-5">
                  <a href={`/submission?id=${s.id}`} className="text-indigo-600 font-black font-mono text-xs hover:underline flex items-center gap-2">
                    #{s.id}
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </a>
                </td>
                <td className="px-6 py-5 font-bold text-slate-700">{s.request_type}</td>
                <td className="px-6 py-5 text-slate-500 font-medium text-xs">{s.service}</td>
                <td className="px-6 py-5">
                  {(() => {
                    const status = s.status || 'Pending';
                    let color = 'bg-amber-100 text-amber-700';
                    if (status === 'In-process') color = 'bg-blue-100 text-blue-700';
                    else if (status === 'Completed') color = 'bg-green-100 text-green-700';
                    else if (status === 'Rejected') color = 'bg-rose-100 text-rose-700';
                    const displayStatus = status === 'Rejected' ? 'Not Accepted' : status;
                    return (
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${color}`}>
                        {displayStatus}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-6 py-5 text-slate-400 font-bold text-[10px] uppercase">
                  {new Date(s.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </HistoryWrapper>
  );
}
