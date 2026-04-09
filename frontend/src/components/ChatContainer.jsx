import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import FeedbackModal from './FeedbackModal';
import ConfirmModal from './ConfirmModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── Custom Dropdown (Obsidian Dark) ─────────────────────────────────────────
const DarkCustomDropdown = ({ label, value, options, onChange }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] items-center font-mono text-slate-500 uppercase">{label}:</span>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-slate-900/40 border border-slate-700 hover:border-[#818CF8]/50 rounded px-2.5 py-1 text-xs text-slate-200 transition-colors flex items-center justify-between min-w-[100px]"
        >
          {options.find(o => o.value === value)?.label || value}
          <svg className={`w-3 h-3 ml-2 transition-transform text-slate-500 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </button>
      </div>
      
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-[140px] rounded-md shadow-2xl bg-[#0F172A] border border-slate-700 z-50 overflow-hidden">
          <ul className="py-1">
            {options.map((opt) => (
              <li key={opt.value}>
                <button
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                    value === opt.value ? 'bg-slate-800 text-[#2DD4BF]' : 'text-slate-300 hover:bg-slate-800/60 hover:text-[#2DD4BF]'
                  }`}
                >
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ─── SVG Icons ──────────────────────────────────────────────────────────────
const IconSend = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const IconPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>
  </svg>
);

const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

const IconScale = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-[#818CF8]">
    <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
    <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
    <path d="M7 21h10"/><path d="M12 3v18"/>
  </svg>
);

const IconFilePDF = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14.5 2 14.5 7.5 20 7.5"/>
    <path d="M10 12l-1 3h3.5c.8 0 1.5-.7 1.5-1.5S13.3 12 12.5 12H10z"/>
  </svg>
);

const IconMail = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const IconCopy = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
  </svg>
);

const IconClose = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const IconCloseSmall = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const IconPaperclip = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
);

const IconFileSmall = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14.5 2 14.5 7.5 20 7.5"/>
  </svg>
);

const IconUpload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
  </svg>
);

// ─── Terminal Loader ────────────────────────────────────────────────────────
const TerminalLoader = () => (
  <div className="flex justify-start">
    <div className="chat-bubble-ai min-w-[200px] terminal-loader">
      <div className="flex items-center gap-2 mb-3 opacity-40">
        <span className="text-[10px] font-mono uppercase tracking-tighter">Copilot Kernel</span>
        <span className="terminal-cursor" />
      </div>
      <div className="space-y-1">
        <div className="text-[11px] font-mono text-slate-500">CONSULTING_DB... <span className="text-[#2DD4BF]">OK</span></div>
        <div className="text-[11px] font-mono text-slate-500">APPLYING_NBC_TG... <span className="text-[#2DD4BF]">OK</span></div>
        <div className="text-[11px] font-mono text-[#818CF8] animate-pulse">GENERATING_LEGAL_RESPONSE...</div>
      </div>
      <div className="terminal-progress"><div className="terminal-progress-bar" /></div>
    </div>
  </div>
);

// ─── Suggestion Cards Data ──────────────────────────────────────────────────
const SUGGESTIONS = [
  { text: "Como calculo o FAP para 2026?", icon: "calc" },
  { text: "Resumir regras do IRPF 2026", icon: "doc" },
  { text: "Retenções na fonte para serviços de limpeza", icon: "law" },
  { text: "Tratamento contábil para leasing (NBC TG 06)", icon: "book" },
];

const SuggestionIcon = ({ type }) => {
  const cls = "w-5 h-5 text-[#818CF8]/60";
  switch (type) {
    case 'calc': return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><line x1="8" x2="8.01" y1="10" y2="10"/><line x1="12" x2="12.01" y1="10" y2="10"/><line x1="16" x2="16.01" y1="10" y2="10"/><line x1="8" x2="8.01" y1="14" y2="14"/><line x1="12" x2="12.01" y1="14" y2="14"/><line x1="8" x2="8.01" y1="18" y2="18"/><line x1="12" x2="12.01" y1="18" y2="18"/>
      </svg>
    );
    case 'doc': return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14.5 2 14.5 7.5 20 7.5"/><line x1="8" x2="16" y1="13" y2="13"/><line x1="8" x2="16" y1="17" y2="17"/>
      </svg>
    );
    case 'law': return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/>
      </svg>
    );
    case 'book': return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    );
    default: return null;
  }
};

// ─── Format AI Response ─────────────────────────────────────────────────────
const FormattedMessage = ({ content }) => {
  const lines = content.split('\n');
  const elements = [];
  let codeBlock = null;
  let mathBlock = false;
  let mathLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (codeBlock) {
        elements.push(
          <div key={`code-${i}`} className="code-block">
            <div className="code-block-header">{codeBlock.lang || 'code'}</div>
            <pre className="text-xs font-mono"><code>{codeBlock.lines.join('\n')}</code></pre>
          </div>
        );
        codeBlock = null;
      } else {
        codeBlock = { lang: line.slice(3).trim(), lines: [] };
      }
      continue;
    }
    if (codeBlock) { codeBlock.lines.push(line); continue; }

    if (line.trim() === '\\[') { mathBlock = true; mathLines = []; continue; }
    if (line.trim() === '\\]' && mathBlock) {
      elements.push(
        <div key={`math-${i}`} className="my-3 px-4 py-3 rounded-md bg-[#020617]/60 border border-slate-800/40">
          <pre className="font-mono text-sm text-[#2DD4BF] text-center whitespace-pre-wrap">{mathLines.join('\n')}</pre>
        </div>
      );
      mathBlock = false;
      continue;
    }
    if (mathBlock) { mathLines.push(line); continue; }

    if (line.startsWith('#### ')) {
      elements.push(<h5 key={i} className="text-sm font-semibold text-slate-200 mt-4 mb-1">{formatInline(line.slice(5))}</h5>);
    } else if (line.startsWith('### ')) {
      elements.push(<h4 key={i} className="text-sm font-semibold text-[#818CF8] mt-4 mb-1">{formatInline(line.slice(4))}</h4>);
    } else if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className="text-sm font-bold text-[#2DD4BF] mt-4 mb-1">{formatInline(line.slice(3))}</h3>);
    } else if (line.startsWith('# ')) {
      elements.push(<h2 key={i} className="text-base font-bold text-slate-100 mt-4 mb-2">{formatInline(line.slice(2))}</h2>);
    } else if (line.startsWith('> ')) {
      elements.push(<blockquote key={i} className="legal-citation">{formatInline(line.slice(2))}</blockquote>);
    } else if (/^[-*_]{3,}$/.test(line.trim())) {
      elements.push(<hr key={i} className="border-slate-800/40 my-3" />);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={i} className="flex gap-2 ml-2 text-sm text-slate-300">
          <span className="text-[#2DD4BF] mt-0.5 text-[10px] flex-shrink-0">&#9656;</span>
          <span className="flex-1">{formatInline(line.slice(2))}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)/);
      if (match) {
        elements.push(
          <div key={i} className="flex gap-2.5 ml-1 text-sm text-slate-300 mt-1">
            <span className="text-[#818CF8] font-mono text-xs mt-0.5 w-5 text-right flex-shrink-0">{match[1]}.</span>
            <span className="flex-1">{formatInline(match[2])}</span>
          </div>
        );
      }
    } else if (line.trim()) {
      elements.push(<p key={i} className="text-sm text-slate-300 leading-relaxed">{formatInline(line)}</p>);
    } else {
      elements.push(<div key={i} className="h-2" />);
    }
  }

  return <div className="space-y-1">{elements}</div>;
};

function formatInline(text) {
  if (!text) return null;
  const parts = [];
  let remaining = text;
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/s);
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)/);
    const mathMatch = remaining.match(/^(.*?)\\\((.+?)\\\)(.*)/);
    let earliest = null;
    let type = null;
    if (boldMatch && boldMatch[1] !== undefined) {
      const pos = boldMatch[1].length;
      if (!earliest || pos < earliest.pos) { earliest = { pos, match: boldMatch }; type = 'bold'; }
    }
    if (codeMatch && codeMatch[1] !== undefined) {
      const pos = codeMatch[1].length;
      if (!earliest || pos < earliest.pos) { earliest = { pos, match: codeMatch }; type = 'code'; }
    }
    if (mathMatch && mathMatch[1] !== undefined) {
      const pos = mathMatch[1].length;
      if (!earliest || pos < earliest.pos) { earliest = { pos, match: mathMatch }; type = 'math'; }
    }
    if (!earliest) { parts.push({ type: 'text', content: remaining }); break; }
    const m = earliest.match;
    if (m[1]) parts.push({ type: 'text', content: m[1] });
    parts.push({ type, content: m[2] });
    remaining = m[3] || '';
  }
  return parts.map((part, i) => {
    switch (part.type) {
      case 'bold': return <strong key={i} className="text-slate-100 font-semibold">{part.content}</strong>;
      case 'code': return <code key={i} className="inline-code">{part.content}</code>;
      case 'math': return <span key={i} className="font-mono text-[#2DD4BF] text-xs bg-[#2DD4BF]/5 px-1 py-0.5 rounded">{part.content}</span>;
      default: return <span key={i}>{part.content}</span>;
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// CHAT CONTAINER
// ═══════════════════════════════════════════════════════════════════════════
const ChatContainer = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [emailModal, setEmailModal] = useState({ open: false, subject: '', body: '' });
  const [exportModal, setExportModal] = useState({ open: false, content: '', query: '' });
  const [exportOpts, setExportOpts] = useState({ title: 'Parecer Técnico', includeLogo: true, isolateLegal: true });
  const [exporting, setExporting] = useState(false);
  const [aiTone, setAiTone] = useState('Formal');
  const [aiDetail, setAiDetail] = useState('Padrão');
  const [orgLogo, setOrgLogo] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => { loadConversations(); loadOrgLogo(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const loadOrgLogo = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', session.user.id).single();
      if (profile?.organization_id) {
        const { data: org } = await supabase.from('organizations').select('logo_url').eq('id', profile.organization_id).single();
        if (org?.logo_url) setOrgLogo(org.logo_url);
      }
    } catch { /* silent */ }
  };

  const getAuthHeaders = async (includeContentType = true) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Sessão expirada');
    const headers = { 'Authorization': `Bearer ${session.access_token}` };
    if (includeContentType) headers['Content-Type'] = 'application/json';
    return headers;
  };

  const loadConversations = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/chat/conversations`, { headers });
      if (res.ok) { const data = await res.json(); setConversations(data.conversations || []); }
    } catch { /* silent */ }
  };

  const [feedback, setFeedback] = useState({ isOpen: false, status: '', title: '', message: '' });
  const [confirmObj, setConfirmObj] = useState({ isOpen: false, convId: null, event: null });

  const showFeedback = (status, title, message) => {
    setFeedback({ isOpen: true, status, title, message });
  };

  const loadMessages = async (convId) => {
    setActiveConversation(convId);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/chat/conversations/${convId}/messages`, { headers });
      if (res.ok) { const data = await res.json(); setMessages(data.messages || []); }
    } catch { setMessages([]); }
  };

  const confirmDeleteConversation = (convId, e) => {
    e.stopPropagation();
    setConfirmObj({ isOpen: true, convId, event: e });
  };

  const execDeleteConversation = async (convId) => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_URL}/api/chat/conversations/${convId}`, { method: 'DELETE', headers });
      if (activeConversation === convId) { setActiveConversation(null); setMessages([]); }
      loadConversations();
    } catch { /* silent */ }
  };

  const sendMessage = async (currentInput) => {
    const textToSend = currentInput || input;
    if (!textToSend.trim() && !attachedFile) return;

    const displayText = attachedFile
      ? `${textToSend || 'Analise o documento anexado.'}`
      : textToSend;

    setInput('');
    const userMsg = { id: Date.now(), role: 'user', content: displayText, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // If there's an attached file, upload it first, then send the message
      if (attachedFile) {
        const authHeaders = await getAuthHeaders(false);
        const formData = new FormData();
        formData.append('file', attachedFile);

        // Upload the file
        await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          headers: authHeaders,
          body: formData,
        });
        setAttachedFile(null);
      }

      const headers = await getAuthHeaders();
      const payload = {
        message: displayText,
        conversation_id: activeConversation,
        tone: aiTone,
        detail_level: aiDetail,
      };

      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1, role: 'assistant', content: data.response, sources: data.sources || [], createdAt: new Date().toISOString(),
        }]);
        if (data.conversation_id && !activeConversation) {
          setActiveConversation(data.conversation_id);
          loadConversations();
        }
      } else {
        setMessages(prev => [...prev, {
          id: Date.now() + 1, role: 'assistant', content: `Erro: ${data.detail || 'Erro desconhecido'}`,
          sources: [], createdAt: new Date().toISOString(),
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'assistant', content: `Falha na conexão: ${err.message}`,
        sources: [], createdAt: new Date().toISOString(),
      }]);
    } finally { setLoading(false); }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', session.user.id).single();
      if (!profile?.organization_id) throw new Error('Organização não encontrada');

      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.organization_id}_logo_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('office_logos').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('office_logos').getPublicUrl(fileName);
      const logoUrl = publicUrlData.publicUrl;

      await supabase.from('organizations').update({ logo_url: logoUrl }).eq('id', profile.organization_id);
      setOrgLogo(logoUrl);
      showFeedback('success', 'Logo Atualizada', 'A identidade visual foi definida com sucesso.');
    } catch (err) {
      showFeedback('error', 'Falha no Upload', 'Erro ao fazer upload da logo: ' + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setAttachedFile(file);
    } else if (file) {
      showFeedback('error', 'Arquivo Inválido', 'Apenas arquivos PDF são aceitos. Evite anexar imagens ou planilhas diretamente.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openExportModal = (content, query) => {
    setExportOpts({ title: 'Parecer Técnico', includeLogo: true, isolateLegal: true });
    setExportModal({ open: true, content, query: query || '' });
  };

  const handleGeneratePDF = async () => {
    setExporting(true);
    try {
      const headers = await getAuthHeaders(false);
      const res = await fetch(`${API_URL}/api/export/pdf`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: exportModal.content,
          query: exportModal.query,
          title: exportOpts.title,
          include_logo: exportOpts.includeLogo,
          isolate_legal: exportOpts.isolateLegal,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `parecer_${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setExportModal({ ...exportModal, open: false });
        showFeedback('success', 'PDF Gerado', 'Seu arquivo PDF foi baixado.');
      } else {
        showFeedback('error', 'Falha de Servidor', 'Erro ao processar PDF.');
      }
    } catch { showFeedback('error', 'Sem Conexão', 'Falha na rede ao gerar PDF.'); }
    finally { setExporting(false); }
  };

  const handleRedigirEmail = (content) => {
    const subject = "Consultoria Contábil — Mendonça Galvão";
    const body = `Prezado cliente,\n\nConforme solicitado, seguem as orientações técnicas:\n\n${content}\n\nAtenciosamente,\nMendonça Galvão Contadores`;
    setEmailModal({ open: true, subject, body });
  };

  return (
    <div className="flex h-full overflow-hidden" style={{ background: '#0B1120' }}>
      {/* ── Conversations Sidebar ─────────────────────────────────────── */}
      <div className="w-64 border-r border-slate-800/40 bg-slate-900/40 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-800/40">
          <button onClick={() => { setActiveConversation(null); setMessages([]); }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-[#818CF8]/10 border border-[#818CF8]/20 text-xs font-medium text-[#818CF8] hover:bg-[#818CF8]/15 transition-all">
            <IconPlus /> Nova Consulta
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
          <p className="px-2 py-1 text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-1">Recentes</p>
          {conversations.length === 0 && (
            <p className="text-[10px] text-slate-600 text-center py-6 font-mono">Nenhuma conversa ainda.</p>
          )}
          {conversations.map(conv => (
            <div key={conv.id} onClick={() => loadMessages(conv.id)}
              className={`group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-all ${activeConversation === conv.id ? 'bg-slate-800/60 text-slate-100' : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-300'}`}>
              <span className="text-xs truncate font-medium">{conv.title || 'Conversa nova'}</span>
              <button onClick={(e) => confirmDeleteConversation(conv.id, e)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all">
                <IconTrash />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Chat Area ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* AI Config Header / Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800/40 bg-[#0B1120]/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2DD4BF] animate-pulse"></span>
            <span className="text-xs font-medium text-slate-300">Sessão Segura</span>
          </div>
          <div className="flex items-center gap-4">
            <DarkCustomDropdown 
              label="Tom"
              value={aiTone}
              onChange={setAiTone}
              options={[
                { value: 'Formal', label: 'Técnico/Formal' },
                { value: 'Informal', label: 'Didático/Informal' }
              ]}
            />
            <DarkCustomDropdown 
              label="Formato"
              value={aiDetail}
              onChange={setAiDetail}
              options={[
                { value: 'Resumida', label: 'Resumida (Rápido)' },
                { value: 'Padrão', label: 'Padrão' },
                { value: 'Detalhada', label: 'Detalhada (Completa)' }
              ]}
            />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 chat-messages-area">

          {/* ── Empty State with Suggestion Cards ────────────────────── */}
          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="mb-2 p-3 rounded-2xl bg-[#818CF8]/5 border border-[#818CF8]/10">
                <IconScale />
              </div>
              <h2 className="text-slate-200 font-semibold text-lg mt-4 tracking-tight">Consultoria Contábil IA</h2>
              <p className="text-slate-500 text-xs mt-1.5 max-w-sm font-mono leading-relaxed">
                Respostas fundamentadas em CPC, NBC, RFB e CLT. Selecione um tópico abaixo ou digite sua pergunta.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-8 w-full max-w-lg">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s.text)}
                    className="group relative text-left px-4 py-3.5 rounded-xl
                      bg-slate-900/40 border border-slate-800/50
                      hover:bg-[#818CF8]/5 hover:border-[#818CF8]/25
                      hover:shadow-[0_0_20px_rgba(129,140,248,0.06)]
                      transition-all duration-300 backdrop-blur-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                        <SuggestionIcon type={s.icon} />
                      </div>
                      <span className="text-xs text-slate-400 group-hover:text-slate-200 leading-relaxed transition-colors">
                        {s.text}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Message Bubbles ───────────────────────────────────────── */}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={msg.role === 'user' ? 'chat-bubble-user max-w-[80%]' : 'chat-bubble-ai max-w-[90%]'}>
                <div className="flex items-center gap-2 mb-1.5 opacity-50">
                  <span className="text-[10px] font-mono font-bold uppercase">{msg.role === 'user' ? 'Você' : 'Copilot'}</span>
                </div>
                <FormattedMessage content={msg.content} />
                {msg.role === 'assistant' && (
                  <div className="mt-4 pt-3 border-t border-slate-800/40 flex gap-2">
                    <button onClick={() => {
                        const prevUserMsg = messages.slice(0, i).reverse().find(m => m.role === 'user');
                        openExportModal(msg.content, prevUserMsg?.content);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/40 border border-slate-700/50 text-[10px] text-slate-400 hover:text-[#2DD4BF] hover:border-[#2DD4BF]/30 transition-all">
                      <IconFilePDF /> Gerar PDF
                    </button>
                    <button onClick={() => handleRedigirEmail(msg.content)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/40 border border-slate-700/50 text-[10px] text-slate-400 hover:text-[#818CF8] hover:border-[#818CF8]/30 transition-all">
                      <IconMail /> E-mail
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && <TerminalLoader />}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-slate-800/50 px-4 py-3 flex flex-col" style={{ background: 'rgba(11, 17, 32, 0.85)', backdropFilter: 'blur(12px)' }}>


          {/* Attached File Pill */}
          {attachedFile && (
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2DD4BF]/10 border border-[#2DD4BF]/20 text-[11px] text-[#2DD4BF] font-mono">
                <IconFileSmall />
                {attachedFile.name.length > 35 ? attachedFile.name.slice(0, 32) + '...' : attachedFile.name}
                <button
                  onClick={() => setAttachedFile(null)}
                  className="ml-1 p-0.5 rounded hover:bg-[#2DD4BF]/20 transition-colors"
                >
                  <IconCloseSmall />
                </button>
              </span>
            </div>
          )}

          <div className="w-full max-w-5xl mx-auto xl:w-[70%] flex items-end gap-2 relative">
            {/* Upload Button */}
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".pdf" className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 p-2.5 mb-1 rounded-lg text-slate-500 hover:text-[#2DD4BF] hover:bg-[#2DD4BF]/5 border border-transparent hover:border-[#2DD4BF]/20 transition-all"
              title="Anexar PDF"
            >
              <IconPaperclip />
            </button>

            {/* Text Input */}
            <textarea
              rows={1}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!loading && (input.trim() || attachedFile)) {
                    sendMessage();
                    e.target.style.height = 'auto';
                  }
                }
              }}
              placeholder={attachedFile ? `Pergunta sobre ${attachedFile.name}...` : "Cole balancetes, cite NBS ou digite a pergunta contábil... (Shift+Enter pula linha)"}
              className="flex-1 chat-input resize-none overflow-y-auto py-3 leading-relaxed min-h-[48px] max-h-[180px]"
              disabled={loading}
            />

            {/* Send Button */}
            <button
              onClick={() => sendMessage()}
              disabled={loading || (!input.trim() && !attachedFile)}
              className="send-button"
            >
              <IconSend />
            </button>
          </div>
        </div>
      </div>

      {/* ── PDF Export Modal ──────────────────────────────────────────── */}
      {exportModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-800/50 overflow-hidden" style={{ background: '#0F172A' }}>
            <div className="px-5 py-4 border-b border-slate-800/40 flex items-center justify-between bg-slate-900/40">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Exportar Parecer Técnico</h3>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">PDF corporativo white-label</p>
              </div>
              <button onClick={() => setExportModal({ ...exportModal, open: false })} className="text-slate-500 hover:text-slate-300">
                <IconClose />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Title Input */}
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1.5">Título do Parecer</label>
                <input
                  type="text"
                  value={exportOpts.title}
                  onChange={e => setExportOpts({ ...exportOpts, title: e.target.value })}
                  placeholder="Ex: Parecer Técnico: Retenção de ISS"
                  className="w-full px-3 py-2.5 bg-slate-800/40 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#2DD4BF]/40 transition-colors"
                />
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={exportOpts.includeLogo}
                    onChange={e => setExportOpts({ ...exportOpts, includeLogo: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-4 h-4 rounded border border-slate-700 bg-slate-800/50 flex items-center justify-center peer-checked:bg-[#2DD4BF]/20 peer-checked:border-[#2DD4BF]/40 transition-all">
                    {exportOpts.includeLogo && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2DD4BF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </div>
                  <span className="text-xs text-slate-300 group-hover:text-slate-100 transition-colors">Incluir logo do escritório no cabeçalho</span>
                </label>
                
                {/* Logo Upload UX */}
                {exportOpts.includeLogo && (
                  <div className="ml-7 p-3 bg-slate-900/40 border border-slate-800/60 rounded-lg flex items-center gap-3">
                    {orgLogo ? (
                      <>
                        <img src={orgLogo} alt="Logo do Escritório" className="h-8 max-w-[100px] object-contain rounded" />
                        <label className="cursor-pointer text-[10px] text-slate-400 hover:text-[#2DD4BF] underline transition-colors ml-auto">
                          Trocar Logo
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
                        </label>
                      </>
                    ) : (
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-[#2DD4BF] transition-colors w-full">
                        <IconUpload /> {uploadingLogo ? 'Enviando...' : 'Fazer upload da marca (PNG/JPG)'}
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
                      </label>
                    )}
                  </div>
                )}

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={exportOpts.isolateLegal}
                    onChange={e => setExportOpts({ ...exportOpts, isolateLegal: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-4 h-4 rounded border border-slate-700 bg-slate-800/50 flex items-center justify-center peer-checked:bg-[#818CF8]/20 peer-checked:border-[#818CF8]/40 transition-all">
                    {exportOpts.isolateLegal && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </div>
                  <span className="text-xs text-slate-300 group-hover:text-slate-100 transition-colors">Isolar fundamentação legal em seção dedicada</span>
                </label>
              </div>

              {/* Preview Info */}
              {exportModal.query && (
                <div className="px-3 py-2 bg-slate-800/30 border border-slate-700/30 rounded-lg">
                  <p className="text-[9px] font-mono text-slate-500 uppercase mb-1">Consulta incluída</p>
                  <p className="text-[11px] text-slate-400 truncate">{exportModal.query}</p>
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGeneratePDF}
                disabled={exporting}
                className="w-full py-2.5 rounded-lg bg-[#2DD4BF] text-[#0F172A] text-xs font-bold hover:bg-[#26b8a5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {exporting ? (
                  <><svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Gerando documento...</>
                ) : (
                  <><IconFilePDF /> Gerar Documento</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Email Draft Modal ─────────────────────────────────────────── */}
      {emailModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-2xl animate-in zoom-in duration-200">
            <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between bg-slate-900/40">
              <h3 className="text-sm font-semibold text-slate-200">Rascunho de E-mail</h3>
              <button onClick={() => setEmailModal({ ...emailModal, open: false })} className="text-slate-500 hover:text-slate-200">
                <IconClose />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Assunto</label>
                <div className="px-3 py-2 bg-slate-800/30 border border-slate-700/50 rounded text-slate-300 text-sm">
                  {emailModal.subject}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Corpo</label>
                <textarea readOnly className="w-full h-64 px-4 py-3 bg-slate-800/30 border border-slate-700/50 rounded text-slate-300 text-xs leading-relaxed font-sans focus:outline-none" value={emailModal.body} />
              </div>
              <div className="flex justify-end">
                <button onClick={() => { navigator.clipboard.writeText(emailModal.body); showFeedback('success', 'Email Copiado', 'Texto copiado para a área de transferência.'); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#818CF8] text-white text-xs font-semibold hover:bg-[#717cf0] transition-colors">
                  <IconCopy /> Copiar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Global Feedback Modal ──────────────────────────────────────── */}
      <FeedbackModal 
        isOpen={feedback.isOpen} 
        onClose={() => setFeedback({ ...feedback, isOpen: false })}
        status={feedback.status}
        title={feedback.title}
        message={feedback.message}
      />

      <ConfirmModal
        isOpen={confirmObj.isOpen}
        onClose={() => setConfirmObj({ isOpen: false, convId: null, event: null })}
        onConfirm={() => execDeleteConversation(confirmObj.convId)}
        title="Excluir Consulta"
        message="Deseja excluir esta conversa? O histórico e as respostas mapeadas da base legal serão irrecuperáveis."
        confirmText="Excluir Conversa"
      />

    </div>
  );
};

export default ChatContainer;