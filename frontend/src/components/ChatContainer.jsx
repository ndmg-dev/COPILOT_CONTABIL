import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import ConfirmModal from './ConfirmModal';
import MessageActions from './MessageActions';
import { useUI } from '../context/UIContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

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
const FormattedMessage = ({ content, role, onSuggestionClick }) => {
  const lines = (content || '').split('\n');
  const mainLines = [];
  const suggestions = [];

  for (const line of lines) {
    if (line.trim().startsWith('SUGESTÃO_DE_PERGUNTA:')) {
      suggestions.push(line.replace('SUGESTÃO_DE_PERGUNTA:', '').trim());
    } else {
      mainLines.push(line);
    }
  }

  const mainContent = mainLines.join('\n');
  const safeContent = mainContent.replace(/(?<!\\)R\$/g, 'R\\$');
  
  return (
    <div className="flex flex-col w-full">
      <div className={`prose prose-sm max-w-none ${role === 'user' ? 'prose-p:text-[#E0E7FF] text-[#E0E7FF]' : 'prose-invert'}`}>
        <ReactMarkdown 
          remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: false }]]}
          rehypePlugins={[rehypeKatex]}
        >
          {safeContent}
        </ReactMarkdown>
      </div>
      {suggestions.length > 0 && role === 'assistant' && (
        <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-slate-700/50">
          <span className="w-full text-[10px] font-mono text-slate-500 uppercase mb-1">Perguntas Relacionadas</span>
          {suggestions.map((sug, idx) => (
            <button 
              key={idx}
              onClick={() => onSuggestionClick && onSuggestionClick(sug)}
              className="px-3 py-1.5 text-xs font-medium text-[#2DD4BF] bg-[#2DD4BF]/5 border border-[#2DD4BF]/20 rounded-full hover:bg-[#2DD4BF]/20 hover:border-[#2DD4BF]/40 transition-all text-left flex items-center gap-1.5 shadow-sm"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              {sug}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// CHAT CONTAINER
// ═══════════════════════════════════════════════════════════════════════════
const ChatContainer = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  
  const { showFeedback } = useUI();
  
  const [aiTone, setAiTone] = useState('Formal');
  const [aiDetail, setAiDetail] = useState('Padrão');
  const [attachedFile, setAttachedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { loadConversations(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

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

  const [confirmObj, setConfirmObj] = useState({ isOpen: false, convId: null, event: null });

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
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
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

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setAttachedFile(file);
    } else if (file) {
      showFeedback('error', 'Arquivo Inválido', 'Apenas arquivos PDF são aceitos. Evite anexar imagens ou planilhas diretamente.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
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
                <FormattedMessage content={msg.content} role={msg.role} onSuggestionClick={(text) => sendMessage(text)} />
                {msg.role === 'assistant' && (
                  <MessageActions
                    content={msg.content}
                    query={messages.slice(0, i).reverse().find(x => x.role === 'user')?.content || ''}
                    onFeedback={showFeedback}
                    variant="chat"
                  />
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
              ref={textareaRef}
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