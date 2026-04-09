import React from 'react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmar", cancelText = "Cancelar" }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 bg-[#0B1120]/80 backdrop-blur-sm" 
        onClick={onClose} 
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-sm glass-panel border border-slate-700/50 p-6 shadow-2xl flex flex-col items-center text-center animate-fade-in-up">
        
        {/* Warning Icon */}
        <div className="mb-4 mt-2 w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <svg className="w-6 h-6 text-red-500/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        {/* Text Area */}
        <h3 className="text-lg font-semibold text-slate-100 mb-2">
          {title}
        </h3>
        <p className="text-sm text-slate-400 mb-8 leading-relaxed">
          {message}
        </p>

        {/* Actions */}
        <div className="flex w-full gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg font-medium text-slate-400 bg-slate-800/50 hover:bg-slate-800 hover:text-slate-200 border border-transparent hover:border-slate-700 transition-all duration-200"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-2.5 rounded-lg font-medium text-red-400 bg-red-950/30 hover:bg-red-900/40 border border-red-900/30 hover:border-red-500/30 transition-all duration-200"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
