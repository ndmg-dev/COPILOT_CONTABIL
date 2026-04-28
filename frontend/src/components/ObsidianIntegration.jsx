import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import FeedbackModal from './FeedbackModal';
import ConfirmModal from './ConfirmModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── Feather Icons ──────────────────────────────────────────────────────────
const IconObsidian = () => (
  <svg width="28" height="28" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M337.3 101.6L244.6 3.2C243.4 1.8 241.5 1 239.5 1.3C237.6 1.5 235.9 2.8 235.2 4.6L175.5 161.3L337.3 101.6Z" fill="#a78bfa"/>
    <path d="M175.5 161.3L123.6 247.5C122.4 249.5 122.5 252 123.9 253.9L256.4 428.7L175.5 161.3Z" fill="#818CF8"/>
    <path d="M256.4 428.7L350.9 508.1C352.7 509.5 355.2 509.7 357.1 508.4C359.1 507.2 360 504.9 359.4 502.7L337.3 101.6L175.5 161.3L256.4 428.7Z" fill="#6366f1"/>
    <path d="M430.5 209.9C429.1 208.1 426.7 207.3 424.5 208L337.3 101.6L359.4 502.7L430.5 209.9Z" fill="#4f46e5"/>
  </svg>
);

const IconSync = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6"/><path d="M2.5 22v-6h6"/>
    <path d="M2.5 11.5a10 10 0 0 1 18.8-4.3"/><path d="M21.5 12.5a10 10 0 0 1-18.8 4.2"/>
  </svg>
);

const IconPlug = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/>
    <path d="M18 8v5a6 6 0 0 1-12 0V8z"/>
  </svg>
);

const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

const IconFolder = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

const IconCheck = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const IconSettings = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v2m0 18v2m-9-11h2m18 0h2m-3.3-6.7-1.4 1.4M6.7 17.3l-1.4 1.4M17.3 17.3l1.4 1.4M6.7 6.7 5.3 5.3"/>
  </svg>
);

const IconClock = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

const IconCheckCircle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const IconFileText = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/>
  </svg>
);

const IconLayers = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
  </svg>
);

const IconCpu = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/>
    <line x1="9" x2="9" y1="1" y2="4"/><line x1="15" x2="15" y1="1" y2="4"/>
    <line x1="9" x2="9" y1="20" y2="23"/><line x1="15" x2="15" y1="20" y2="23"/>
    <line x1="20" x2="23" y1="9" y2="9"/><line x1="20" x2="23" y1="14" y2="14"/>
    <line x1="1" x2="4" y1="9" y2="9"/><line x1="1" x2="4" y1="14" y2="14"/>
  </svg>
);

const IconMessageCircle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
  </svg>
);

const Spinner = ({ size = 'h-5 w-5', color = 'text-[#818CF8]' }) => (
  <svg className={`animate-spin ${size} ${color}`} viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>
);

const ObsidianIntegration = () => {
  // State
  const [authorized, setAuthorized] = useState(null);
  const [activeTab, setActiveTab] = useState('sync'); // 'sync' | 'history'
  const [mode, setMode] = useState('filesystem');
  const [apiUrl, setApiUrl] = useState('https://127.0.0.1:27124');
  const [apiKey, setApiKey] = useState('');
  const [vaultPath, setVaultPath] = useState('');
  const [folderFilter, setFolderFilter] = useState('');
  const [smartFilter, setSmartFilter] = useState(true);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [syncHistory, setSyncHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [feedback, setFeedback] = useState({ isOpen: false, status: '', title: '', message: '' });
  const [confirmObj, setConfirmObj] = useState({ isOpen: false, id: null });

  const showFeedback = (status, title, message) => setFeedback({ isOpen: true, status, title, message });

  // Auth check
  useEffect(() => {
    const checkRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) { setAuthorized(false); return; }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      setAuthorized(data?.role === 'admin' || data?.role === 'socio');
    };
    checkRole();
  }, []);

  useEffect(() => { if (authorized) { loadConfig(); loadHistory(); } }, [authorized]);

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Sessão expirada');
    return { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
  };

  // Load saved config
  const loadConfig = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/admin/obsidian/config`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          const c = data.config;
          setMode(c.mode || 'filesystem');
          setApiUrl(c.api_url || 'https://127.0.0.1:27124');
          setApiKey(c.api_key || '');
          setVaultPath(c.vault_path || '');
          setFolderFilter(c.folder_filter || '');
          setSmartFilter(c.smart_filter !== false);
        }
      }
    } catch (err) { console.error('Config load error:', err); }
  };

  // Load sync history
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/admin/obsidian/history`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSyncHistory(data.syncs || []);
      }
    } catch (err) { console.error('History load error:', err); }
    finally { setLoadingHistory(false); }
  };

  // Test connection
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/admin/obsidian/test-connection`, {
        method: 'POST', headers,
        body: JSON.stringify({ mode, api_url: apiUrl, api_key: apiKey, vault_path: vaultPath, folder_filter: folderFilter }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult(data);
        showFeedback('success', 'Conexão OK', data.message);
      } else {
        showFeedback('error', 'Falha na Conexão', data.detail || 'Erro desconhecido');
      }
    } catch (err) {
      showFeedback('error', 'Erro', err.message);
    } finally { setTesting(false); }
  };

  // Sync vault
  const handleSync = async () => {
    setSyncing(true);
    try {
      const headers = await getAuthHeaders();
      // Save config first
      await fetch(`${API_URL}/api/admin/obsidian/config`, {
        method: 'POST', headers,
        body: JSON.stringify({ mode, api_url: apiUrl, api_key: apiKey, vault_path: vaultPath, folder_filter: folderFilter, smart_filter: smartFilter }),
      });
      // Run sync
      const res = await fetch(`${API_URL}/api/admin/obsidian/sync`, {
        method: 'POST', headers,
        body: JSON.stringify({ mode, api_url: apiUrl, api_key: apiKey, vault_path: vaultPath, folder_filter: folderFilter, smart_filter: smartFilter }),
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback('success', 'Sincronização Concluída', data.message);
        loadHistory();
      } else {
        showFeedback('error', 'Falha na Sincronização', data.detail || 'Erro desconhecido');
      }
    } catch (err) {
      showFeedback('error', 'Erro Crítico', err.message);
    } finally { setSyncing(false); }
  };

  // Delete sync
  const execDeleteSync = async (syncId) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/admin/obsidian/sync/${syncId}`, { method: 'DELETE', headers });
      if (res.ok) {
        showFeedback('success', 'Removido', 'Sincronização removida da base.');
        loadHistory();
      }
    } catch (err) { showFeedback('error', 'Erro', err.message); }
  };

  // Guard screens
  if (authorized === null) return (
    <div className="h-full flex items-center justify-center" style={{ background: '#0B1120' }}>
      <Spinner size="h-8 w-8" />
    </div>
  );
  if (!authorized) return (
    <div className="h-full flex flex-col items-center justify-center gap-4" style={{ background: '#0B1120' }}>
      <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-400"><circle cx="12" cy="12" r="10"/><line x1="4.93" x2="19.07" y1="4.93" y2="19.07"/></svg>
      </div>
      <h2 className="text-lg font-bold text-slate-200">Acesso Restrito</h2>
      <p className="text-xs text-slate-500 text-center max-w-xs">Apenas <strong className="text-slate-300">Administradores</strong> podem configurar integrações.</p>
    </div>
  );

  return (
    <div className="p-6 h-full overflow-y-auto" style={{ background: '#0B1120' }}>
      <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="w-14 h-14 rounded-xl bg-[#818CF8]/10 border border-[#818CF8]/20 flex items-center justify-center shadow-lg shadow-[#818CF8]/5 mx-auto mb-4">
          <IconObsidian />
        </div>
        <h1 className="text-xl font-semibold text-slate-200">Integração Obsidian</h1>
        <p className="text-xs text-slate-500 font-mono mt-1">Sincronize seu vault para enriquecer a base RAG do Copilot</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg bg-slate-900/50 border border-slate-800/50 w-fit mx-auto">
        {[{ id: 'sync', label: 'Configurar & Sincronizar', icon: <IconSettings /> }, { id: 'history', label: 'Histórico', icon: <IconClock /> }].map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id === 'history') loadHistory(); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-all ${activeTab === tab.id
              ? 'bg-[#818CF8]/15 text-[#818CF8] border border-[#818CF8]/20'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Sync Config ── */}
      {activeTab === 'sync' && (
        <div className="space-y-6">
          {/* Mode Selector */}
          <div className="rounded-xl border border-slate-800/50 p-5" style={{ background: 'rgba(15,23,42,0.5)' }}>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Modo de Conexão</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'filesystem', label: 'Pasta Local', desc: 'Leitura direta do vault no servidor', icon: <IconFolder /> },
                { id: 'api', label: 'REST API', desc: 'Plugin "Local REST API" do Obsidian', icon: <IconPlug /> },
              ].map(opt => (
                <button key={opt.id} onClick={() => setMode(opt.id)}
                  className={`p-4 rounded-lg border text-left transition-all ${mode === opt.id
                    ? 'border-[#818CF8]/40 bg-[#818CF8]/5 shadow-md shadow-[#818CF8]/5'
                    : 'border-slate-800/50 hover:border-slate-700/50 bg-slate-900/30'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={mode === opt.id ? 'text-[#818CF8]' : 'text-slate-500'}>{opt.icon}</span>
                    <span className={`text-sm font-medium ${mode === opt.id ? 'text-[#818CF8]' : 'text-slate-300'}`}>{opt.label}</span>
                    {mode === opt.id && <span className="text-[#2DD4BF] ml-auto"><IconCheck /></span>}
                  </div>
                  <p className="text-[11px] text-slate-500">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Connection Fields */}
          <div className="rounded-xl border border-slate-800/50 p-5 space-y-4" style={{ background: 'rgba(15,23,42,0.5)' }}>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {mode === 'api' ? 'Configuração da API' : 'Caminho do Vault'}
            </label>

            {mode === 'api' ? (
              <>
                <div>
                  <label className="text-[11px] text-slate-500 mb-1 block">URL da API</label>
                  <input value={apiUrl} onChange={e => setApiUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/50 text-sm text-slate-200 font-mono focus:border-[#818CF8]/40 focus:ring-1 focus:ring-[#818CF8]/20 outline-none transition-all"
                    placeholder="https://127.0.0.1:27124" />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 mb-1 block">API Key (do plugin)</label>
                  <input value={apiKey} onChange={e => setApiKey(e.target.value)} type="password"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/50 text-sm text-slate-200 font-mono focus:border-[#818CF8]/40 focus:ring-1 focus:ring-[#818CF8]/20 outline-none transition-all"
                    placeholder="Cole a chave do plugin Local REST API" />
                </div>
              </>
            ) : (
              <div>
                <label className="text-[11px] text-slate-500 mb-1 block">Caminho absoluto do vault</label>
                <input value={vaultPath} onChange={e => setVaultPath(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/50 text-sm text-slate-200 font-mono focus:border-[#818CF8]/40 focus:ring-1 focus:ring-[#818CF8]/20 outline-none transition-all"
                  placeholder="C:\Users\Contador\ObsidianVault" />
              </div>
            )}

            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Filtro de pasta (opcional)</label>
              <input value={folderFilter} onChange={e => setFolderFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/50 text-sm text-slate-200 font-mono focus:border-[#818CF8]/40 focus:ring-1 focus:ring-[#818CF8]/20 outline-none transition-all"
                placeholder="Ex: Contabilidade/ ou Legislacao/" />
            </div>

            {/* Smart Filter Toggle */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-xs text-slate-300 font-medium">Filtro Inteligente</p>
                <p className="text-[10px] text-slate-500">Priorizar notas com tags/conteúdo contábil</p>
              </div>
              <button onClick={() => setSmartFilter(!smartFilter)}
                className={`w-10 h-5 rounded-full transition-all relative ${smartFilter ? 'bg-[#818CF8]' : 'bg-slate-700'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow absolute top-0.5 transition-all ${smartFilter ? 'left-5' : 'left-0.5'}`}/>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <button onClick={handleTestConnection} disabled={testing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-700/60 text-sm font-medium text-slate-300 hover:border-[#818CF8]/40 hover:text-[#818CF8] transition-all disabled:opacity-50">
              {testing ? <Spinner size="h-4 w-4" /> : <IconPlug />}
              {testing ? 'Testando...' : 'Testar Conexão'}
            </button>
            <button onClick={handleSync} disabled={syncing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#818CF8] text-sm font-medium text-white hover:bg-[#6366f1] transition-all disabled:opacity-50 shadow-lg shadow-[#818CF8]/20">
              {syncing ? <Spinner size="h-4 w-4" color="text-white" /> : <IconSync />}
              {syncing ? 'Sincronizando...' : 'Sincronizar Vault'}
            </button>
          </div>

          {/* Test Result Card */}
          {testResult && (
            <div className="rounded-xl border border-[#2DD4BF]/20 bg-[#2DD4BF]/5 p-5 space-y-3 animate-fadeIn">
              <h3 className="text-sm font-semibold text-[#2DD4BF] flex items-center gap-2"><IconCheckCircle /> Resultado do Teste</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Total de Notas', value: testResult.total_notes, color: '#818CF8' },
                  { label: 'Relevantes (Contábil)', value: testResult.accounting_relevant, color: '#2DD4BF' },
                  { label: 'Chunks Estimados', value: testResult.estimated_chunks, color: '#F59E0B' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className="text-[10px] text-slate-500 font-mono uppercase">{s.label}</p>
                    <p className="text-xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>
              {testResult.unique_tags?.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-500 font-mono uppercase mb-2">Tags Encontradas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {testResult.unique_tags.slice(0, 15).map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-full bg-slate-800/60 border border-slate-700/40 text-[10px] text-slate-400 font-mono">#{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* How it Works */}
          <div className="rounded-xl border border-slate-800/30 p-5" style={{ background: 'rgba(15,23,42,0.3)' }}>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Como Funciona</h3>
            <div className="space-y-2.5">
              {[
                { icon: <IconFileText />, text: 'Suas notas .md são lidas do vault Obsidian' },
                { icon: <IconLayers />, text: 'Frontmatter YAML, tags e wikilinks são extraídos' },
                { icon: <IconCpu />, text: 'Chunking inteligente por seções (headers markdown)' },
                { icon: <IconSync />, text: 'Embeddings gerados e armazenados no pgvector' },
                { icon: <IconMessageCircle />, text: 'Notas ficam disponíveis no RAG do Chat Global' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#818CF8]/10 border border-[#818CF8]/20 flex items-center justify-center flex-shrink-0 text-[#818CF8]">
                    {item.icon}
                  </div>
                  <p className="text-xs text-slate-400">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: History ── */}
      {activeTab === 'history' && (
        <div className="rounded-lg border border-slate-800/50 overflow-hidden" style={{ background: 'rgba(15,23,42,0.5)' }} >
          <div className="px-4 py-3 border-b border-slate-800/40 bg-slate-900/40 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">Sincronizações Anteriores</h2>
            <button onClick={loadHistory} className="text-slate-500 hover:text-[#818CF8] transition-all"><IconSync /></button>
          </div>
          {loadingHistory ? (
            <div className="p-10 text-center"><Spinner /></div>
          ) : syncHistory.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <IconObsidian />
              <p className="text-xs text-slate-600 font-mono mt-4">Nenhuma sincronização realizada ainda.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/30">
              {syncHistory.map(sync => (
                <div key={sync.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-800/10 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-[#818CF8]/10 border border-[#818CF8]/20 text-[#818CF8]">
                      <IconObsidian />
                    </div>
                    <div>
                      <p className="text-sm text-slate-200 font-medium">{sync.file_name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] text-slate-500 font-mono">
                          {(sync.file_size / 1024).toFixed(1)} KB
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono px-1.5 py-0.5 rounded bg-slate-800/40 border border-slate-700/50">
                          {sync.chunks_count} fragmentos
                        </span>
                        <span className="text-[9px] font-mono uppercase tracking-wider text-[#2DD4BF]">
                          {sync.analysis_status === 'completed' ? 'Indexado' : sync.analysis_status}
                        </span>
                        <span className="text-[10px] text-slate-600 font-mono">
                          {sync.created_at ? new Date(sync.created_at).toLocaleDateString('pt-BR') : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setConfirmObj({ isOpen: true, id: sync.id })}
                    className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                    <IconTrash />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <FeedbackModal isOpen={feedback.isOpen} onClose={() => setFeedback({ ...feedback, isOpen: false })}
        status={feedback.status} title={feedback.title} message={feedback.message} />
      <ConfirmModal isOpen={confirmObj.isOpen} onClose={() => setConfirmObj({ isOpen: false, id: null })}
        onConfirm={() => execDeleteSync(confirmObj.id)}
        title="Remover Sincronização" message="Deseja remover esta sincronização e todos os fragmentos RAG associados?"
        confirmText="Excluir Definitivamente" />
      </div>
    </div>
  );
};

export default ObsidianIntegration;
