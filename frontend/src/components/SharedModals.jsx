import React from 'react';
import { useUI } from '../context/UIContext';
import { supabase } from '../utils/supabase';
import FeedbackModal from './FeedbackModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const IconClose = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const IconFilePDF = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14.5 2 14.5 7.5 20 7.5"/>
    <path d="M10 12l-1 3h3.5c.8 0 1.5-.7 1.5-1.5S13.3 12 12.5 12H10z"/>
  </svg>
);

const IconUpload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
  </svg>
);

const IconCopy = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
  </svg>
);

const SharedModals = () => {
  const {
    exportModal, setExportModal,
    exportOpts, setExportOpts,
    exporting, setExporting,
    orgLogo, setOrgLogo,
    uploadingLogo, setUploadingLogo,
    emailModal, setEmailModal,
    feedback, setFeedback, showFeedback
  } = useUI();

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', session.user.id).single();
      if (!profile?.organization_id) throw new Error('Organização não encontrada');

      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.organization_id}_logo_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('office_logos').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('office_logos').getPublicUrl(fileName);
      const logoUrl = publicUrlData.publicUrl;

      await supabase.from('organizations').update({ logo_url: logoUrl }).eq('id', profile.organization_id);
      setOrgLogo(logoUrl);
      showFeedback('success', 'Logo Atualizada', 'A identidade visual foi definida com sucesso.');
    } catch (err) {
      showFeedback('error', 'Falha no Upload', 'Erro ao fazer upload da logo: ' + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleGeneratePDF = async () => {
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');
      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(`${API_URL}/api/export/pdf`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: exportModal.content,
          query: exportModal.query,
          title: exportOpts.title,
          include_logo: exportOpts.includeLogo,
          isolate_legal: exportOpts.isolateLegal,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `parecer_${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setExportModal({ ...exportModal, open: false });
        showFeedback('success', 'PDF Gerado', 'Seu arquivo PDF foi baixado.');
      } else {
        showFeedback('error', 'Falha de Servidor', 'Erro ao processar PDF.');
      }
    } catch { showFeedback('error', 'Sem Conexão', 'Falha na rede ao gerar PDF.'); }
    finally { setExporting(false); }
  };

  return (
    <>
      {/* ── PDF Export Modal ──────────────────────────────────────────── */}
      {exportModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-800/50 overflow-hidden" style={{ background: '#0F172A' }}>
            <div className="px-5 py-4 border-b border-slate-800/40 flex items-center justify-between bg-slate-900/40">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Exportar Parecer Técnico</h3>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">PDF corporativo white-label</p>
              </div>
              <button onClick={() => setExportModal({ ...exportModal, open: false })} className="text-slate-500 hover:text-slate-300">
                <IconClose />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Title Input */}
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1.5">Título do Parecer</label>
                <input
                  type="text"
                  value={exportOpts.title}
                  onChange={e => setExportOpts({ ...exportOpts, title: e.target.value })}
                  placeholder="Ex: Parecer Técnico: Retenção de ISS"
                  className="w-full px-3 py-2.5 bg-slate-800/40 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#2DD4BF]/40 transition-colors"
                />
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={exportOpts.includeLogo}
                    onChange={e => setExportOpts({ ...exportOpts, includeLogo: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-4 h-4 rounded border border-slate-700 bg-slate-800/50 flex items-center justify-center peer-checked:bg-[#2DD4BF]/20 peer-checked:border-[#2DD4BF]/40 transition-all">
                    {exportOpts.includeLogo && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2DD4BF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </div>
                  <span className="text-xs text-slate-300 group-hover:text-slate-100 transition-colors">Incluir logo do escritório no cabeçalho</span>
                </label>
                
                {/* Logo Upload UX */}
                {exportOpts.includeLogo && (
                  <div className="ml-7 p-3 bg-slate-900/40 border border-slate-800/60 rounded-lg flex items-center gap-3">
                    {orgLogo ? (
                      <>
                        <img src={orgLogo} alt="Logo do Escritório" className="h-8 max-w-[100px] object-contain rounded" />
                        <label className="cursor-pointer text-[10px] text-slate-400 hover:text-[#2DD4BF] underline transition-colors ml-auto">
                          Trocar Logo
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
                        </label>
                      </>
                    ) : (
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-[#2DD4BF] transition-colors w-full">
                        <IconUpload /> {uploadingLogo ? 'Enviando...' : 'Fazer upload da marca (PNG/JPG)'}
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
                      </label>
                    )}
                  </div>
                )}

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={exportOpts.isolateLegal}
                    onChange={e => setExportOpts({ ...exportOpts, isolateLegal: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-4 h-4 rounded border border-slate-700 bg-slate-800/50 flex items-center justify-center peer-checked:bg-[#818CF8]/20 peer-checked:border-[#818CF8]/40 transition-all">
                    {exportOpts.isolateLegal && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </div>
                  <span className="text-xs text-slate-300 group-hover:text-slate-100 transition-colors">Isolar fundamentação legal em seção dedicada</span>
                </label>
              </div>

              {/* Preview Info */}
              {exportModal.query && (
                <div className="px-3 py-2 bg-slate-800/30 border border-slate-700/30 rounded-lg">
                  <p className="text-[9px] font-mono text-slate-500 uppercase mb-1">Consulta incluída</p>
                  <p className="text-[11px] text-slate-400 truncate">{exportModal.query}</p>
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGeneratePDF}
                disabled={exporting}
                className="w-full py-2.5 rounded-lg bg-[#2DD4BF] text-[#0F172A] text-xs font-bold hover:bg-[#26b8a5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {exporting ? (
                  <><svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Gerando documento...</>
                ) : (
                  <><IconFilePDF /> Gerar Documento</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Email Draft Modal ─────────────────────────────────────────── */}
      {emailModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-2xl animate-in zoom-in duration-200">
            <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between bg-slate-900/40">
              <h3 className="text-sm font-semibold text-slate-200">Rascunho de E-mail</h3>
              <button onClick={() => setEmailModal({ ...emailModal, open: false })} className="text-slate-500 hover:text-slate-200">
                <IconClose />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Assunto</label>
                <div className="px-3 py-2 bg-slate-800/30 border border-slate-700/50 rounded text-slate-300 text-sm">
                  {emailModal.subject}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Corpo</label>
                <textarea readOnly className="w-full h-64 px-4 py-3 bg-slate-800/30 border border-slate-700/50 rounded text-slate-300 text-xs leading-relaxed font-sans focus:outline-none" value={emailModal.body} />
              </div>
              <div className="flex justify-end">
                <button onClick={() => { navigator.clipboard.writeText(emailModal.body); showFeedback('success', 'Email Copiado', 'Texto copiado para a área de transferência.'); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#818CF8] text-white text-xs font-semibold hover:bg-[#717cf0] transition-colors">
                  <IconCopy /> Copiar
                </button>
              </div>
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
    </>
  );
};

export default SharedModals;
