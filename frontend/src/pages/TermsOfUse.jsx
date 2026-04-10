import React from 'react';
import { useNavigate } from 'react-router-dom';

const TermsOfUse = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-300 font-sans selection:bg-indigo-500/30">
      <div className="max-w-4xl mx-auto py-16 px-6 sm:px-8">
        
        {/* Navigation / Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="group mb-12 flex items-center gap-2 text-slate-500 hover:text-[#818CF8] transition-colors text-xs font-mono tracking-widest uppercase"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Voltar
        </button>

        <header className="mb-12">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-4">
            Termos de Uso
          </h1>
          <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">
            Copilot Contábil IA • v3.1 Enterprise
          </p>
        </header>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-bold text-white mb-4">1. Aceitação</h2>
            <p className="leading-relaxed">
              Ao acessar e utilizar o Copilot Contábil, plataforma desenvolvida e operada pela <strong>Mendonça Galvão</strong>, você manifesta sua concordância integral com estes termos e com todas as diretrizes de conformidade aqui estabelecidas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">2. Descrição do Serviço</h2>
            <p className="leading-relaxed">
              O Copilot Contábil é uma ferramenta de suporte à decisão assistida por Inteligência Artificial (IA), projetada especificamente para a triagem, extração e análise de dados contábeis complexos, incluindo, mas não se limitando a, Demonstrações de Resultados do Exercício (DREs), Notas Fiscais Eletrônicas e Extratos Bancários.
            </p>
          </section>

          <section className="p-6 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
            <h2 className="text-xl font-bold text-[#818CF8] mb-4">3. Limitação de Responsabilidade da IA</h2>
            <p className="leading-relaxed mb-4">
              A plataforma utiliza Modelos de Linguagem de Grande Escala (LLMs) que, apesar de sua alta precisão, podem gerar resultados inconsistentes ou imprecisos sob certas condições. 
            </p>
            <div className="bg-[#0F172A] border-l-2 border-[#818CF8] p-4 text-sm italic">
              O Copilot Contábil atua exclusivamente como um <strong>assistente de produtividade</strong> e não substitui, sob hipótese alguma, o julgamento técnico e a validação profissional de um contador humano legalmente habilitado.
            </div>
            <p className="leading-relaxed mt-4">
              A Mendonça Galvão não se responsabiliza por decisões fiscais, financeiras ou estratégicas tomadas com base exclusiva nas análises automáticas geradas pelo sistema.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">4. Uso Adequado</h2>
            <p className="leading-relaxed mb-4">
              O usuário compromete-se a utilizar a plataforma de forma ética e legal, sendo estritamente proibido:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-400">
              <li>Inserir documentos ilícitos, falsos ou obtidos de forma fraudulenta.</li>
              <li>Utilizar a IA para finalidades de evasão fiscal ou qualquer atividade criminosa.</li>
              <li>Tentar realizar engenharia reversa nos prompts ou motores da plataforma.</li>
            </ul>
          </section>

          <footer className="pt-12 border-t border-slate-800 text-[10px] font-mono text-slate-600 uppercase tracking-widest text-center">
            Última atualização: Abril de 2026
          </footer>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUse;
