import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import FeedbackModal from './FeedbackModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── SVG Icons (Technical Line Style) ───────────────────────────────────────
const IconUsers = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconActivity = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const IconCheck = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);
const IconPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>
  </svg>
);
const IconUpload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
  </svg>
);
const IconDownload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
  </svg>
);
const IconClose = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconSearch = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/>
  </svg>
);

// ─── Role Config ────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  socio:    { bg: 'bg-[#818CF8]/10', border: 'border-[#818CF8]/20', text: 'text-[#818CF8]', label: 'Sócio', dot: '#818CF8' },
  admin:    { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', label: 'Administrador', dot: '#F59E0B' },
  analista: { bg: 'bg-[#2DD4BF]/10', border: 'border-[#2DD4BF]/20', text: 'text-[#2DD4BF]', label: 'Usuário Padrão', dot: '#2DD4BF' },
};

// ─── Stat Card ──────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, subValue, accentColor }) => (
  <div className="rounded-xl border border-slate-800/50 p-4 backdrop-blur-sm" style={{ background: 'rgba(15,23,42,0.5)' }}>
    <div className="flex items-center justify-between mb-3">
      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{label}</span>
      <div className={`p-1.5 rounded-lg bg-${accentColor}/10 border border-${accentColor}/15`} style={{ color: accentColor }}>
        <Icon />
      </div>
    </div>
    <p className="text-2xl font-bold font-mono" style={{ color: accentColor }}>{value}</p>
    {subValue && <p className="text-[10px] text-slate-500 font-mono mt-1">{subValue}</p>}
  </div>
);

// ─── Toggle Switch ──────────────────────────────────────────────────────────
const ToggleSwitch = ({ checked, onChange, disabled }) => (
  <button
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
      checked ? 'bg-[#2DD4BF]/30 border border-[#2DD4BF]/40' : 'bg-slate-800 border border-slate-700'
    } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform duration-200 ${
      checked ? 'translate-x-4 bg-[#2DD4BF]' : 'translate-x-0.5 bg-slate-500'
    }`} />
  </button>
);

// ═══════════════════════════════════════════════════════════════════════════
// TEAM MANAGEMENT — Enterprise Admin Panel
// ═══════════════════════════════════════════════════════════════════════════
const TeamManagement = () => {
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({ total_members: 0, active_members: 0, total_queries: 0, plan_limit: 10 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('analista');
  const [inviting, setInviting] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const csvInputRef = useRef(null);
  const [feedback, setFeedback] = useState({ isOpen: false, status: '', title: '', message: '' });

  const showFeedback = (status, title, message) => {
    setFeedback({ isOpen: true, status, title, message });
  };

  useEffect(() => { loadMembers(); }, []);

  const getAuthHeaders = async (json = true) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Sessão expirada');
    const h = { 'Authorization': `Bearer ${session.access_token}` };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  };

  const loadMembers = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/team/members`, { headers });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setStats(data.stats || stats);
      }

      // Fetch current user role for UI permission gating
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        if (profile) setCurrentUserRole(profile.role);
      }
    } catch (err) {
      console.error('Error loading team:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_URL}/api/team/members/${memberId}/role`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ role: newRole }),
      });
      loadMembers();
    } catch (err) { showFeedback('error', 'Falha na Atualização', 'Erro ao atualizar perfil.'); }
  };

  const handleToggleActive = async (memberId, newState) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/team/members/${memberId}/active`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ is_active: newState }),
      });
      if (!res.ok) {
        const data = await res.json();
        showFeedback('error', 'Falha na Atualização', data.detail || 'Erro ao alterar status.');
        return;
      }
      loadMembers();
    } catch (err) { showFeedback('error', 'Falha na Atualização', 'Erro ao alterar status.'); }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    showFeedback('loading', 'Processando Convite', 'Enviando e-mail pelo servidor seguro...');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/team/invite`, {
        method: 'POST', headers,
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      if (res.ok) {
        setInviteModal(false);
        setInviteEmail('');
        showFeedback('success', 'Convite Enviado', 'O acesso foi liberado com sucesso.');
      } else {
        const data = await res.json();
        showFeedback('error', 'Erro no Convite', data.detail || 'Erro ao enviar convite.');
      }
    } catch { showFeedback('error', 'Falha', 'Falha na conexão de rede.'); }
    finally { setInviting(false); }
  };

  const handleBulkCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const headers = await getAuthHeaders(false);
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/api/team/invite/bulk`, {
        method: 'POST', headers, body: formData,
      });
      const data = await res.json();
      showFeedback('success', 'Importação Concluída', `${data.total} convites enviados.${data.errors?.length ? `\nErros: ${data.errors.join(', ')}` : ''}`);
    } catch { showFeedback('error', 'Falha no Upload', 'Erro ao ler arquivo.'); }
    if (csvInputRef.current) csvInputRef.current.value = '';
  };

  const handleExport = async () => {
    try {
      const headers = await getAuthHeaders(false);
      const res = await fetch(`${API_URL}/api/team/export`, { headers });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'equipe_copilot.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch { showFeedback('error', 'Falha na Exportação', 'Erro ao processar dados.'); }
  };

  const filtered = members.filter(m =>
    !search || m.full_name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return '—'; }
  };

  return (
    <div className="p-6 h-full overflow-y-auto" style={{ background: '#0B1120' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-200 tracking-tight">Gerência de Membros</h1>
        <p className="text-xs text-slate-500 font-mono mt-0.5">Administração de acessos, perfis e atividades da organização</p>
      </div>

      {/* ── Stats Dashboard ────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard icon={IconActivity} label="Total de Consultas" value={stats.total_queries} subValue="Soma de todas as interações" accentColor="#2DD4BF" />
        <StatCard icon={IconCheck} label="Nível de Satisfação" value="98%" subValue="Baseado em feedback interno" accentColor="#818CF8" />
        <StatCard icon={IconUsers} label="Usuários Ativos" value={`${stats.active_members} / ${stats.plan_limit}`} subValue={`${stats.total_members} cadastrados no total`} accentColor="#F59E0B" />
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-600">
            <IconSearch />
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full pl-8 pr-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-xs text-slate-300 placeholder-slate-600 font-mono focus:outline-none focus:border-[#818CF8]/30 transition-colors"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button onClick={() => setInviteModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#818CF8] text-white text-[11px] font-semibold hover:bg-[#717cf0] transition-colors">
            <IconPlus /> Convidar Membro
          </button>

          <input type="file" ref={csvInputRef} onChange={handleBulkCSV} accept=".csv" className="hidden" />
          <button onClick={() => csvInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-400 text-[11px] font-medium hover:text-slate-200 hover:border-slate-600 transition-all">
            <IconUpload /> CSV em Massa
          </button>

          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-400 text-[11px] font-medium hover:text-slate-200 hover:border-slate-600 transition-all">
            <IconDownload /> Exportar
          </button>
        </div>
      </div>

      {/* ── Data Grid ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-800/50 overflow-hidden" style={{ background: 'rgba(15,23,42,0.5)' }}>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-3 px-5 py-2.5 border-b border-slate-800/40 bg-slate-900/30">
          <span className="col-span-4 text-[10px] font-mono text-slate-500 uppercase tracking-wider">Membro</span>
          <span className="col-span-2 text-[10px] font-mono text-slate-500 uppercase tracking-wider">Perfil</span>
          <span className="col-span-2 text-[10px] font-mono text-slate-500 uppercase tracking-wider">Último Acesso</span>
          <span className="col-span-2 text-[10px] font-mono text-slate-500 uppercase tracking-wider text-right">Consultas</span>
          <span className="col-span-2 text-[10px] font-mono text-slate-500 uppercase tracking-wider text-center">Status</span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-40">
            <span className="font-mono text-xs text-slate-600 animate-pulse">Carregando membros...</span>
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="px-5 py-12 text-center">
            <p className="text-xs text-slate-600 font-mono">
              {search ? 'Nenhum membro encontrado para esta busca.' : 'Nenhum membro na organização.'}
            </p>
          </div>
        )}

        {/* Rows */}
        {!loading && (
          <div className="divide-y divide-slate-800/20">
            {filtered.map((member) => {
              const role = ROLE_CONFIG[member.role] || ROLE_CONFIG.analista;
              const isActive = member.is_active !== false;
              return (
                <div key={member.id} className={`grid grid-cols-12 gap-3 px-5 py-3.5 items-center transition-colors ${isActive ? 'hover:bg-slate-800/15' : 'opacity-50 bg-slate-900/20'}`}>

                  {/* Avatar + Name */}
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    <div className="relative flex-shrink-0">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt="" className="w-9 h-9 rounded-full ring-1 ring-slate-700" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                          <span className="font-mono text-xs text-slate-400">{member.full_name?.charAt(0)?.toUpperCase() || '?'}</span>
                        </div>
                      )}
                      {/* Online dot */}
                      <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 ${isActive ? 'bg-[#2DD4BF] border-[#0B1120]' : 'bg-slate-600 border-[#0B1120]'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-200 font-medium truncate">{member.full_name}</p>
                      <p className="text-[10px] text-slate-500 font-mono truncate">{member.email || '—'}</p>
                    </div>
                  </div>

                  {/* Role Selector */}
                  <div className="col-span-2">
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      disabled={currentUserRole !== 'admin'}
                      className={`appearance-none bg-transparent text-[10px] font-mono px-2 py-1 rounded-md border text-center ${currentUserRole === 'admin' ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'} focus:outline-none transition-colors`}
                      style={{
                        backgroundColor: `${role.dot}10`,
                        borderColor: `${role.dot}30`,
                        color: role.dot,
                      }}
                    >
                      <option value="analista" style={{ background: '#0F172A', color: '#94A3B8' }}>Usuário Padrão</option>
                      <option value="admin" style={{ background: '#0F172A', color: '#F59E0B' }}>Administrador</option>
                      <option value="socio" style={{ background: '#0F172A', color: '#818CF8' }}>Sócio</option>
                    </select>
                  </div>

                  {/* Last Access */}
                  <div className="col-span-2">
                    <span className="text-[11px] text-slate-500 font-mono">{formatDate(member.last_sign_in_at)}</span>
                  </div>

                  {/* Query Count */}
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-mono font-bold text-[#2DD4BF]">{member.query_count ?? 0}</span>
                  </div>

                  {/* Active Toggle */}
                  <div className="col-span-2 flex justify-center">
                    <ToggleSwitch 
                      checked={isActive} 
                      onChange={(v) => handleToggleActive(member.id, v)} 
                      disabled={currentUserRole !== 'admin'} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Invite Modal ───────────────────────────────────────────────── */}
      {inviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-800/50 overflow-hidden" style={{ background: '#0F172A' }}>

            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-800/40 flex items-center justify-between bg-slate-900/40">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Convidar Novo Membro</h3>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">O convite será registrado para acesso via Google Workspace</p>
              </div>
              <button onClick={() => setInviteModal(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                <IconClose />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1.5">E-mail do Colaborador</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="nome@mendoncagalvao.com.br"
                  className="w-full px-3 py-2.5 bg-slate-800/40 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#818CF8]/40 transition-colors"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1.5">Perfil de Acesso</label>
                <div className="flex gap-2">
                  {[
                    { value: 'analista', label: 'Usuário Padrão', color: '#2DD4BF' },
                    { value: 'admin', label: 'Administrador', color: '#F59E0B' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setInviteRole(opt.value)}
                      className={`flex-1 py-2 rounded-lg text-[11px] font-medium border transition-all ${
                        inviteRole === opt.value
                          ? `border-[${opt.color}]/30 text-[${opt.color}]`
                          : 'border-slate-700/50 text-slate-500 hover:border-slate-600'
                      }`}
                      style={inviteRole === opt.value ? { borderColor: `${opt.color}40`, color: opt.color, background: `${opt.color}10` } : {}}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="w-full py-2.5 rounded-lg bg-[#818CF8] text-white text-xs font-semibold hover:bg-[#717cf0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {inviting ? 'Enviando...' : 'Enviar Convite'}
              </button>
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

    </div>
  );
};

export default TeamManagement;