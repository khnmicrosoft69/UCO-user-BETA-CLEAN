import React, { useState } from 'react';

export default function FormStep1({ formData, setFormData, onNext }) {
  const [showErrors, setShowErrors] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const isComplete = formData.email && formData.acceptedGuidelines;

  const handleContinue = () => {
    if (isComplete) {
      onNext();
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
      <div className="bg-blue-50/50 border-l-4 border-[#0A1C5C] p-6 rounded-2xl">
        <h2 className="text-xl font-black text-[#0A1C5C] mb-4 tracking-tight">Publicity & Promotions Request Form</h2>
        <p className="text-xs font-black text-slate-500 uppercase tracking-[0.15em] mb-4">Read carefully before starting:</p>
        <ul className="text-sm text-slate-600 space-y-3 list-none">
          {[
            'Submit Photo and Video Documentation requests at least three (3) working days before the event.',
            'Ensure all attachments e.g., (Press Release Template, photos in HD format, videos, etc) are uploaded when making publicity requests.',
            'Check all contents to ensure compliance with the ADZU branding guidelines.' ,
            'Non-compliant or late requests may not be accommodated.'
            
          ].map((text, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="text-[#0A1C5C] font-bold">•</span>
              <span className="leading-relaxed font-medium">{text}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 p-4 bg-amber-50/80 border border-amber-100 rounded-2xl">
          <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Important Note:</p>
          <p className="text-xs text-amber-700 leading-relaxed font-medium">
            Submitting this form does not guarantee approval. All submissions are subject to UCO review and scheduling. Please call UCO to confirm job requests.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className={`block text-sm font-black mb-2 uppercase tracking-widest ${showErrors && !formData.email ? 'text-red-500 has-error' : 'text-slate-700'}`}>Email Address*</label>
          <input 
            type="email" 
            name="email"
            value={formData.email || ''}
            onChange={handleChange}
            placeholder="your-email@adzu.edu.ph"
            className={`w-full p-4 bg-slate-50 border-2 text-slate-900 rounded-2xl focus:bg-white outline-none transition-all text-sm font-medium ${showErrors && !formData.email ? 'border-red-500 focus:border-red-500' : 'border-slate-100 focus:border-indigo-500'}`}
            required
          />
          <p className="text-[10px] text-slate-400 mt-2 font-medium italic">Your account details will be recorded for file tracking.</p>
        </div>

        <div className={`group flex items-start gap-4 p-5 bg-slate-50/50 rounded-2xl border-2 hover:border-indigo-100 transition-colors cursor-pointer ${showErrors && !formData.acceptedGuidelines ? 'border-red-500 has-error' : 'border-slate-100'}`} onClick={() => handleChange({ target: { name: 'acceptedGuidelines', type: 'checkbox', checked: !formData.acceptedGuidelines } })}>
          <div className="mt-0.5">
            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${formData.acceptedGuidelines ? 'bg-indigo-600 border-indigo-600' : (showErrors && !formData.acceptedGuidelines ? 'bg-white border-red-500' : 'bg-white border-slate-200')}`}>
              {formData.acceptedGuidelines && <span className="text-white text-[10px] font-black">✓</span>}
            </div>
          </div>
          <label className={`text-xs leading-relaxed font-semibold cursor-pointer select-none ${showErrors && !formData.acceptedGuidelines ? 'text-red-500' : 'text-slate-500'}`}>
            I have read and understood the guidelines. I acknowledge that all submissions are subject to UCO review and I am responsible for confirming the status of the request.
          </label>
        </div>
      </div>

      <div className="pt-6">
        <button 
          onClick={handleContinue} 
          className="w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl bg-[#0A1C5C] text-white hover:bg-indigo-700 hover:-translate-y-1 active:scale-95"
        >
          Confirm and Start Request
        </button>
      </div>
    </div>
  );
}

