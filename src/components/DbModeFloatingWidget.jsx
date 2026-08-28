// OFFLINE-MODE FEATURE
// Floating corner widget hosting the online/offline DB source switch —
// rendered once from Layout.astro (login page) and ResponsiveLayout.jsx
// (every authenticated page) so it appears everywhere without being mixed
// into the header navigation. Delete this file (and its two usages) to
// remove the switch from the UI.
import React from 'react';
import DbModeSwitch from './DbModeSwitch';

export default function DbModeFloatingWidget() {
  return (
    <div className="fixed bottom-4 right-4 z-[100] bg-white rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-200 px-3 py-2">
      <DbModeSwitch compact />
    </div>
  );
}
