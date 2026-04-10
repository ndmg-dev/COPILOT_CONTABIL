import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import FeedbackModal from './FeedbackModal';
import ConfirmModal from './ConfirmModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── SVG Icons ──────────────────────────────────────────────────────────────
const IconUpload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
  </svg>
);

const IconFile = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14.5 2 14.5 7.5 20 7.5"/>
  </svg>
);

const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

const IconDatabase = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-[#818CF8]">
    <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>
  </svg>
);

const KnowledgeAdmin = () => {
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState({ total_documents: 0, total_chunks: 0 });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [authorized, setAuthorized] = useState(null); // null = checking, true/false
  const fileInputRef = useRef(null);

  const [feedback, setFeedback] = useState({ isOpen: false, status: '', title: '', message: '' });
  const [confirmObj, setConfirmObj] = useState({ isOpen: false, id: null });

  const showFeedback = (status, title, message) => {
    setFeedback({ isOpen: true, status, title, message });
  };

  // Role gate: only admin/socio can access
  useEffect(() => {
    const checkRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) { setAuthorized(false); return; }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      const role = data?.role;
      setAuthorized(role === 'admin' || role === 'socio');
    };
    checkRole();
  }, []);

  useEffect(() => { if (authorized) loadKnowledge(); }, [authorized]);

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Sessão expirada');
    return { 'Authorization': `Bearer ${session.access_token}` };
  };

  const loadKnowledge = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/admin/knowledge`, { headers });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        setStats({ total_documents: data.total_documents, total_chunks: data.total_chunks });
      }
    } catch (err) {
      console.error('Error loading knowledge:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !file.type.includes('pdf')) {
      showFeedback('error', 'Arquivo Inválido', 'Apenas arquivos PDF são permitidos.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/admin/knowledge/ingest`, {
        method: 'POST',
        headers: { ...authHeaders },
        body: formData,
      });

      if (res.ok) {
        await loadKnowledge();
      } else {
        const data = await res.json();
        showFeedback('error', 'Falha na Indexação', data.detail || 'Erro desconhecido');
      }
    } catch (err) {
      showFeedback('error', 'Erro Crítico', `Falha no upload: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmDelete = (id) => {
    setConfirmObj({ isOpen: true, id });
  };

  const execDeleteDocument = async (id) => {
    try {
      showFeedback('loading', 'Processando', 'Removendo documento da base...');
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/admin/knowledge/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        loadKnowledge();
        showFeedback('success', 'Documento Removido', 'Arquivo removido com sucesso.');
      }
    } catch (err) {
      showFeedback('error', 'Falha na Remoção', `Erro ao deletar: ${err.message}`);
    }
  };

  // Access guard screens
  if (authorized === null) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: '#0B1120' }}>
        <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-[#818CF8] animate-spin"></div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4" style={{ background: '#0B1120' }}>
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
            <circle cx="12" cy="12" r="10"/><line x1="4.93" x2="19.07" y1="4.93" y2="19.07"/>
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-200">Acesso Restrito</h2>
        <p className="text-xs text-slate-500 text-center max-w-xs">
          Esta área é restrita a usuários com perfil de <strong className="text-slate-300">Administrador</strong>. Contate o gestor da sua organização.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-y-auto" style={{ background: '#0B1120' }}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-200 mb-1">Base Legal e Conhecimento (RAG)</h1>
          <p className="text-xs text-slate-500 font-mono">Gerencie os documentos que alimentam a inteligência do Copilot</p>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-[10px] text-slate-500 font-mono uppercase">Documentos</p>
            <p className="text-lg font-bold text-[#818CF8] font-mono">{stats.total_documents}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 font-mono uppercase">Fragmentos (Chunks)</p>
            <p className="text-lg font-bold text-[#2DD4BF] font-mono">{stats.total_chunks}</p>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="mb-8 border-2 border-dashed border-slate-800/60 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-[#818CF8]/40 hover:bg-[#818CF8]/5 transition-all group"
      >
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf" className="hidden" />
        <div className="w-12 h-12 rounded-full bg-slate-800/40 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          {uploading ? (
            <svg className="animate-spin h-6 w-6 text-[#2DD4BF]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <IconUpload />
          )}
        </div>
        <p className="text-sm text-slate-300 font-medium">
          {uploading ? 'Processando documento...' : 'Clique ou arraste manuais, leis ou normas em PDF'}
        </p>
        <p className="text-xs text-slate-500 mt-2 font-mono">
          Os arquivos serão fatiados e indexados para busca vetorial instantânea.
        </p>
      </div>

      {/* Documents List */}
      <div className="rounded-lg border border-slate-800/50 overflow-hidden" style={{ background: 'rgba(15,23,42,0.5)' }}>
        <div className="px-4 py-3 border-b border-slate-800/40 bg-slate-900/40">
          <h2 className="text-sm font-semibold text-slate-300">Documentos Indexados</h2>
        </div>
        
        {loading ? (
          <div className="p-10 text-center font-mono text-xs text-slate-600 animate-pulse">Consultando base vetorial...</div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <IconDatabase />
            <p className="text-xs text-slate-600 font-mono mt-4">Nenhum documento na base de conhecimento.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/30">
            {documents.map((doc) => (
              <div key={doc.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-800/10 transition-all group">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded bg-slate-800/60 border ${doc.analysis_status === 'completed' ? 'border-[#2DD4BF]/20 text-[#2DD4BF]' : 'border-slate-700 text-slate-500'}`}>
                    <IconFile />
                  </div>
                  <div>
                    <p className="text-sm text-slate-200 font-medium">{doc.file_name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono px-1.5 py-0.5 rounded bg-slate-800/40 border border-slate-700/50">
                        {doc.chunks_count} fragmentos
                      </span>
                      <span className={`text-[9px] font-mono uppercase tracking-wider ${doc.analysis_status === 'completed' ? 'text-[#2DD4BF]' : 'text-amber-400'}`}>
                        {doc.analysis_status === 'completed' ? 'Indexado' : doc.analysis_status}
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => confirmDelete(doc.id)}
                  className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <IconTrash />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <FeedbackModal 
        isOpen={feedback.isOpen} 
        onClose={() => setFeedback({ ...feedback, isOpen: false })}
        status={feedback.status}
        title={feedback.title}
        message={feedback.message}
      />

      <ConfirmModal
        isOpen={confirmObj.isOpen}
        onClose={() => setConfirmObj({ isOpen: false, id: null })}
        onConfirm={() => execDeleteDocument(confirmObj.id)}
        title="Remover Documento"
        message="Deseja remover este documento e todos os seus fragmentos RAG da base de conhecimento?"
        confirmText="Excluir Definitivamente"
      />

    </div>
  );
};

export default KnowledgeAdmin;
