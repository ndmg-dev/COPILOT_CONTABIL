import React from 'react';

export default function FeedbackModal({ isOpen, onClose, status, title, message }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 bg-[#0B1120]/80 backdrop-blur-sm" 
        onClick={status !== 'loading' ? onClose : undefined} 
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-sm glass-panel border border-slate-700/50 p-6 shadow-2xl flex flex-col items-center text-center animate-fade-in-up">
        
        {/* Animated Icons / Loader */}
        <div className="mb-6 mt-2 h-16 flex items-center justify-center">
          {status === 'loading' && (
            <div className="loader"></div>
          )}
          {status === 'success' && (
            <div className="w-12 h-12 rounded-full bg-[#2DD4BF]/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-[#2DD4BF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {status === 'error' && (
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>

        {/* Text Area */}
        <h3 className="text-lg font-semibold text-slate-100 mb-2">
          {title || (status === 'loading' ? 'Processando...' : status === 'success' ? 'Sucesso' : 'Erro')}
        </h3>
        <p className="text-sm text-slate-400 leading-relaxed max-w-[280px]">
          {message}
        </p>

        {/* Action Button */}
        {status !== 'loading' && (
          <button
            onClick={onClose}
            className={`mt-8 w-full py-2.5 rounded-lg font-medium transition-all duration-300 ${
              status === 'error' 
                ? 'bg-slate-800 text-slate-300 hover:bg-red-500/20 hover:text-red-400 border border-slate-700/50 hover:border-red-500/50' 
                : 'bg-slate-800 text-slate-300 hover:bg-[#2DD4BF]/20 hover:text-[#2DD4BF] border border-slate-700/50 hover:border-[#2DD4BF]/50'
            }`}
          >
            Fechar
          </button>
        )}
      </div>
    </div>
  );
}
