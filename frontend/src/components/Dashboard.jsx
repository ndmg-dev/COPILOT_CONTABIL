import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── Stat Card ──────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color = '#2DD4BF' }) => (
  <div className="rounded-lg border border-slate-800/50 p-4" style={{ background: 'rgba(15,23,42,0.5)' }}>
    <p className="text-[11px] text-slate-500 font-mono uppercase tracking-wider mb-2">{label}</p>
    <p className="text-2xl font-bold font-mono" style={{ color }}>{value}</p>
    {sub && <p className="text-[10px] text-slate-600 font-mono mt-1">{sub}</p>}
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalConversations: 0,
    totalMessages: 0,
    totalMembers: 0,
    messagesThisWeek: 0,
  });
  const [recentConversations, setRecentConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      // Load conversations count and list
      const convRes = await fetch(`${API_URL}/api/chat/conversations`, { headers });
      let convCount = 0;
      let convList = [];
      if (convRes.ok) {
        const convData = await convRes.json();
        convList = convData.conversations || [];
        convCount = convList.length;
      }

      // Count total messages from conversations
      let totalMsgs = 0;
      let weekMsgs = 0;
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Load message count for recent conversations (limit to avoid heavy loads)
      for (const conv of convList.slice(0, 20)) {
        const msgRes = await fetch(`${API_URL}/api/chat/conversations/${conv.id}/messages`, { headers });
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          const msgs = msgData.messages || [];
          totalMsgs += msgs.length;
          weekMsgs += msgs.filter(m => new Date(m.created_at) > oneWeekAgo).length;
        }
      }

      // Load team members (profiles in same org)
      const profileRes = await fetch(`${API_URL}/api/team/members`, { headers }).catch(() => null);
      let memberCount = 1;
      if (profileRes && profileRes.ok) {
        const profileData = await profileRes.json();
        memberCount = (profileData.members || []).length || 1;
      }

      setStats({
        totalConversations: convCount,
        totalMessages: totalMsgs,
        totalMembers: memberCount,
        messagesThisWeek: weekMsgs,
      });
      setRecentConversations(convList.slice(0, 5));

    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto" style={{ background: '#0B1120' }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-200 mb-1">Dashboard de Uso</h1>
        <p className="text-xs text-slate-500 font-mono">Métricas reais da plataforma Copilot Contábil IA</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <span className="font-mono text-xs text-slate-600 animate-pulse">Carregando métricas...</span>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            <StatCard label="Total de Conversas" value={stats.totalConversations} sub="Sessões de consultoria" />
            <StatCard label="Total de Mensagens" value={stats.totalMessages} sub="Perguntas e Respostas" color="#818CF8" />
            <StatCard label="Mensagens (7 dias)" value={stats.messagesThisWeek} sub="Atividade recente" />
            <StatCard label="Membros da Equipe" value={stats.totalMembers} sub="Usuários ativos" color="#818CF8" />
          </div>

          {/* Recent Conversations */}
          <div className="rounded-lg border border-slate-800/50 overflow-hidden" style={{ background: 'rgba(15,23,42,0.5)' }}>
            <div className="px-4 py-3 border-b border-slate-800/40">
              <h2 className="text-sm font-semibold text-slate-300">Conversas Recentes</h2>
            </div>
            {recentConversations.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-xs text-slate-600 font-mono">Nenhuma conversa registrada ainda.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/30">
                {recentConversations.map((conv) => (
                  <div key={conv.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
                    <div>
                      <p className="text-sm text-slate-300">{conv.title || 'Conversa sem título'}</p>
                      <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                        {new Date(conv.created_at || conv.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-600 bg-slate-800/40 px-2 py-0.5 rounded">
                      {conv.id?.slice(0, 8)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;