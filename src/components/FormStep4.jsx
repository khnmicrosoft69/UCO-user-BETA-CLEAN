import React, { useRef, useState } from 'react';

export default function FormStep4({ formData, setFormData, onSubmit, onPrev }) {
  const fileInputRef = useRef(null);
  const [showErrors, setShowErrors] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      eventInfo: {
        ...formData.eventInfo,
        [name]: value
      }
    });
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // Allowed MIME types
    const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/pdf', // .pdf
        'image/jpeg', 'image/png', 'image/gif', // Images
        'video/mp4', 'video/quicktime', 'video/x-matroska', // Videos (mp4, hevc, mkv)
        'audio/mpeg', 'audio/wav' // Audio
    ];

    const validFiles = selectedFiles.filter(file => 
        allowedTypes.includes(file.type) || 
        file.name.endsWith('.docx') || 
        file.name.endsWith('.pdf') || 
        file.name.endsWith('.mp4') || 
        file.name.endsWith('.mkv')
    );

    if (validFiles.length !== selectedFiles.length) {
        alert("Some files were rejected. Please only upload .docx, .pdf, images, videos, or audio files.");
    }

    setFormData({
      ...formData,
      eventInfo: {
        ...formData.eventInfo,
        files: validFiles
      }
    });
  };

  const info = formData.eventInfo || {};
  const isComplete = info.eventDetails && info.files && info.files.length > 0;

  const handleSubmit = () => {
    if (isComplete) {
      onSubmit();
    } else {
      setShowErrors(true);
      alert("Please fill in all required fields.");
      setTimeout(() => {
        const errorElement = document.querySelector('.has-error');
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center sm:text-left">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Finalize Request</h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Information & Verification*</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className={`block text-xs font-black mb-2 uppercase tracking-[0.15em] ${showErrors && !info.eventDetails ? 'text-red-500 has-error' : 'text-slate-700'}`}>Event Details / Context*</label>
          <textarea 
            name="eventDetails"
            value={info.eventDetails || ''}
            onChange={handleChange}
            rows="5"
            placeholder="Please provide comprehensive details about the event, intended message, and specific posting requirements..."
            className={`w-full p-4 bg-slate-50 border-2 rounded-2xl focus:bg-white outline-none transition-all text-sm font-medium resize-none ${showErrors && !info.eventDetails ? 'border-red-500 text-red-900 focus:border-red-500' : 'border-slate-100 text-slate-900 focus:border-indigo-500'}`}
          ></textarea>
        </div>

        {/* Template Download Section */}
        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900">Need the template?</span>
            <a 
                href="/files/Press-Release-Template-2025-ver (1).docx" 
                download
                className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 underline"
            >
                Download Template
            </a>
        </div>

        {/* File Upload Section */}
        <div 
          className={`p-8 border-2 border-dashed rounded-[2rem] transition-all text-center cursor-pointer group ${info.files && info.files.length > 0 ? 'bg-green-50 border-green-200' : (showErrors && (!info.files || info.files.length === 0) ? 'bg-red-50 border-red-500 has-error' : 'bg-slate-50/50 border-slate-200 hover:border-indigo-300 hover:bg-slate-50')}`}
          onClick={() => fileInputRef.current.click()}
        >
          <input 
            type="file" 
            name="files"
            accept=".docx,.pdf,image/*,video/*,audio/*"
            ref={fileInputRef} 
            onChange={handleFileChange} 
            multiple 
            className="hidden" 
          />
          <div className="flex flex-col items-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4 transition-transform group-hover:scale-110 ${info.files && info.files.length > 0 ? 'bg-green-100' : (showErrors && (!info.files || info.files.length === 0) ? 'bg-red-100 text-red-500' : 'bg-white shadow-sm')}`}>
              {info.files && info.files.length > 0 ? '✅' : '📁'}
            </div>
            <p className={`text-sm font-black tracking-tight ${info.files && info.files.length > 0 ? 'text-green-700' : (showErrors && (!info.files || info.files.length === 0) ? 'text-red-500' : 'text-slate-700')}`}>
              {info.files && info.files.length > 0 ? `${info.files.length} File(s) Selected` : 'Attach Filled Template & Media*'}
            </p>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed max-w-[200px]">
              Upload the filled template (Docx/PDF) & up to 4 high-quality photos/videos.
            </p>
          </div>
        </div>

        <div className="p-6 bg-blue-50/30 rounded-3xl border border-blue-100/50">
          <h3 className="text-[10px] font-black text-[#0A1C5C] uppercase tracking-[0.2em] mb-3">Disclaimer & Consent</h3>
          <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
            By submitting, you certify that all information is correct and that necessary permissions have been granted for the use of photos/data in public University promotions.
          </p>
          <div className="mt-4 flex items-center gap-4 border-t border-blue-100/50 pt-4">
             <div className="flex-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Processing Time</p>
                <p className="text-xs font-bold text-slate-700">3 Working Days</p>
             </div>
             <div className="flex-1 text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Confirmation</p>
                <p className="text-xs font-bold text-slate-700 tracking-tight">Call Local 2025</p>
             </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-6">
        <button 
          onClick={onPrev}
          className="flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95"
        >
          Back
        </button>
        <button 
          onClick={handleSubmit} 
          className="flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-200 bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-1 active:scale-95"
        >
          Submit Request
        </button>
      </div>
    </div>
  );
}
