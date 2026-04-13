import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { useUI } from '../context/UIContext';

export default function SocialExporter({ extractedData }) {
    const nodeRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const { showFeedback } = useUI();

    const generateAndDownload = async () => {
        if (!extractedData) {
            showFeedback('error', 'Sem Dados', 'Faça a análise de um documento primeiro.');
            return;
        }
        
        setIsGenerating(true);
        showFeedback('loading', 'Gerando Post', 'Renderizando design e compactando imagens...');

        try {
            // We use html2canvas to capture the hidden 1080x1080 node
            const canvas = await html2canvas(nodeRef.current, {
                scale: 2, // High DPI for Instagram
                useCORS: true,
                backgroundColor: '#020617' // slate-950
            });

            // Convert to Blob
            canvas.toBlob(async (blob) => {
                if (!blob) throw new Error("Falha na geração do Canvas");
                
                // Package inside ZIP
                const zip = new JSZip();
                zip.file("instagram_post_01.png", blob);
                
                const content = await zip.generateAsync({ type: "blob" });
                
                // Force Download
                const url = window.URL.createObjectURL(content);
                const link = document.createElement('a');
                link.href = url;
                link.download = `Copilot_Social_Pack_${new Date().getTime()}.zip`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                
                showFeedback('success', 'Pronto para Postar', 'Seu arquivo ZIP foi baixado com sucesso!');
                setIsGenerating(false);
            }, 'image/png');

        } catch (error) {
             showFeedback('error', 'Erro', 'Falha ao gerar as imagens: ' + error.message);
             setIsGenerating(false);
        }
    };

    return (
        <>
            <button 
                onClick={generateAndDownload} 
                disabled={isGenerating}
                className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 transition-all font-semibold text-white shadow-lg disabled:opacity-50"
            >
                {isGenerating ? (
                    <span className="animate-pulse">Gerando Carrossel...</span>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                        Gerar Post Instagram (ZIP)
                    </>
                )}
            </button>

            {/* Hidden DOM element for HTML2Canvas to capture (1080x1080) */}
            <div className="overflow-hidden h-0 w-0 absolute left-[-9999px]">
                <div ref={nodeRef} style={{ width: '1080px', height: '1080px' }} className="flex flex-col items-center justify-center bg-slate-950 p-16 text-center border-8 border-slate-800">
                    <div className="w-full flex-1 flex flex-col items-center justify-center bg-slate-900 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
                        
                        {/* Decorative Background Glows */}
                        <div className="absolute -top-32 -right-32 w-96 h-96 bg-purple-600/30 blur-[100px] rounded-full"></div>
                        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-pink-600/20 blur-[100px] rounded-full"></div>

                        <div className="relative z-10 w-full flex flex-col items-center">
                            <h2 className="text-4xl font-mono text-slate-400 mb-8 tracking-widest uppercase">Análise Contábil Semanal</h2>
                            <h1 className="text-7xl font-bold text-pink-400 drop-shadow-lg leading-tight mb-16 break-words max-w-4xl">
                                Insights Fiscais Direto da Fonte
                            </h1>
                            
                            <div className="bg-slate-800 p-10 rounded-3xl border border-slate-700/50 w-full max-w-3xl shadow-xl">
                                <p className="text-4xl text-slate-200 leading-relaxed font-light text-left overflow-hidden">
                                    "{extractedData ? extractedData.replace(/[*#_`~|-]+/g, ' ').replace(/<[^>]+>/g, '').substring(0, 250) + '...' : 'As conclusões da análise da Inteligência Artificial aparecerão aqui de forma clara e visual para seus clientes.'}"
                                </p>
                            </div>
                        </div>

                        <div className="absolute bottom-12 left-0 w-full flex justify-center items-center gap-4 text-slate-500 font-mono text-2xl font-semibold tracking-widest uppercase">
                            <span>Gerado por Copilot Contábil IA</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
