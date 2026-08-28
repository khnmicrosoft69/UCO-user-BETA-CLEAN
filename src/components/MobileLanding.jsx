import React, { useState, useEffect } from "react";

export default function MobileLanding({ onCreateRequest }) {
  const [metrics, setMetrics] = useState({ pending: 0, inProcess: 0, completed: 0, rejected: 0 });
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) return;
    const user = JSON.parse(savedUser);

    fetch(`/api/my-submissions?userId=${user.id}`)
      .then(res => res.json())
      .then(submissionsData => {
        if (Array.isArray(submissionsData)) {
          setRecentLogs(submissionsData.slice(0, 4));

          // Compute counts directly from submissions data (reliable fallback)
          const counts = { pending: 0, inProcess: 0, completed: 0, rejected: 0 };
          submissionsData.forEach(s => {
            const status = (s.status || 'Pending').trim();
            if (status === 'Pending') counts.pending++;
            else if (status === 'In-process') counts.inProcess++;
            else if (status === 'Completed') counts.completed++;
            else if (status === 'Rejected') counts.rejected++;
          });

          // Try the dedicated metrics endpoint and use it only if it returns valid numbers
          fetch(`/api/user-metrics?userId=${user.id}`)
            .then(res => res.ok ? res.json() : null)
            .then(metricsData => {
              if (
                metricsData &&
                typeof metricsData.pending === 'number' &&
                typeof metricsData.inProcess === 'number'
              ) {
                setMetrics(metricsData);
              } else {
                // Fall back to counts computed from submissions
                setMetrics(counts);
              }
            })
            .catch(() => setMetrics(counts));
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const statusFilters = [
    { label: "Pending", count: metrics.pending, color: "bg-amber-500" },
    { label: "In-Process", count: metrics.inProcess, color: "bg-blue-500" },
    { label: "Completed", count: metrics.completed, color: "bg-green-500" },
    { label: "Not Accepted", count: metrics.rejected, color: "bg-rose-500" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-slate-400 font-black uppercase tracking-[0.3em] text-xs">
          Syncing Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      {/* Top Section: Dashboard Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left/Main Column: Request Logs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">
              Request Dashboard
            </h2>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              Activity Logs
            </span>
          </div>

          {/* Status Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statusFilters.map((filter) => (
              <div
                key={filter.label}
                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${filter.color}`}></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">
                    {filter.label}
                  </span>
                </div>
                <p className="text-3xl font-black text-slate-900">
                  {filter.count}
                </p>
              </div>
            ))}
          </div>

          {/* Recent Activity List */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mt-8">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                Recent Submissions
              </p>
              <a href="/history" className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase">
                View All History
              </a>
            </div>
            <div className="divide-y divide-slate-50">
              {recentLogs.length > 0 ? recentLogs.map((log) => {
                const status = log.status || 'Pending';
                let statusColor = "bg-amber-100 text-amber-700";
                if (status === 'In-process') statusColor = "bg-blue-100 text-blue-700";
                else if (status === 'Completed') statusColor = "bg-green-100 text-green-700";
                else if (status === 'Rejected') statusColor = "bg-rose-100 text-rose-700";

                return (
                  <a
                    key={log.id}
                    href={`/submission?id=${log.id}`}
                    className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group border-b border-slate-50 last:border-0"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                        {log.request_type.includes("Social")
                          ? "📱"
                          : log.request_type.includes("Photo")
                            ? "📸"
                            : log.request_type.includes("Local Media")
                              ? "📰"
                              : "📄"}
                      </div>
                      <div className="flex flex-col">
                        <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                          {log.request_type}
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {new Date(log.created_at).toLocaleDateString()} • ID: #{log.id}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${statusColor}`}
                      >
                        {status === 'Rejected' ? 'Not Accepted' : status}
                      </span>
                      <span className="text-slate-300 group-hover:text-indigo-400 transition-colors text-lg">→</span>
                    </div>
                  </a>
                );
              }) : (
                <div className="p-10 text-center">
                  <p className="text-xs text-slate-400 font-medium italic">No recent activity to show.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Action Card */}
        <div className="lg:col-span-1">
          <div className="bg-[#0A1C5C] p-8 md:p-10 rounded-[2.5rem] shadow-2xl shadow-blue-900/30 border border-transparent text-center relative overflow-hidden group lg:sticky lg:top-28">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-blue-400 opacity-10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>
            <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-40 h-40 bg-indigo-500 opacity-10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>

            <div className="relative z-10 flex flex-col h-full justify-center">
              <div className="w-32 h-32 flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">
                  <img
                    src="/images/uco-logo.png"
                    alt="AdZU UCO Logo"
                    className="w-34 md:w-38 h-auto object-contain drop-shadow-md brightness-110"
                  />
                </span>
              </div>
              <h3 className="text-2xl font-black text-white mb-3 tracking-tight">
                Need Publicity?
              </h3>
              <p className="text-blue-100/60 text-sm mb-10 leading-relaxed font-medium">
                Submit your media requests to UCO for events, social media
                posts, and design layout services.
              </p>

              <button
                onClick={onCreateRequest}
                className="w-full py-5 bg-white text-[#0A1C5C] rounded-[1.5rem] font-black text-sm tracking-[0.15em] uppercase shadow-xl hover:bg-indigo-50 hover:-translate-y-1 active:scale-95 transition-all duration-300"
              >
                Create New Request
              </button>

              <div className="mt-8 flex items-center justify-center gap-6">
                <div className="text-center">
                  <p className="text-[10px] font-black text-blue-300/40 uppercase tracking-widest">
                    Processing
                  </p>
                  <p className="text-lg font-bold text-white">3 Days</p>
                </div>
                <div className="w-px h-8 bg-white/10"></div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-blue-300/40 uppercase tracking-widest">
                    Support
                  </p>
                  <p className="text-lg font-bold text-white">L2025</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
