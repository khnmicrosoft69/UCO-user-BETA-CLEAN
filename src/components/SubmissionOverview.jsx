import React, { useState, useEffect } from 'react';

export default function SubmissionOverview() {
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState(null);
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const viewerBase = 'http://localhost:3001';

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const subId = urlParams.get('id');
    setId(subId);

    const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(savedUser);

    if (subId && savedUser.id) {
      fetch(`/api/my-submissions?userId=${savedUser.id}`)
        .then(res => res.json())
        .then(data => {
          const found = data.find(s => s.id.toString() === subId);
          if (found) {
            setSubmission(found);
            loadFiles(found);
          }
          setLoading(false);
        });
    } else {
        setLoading(false);
    }
  }, []);

  const loadFiles = (sub) => {
    const fileList = [];
    
    const parseUrl = (pathStr, defaultName) => {
      if (!pathStr) return [];
      const paths = pathStr.includes(',') ? pathStr.split(',') : [pathStr];
      return paths.map((path, index) => {
        if (path.startsWith('http')) {
          const name = paths.length > 1 ? `${defaultName} ${index + 1}` : defaultName;
          return { name, url: path };
        }
        // Legacy local paths
        const parts = path.split(/[\\/]/);
        const folderIndex = parts.findIndex(p => p.includes('_20'));
        let folder, filename;
        if (folderIndex !== -1) {
           folder = parts[folderIndex]; filename = parts[folderIndex + 1];
        } else {
           folder = parts[parts.length - 2]; filename = parts[parts.length - 1];
        }
        const name = paths.length > 1 
          ? `${filename || defaultName} ${index + 1}` 
          : (filename || defaultName);
        return { 
          name, 
          url: `${viewerBase}/${filename?.endsWith('.docx') ? 'view/docx' : 'file'}/${folder}/${filename}` 
        };
      });
    };

    if (sub.ppTemplate) fileList.push(...parseUrl(sub.ppTemplate, 'Template Document'));
    if (sub.image) fileList.push(...parseUrl(sub.image, 'Image'));
    if (sub.video) fileList.push(...parseUrl(sub.video, 'Video'));
    if (sub.audio) fileList.push(...parseUrl(sub.audio, 'Audio'));

    const validFiles = fileList.filter(Boolean);
    setFiles(validFiles);
    if (validFiles.length > 0) setActiveFile(validFiles[0]);
  };

  const handleEdit = () => {
    setEditForm({
      office_name: submission.office_name,
      request_type: submission.request_type,
      mName: submission.mName,
      nNo: submission.nNo,
      socMed: submission.socMed,
      service: submission.service,
      eventDetails: submission.eventDetails,
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/update-submission', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: submission.id,
          user_id: user.id,
          ...editForm
        })
      });
      if (res.ok) {
        setSubmission({ ...submission, ...editForm });
        setIsEditing(false);
      } else {
        alert('Failed to update submission.');
      }
    } catch (error) {
      console.error(error);
      alert('Error updating submission.');
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center animate-pulse font-black uppercase text-slate-400">
        Loading Request Overview...
      </div>
    );
  if (!submission)
    return (
      <div className="p-8 text-center text-rose-500 font-bold uppercase">
        Request not found or unauthorized.
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Crisp White Unified Header */}
      <div className="bg-white px-8 py-6 rounded-[30px] shadow-[0_18px_40px_rgba(112,144,176,0.12)] border border-slate-100 flex items-center gap-5">
        <div className="w-12 h-12 rounded-2xl bg-[#F4F7FE] flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-[#547DBE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest mb-0.5">Office</p>
          <h1 className="text-xl font-black text-[#1B2559] truncate">
            {submission.office_name || "University Communications Office"}
          </h1>
          <p className="text-[10px] font-bold text-[#547DBE] uppercase tracking-wider mt-0.5">
            {submission.request_type} — {submission.service}
          </p>
        </div>
        <div className="ml-auto flex-shrink-0">
          <span className={`inline-block px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider ${
            submission.status === "Completed" ? "bg-[#E6FFF5] text-[#05CD99]"
            : submission.status === "In-process" ? "bg-[#E5F1FF] text-[#0075FF]"
            : submission.status === "Rejected" ? "bg-[#FFE6E6] text-[#EE5D50]"
            : "bg-[#FFF9E6] text-[#FFB800]"
          }`}>
            {submission.status === 'Rejected' ? 'Not Accepted' : (submission.status || "Pending")}
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column: Preview Frame & Context Panel */}
        <div className="flex-[2] space-y-8">
          <div className="bg-white p-8 shadow-[0_18px_40px_rgba(112,144,176,0.12)] border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest">
                File Preview
              </h2>
              {activeFile && (
                <span className="text-[10px] font-bold text-indigo-600 truncate max-w-[200px]">
                  {activeFile.name}
                </span>
              )}
            </div>
            <div className="h-[750px] bg-[#F4F7FE] flex items-center justify-center overflow-hidden">
              {activeFile ? (
                <iframe
                  src={activeFile.url}
                  className="w-full h-full border-0"
                />
              ) : (
                <div className="text-center text-slate-400">
                  <div className="text-4xl mb-2">📄</div>
                  <p className="text-[10px] font-black uppercase tracking-widest">No file selected</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-8 shadow-[0_18px_40px_rgba(112,144,176,0.12)] border border-slate-100 ">
            <h2 className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest mb-4">
              Event Context
            </h2>
            {isEditing ? (
              <textarea 
                className="w-full h-32 border border-slate-200 rounded p-3 text-xs font-bold text-[#1B2559] outline-none focus:border-indigo-500"
                value={editForm.eventDetails || ''}
                onChange={(e) => setEditForm({...editForm, eventDetails: e.target.value})}
              />
            ) : (
              <p className="text-xs font-bold text-[#1B2559] leading-relaxed whitespace-pre-line font-medium italic">
                {submission.eventDetails || "No additional details provided."}
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Specifications & Material Listings */}
        <div className="flex-1 space-y-6">
          {/* Informational Status Card */}
          <div className="bg-white p-8 shadow-[0_18px_40px_rgba(112,144,176,0.12)] border border-slate-100 ">
            <h2 className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest mb-6">
              Submission Status
            </h2>
            <div className="p-4 bg-[#F4F7FE] rounded-2xl text-center">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Current State</p>
              <p className="text-sm font-black text-[#1B2559] uppercase tracking-widest">
                {submission.status === 'Rejected' ? 'Not Accepted' : (submission.status || "Pending")}
              </p>
            </div>
          </div>

          {/* Key Submission Parameters Metadata Grid */}
          <div className="bg-white p-8 rounded-[10px] shadow-[0_18px_40px_rgba(112,144,176,0.12)] border border-slate-100">
            <div className="flex items-center justify-between mb-6 border-b border-[#F4F7FE] pb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest">
                  Request Details
                </h2>
                {!isEditing ? (
                  <button onClick={handleEdit} className="text-[9px] font-black bg-slate-100 text-slate-600 px-3 py-1 rounded-full hover:bg-slate-200 transition-colors">
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={handleSave} className="text-[9px] font-black bg-[#05CD99] text-white px-3 py-1 rounded-full hover:bg-emerald-600 transition-colors">
                      Save
                    </button>
                    <button onClick={() => setIsEditing(false)} className="text-[9px] font-black bg-rose-100 text-rose-600 px-3 py-1 rounded-full hover:bg-rose-200 transition-colors">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              <div
                className={`w-3 h-3 rounded-full ${submission.status === "Pending" ? "bg-[#FFB800]" : "bg-[#05CD99]"}`}
              ></div>
            </div>

            <div className="space-y-5">
              {[
                { label: "Office", key: "office_name", value: submission.office_name },
                { label: "Requestor", key: "mName", value: submission.mName },
                { label: "Contact", key: "nNo", value: submission.nNo },
                { label: "Social Media", key: "socMed", value: submission.socMed },
                { label: "Event Type", key: "request_type", value: submission.request_type },
                { label: "Service", key: "service", value: submission.service },
              ].map((item) => (
                <div key={item.label} className="border-l-2 border-[#F4F7FE] pl-4 hover:border-indigo-500 transition-colors">
                  <p className="text-[9px] font-black text-[#A3AED0] tracking-widest uppercase">
                    {item.label}
                  </p>
                  <div className="text-[11px] font-bold text-[#1B2559] uppercase mt-0.5">
                    {isEditing ? (
                      <input 
                        className="border border-slate-200 rounded px-2 py-1.5 w-full mt-1 bg-white outline-none focus:border-indigo-500"
                        value={editForm[item.key] || ''}
                        onChange={(e) => setEditForm({...editForm, [item.key]: e.target.value})}
                      />
                    ) : (() => {
                      if (!item.value) return "Not Specified";
                      
                      const shouldFormat = ["Social Media", "Event Type", "Service"].includes(item.label);
                      if (!shouldFormat) {
                        return item.value;
                      }

                      const knownOptions = [
                        'official adzu website',
                        'official adzu social media accounts',
                        'print media',
                        'photo documentation',
                        'video documentation',
                        'photo/video documentation',
                        'local media and other services',
                        'local media services',
                        'other services',
                        'file photos',
                        'facebook live',
                        'mascot',
                        'posting by official adzu social media accounts (text, photos, and videos)',
                        'layout and posting of graphics (social cards and infographics)',
                        'design and posting of graphics (social cards and infographics)',
                        'layout/design and posting of graphics (social cards and infographics)',
                        'other'
                      ];

                      const valStr = String(item.value);
                      const lowerStr = valStr.toLowerCase();
                      const matched = [];
                      
                      knownOptions.forEach(opt => {
                        let idx = lowerStr.indexOf(opt);
                        while (idx !== -1) {
                          // Prevent overlapping matches
                          if (!matched.some(m => idx >= m.index && idx < m.index + m.length)) {
                            matched.push({
                              index: idx,
                              length: opt.length,
                              value: valStr.substring(idx, idx + opt.length)
                            });
                          }
                          idx = lowerStr.indexOf(opt, idx + 1);
                        }
                      });

                      let displayLines = [];
                      if (matched.length > 0) {
                        displayLines = matched.sort((a, b) => a.index - b.index).map(m => m.value);
                      } else {
                        displayLines = valStr.split(',').map(v => v.trim()).filter(Boolean);
                      }

                      if (displayLines.length === 1) {
                        return <span className="block">{displayLines[0]}</span>;
                      }

                      return displayLines.map((line, idx) => (
                        <span key={idx} className="block">{idx + 1}. {line}</span>
                      ));
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>

        { /* Attached Assets */}
        <div className="bg-white p-8 shadow-[0_18px_40px_rgba(112,144,176,0.12)]">
          <h2 className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest mb-6">
            Attached Assets
          </h2>
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.name}
                className="flex items-center justify-between gap-3 p-3 bg-[#F4F7FE] rounded-xl"
              >
                <span className="text-[10px] font-black text-[#1B2559] truncate max-w-[120px]">
                  {file.name}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveFile(file)}
                    className="text-[10px] font-black text-[#547DBE] hover:underline"
                  >
                    View
                  </button>
                  <a
                    href={file.url}
                    download
                    className="text-[10px] font-black text-[#547DBE] hover:underline"
                  >
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
          </div>
        </div>
      </div>
  );
}