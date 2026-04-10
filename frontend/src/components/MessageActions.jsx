import React, { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Icons ────────────────────────────────────────────────────────────────────
const IconCopy = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
  </svg>
);

const IconCheck = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const IconFilePDF = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14.5 2 14.5 7.5 20 7.5"/>
    <path d="M10 12l-1 3h3.5c.8 0 1.5-.7 1.5-1.5S13.3 12 12.5 12H10z"/>
  </svg>
);

const IconMail = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

import { useUI } from '../context/UIContext';

/**
 * MessageActions — Reusable action toolbar for AI responses.
 * Used in both ChatContainer and Workspace.
 * 
 * Props:
 *   content    - Raw text of the AI message
 *   query      - (optional) Original user question, used as PDF context
 *   onFeedback - (optional) callback(status, title, message) for toast notifications
 *   variant    - 'chat' | 'workspace' (adjusts styling subtly)
 */
const MessageActions = ({ content, query = '', onFeedback, variant = 'chat' }) => {
  const [copied, setCopied] = useState(false);
  const { openExportModal, handleRedigirEmail, exporting } = useUI();

  const notify = (status, title, msg) => {
    if (onFeedback) onFeedback(status, title, msg);
  };

  // ── Copy to Clipboard ──────────────────────────────────────────────
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify('error', 'Erro', 'Não foi possível copiar o texto.');
    }
  };

  const btnBase = `flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all duration-150
    bg-slate-800/40 border border-slate-700/50`;

  return (
    <div className={`flex gap-2 flex-wrap ${variant === 'workspace' ? 'mt-3 pt-3 border-t border-slate-700/40' : 'mt-4 pt-3 border-t border-slate-800/40'}`}>
      {/* Copy */}
      <button
        onClick={handleCopy}
        className={`${btnBase} ${copied ? 'text-[#2DD4BF] border-[#2DD4BF]/30' : 'text-slate-400 hover:text-[#2DD4BF] hover:border-[#2DD4BF]/30'}`}
      >
        {copied ? <><IconCheck /> Copiado!</> : <><IconCopy /> Copiar</>}
      </button>

      {/* PDF */}
      <button
        onClick={() => openExportModal(content, query)}
        disabled={exporting}
        className={`${btnBase} text-slate-400 hover:text-[#2DD4BF] hover:border-[#2DD4BF]/30 disabled:opacity-50`}
      >
        <IconFilePDF /> {exporting ? 'Gerando...' : 'Gerar PDF'}
      </button>

      {/* Email */}
      <button
        onClick={() => handleRedigirEmail(content)}
        className={`${btnBase} text-slate-400 hover:text-[#818CF8] hover:border-[#818CF8]/30`}
      >
        <IconMail /> E-mail
      </button>
    </div>
  );
};

export default MessageActions;
