import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../utils/supabase';

// ─── Technical line icons (Lucide-style) ─────────────────────────────────────
const IconChat = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const IconChart = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/>
    <line x1="6" x2="6" y1="20" y2="14"/>
  </svg>
);

const IconUsers = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IconBook = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);

const IconFileSearch = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <circle cx="11.5" cy="14.5" r="2.5"/>
    <path d="M13.25 16.25 15 18"/>
  </svg>
);

const IconLogout = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>
  </svg>
);

// All nav items visible to every user — no role restriction during MVP/testing
const navItems = [
  { to: '/app/chat', label: 'Chat Global', icon: IconChat },
  { to: '/app/workspace', label: 'Análise de Arquivos', icon: IconFileSearch },
  { to: '/app/dashboard', label: 'Dashboard', icon: IconChart },
  { to: '/app/team', label: 'Equipe', icon: IconUsers },
  { to: '/app/knowledge', label: 'Base Legal', icon: IconBook },
];

const Layout = ({ onLogout, session }) => {
  const [role, setRole] = useState(null);
  const user = session?.user;
  const email = user?.email || '';
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || email.split('@')[0];
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

  useEffect(() => {
    if (user?.id) {
      supabase.from('profiles').select('role').eq('id', user.id).single()
        .then(({ data }) => { if (data) setRole(data.role); });
    }
  }, [user?.id]);

  return (
    <div className="flex h-screen" style={{ background: '#0B1120' }}>
      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className="w-56 flex flex-col border-r border-slate-800/60" style={{ background: 'rgba(11, 17, 32, 0.95)' }}>

        {/* Logo */}
        <div className="px-4 py-5 border-b border-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#818CF8]/10 border border-[#818CF8]/20 flex items-center justify-center flex-shrink-0">
              <span className="font-mono text-[#818CF8] text-[11px] font-bold">CC</span>
            </div>
            <span className="font-semibold text-sm text-slate-200 tracking-tight">Copilot Contábil</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {navItems.filter(item => {
            // Se for link de conhecimento admin, bloqueie se role não for socio nem admin
            if (item.to === '/app/knowledge' && (!role || (role !== 'admin' && role !== 'socio'))) return false;
            return true;
          }).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#818CF8]/10 text-[#818CF8] border border-[#818CF8]/15'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                }`
              }
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User profile + Logout */}
        <div className="px-3 py-3 border-t border-slate-800/40 space-y-2">
          <div className="flex items-center gap-2.5 px-1">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="w-7 h-7 rounded-full ring-1 ring-slate-700 flex-shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                <span className="font-mono text-[10px] text-slate-400">
                  {fullName?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[12px] text-slate-300 font-medium truncate">{fullName}</div>
              <div className="text-[10px] text-slate-500 font-mono truncate">{email}</div>
            </div>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-medium text-slate-500 hover:text-red-400 hover:bg-red-400/5 border border-transparent hover:border-red-400/15 transition-all duration-200"
            >
              <IconLogout />
              Sair
            </button>
          )}
        </div>
      </aside>

      {/* ── Main Content ───────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;