import React, { useState, useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Icons ────────────────────────────────────────────────────────────────────
const IconWhatsApp = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const IconPlug = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const IconRefresh = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

// ── Main Component ───────────────────────────────────────────────────────────
const WhatsAppIntegration = () => {
    const [token, setToken] = useState(null);
    const [step, setStep] = useState('loading');  // loading | idle | creating | qr | connected | error
    const [instanceName, setInstanceName] = useState('');
    const [qrBase64, setQrBase64] = useState(null);
    const [statusMsg, setStatusMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const pollRef = useRef(null);

    // Fetch auth token
    useEffect(() => {
        const fetchToken = async () => {
            const { supabase } = await import('../utils/supabase');
            const { data } = await supabase.auth.getSession();
            if (data?.session) setToken(data.session.access_token);
        };
        fetchToken();
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, []);

    // Auto-check org status on mount (persistent state)
    useEffect(() => {
        if (!token) return;

        const checkOrgStatus = async () => {
            try {
                const res = await fetch(`${API_URL}/api/whatsapp/check`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();

                if (data.connected) {
                    setStep('connected');
                    setInstanceName(data.instance || '');
                    setStatusMsg('WhatsApp conectado com sucesso!');
                } else if (data.instance) {
                    // Instance exists but not connected
                    setStep('idle');
                    setInstanceName(data.instance);
                    setStatusMsg('Instância encontrada, mas desconectada.');
                } else {
                    setStep('idle');
                }
            } catch {
                setStep('idle');
            }
        };

        checkOrgStatus();
    }, [token]);

    // ── Create Instance ──────────────────────────────────────────────────
    const handleCreateInstance = async () => {
        if (!token) return;
        setStep('creating');
        setErrorMsg('');
        setStatusMsg('Provisionando instância na Evolution API...');

        try {
            const res = await fetch(`${API_URL}/api/whatsapp/instance`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Erro ao criar instância');

            setInstanceName(data.instance_name);
            setStatusMsg('Instância gerada. Obtendo QR Code...');

            // Immediately fetch QR
            await fetchQRCode(data.instance_name);
        } catch (e) {
            setStep('error');
            setErrorMsg(e.message);
        }
    };

    // ── Fetch QR Code ────────────────────────────────────────────────────
    const fetchQRCode = async (name) => {
        const iName = name || instanceName;
        if (!iName || !token) return;

        try {
            const res = await fetch(`${API_URL}/api/whatsapp/qrcode/${iName}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Erro ao obter QR Code');

            if (data.base64) {
                // Strip data URI prefix if Evolution already includes it
                const raw = data.base64.replace(/^data:image\/[a-z]+;base64,/, '');
                setQrBase64(raw);
                setStep('qr');
                setStatusMsg('Escaneie o QR Code com o WhatsApp do celular.');

                // Start polling for connection status
                startStatusPolling(iName);
            } else {
                setStatusMsg('QR Code não disponível. Tente novamente em instantes.');
                setStep('error');
                setErrorMsg('A Evolution API não retornou o QR Code. Verifique se a instância está ativa.');
            }
        } catch (e) {
            setStep('error');
            setErrorMsg(e.message);
        }
    };

    // ── Poll Connection Status ───────────────────────────────────────────
    const startStatusPolling = (name) => {
        if (pollRef.current) clearInterval(pollRef.current);

        pollRef.current = setInterval(async () => {
            try {
                const res = await fetch(`${API_URL}/api/whatsapp/status/${name}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();

                if (data.connected) {
                    setStep('connected');
                    setStatusMsg('WhatsApp conectado com sucesso!');
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                }
            } catch { /* silent retry */ }
        }, 5000);
    };

    // ── Refresh QR ───────────────────────────────────────────────────────
    const handleRefreshQR = () => {
        setQrBase64(null);
        setStep('creating');
        setStatusMsg('Atualizando QR Code...');
        fetchQRCode(instanceName);
    };

    // ── Render ───────────────────────────────────────────────────────────
    return (
        <div className="h-full w-full bg-slate-950 overflow-y-auto">
            <div className="max-w-2xl mx-auto py-10 px-6">

                {/* Header */}
                <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <IconWhatsApp />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-100 tracking-tight">WhatsApp Manager</h1>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">Integração via Evolution API</p>
                    </div>
                </div>

                {/* Status Card */}
                <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-semibold text-slate-300">Status da Conexão</span>
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full ${
                            step === 'connected'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : step === 'error'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                            {step === 'loading' ? (
                                <span className="w-3 h-3 rounded-full border border-slate-500 border-t-slate-300 animate-spin"></span>
                            ) : (
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                    step === 'connected' ? 'bg-emerald-400 animate-pulse' :
                                    step === 'error' ? 'bg-red-400' :
                                    step === 'qr' ? 'bg-amber-400 animate-pulse' :
                                    'bg-slate-500'
                                }`}></span>
                            )}
                            {step === 'loading' ? 'Verificando...' :
                             step === 'connected' ? 'Conectado' :
                             step === 'qr' ? 'Aguardando Scan' :
                             step === 'creating' ? 'Provisionando...' :
                             step === 'error' ? 'Erro' : 'Desconectado'}
                        </span>
                    </div>

                    {instanceName && (
                        <div className="mb-4 p-3 rounded-lg bg-slate-800/40 border border-slate-700/50">
                            <span className="text-[10px] text-slate-500 font-mono uppercase">Instância</span>
                            <p className="text-sm text-slate-200 font-mono mt-0.5">{instanceName}</p>
                        </div>
                    )}

                    {statusMsg && (
                        <p className={`text-xs mb-4 ${step === 'error' ? 'text-red-400' : 'text-slate-400'}`}>
                            {statusMsg}
                        </p>
                    )}

                    {errorMsg && step === 'error' && (
                        <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 mb-4">
                            <p className="text-xs text-red-300 font-mono">{errorMsg}</p>
                        </div>
                    )}
                </div>

                {/* QR Code Display */}
                {step === 'qr' && qrBase64 && (
                    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-8 mb-6 flex flex-col items-center gap-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-[#818CF8]/10 rounded-2xl blur-xl"></div>
                            <div className="relative bg-white rounded-2xl p-4 shadow-2xl shadow-emerald-500/5">
                                <img
                                    src={`data:image/png;base64,${qrBase64}`}
                                    alt="QR Code WhatsApp"
                                    className="w-64 h-64 object-contain"
                                />
                            </div>
                        </div>

                        <div className="text-center space-y-2">
                            <p className="text-sm text-slate-300 font-medium">Escaneie com o WhatsApp</p>
                            <p className="text-[11px] text-slate-500">Abra o WhatsApp → Menu (⋮) → Dispositivos Conectados → Conectar Dispositivo</p>
                        </div>

                        <button
                            onClick={handleRefreshQR}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-300 transition-all"
                        >
                            <IconRefresh />
                            Atualizar QR Code
                        </button>
                    </div>
                )}

                {/* Connected State */}
                {step === 'connected' && (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 mb-6 flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <IconPlug />
                        </div>
                        <h3 className="text-lg font-bold text-emerald-300">Conexão Estabelecida</h3>
                        <p className="text-xs text-slate-400 text-center max-w-sm">
                            O WhatsApp da organização está conectado e pronto para receber e responder mensagens automaticamente via IA.
                        </p>
                    </div>
                )}

                {/* Loading Animation */}
                {step === 'creating' && (
                    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-12 mb-6 flex flex-col items-center gap-4">
                        <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-emerald-400 animate-spin"></div>
                        <p className="text-sm text-slate-400 animate-pulse">{statusMsg || 'Processando...'}</p>
                    </div>
                )}

                {/* Loading State */}
                {step === 'loading' && (
                    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-12 mb-6 flex flex-col items-center gap-4">
                        <div className="w-10 h-10 rounded-full border-2 border-slate-700 border-t-emerald-400 animate-spin"></div>
                        <p className="text-sm text-slate-400">Consultando status da conexão...</p>
                    </div>
                )}

                {/* Action Button */}
                {(step === 'idle' || step === 'error') && (
                    <button
                        onClick={handleCreateInstance}
                        disabled={!token}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold text-sm
                            bg-gradient-to-r from-emerald-500 to-[#2DD4BF] text-slate-900
                            hover:shadow-lg hover:shadow-emerald-500/20
                            active:scale-[0.98] transition-all duration-200
                            disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <IconWhatsApp />
                        Gerar Conexão WhatsApp
                    </button>
                )}

                {/* Info Section */}
                <div className="mt-8 p-4 rounded-xl bg-slate-900/30 border border-slate-800/40">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Como funciona</h4>
                    <ul className="space-y-2">
                        {[
                            'Ao clicar no botão, uma instância dedicada é criada na Evolution API.',
                            'Um QR Code aparecerá para ser escaneado pelo celular.',
                            'Após a leitura, o WhatsApp da organização ficará conectado à IA.',
                            'Todas as mensagens recebidas serão processadas pelo Copilot Contábil.'
                        ].map((text, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-slate-500">
                                <span className="mt-0.5 w-4 h-4 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 text-[9px] text-slate-400 font-bold">{i + 1}</span>
                                {text}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default WhatsAppIntegration;
