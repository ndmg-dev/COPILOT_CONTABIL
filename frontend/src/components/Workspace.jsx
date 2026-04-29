import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import MessageActions from './MessageActions';
import { useUI } from '../context/UIContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Icons
const IconUpload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
);
const IconFile = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
);
const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
);
const IconSend = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
);

import { useWorkspace } from '../context/WorkspaceContext';

const Workspace = () => {
    const { documents, setDocuments, messages, setMessages, clearWorkspaceSession } = useWorkspace();
    const [inputStr, setInputStr] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    
    // Auth token mechanism
    const [token, setToken] = useState(null);
    useEffect(() => {
        const fetchToken = async () => {
            const { supabase } = await import('../utils/supabase');
            const { data } = await supabase.auth.getSession();
            if (data?.session) {
                setToken(data.session.access_token);
            }
        };
        fetchToken();
    }, []);

    const { showFeedback } = useUI();
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);

    const handleFileChange = async (e) => {
        if (!e.target.files?.length) return;
        await processFiles(Array.from(e.target.files));
    };

    const processFiles = async (files) => {
        if (!token) return;
        
        showFeedback('loading', 'Processando Documentos', 'Extraindo texto via OCR e Engine LLM...');
        try {
            const formData = new FormData();
            for (const file of files) {
                formData.append('files', file); // 'files' is the key expected by the FastAPI backend
            }
            
            const res = await fetch(`${API_URL}/api/workspace/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Erro ao processar');
            
            const newDocs = (data.documents || []).map((doc) => ({
                id: doc.id,
                name: doc.file_name,
                content: doc.extracted_content
            }));

            setDocuments(prev => [...prev, ...newDocs]);
            showFeedback('success', 'Upload Concluído', 'Arquivos lidos com sucesso. O contexto agora está isolado e pronto para análise.');
        } catch (e) {
            showFeedback('error', 'Erro no Leitor', e.message);
        }
    };

    const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
    const handleDragLeave = (e) => { e.preventDefault(); setIsDragOver(false); };
    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files?.length) await processFiles(Array.from(e.dataTransfer.files));
    };

    const removeDoc = (id) => setDocuments(docs => docs.filter(d => d.id !== id));

    const handleSend = async (messageText) => {
        const text = messageText || inputStr;
        if (!text.trim() || !token) return;

        if (documents.length === 0) {
            showFeedback('error', 'Nenhum Arquivo', 'Faça upload de pelo menos um documento para analisá-lo.');
            return;
        }

        const consolidatedContext = documents.map(d => `--- ARQUIVO: ${d.name} ---\n${d.content}\n`).join('\n');
        
        const newMsg = { role: 'user', content: text };
        setMessages(prev => [...prev, newMsg]);
        setInputStr('');

        const aiMsgPlace = { role: 'assistant', content: '...', loading: true };
        setMessages(prev => [...prev, aiMsgPlace]);
        
        try {
            const res = await fetch(`${API_URL}/api/workspace/chat`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    document_context: consolidatedContext,
                    tone: 'Formal',
                    detail_level: 'Detalhada'
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Erro na API');
            
            setMessages(prev => prev.map((msg, i) => i === prev.length - 1 ? { role: 'assistant', content: data.response } : msg));
        } catch (e) {
            setMessages(prev => prev.map((msg, i) => i === prev.length - 1 ? { role: 'assistant', content: `⚠️ Falha: ${e.message}`, isError: true } : msg));
        }
    };

    const handleQuickAction = (action) => {
        handleSend(action);
    };

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    return (
        <div className="flex h-full w-full bg-slate-950 overflow-hidden">
            {/* Lado Esquerdo: Gerenciador Documental */}
            <div className="w-1/3 border-r border-slate-800/60 bg-slate-900/40 p-6 flex flex-col gap-6 relative">
                <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-xl font-bold text-slate-100 uppercase tracking-wide">Workspace</h2>
                        <p className="text-[10px] text-slate-400 font-mono">Motor Isento de RAG</p>
                    </div>
                    <button 
                        onClick={() => setIsResetModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-500/10 border border-red-500/20 text-[10px] font-medium text-red-400 hover:bg-red-500/20 transition-all"
                    >
                        <IconTrash /> Nova Análise
                    </button>
                </div>

                <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex-shrink-0 w-full h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 ${isDragOver ? 'border-[#2DD4BF] bg-[#2DD4BF]/10' : 'border-slate-700 hover:border-[#818CF8] hover:bg-slate-800/50'}`}
                >
                    <IconUpload />
                    <p className="text-sm text-slate-300 font-medium">Solte os arquivos aqui</p>
                    <p className="text-[10px] text-slate-500 font-mono">PDF, DOCX, XLSX, CSV, JPG, PNG</p>
                    <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.csv,.xlsx,.xls,.docx,.jpg,.jpeg,.png"/>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                    {documents.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-700/50 group">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-1.5 rounded-md bg-[#818CF8]/10 text-[#818CF8]"><IconFile /></div>
                                <span className="text-xs font-medium text-slate-300 truncate">{doc.name}</span>
                            </div>
                            <button onClick={() => removeDoc(doc.id)} className="p-1.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"><IconTrash /></button>
                        </div>
                    ))}
                    {documents.length === 0 && (
                        <div className="h-full flex items-center justify-center text-center text-slate-500 text-xs font-mono">
                            Nenhum arquivo local instanciado.
                        </div>
                    )}
                </div>
            </div>

            {/* Lado Direito: Chat Exclusivo */}
            <div className="flex-1 flex flex-col relative h-full">
                <div className="p-4 border-b border-slate-800/40 bg-slate-900/60 flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#2DD4BF] tracking-tight flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#2DD4BF] animate-pulse"></span>
                        Análise de Contexto Fechada
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Motor Isento de RAG</span>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center gap-8 opacity-60">
                            <h3 className="text-2xl font-bold font-mono tracking-tighter text-slate-400">Contexto Analítico</h3>
                        </div>
                    )}
                    {messages.map((m, i) => (
                        <div key={i} className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {m.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#818CF8] to-[#2DD4BF] flex items-center justify-center text-slate-900 font-bold text-xs shadow-lg flex-shrink-0">
                                    CC
                                </div>
                            )}
                            <div className={`max-w-[75%] p-4 rounded-2xl text-[13px] leading-relaxed relative ${m.role === 'user' ? 'bg-[#818CF8] text-[#E0E7FF]' : 'bg-slate-800/80 text-slate-200 border border-slate-700/50 shadow-md'}`}>
                                {m.loading ? (
                                    <div className="flex gap-1 py-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                                    </div>
                                ) : (
                                    <>
                                        <div className={`prose prose-sm max-w-none ${m.role === 'user' ? 'prose-p:text-[#E0E7FF] text-[#E0E7FF]' : 'prose-invert'}`}>
                                            <ReactMarkdown 
                                                remarkPlugins={[remarkGfm, remarkMath]}
                                                rehypePlugins={[rehypeKatex]}
                                            >
                                                {m.content}
                                            </ReactMarkdown>
                                        </div>
                                        {m.role === 'assistant' && !m.isError && (
                                            <MessageActions
                                                content={m.content}
                                                query={messages.slice(0, i).reverse().find(x => x.role === 'user')?.content || ''}
                                                onFeedback={showFeedback}
                                                variant="workspace"
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-slate-900/60 border-t border-slate-800/50">
                    <div className="flex gap-2 mb-3 px-1">
                        <button onClick={() => handleQuickAction('Analisar DRE e destacar as maiores margens de lucro e de prejuízo.')} className="px-3 py-1.5 rounded border border-[#2DD4BF]/30 text-[#2DD4BF] text-[10px] font-medium font-mono hover:bg-[#2DD4BF]/10 transition-colors">Analisar DRE</button>
                        <button onClick={() => handleQuickAction('Extrair todos os dados brutos e totais destas Notas Fiscais estruturando-os no formato de tabela.')} className="px-3 py-1.5 rounded border border-[#818CF8]/30 text-[#818CF8] text-[10px] font-medium font-mono hover:bg-[#818CF8]/10 transition-colors">Extrair dados de NF</button>
                        <button onClick={() => handleQuickAction('Categorize os lançamentos deste extrato em Operacional, Investimentos e Impostos.')} className="px-3 py-1.5 rounded border border-purple-400/30 text-purple-400 text-[10px] font-medium font-mono hover:bg-purple-400/10 transition-colors">Categorizar Extrato</button>
                    </div>

                    <div className="flex gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800 focus-within:border-[#818CF8]/50 focus-within:ring-1 focus-within:ring-[#818CF8]/30 transition-all">
                        <input
                            value={inputStr}
                            onChange={(e) => setInputStr(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                            placeholder="Faça perguntas livres aos arquivos extraídos..."
                            className="flex-1 bg-transparent border-none text-sm text-slate-200 outline-none px-2 font-sans placeholder-slate-600"
                        />
                        <button onClick={() => handleSend()} className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-r from-[#818CF8] to-[#2DD4BF] text-slate-900 transition-transform active:scale-95 disabled:opacity-50" disabled={!inputStr.trim()}>
                            <IconSend />
                        </button>
                    </div>
                </div>
            </div>

            {isResetModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-sm rounded-xl border border-slate-800/50 bg-slate-900 shadow-2xl overflow-hidden zoom-in-95">
                        <div className="p-5 flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 text-red-400">
                                <IconTrash />
                            </div>
                            <h3 className="text-lg font-bold text-slate-100 mb-2">Limpar Workspace</h3>
                            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                                Tem certeza? Ao iniciar uma nova análise, os arquivos extraídos e o histórico atual serão permanently removidos da tela local.
                            </p>
                            <div className="flex w-full gap-3">
                                <button 
                                    onClick={() => setIsResetModalOpen(false)}
                                    className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={() => {
                                        clearWorkspaceSession();
                                        setIsResetModalOpen(false);
                                        showFeedback('success', 'Sessão Limpa', 'Workspace pronto para nova análise.');
                                    }}
                                    className="flex-1 py-2 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-400 transition-colors shadow-lg shadow-red-500/20"
                                >
                                    Confirmar Limpeza
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Workspace;
