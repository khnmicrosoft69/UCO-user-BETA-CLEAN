import React, { useState } from 'react';

const requestTypes = [
  { label: 'Official AdZU Website', desc: 'Story in the AdZU website', icon: '🌐' },
  { label: 'Official AdZU Social Media Accounts', desc: 'FB, Twitter, IG, YouTube shared post', icon: '📱' },
  { label: 'Print Media', desc: 'Design & Layout, Printing, etc', icon: '📄' },
  { label: 'Photo Documentation', desc: 'Event Highlights', icon: '📸' },
  { label: 'Video Documentation', desc: 'Event Highlights', icon: '📹' },
  { label: 'Local Media Services', desc: 'Press releases & partnerships', icon: '📰' },
  { label: 'Other Services', desc: 'Other specialized media services', icon: '✨' },
  { label: 'File Photos', desc: 'Archive retrieval', icon: '📁' },
  { label: 'Facebook Live', desc: 'Live event streaming', icon: '🎥' },
  { label: 'Mascot', desc: 'Mascot appearance and engagement', icon: '🦅' }
];

export default function FormStep2({ formData, setFormData, onNext, onPrev }) {
  const [showErrors, setShowErrors] = useState(false);

  const handleChange = (val) => {
    const currentTypes = Array.isArray(formData.requestType) ? formData.requestType : (formData.requestType ? [formData.requestType] : []);
    let newTypes;
    if (currentTypes.includes(val)) {
      newTypes = currentTypes.filter(t => t !== val);
    } else {
      newTypes = [...currentTypes, val];
    }

    // Check if the local media services selection status is changing
    const wasLocalMedia = currentTypes.includes('Local Media Services');
    const isLocalMedia = newTypes.includes('Local Media Services');

    const updatedDetails = { ...formData.requestDetails };
    if (wasLocalMedia !== isLocalMedia) {
      // Clear selected platforms
      updatedDetails.socialAccount = [];
    }

    setFormData({ 
      ...formData, 
      requestType: newTypes,
      requestDetails: updatedDetails
    });
  };

  const isSelected = (label) => {
    const currentTypes = Array.isArray(formData.requestType) ? formData.requestType : (formData.requestType ? [formData.requestType] : []);
    return currentTypes.includes(label);
  };

  const isComplete = formData.requestType && formData.requestType.length > 0;

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
      <div className="text-center sm:text-left">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Media Service</h2>
        <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${showErrors && !isComplete ? 'text-red-500 has-error' : 'text-slate-400'}`}>What can we help you with today?*</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {requestTypes.map((type) => (
          <button 
            key={type.label} 
            onClick={() => handleChange(type.label)}
            className={`flex items-center gap-4 p-5 rounded-3xl border-2 text-left transition-all active:scale-[0.98] ${isSelected(type.label) ? 'border-indigo-600 bg-indigo-50/50 shadow-lg shadow-indigo-100' : 'border-slate-50 bg-slate-50/30 hover:border-slate-200 hover:bg-slate-50'}`}
          >
            <div className={`w-12 h-12 flex items-center justify-center rounded-2xl text-2xl transition-colors ${isSelected(type.label) ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 shadow-sm'}`}>
              {type.icon}
            </div>
            <div className="flex flex-col">
              <span className={`text-sm font-black tracking-tight ${isSelected(type.label) ? 'text-indigo-900' : 'text-slate-700'}`}>{type.label}</span>
              <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-500">{type.desc}</span>
            </div>
            {isSelected(type.label) && (
               <div className="ml-auto w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-[10px]">✓</span>
               </div>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-6">
        <button 
          onClick={onPrev}
          className="flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95"
        >
          Back
        </button>
        <button 
          onClick={handleContinue} 
          className="flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl bg-[#0A1C5C] text-white hover:bg-indigo-700 hover:-translate-y-1 active:scale-95"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
