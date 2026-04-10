import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import SharedModals from './SharedModals';

// ─── Technical line icons (Lucide-style) ─────────────────────────────────────
const IconChat = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IconChart = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" x2="18" y1="20" y2="10" /><line x1="12" x2="12" y1="20" y2="4" />
    <line x1="6" x2="6" y1="20" y2="14" />
  </svg>
);

const IconUsers = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconBook = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const IconFileSearch = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <circle cx="11.5" cy="14.5" r="2.5" />
    <path d="M13.25 16.25 15 18" />
  </svg>
);

const IconLogout = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" />
  </svg>
);

const IconWhatsApp = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// Main nav items 
const mainNavigation = [
  { to: '/app/chat', label: 'Chat Global', icon: IconChat },
  { to: '/app/workspace', label: 'Análise de Arquivos', icon: IconFileSearch },
  { to: '/app/dashboard', label: 'Dashboard', icon: IconChart },
];

// Admin explicit items
const adminNavigation = [
  { to: '/app/team', label: 'Equipe', icon: IconUsers },
  { to: '/app/knowledge', label: 'Base Legal', icon: IconBook },
  { to: '/app/whatsapp', label: 'WhatsApp', icon: IconWhatsApp },
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
        <div className="px-4 py-6 border-b border-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#818CF8]/10 border border-[#818CF8]/20 flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#818CF8]/5">
              <span className="font-mono text-[#818CF8] text-[14px] font-bold">CC</span>
            </div>
            <span className="font-bold text-base text-slate-100 tracking-tight">Copilot Contábil</span>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="py-3 px-2 space-y-0.5 flex-1">
          {mainNavigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150 ${isActive
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

        {/* Admin Navigation */}
        {(role === 'admin' || role === 'socio') && (
          <div className="px-2 pb-4">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5 px-3">
              Administração
            </div>
            <nav className="space-y-0.5">
              {adminNavigation.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150 ${isActive
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
          </div>
        )}

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

      <SharedModals />
    </div>
  );
};

export default Layout;