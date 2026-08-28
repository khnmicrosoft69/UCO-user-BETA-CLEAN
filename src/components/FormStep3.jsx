import React, { useRef, useState } from 'react';

const serviceOptions = [
  'Layout and Posting of graphics (Social cards and infographics)',
  'Design and Posting of graphics (Social cards and infographics)',
  'Other'
];

export default function FormStep3({ formData, setFormData, onNext, onPrev }) {
  const [showErrors, setShowErrors] = useState(false);
  const requestTypes = Array.isArray(formData.requestType) 
    ? formData.requestType 
    : (formData.requestType ? [formData.requestType] : []);

  const isLocalMediaSelected = requestTypes.includes('Local Media Services');
  const platformOptions = isLocalMediaSelected ? [
    'Radio/Television/Teleradyo',
    'Press Release (Newspaper, Magazines, etc.)',
    'Press Conference',
    'Local Media Event Coverage'
  ] : ['Facebook', 'Twitter', 'Instagram', 'YouTube', 'TikTok'];

  const details = formData.requestDetails || {};

  const fileInputs = {
    print: useRef(null),
    photoVideo: useRef(null),
    fbLive: useRef(null),
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      requestDetails: {
        ...formData.requestDetails,
        [name]: value
      }
    });
  };

  const toggleArrayValue = (name, value) => {
    const current = Array.isArray(details[name]) ? details[name] : (details[name] ? [details[name]] : []);
    const newValues = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    handleChange({ target: { name, value: newValues } });
  };

  const isSelected = (name, value) => {
    const current = Array.isArray(details[name]) ? details[name] : (details[name] ? [details[name]] : []);
    return current.includes(value);
  };

  const handleFileChange = (name, e, maxCount, allowedExtensions) => {
    const selectedFiles = Array.from(e.target.files);
    
    if (selectedFiles.length > maxCount) {
      alert(`You can only upload up to ${maxCount} files.`);
      return;
    }
    
    const maxSize = 1024 * 1024 * 1024; // 1 GB
    const invalidSize = selectedFiles.some(f => f.size > maxSize);
    if (invalidSize) {
      alert("One or more files exceed the 1 GB size limit.");
      return;
    }

    if (allowedExtensions && allowedExtensions.length > 0) {
      const invalidType = selectedFiles.some(file => {
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        return !allowedExtensions.includes(ext);
      });
      if (invalidType) {
        alert(`Some files are not supported. Supported extensions: ${allowedExtensions.join(', ')}`);
        return;
      }
    }

    setFormData({
      ...formData,
      requestDetails: {
        ...formData.requestDetails,
        [name]: selectedFiles
      }
    });
  };

  const removeFile = (name, index) => {
    const currentFiles = Array.isArray(details[name]) ? details[name] : [];
    const updated = currentFiles.filter((_, idx) => idx !== index);
    setFormData({
      ...formData,
      requestDetails: {
        ...formData.requestDetails,
        [name]: updated
      }
    });
  };

  // Validation Logic
  const isCommonComplete = details.office_name && details.requestedByName && details.requestedByMobile;

  const isWebComplete = !requestTypes.includes('Official AdZU Website') || (
    details.webDateSubmitted &&
    details.webDateRequired &&
    details.webEventName &&
    (details.webWhereToPost && details.webWhereToPost.length > 0) &&
    (!details.webWhereToPost?.includes('Other') || details.webWhereToPostOther) &&
    details.webFormOfPost
  );

  const isSocialComplete = !requestTypes.includes('Official AdZU Social Media Accounts') || (
    (details.socialAccount && details.socialAccount.length > 0) &&
    (details.socialService && details.socialService.length > 0) &&
    (!details.socialService?.includes('Other') || details.socialServiceOther)
  );

  const isPrintComplete = !requestTypes.includes('Print Media') || (
    details.printDateRequested &&
    details.printDateNeeded &&
    details.printEventInfo &&
    (details.printSizes && details.printSizes.length > 0) &&
    (!details.printSizes?.includes('Other') || details.printSizesOther) &&
    details.printNumSheets
  );

  const isPhotoVideoLocationValid = Array.isArray(details.photoVideoLocation) 
    ? details.photoVideoLocation.some(loc => typeof loc === 'string' && loc.trim() !== '') 
    : (details.photoVideoLocation && typeof details.photoVideoLocation === 'string' && details.photoVideoLocation.trim() !== '');

  const isPhotoVideoComplete = !(requestTypes.includes('Photo Documentation') || requestTypes.includes('Video Documentation')) || (
    details.photoVideoPointPerson &&
    details.photoVideoDate &&
    details.photoVideoTime &&
    isPhotoVideoLocationValid &&
    details.photoVideoEventName &&
    details.photoVideoEventInfo
  );

  const isFbLiveComplete = !requestTypes.includes('Facebook Live') || (
    details.fbLivePointPerson &&
    details.fbLiveEventTitle &&
    details.fbLiveEventDate &&
    details.fbLiveEventTime &&
    details.fbLiveDuration &&
    details.fbLiveCoordinator &&
    (details.fbLiveFlowFile && details.fbLiveFlowFile.length > 0)
  );

  const hasFallbackTypes = requestTypes.some(t => 
    !['Official AdZU Website', 'Official AdZU Social Media Accounts', 'Print Media', 'Photo Documentation', 'Video Documentation', 'Facebook Live'].includes(t)
  );
  const isFallbackComplete = !hasFallbackTypes || (
    (details.socialAccount && details.socialAccount.length > 0) &&
    (details.serviceType && details.serviceType.length > 0) &&
    (!details.serviceType?.includes('Other') || details.otherService)
  );

  const isComplete = isCommonComplete && isWebComplete && isSocialComplete && isPrintComplete && isPhotoVideoComplete && isFbLiveComplete && isFallbackComplete;

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

  const getLabelClass = (isInvalid) => {
    return `block text-xs font-black mb-2 uppercase tracking-[0.15em] ${showErrors && isInvalid ? 'text-red-500 has-error' : 'text-slate-700'}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center sm:text-left">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Request Details</h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Specifics for {requestTypes.join(', ')}*</p>
      </div>

      <div className="space-y-8">
        {/* --- COMMON SUBMISSION DETAILS --- */}
        <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-6">
          <h3 className="text-xs font-black text-[#0A1C5C] uppercase tracking-[0.2em] border-b border-slate-100 pb-3">Submission Details</h3>
          
          <div>
            <label className={getLabelClass(!details.office_name)}>Requesting Office / Unit*</label>
            <input 
              type="text" 
              name="office_name"
              value={details.office_name || ''}
              onChange={handleChange}
              placeholder="e.g. Office of Student Affairs"
              className={`w-full p-4 bg-white border-2 rounded-2xl outline-none transition-all text-sm font-medium ${showErrors && !details.office_name ? 'border-red-500 focus:border-red-500' : 'border-slate-100 text-slate-900 focus:border-indigo-500'}`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={getLabelClass(!details.requestedByName)}>Requested by (Full Name)*</label>
              <input 
                type="text" 
                name="requestedByName"
                value={details.requestedByName || ''}
                onChange={handleChange}
                placeholder="Full Name"
                className={`w-full p-4 bg-white border-2 rounded-2xl outline-none transition-all text-sm font-medium ${showErrors && !details.requestedByName ? 'border-red-500 focus:border-red-500' : 'border-slate-100 text-slate-900 focus:border-indigo-500'}`}
              />
            </div>
            <div>
              <label className={getLabelClass(!details.requestedByMobile)}>Mobile Number*</label>
              <input 
                type="text" 
                name="requestedByMobile"
                value={details.requestedByMobile || ''}
                onChange={handleChange}
                placeholder="09XX-XXX-XXXX"
                className={`w-full p-4 bg-white border-2 rounded-2xl outline-none transition-all text-sm font-medium ${showErrors && !details.requestedByMobile ? 'border-red-500 focus:border-red-500' : 'border-slate-100 text-slate-900 focus:border-indigo-500'}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-[0.15em]">Alternate Contact (Full Name)</label>
              <input 
                type="text" 
                name="alternateContactName"
                value={details.alternateContactName || ''}
                onChange={handleChange}
                placeholder="Full Name"
                className="w-full p-4 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl focus:border-indigo-500 outline-none transition-all text-sm font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-[0.15em]">Alternate Mobile Number</label>
              <input 
                type="text" 
                name="alternateContactMobile"
                value={details.alternateContactMobile || ''}
                onChange={handleChange}
                placeholder="09XX-XXX-XXXX"
                className="w-full p-4 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl focus:border-indigo-500 outline-none transition-all text-sm font-medium"
              />
            </div>
          </div>
        </div>

        {/* --- DYNAMIC SERVICE-SPECIFIC SECTIONS --- */}

        {/* 1. Official AdZU Website */}
        {requestTypes.includes('Official AdZU Website') && (
          <div className="bg-indigo-50/20 p-6 rounded-3xl border border-indigo-100/50 space-y-6 animate-in fade-in duration-300">
            <h3 className="text-xs font-black text-indigo-900 uppercase tracking-[0.2em] border-b border-indigo-100/50 pb-3 flex items-center gap-2">
              <span>🌐</span> Official AdZU Website Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={getLabelClass(!details.webDateSubmitted)}>Date Submitted*</label>
                <input 
                  type="date" 
                  name="webDateSubmitted"
                  value={details.webDateSubmitted || ''}
                  onChange={handleChange}
                  className={`w-full p-4 bg-white border-2 rounded-2xl outline-none transition-all text-sm font-medium ${showErrors && !details.webDateSubmitted ? 'border-red-500 focus:border-red-500' : 'border-slate-100 text-slate-900 focus:border-indigo-500'}`}
                />
              </div>
              <div>
                <label className={getLabelClass(!details.webDateRequired)}>Date required to be posted*</label>
                <input 
                  type="date" 
                  name="webDateRequired"
                  value={details.webDateRequired || ''}
                  onChange={handleChange}
                  className={`w-full p-4 bg-white border-2 rounded-2xl outline-none transition-all text-sm font-medium ${showErrors && !details.webDateRequired ? 'border-red-500 focus:border-red-500' : 'border-slate-100 text-slate-900 focus:border-indigo-500'}`}
                />
              </div>
            </div>

            <div>
              <label className={getLabelClass(!details.webEventName)}>Name of Event or Project*</label>
              <input 
                type="text" 
                name="webEventName"
                value={details.webEventName || ''}
                onChange={handleChange}
                placeholder="Name of Event or Project"
                className={`w-full p-4 bg-white border-2 rounded-2xl outline-none transition-all text-sm font-medium ${showErrors && !details.webEventName ? 'border-red-500 focus:border-red-500' : 'border-slate-100 text-slate-900 focus:border-indigo-500'}`}
              />
            </div>

            <div>
              <label className={getLabelClass(!details.webWhereToPost || details.webWhereToPost.length === 0 || (details.webWhereToPost.includes('Other') && !details.webWhereToPostOther))}>Where to post*</label>
              <div className="flex flex-wrap gap-2">
                {['Featured Stories (Home Page)', "Office's Web Page (Section inside Website)", 'Web banner/slider', 'Other'].map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleArrayValue('webWhereToPost', option)}
                    className={`px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest border-2 transition-all ${isSelected('webWhereToPost', option) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {isSelected('webWhereToPost', 'Other') && (
                <input 
                  type="text" 
                  name="webWhereToPostOther"
                  value={details.webWhereToPostOther || ''}
                  onChange={handleChange}
                  placeholder="Please specify where to post..."
                  className="w-full p-4 mt-3 bg-white border-2 border-indigo-100 rounded-2xl focus:border-indigo-500 outline-none transition-all text-sm font-medium animate-in fade-in"
                />
              )}
            </div>

            <div>
              <label className={getLabelClass(!details.webFormOfPost)}>Form of post*</label>
              <div className="grid grid-cols-1 gap-2">
                {['News Article', 'Website Banner', 'Website Banner and News article'].map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleChange({ target: { name: 'webFormOfPost', value: option } })}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${details.webFormOfPost === option ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-50 bg-white hover:border-slate-200'}`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${details.webFormOfPost === option ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}>
                      {details.webFormOfPost === option && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                    </div>
                    <span className={`text-xs font-bold ${details.webFormOfPost === option ? 'text-indigo-900' : 'text-slate-600'}`}>{option}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. Official AdZU Social Media Accounts */}
        {requestTypes.includes('Official AdZU Social Media Accounts') && (
          <div className="bg-indigo-50/20 p-6 rounded-3xl border border-indigo-100/50 space-y-6 animate-in fade-in duration-300">
            <h3 className="text-xs font-black text-indigo-900 uppercase tracking-[0.2em] border-b border-indigo-100/50 pb-3 flex items-center gap-2">
              <span>📱</span> Official AdZU Social Media Accounts Details
            </h3>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-3 uppercase tracking-[0.15em]">Choose AdZU Social Media Account*</label>
              <div className="flex flex-wrap gap-2">
                {['Facebook', 'Twitter', 'Instagram', 'YouTube', 'TikTok'].map(platform => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => toggleArrayValue('socialAccount', platform)}
                    className={`px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest border-2 transition-all ${isSelected('socialAccount', platform) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-3 uppercase tracking-[0.15em]">Which service would you like?*</label>
              <div className="space-y-3">
                {[
                  'Posting by Official AdZU Social Media Accounts (Text, photos, and videos)',
                  'Layout/Design and Posting of graphics (Social cards and infographics)',
                  'Other'
                ].map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleArrayValue('socialService', option)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${isSelected('socialService', option) ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-50 bg-white hover:border-slate-200'}`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected('socialService', option) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}>
                      {isSelected('socialService', option) && <span className="text-white text-[10px] leading-none">✓</span>}
                    </div>
                    <span className={`text-xs font-bold leading-relaxed ${isSelected('socialService', option) ? 'text-indigo-900' : 'text-slate-600'}`}>{option}</span>
                  </button>
                ))}
                {isSelected('socialService', 'Other') && (
                  <input 
                    type="text" 
                    name="socialServiceOther"
                    value={details.socialServiceOther || ''}
                    onChange={handleChange}
                    placeholder="Please specify service details..."
                    className="w-full p-4 mt-2 bg-white border-2 border-indigo-100 rounded-2xl focus:border-indigo-500 outline-none transition-all text-sm font-medium animate-in fade-in"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. Print Media */}
        {requestTypes.includes('Print Media') && (
          <div className="bg-indigo-50/20 p-6 rounded-3xl border border-indigo-100/50 space-y-6 animate-in fade-in duration-300">
            <h3 className="text-xs font-black text-indigo-900 uppercase tracking-[0.2em] border-b border-indigo-100/50 pb-3 flex items-center gap-2">
              <span>📄</span> Print Media Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-[0.15em]">Date Requested*</label>
                <input 
                  type="date" 
                  name="printDateRequested"
                  value={details.printDateRequested || ''}
                  onChange={handleChange}
                  className="w-full p-4 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-[0.15em]">Date Needed*</label>
                <input 
                  type="date" 
                  name="printDateNeeded"
                  value={details.printDateNeeded || ''}
                  onChange={handleChange}
                  className="w-full p-4 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-[0.15em]">Event Information*</label>
              <textarea 
                name="printEventInfo"
                value={details.printEventInfo || ''}
                onChange={handleChange}
                rows="3"
                placeholder="Describe event and print layout context..."
                className="w-full p-4 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl focus:border-indigo-500 outline-none transition-all text-sm font-medium resize-none"
              ></textarea>
            </div>

            {/* Custom file uploader - up to 10 files */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-[0.15em]">Upload up to 10 supported files (Doc, Drawing, Image - Max 1GB per file)*</label>
              <div 
                className="p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-white text-center cursor-pointer hover:border-indigo-500 hover:bg-slate-50/50 transition-all"
                onClick={() => fileInputs.print.current.click()}
              >
                <input 
                  type="file" 
                  multiple 
                  ref={fileInputs.print}
                  onChange={(e) => handleFileChange('printFiles', e, 10, ['.docx', '.pdf', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp'])}
                  className="hidden" 
                />
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl mb-2">📁</div>
                  <span className="text-xs font-black text-slate-700">Choose Files or Drag Here</span>
                  <span className="text-[9px] text-slate-400 mt-1 uppercase">Max 10 files. Docx, PDF, SVG, WebP, PNG, JPEG</span>
                </div>
              </div>
              {details.printFiles && details.printFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {details.printFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl text-xs">
                      <span className="font-bold text-slate-700 truncate max-w-[200px]">{file.name}</span>
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); removeFile('printFiles', idx); }}
                        className="text-rose-500 hover:underline font-black uppercase text-[10px]"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-3 uppercase tracking-[0.15em]">Sizes and Prices*</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  'Bond Paper (Short, B&W): Php 1.105/sheet',
                  'Bond Paper (Short, Colored): Php 15.3/sheet',
                  'Bond Paper (Long, B&W): Php 1.105/sheet',
                  'Bond Paper (Long, Colored): Php 15.3/sheet',
                  'Legal (B&W): Php 1.105/sheet',
                  'Legal (Colored): Php 15.3/sheet',
                  'A4 (B&W): Php 1.105/sheet',
                  'A4 (Colored): Php 15.3/sheet',
                  'B4 (B&W): Php 2.99/sheet',
                  'B4 (Colored): Php 41.4/sheet',
                  '11x17 (B&W): Php 2.99/sheet',
                  '11x17 (Colored): Php 41.4/sheet',
                  'Other'
                ].map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleArrayValue('printSizes', size)}
                    className={`p-3 rounded-xl text-[10px] font-bold text-left border-2 transition-all flex items-center justify-between ${isSelected('printSizes', size) ? 'bg-[#0A1C5C] border-[#0A1C5C] text-white shadow-md' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}
                  >
                    <span>{size}</span>
                    {isSelected('printSizes', size) && <span>✓</span>}
                  </button>
                ))}
              </div>
              {isSelected('printSizes', 'Other') && (
                <input 
                  type="text" 
                  name="printSizesOther"
                  value={details.printSizesOther || ''}
                  onChange={handleChange}
                  placeholder="Please specify sizes requirements..."
                  className="w-full p-4 mt-3 bg-white border-2 border-indigo-100 rounded-2xl focus:border-indigo-500 outline-none transition-all text-sm font-medium animate-in fade-in"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-[0.15em]">Number of Sheet/s*</label>
              <input 
                type="number" 
                min="1"
                name="printNumSheets"
                value={details.printNumSheets || ''}
                onChange={handleChange}
                placeholder="Number of sheets"
                className="w-full p-4 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl focus:border-indigo-500 outline-none transition-all text-sm font-medium"
              />
            </div>
          </div>
        )}

        {/* 4. Photo or Video Documentation */}
        {(requestTypes.includes('Photo Documentation') || requestTypes.includes('Video Documentation')) && (
          <div className="bg-indigo-50/20 p-6 rounded-3xl border border-indigo-100/50 space-y-6 animate-in fade-in duration-300">
            <h3 className="text-xs font-black text-indigo-900 uppercase tracking-[0.2em] border-b border-indigo-100/50 pb-3 flex items-center gap-2">
              <span>📸</span> Photo or Video Documentation Details
            </h3>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-[0.15em]">Event Point Person Name and Mobile Number*</label>
              <input 
                type="text" 
                name="photoVideoPointPerson"
                value={details.photoVideoPointPerson || ''}
                onChange={handleChange}
                placeholder="Write N/A if it is the same as the requester"
                className="w-full p-4 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl focus:border-indigo-500 outline-none transition-all text-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-[0.15em]">Date of Event*</label>
                <input 
                  type="date" 
                  name="photoVideoDate"
                  value={details.photoVideoDate || ''}
                  onChange={handleChange}
                  className="w-full p-4 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-[0.15em]">Time of Event*</label>
                <input 
                  type="time" 
                  name="photoVideoTime"
                  value={details.photoVideoTime || ''}
                  onChange={handleChange}
                  className="w-full p-4 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-[0.15em]">Name of Event*</label>
                <input 
                  type="text" 
                  name="photoVideoEventName"
                  value={details.photoVideoEventName || ''}
                  onChange={handleChange}
                  placeholder="Name of Event"
                  className="w-full p-4 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-[0.15em]">Location(s) of Event (Venue)*</label>
                {(Array.isArray(details.photoVideoLocation) ? details.photoVideoLocation : [details.photoVideoLocation || '']).map((loc, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input 
                      type="text" 
                      value={loc}
                      onChange={(e) => {
                        const newLocs = [...(Array.isArray(details.photoVideoLocation) ? details.photoVideoLocation : [details.photoVideoLocation || ''])];
                        newLocs[idx] = e.target.value;
                        handleChange({ target: { name: 'photoVideoLocation', value: newLocs } });
                      }}
                      placeholder={`Venue ${idx + 1}`}
                      className="flex-1 p-4 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    />
                    {idx > 0 && (
                      <button 
                        type="button" 
                        onClick={() => {
                          const newLocs = [...(Array.isArray(details.photoVideoLocation) ? details.photoVideoLocation : [details.photoVideoLocation || ''])];
                          newLocs.splice(idx, 1);
                          handleChange({ target: { name: 'photoVideoLocation', value: newLocs } });
                        }}
                        className="px-4 py-2 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition-colors font-black text-xs uppercase tracking-widest"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  type="button" 
                  onClick={() => {
                    const newLocs = [...(Array.isArray(details.photoVideoLocation) ? details.photoVideoLocation : [details.photoVideoLocation || '']), ''];
                    handleChange({ target: { name: 'photoVideoLocation', value: newLocs } });
                  }}
                  className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-widest flex items-center gap-1 transition-colors"
                >
                  + Add Another Venue
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-[0.15em]">Event Information/Press Release Template*</label>
              <textarea 
                name="photoVideoEventInfo"
                value={details.photoVideoEventInfo || ''}
                onChange={handleChange}
                rows="3"
                placeholder="Describe details for event documentation..."
                className="w-full p-4 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl focus:border-indigo-500 outline-none transition-all text-sm font-medium resize-none"
              ></textarea>
            </div>

            {/* Custom file uploader - up to 5 files */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-[0.15em]">Upload up to 5 supported files (PDF, Doc, Image, or Presentation - Max 1GB per file)*</label>
              <div 
                className="p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-white text-center cursor-pointer hover:border-indigo-500 hover:bg-slate-50/50 transition-all"
                onClick={() => fileInputs.photoVideo.current.click()}
              >
                <input 
                  type="file" 
                  multiple 
                  ref={fileInputs.photoVideo}
                  onChange={(e) => handleFileChange('photoVideoFiles', e, 5, ['.docx', '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.ppt', '.pptx'])}
                  className="hidden" 
                />
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl mb-2">📁</div>
                  <span className="text-xs font-black text-slate-700">Choose Files or Drag Here</span>
                  <span className="text-[9px] text-slate-400 mt-1 uppercase">Max 5 files. Docx, PDF, PPTX, WebP, PNG, JPEG</span>
                </div>
              </div>
              {details.photoVideoFiles && details.photoVideoFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {details.photoVideoFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl text-xs">
                      <span className="font-bold text-slate-700 truncate max-w-[200px]">{file.name}</span>
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); removeFile('photoVideoFiles', idx); }}
                        className="text-rose-500 hover:underline font-black uppercase text-[10px]"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. Facebook Live */}
        {requestTypes.includes('Facebook Live') && (
          <div className="bg-indigo-50/20 p-6 rounded-3xl border border-indigo-100/50 space-y-6 animate-in fade-in duration-300">
            <h3 className="text-xs font-black text-indigo-900 uppercase tracking-[0.2em] border-b border-indigo-100/50 pb-3 flex items-center gap-2">
              <span>🎥</span> Facebook Live Details
            </h3>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-[0.15em]">Event Point Person Name and Mobile Number*</label>
              <input 
                type="text" 
                name="fbLivePointPerson"
                value={details.fbLivePointPerson || ''}
                onChange={handleChange}
                placeholder="Write N/A if it is the same as the requester"
                className="w-full p-4 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl focus:border-indigo-500 outline-none transition-all text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-[0.15em]">Event Title*</label>
              <input 
                type="text" 
                name="fbLiveEventTitle"
                value={details.fbLiveEventTitle || ''}
                onChange={handleChange}
                placeholder="Event Title"
                className="w-full p-4 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl focus:border-indigo-500 outline-none transition-all text-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-[0.15em]">Event Date*</label>
                <input 
                  type="date" 
                  name="fbLiveEventDate"
                  value={details.fbLiveEventDate || ''}
                  onChange={handleChange}
                  className="w-full p-4 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-[0.15em]">Event Time*</label>
                <input 
                  type="time" 
                  name="fbLiveEventTime"
                  value={details.fbLiveEventTime || ''}
                  onChange={handleChange}
                  className="w-full p-4 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-[0.15em]">Event Duration*</label>
                <input 
                  type="text" 
                  name="fbLiveDuration"
                  value={details.fbLiveDuration || ''}
                  onChange={handleChange}
                  placeholder="e.g. 2 hours"
                  className="w-full p-4 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-[0.15em]">Event Point Person/Coordinator*</label>
                <input 
                  type="text" 
                  name="fbLiveCoordinator"
                  value={details.fbLiveCoordinator || ''}
                  onChange={handleChange}
                  placeholder="Name of Coordinator"
                  className="w-full p-4 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                />
              </div>
            </div>

            {/* Custom file uploader - 1 file */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-[0.15em]">Please attach the event or program flow. Upload event background information if not applicable (1 file - Max 1GB)*</label>
              <div 
                className="p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-white text-center cursor-pointer hover:border-indigo-500 hover:bg-slate-50/50 transition-all"
                onClick={() => fileInputs.fbLive.current.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputs.fbLive}
                  onChange={(e) => handleFileChange('fbLiveFlowFile', e, 1, ['.docx', '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.ppt', '.pptx'])}
                  className="hidden" 
                />
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl mb-2">📁</div>
                  <span className="text-xs font-black text-slate-700">Choose Program Flow File</span>
                  <span className="text-[9px] text-slate-400 mt-1 uppercase">Max 1 file. Docx, PDF, PPTX, PNG, JPEG</span>
                </div>
              </div>
              {details.fbLiveFlowFile && details.fbLiveFlowFile.length > 0 && (
                <div className="mt-3 space-y-2">
                  {details.fbLiveFlowFile.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl text-xs">
                      <span className="font-bold text-slate-700 truncate max-w-[200px]">{file.name}</span>
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); removeFile('fbLiveFlowFile', idx); }}
                        className="text-rose-500 hover:underline font-black uppercase text-[10px]"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. Fallback Details (Local Media, Mascot, File Photos, Other Services) */}
        {hasFallbackTypes && (
          <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-6 animate-in fade-in duration-300">
            <h3 className="text-xs font-black text-[#0A1C5C] uppercase tracking-[0.2em] border-b border-slate-100 pb-3 flex items-center gap-2">
              <span>✨</span> Additional Media Requirements
            </h3>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-3 uppercase tracking-[0.15em]">
                {isLocalMediaSelected ? 'Platforms*' : 'Social Media Platform*'}
              </label>
              <div className="flex flex-wrap gap-2">
                {platformOptions.map(account => (
                  <button
                    key={account}
                    type="button"
                    onClick={() => toggleArrayValue('socialAccount', account)}
                    className={`px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest border-2 transition-all ${isSelected('socialAccount', account) ? 'bg-[#0A1C5C] border-[#0A1C5C] text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                  >
                    {account}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-3 uppercase tracking-[0.15em]">Specific Service Required*</label>
              <div className="space-y-3">
                {serviceOptions.map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleArrayValue('serviceType', option)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${isSelected('serviceType', option) ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-50 bg-white hover:border-slate-200'}`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected('serviceType', option) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}>
                      {isSelected('serviceType', option) && <span className="text-white text-[10px] leading-none">✓</span>}
                    </div>
                    <span className={`text-xs font-bold leading-relaxed ${isSelected('serviceType', option) ? 'text-indigo-900' : 'text-slate-600'}`}>{option}</span>
                  </button>
                ))}
                {isSelected('serviceType', 'Other') && (
                  <input 
                    type="text" 
                    name="otherService"
                    value={details.otherService || ''}
                    onChange={handleChange}
                    placeholder="Please describe your specific requirement..."
                    className="w-full p-4 mt-2 bg-white border-2 border-indigo-200 focus:border-indigo-500 outline-none transition-all text-sm font-medium animate-in fade-in"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-6">
        <button 
          type="button"
          onClick={onPrev}
          className="flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95"
        >
          Back
        </button>
        <button 
          type="button"
          onClick={handleContinue} 
          className="flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl bg-[#0A1C5C] text-white hover:bg-[#122A85] hover:-translate-y-1 active:scale-95"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
