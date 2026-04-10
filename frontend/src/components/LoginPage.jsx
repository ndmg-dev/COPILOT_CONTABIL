import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { Link } from 'react-router-dom';

// ─── Google Icon (official SVG paths) ───────────────────────────────────────
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// ─── Shield Icon ────────────────────────────────────────────────────────────
const ShieldCheck = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
);

// ─── Lock Icon ──────────────────────────────────────────────────────────────
const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

// ─── Network Canvas ─────────────────────────────────────────────────────────
const NetworkCanvas = () => {
  const [nodes] = useState(() => {
    const pts = [];
    for (let i = 0; i < 40; i++) {
      pts.push({ x: Math.random() * 100, y: Math.random() * 100, size: Math.random() * 2 + 0.5, opacity: Math.random() * 0.3 + 0.05 });
    }
    return pts;
  });

  const lines = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      if (dist < 22) lines.push({ from: nodes[i], to: nodes[j], opacity: (1 - dist / 22) * 0.12 });
    }
  }

  return (
    <svg className="network-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
      {lines.map((l, i) => (
        <line key={`l-${i}`} x1={`${l.from.x}%`} y1={`${l.from.y}%`} x2={`${l.to.x}%`} y2={`${l.to.y}%`}
          stroke="#2DD4BF" strokeWidth="0.06" opacity={l.opacity} />
      ))}
      {nodes.map((n, i) => (
        <circle key={`n-${i}`} cx={`${n.x}%`} cy={`${n.y}%`} r={n.size * 0.12} fill="#2DD4BF" opacity={n.opacity} />
      ))}
    </svg>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// LOGIN PAGE — Google Workspace SSO (Zero Emojis, Premium Corporate)
// ═══════════════════════════════════════════════════════════════════════════
const LoginPage = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const email = session.user?.email || '';
        if (email.endsWith('@mendoncagalvao.com.br')) {
          if (onLogin) onLogin(session);
        } else {
          await supabase.auth.signOut();
          setError('Acesso restrito ao domínio corporativo autorizado.');
        }
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          const email = session.user?.email || '';
          if (email.endsWith('@mendoncagalvao.com.br')) {
            if (onLogin) onLogin(session);
          } else {
            await supabase.auth.signOut();
            setError('Acesso restrito ao domínio corporativo autorizado.');
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: { hd: 'mendoncagalvao.com.br', access_type: 'offline', prompt: 'select_account' },
          redirectTo: `${window.location.origin}/app/chat`,
        },
      });
      if (authError) { setError(authError.message); setLoading(false); }
    } catch { setError('Falha na conexão com o provedor. Tente novamente.'); setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ background: '#0B1120' }}>
      <div className="constellation-bg" />
      <NetworkCanvas />

      {/* ── System telemetry: top-left ─────────────────────────────── */}
      <div className={`fixed top-6 left-6 z-10 transition-all duration-1000 ${mounted ? 'opacity-50 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <pre className="font-mono text-[10px] leading-relaxed text-slate-500">
{`STATUS    Multi-Tenant Enterprise Portal
AUDITOR   Score 98.7%
ENGINE    Compliance RFB v3.1
AUTH      Google Workspace SSO`}
        </pre>
      </div>

      {/* ── System telemetry: top-right ────────────────────────────── */}
      <div className={`fixed top-6 right-6 z-10 transition-all duration-1000 delay-200 ${mounted ? 'opacity-40 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <pre className="font-mono text-[10px] leading-relaxed text-slate-500 text-right">
{`CPC Compliance     ACTIVE
NBC Standards      SYNCED
eSocial Module     READY`}
        </pre>
      </div>

      {/* ── Login Card ─────────────────────────────────────────────── */}
      <div className={`relative z-10 w-full max-w-[400px] mx-4 transition-all duration-700 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <div className="glass-panel p-8 sm:p-10">

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-10 h-10 mx-auto mb-4 rounded-lg bg-[#818CF8]/10 border border-[#818CF8]/20 flex items-center justify-center">
              <span className="font-mono text-[#818CF8] text-sm font-bold">CC</span>
            </div>
            <h1 className="text-xl font-semibold text-slate-100 tracking-tight">
              Copilot Contábil IA
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-mono tracking-wide uppercase">
              Plataforma de Inteligência Contábil
            </p>
          </div>

          {/* Domain badge */}
          <div className="flex items-center justify-center gap-2 mb-6 py-2 px-3 rounded-md bg-[#0F172A] border border-slate-700/50">
            <ShieldCheck />
            <span className="text-[11px] text-slate-400 font-mono">
              mendoncagalvao.com.br
            </span>
          </div>

          {/* Google SSO Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            id="google-login-button"
            className="w-full group relative overflow-hidden rounded-lg border border-[#818CF8]/30 bg-[#818CF8]/8 hover:bg-[#818CF8]/15 hover:border-[#818CF8]/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-center gap-3 py-3.5 px-5">
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-[#818CF8]" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-sm font-medium text-slate-300">Redirecionando...</span>
                </>
              ) : (
                <>
                  <div className="w-7 h-7 bg-white rounded flex items-center justify-center flex-shrink-0">
                    <GoogleIcon />
                  </div>
                  <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                    Entrar com Google Workspace
                  </span>
                </>
              )}
            </div>
          </button>

          {/* Error */}
          {error && (
            <div className="mt-4 text-xs text-red-400/90 bg-red-400/5 border border-red-400/15 rounded-md px-3 py-2.5 text-center font-mono">
              {error}
            </div>
          )}

          {/* Security info */}
          <div className="mt-8 space-y-2.5 border-t border-slate-700/30 pt-5">
            <div className="flex items-center gap-2.5 text-[11px] text-slate-500">
              <LockIcon />
              <span>Autenticação OAuth 2.0 via Google Identity</span>
            </div>
            <div className="flex items-center gap-2.5 text-[11px] text-slate-500">
              <ShieldCheck />
              <span>Acesso exclusivo para colaboradores autorizados</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <div className={`fixed bottom-4 left-0 right-0 z-10 text-center transition-all duration-1000 delay-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="font-mono text-[10px] text-slate-600 flex items-center justify-center gap-3">
          <Link to="/termos" className="hover:text-slate-400 transition-colors cursor-pointer">Termos de Uso</Link>
          <span className="text-slate-700">|</span>
          <Link to="/privacidade" className="hover:text-slate-400 transition-colors cursor-pointer">Privacidade</Link>
          <span className="text-slate-700">|</span>
          <span>v3.1 Enterprise</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
