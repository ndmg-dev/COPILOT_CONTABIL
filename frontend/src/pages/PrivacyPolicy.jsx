import React from 'react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-300 font-sans selection:bg-teal-500/30">
      <div className="max-w-4xl mx-auto py-16 px-6 sm:px-8">
        
        {/* Navigation / Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="group mb-12 flex items-center gap-2 text-slate-500 hover:text-[#2DD4BF] transition-colors text-xs font-mono tracking-widest uppercase"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Voltar
        </button>

        <header className="mb-12">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-4">
            Política de Privacidade
          </h1>
          <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">
            Privacidade de Dados • Enterprise Standard
          </p>
        </header>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-bold text-white mb-4">1. Coleta de Dados</h2>
            <p className="leading-relaxed">
              Para o provisionamento correto dos serviços, coletamos informações básicas de perfil via autenticação corporativa (Nome, E-mail, Organização). Adicionalmente, processamos os documentos anexados estritamente durante o ciclo de vida da sessão no módulo Workspace.
            </p>
          </section>

          <section className="p-6 rounded-xl bg-teal-500/5 border border-teal-500/10">
            <h2 className="text-xl font-bold text-[#2DD4BF] mb-4">2. Tratamento e Isolamento (RAG-Free)</h2>
            <p className="leading-relaxed mb-4">
              Diferente de sistemas de IA tradicionais, o módulo <strong>Workspace</strong> opera sob uma arquitetura de isolamento temporário. Os documentos enviados são processados via Injeção Direta de Prompt (Direct Prompt Injection) e:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 text-sm">
              <li>Não alimentam a base de conhecimento (Vector Store) global de outras organizações.</li>
              <li>São removidos dos buffers de memória após o encerramento da sessão ou limpeza manual.</li>
              <li>O isolamento multi-tenant garante que seus dados nunca cruzem fronteiras organizacionais.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">3. Compartilhamento</h2>
            <p className="leading-relaxed mb-4">
              <strong>Não vendemos ou compartilhamos dados de clientes com terceiros para fins de marketing.</strong> 
            </p>
            <p className="leading-relaxed">
              O tráfego de informações ocorre de forma criptografada apenas entre nossos servidores seguros e os provedores de infraestrutura de LLM parceiros (ex: OpenAI) sob rigorosos acordos de confidencialidade de API, onde os dados enviados não são utilizados para treinamento de modelos públicos desses provedores.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">4. Exclusão de Dados</h2>
            <p className="leading-relaxed">
              Respeitando a LGPD e os princípios de soberania de dados, o usuário ou o administrador da organização pode solicitar e executar a exclusão definitiva de seu histórico de conversas e arquivos indexados a qualquer momento através das interfaces de gestão do sistema.
            </p>
          </section>

          <footer className="pt-12 border-t border-slate-800 text-[10px] font-mono text-slate-600 uppercase tracking-widest text-center">
            Mendonça Galvão • Gestão de Dados Segura
          </footer>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
