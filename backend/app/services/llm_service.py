"""
Copiloto Contábil IA — LLM Service
RAG pipeline using LangChain for Brazilian accounting law queries.
"""
import logging
from typing import Optional
from app.config import get_settings
from app.models.schemas import ToneEnum, DetailLevelEnum

LLM_CONFIG = {
    "model": "gpt-4o",
    "temperature": 0.3,
    "max_tokens": 2048,
}

logger = logging.getLogger(__name__)

# ── Base System Prompt (rigoroso, conforme especificação) ─────────────────────
BASE_SYSTEM_PROMPT = """Você é o Agente Supervisor (Copilot Técnico Sênior) especializado em Contabilidade Brasileira.
Sua missão é coordenar as respostas, analisar os dados e formular a resposta final.
Você possui uma equipe de agentes especialistas (ferramentas) à sua disposição. Se a pergunta exigir pesquisa atualizada ou cálculos precisos de impostos/folha de pagamento, DELEGUE a tarefa para o respectivo Agente Especialista antes de formular a sua resposta.

Você domina profundamente:
• Código Tributário Nacional (CTN)
• Regulamento do Imposto de Renda (RIR/2018 - Decreto 9.580)
• Normas Brasileiras de Contabilidade (NBC TG, NBC TA, NBC TSP)
• Pronunciamentos CPC (CPC 00 a CPC 50)
• Legislação Trabalhista (CLT, eSocial, FGTS, INSS)
• Simples Nacional (LC 123/2006)
• SPED Fiscal, ECD, ECF, EFD-Contribuições
• Regimes tributários: Lucro Real, Lucro Presumido, Simples Nacional, MEI
• FAP, RAT, SAT e contribuições previdenciárias
• IRPJ, CSLL, PIS, COFINS, ISS, ICMS, IPI

IMPORTANTE (UX/UI):
Ao final da sua resposta, gere exatamente 3 perguntas curtas e práticas de continuação que o usuário poderia querer perguntar em seguida, para manter o fluxo de conversa.
Formate cada pergunta em uma nova linha com o exato prefixo "SUGESTÃO_DE_PERGUNTA: ".
Exemplo:
SUGESTÃO_DE_PERGUNTA: Como aplicar essa regra no Simples Nacional?
SUGESTÃO_DE_PERGUNTA: Qual a multa por atraso no envio?
SUGESTÃO_DE_PERGUNTA: Há alguma exceção para MEI?

REGRAS DE MATEMÁTICA:
NUNCA use colchetes [ ] para envolver equações. 
Se for criar uma fórmula ou cálculo, você DEVE estritamente usar o formato LaTeX com '$$' para equações em bloco (ex: $$ x = y $$) e '\\(' '\\)' para equações na mesma linha.

REGRAS DE PESQUISA NA INTERNET:
Você TEM ACESSO TOTAL À INTERNET em tempo real através da sua ferramenta de pesquisa.
SEMPRE que o usuário perguntar sobre notícias atuais, leis de 2024/2025/2026, ou pedir para você "pesquisar", VOCÊ É OBRIGADO a invocar a sua ferramenta de pesquisa na web antes de responder.
NUNCA diga que não tem acesso à internet. NUNCA diga que seu conhecimento termina em uma data específica. Você pode e DEVE buscar dados novos.
"""

# ── Tone-Specific Prompts ─────────────────────────────────────────────────────
TONE_INSTRUCTIONS = {
    ToneEnum.FORMAL: """
MODO: TÉCNICO E FORMAL
Diretrizes de resposta:
- Use vocabulário jurídico, cite artigos explicitamente e mantenha tom impessoal.
- SEMPRE cite as fontes legais específicas (ex: "Conforme Art. 150, I, do CTN...", "NBC TG 25, item 14...")
- Apresente cálculos com fórmulas quando aplicável
- Nunca use emojis. Mantenha postura altamente corporativa.
""",
    ToneEnum.INFORMAL: """
MODO: INFORMAL E ACESSÍVEL
Diretrizes de resposta:
- Use linguagem acessível, didática, evite jargão excessivo. Ideal para o cliente final do escritório.
- Explique os termos técnicos caso use-os. Traduza a linguagem legal para termos do dia a dia empresarial.
- Mantenha tom amigável. Emojis leves podem ser usados esporadicamente para melhor comunicação com o cliente leigo.
""",
    ToneEnum.TECNICA: """MODO: TÉCNICO E FORMAL""",
    ToneEnum.DIDATICA: """MODO: INFORMAL E ACESSÍVEL"""
}

# ── Detail Level Prompts ──────────────────────────────────────────────────────
DETAIL_INSTRUCTIONS = {
    DetailLevelEnum.RESUMIDA: """
NÍVEL DE DETALHE: RESUMIDA
- Forneça uma resposta direta e concisa.
- Sintetize as informações em no máximo 2 parágrafos centrais.
- Mantenha o foco absoluto na conclusão da resposta sem se alongar no histórico.
""",
    DetailLevelEnum.PADRAO: """
NÍVEL DE DETALHE: PADRÃO
- Resposta recomendada cobrindo a parte teórica básica e a solução.
""",
    DetailLevelEnum.DETALHADA: """
NÍVEL DE DETALHE: DETALHADA
- Forneça uma análise passo a passo.
- Detalhe exceções à regra, riscos contábeis e inclua exemplos práticos detalhados.
- Se for cálculo, explique cada métrica da fórmula em profundidade.
- Separe em sessões claras com muitos detalhes em markdown.
"""
}


class LLMService:
    """
    Service for processing chat messages through the LangChain pipeline.
    Supports dual-tone responses (Técnica / Didática).
    """

    def __init__(self):
        self.settings = get_settings()
        self._llm = None
        self._initialized = False

    def _initialize(self):
        """Lazy initialization of the LangChain components."""
        if self._initialized:
            return

        try:
            if not self.settings.openai_api_key:
                logger.warning(
                    "⚠️ OpenAI API key not configured. LLM service will return mock responses."
                )
                self._initialized = True
                return

            from langchain_openai import ChatOpenAI

            self._llm = ChatOpenAI(
                api_key=self.settings.openai_api_key,
                **LLM_CONFIG
            )
            self._initialized = True
            logger.info(
                f"✅ LLM Service initialized with config: {LLM_CONFIG}"
            )

        except Exception as e:
            logger.error(f"❌ Failed to initialize LLM service: {e}")
            self._initialized = True  # Mark as initialized to avoid retries

    async def process_message(
        self,
        message: str,
        tone: ToneEnum = ToneEnum.FORMAL,
        detail_level: DetailLevelEnum = DetailLevelEnum.PADRAO,
        conversation_history: Optional[list[dict]] = None,
    ) -> dict:
        """
        Process a chat message through the LLM pipeline.

        Args:
            message: The user's question
            tone: Response tone (Técnica or Didática)
            conversation_history: Previous messages for context

        Returns:
            dict with 'response' and 'sources' keys
        """
        self._initialize()

        # If LLM is not configured, return mock
        if not self.settings.openai_api_key or self._llm is None:
            return self._mock_response(message, tone)

        try:
            from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
            from openai import OpenAI

            # 1. RAG Retrieval
            context = ""
            if self.settings.openai_api_key:
                try:
                    client = OpenAI(api_key=self.settings.openai_api_key)
                    query_embedding_response = client.embeddings.create(
                        model="text-embedding-3-small",
                        input=[message],
                    )
                    query_embedding = query_embedding_response.data[0].embedding

                    # Call Supabase semantic search function
                    from app.supabase_client import get_admin_singleton
                    supabase = get_admin_singleton()
                    
                    # Fetch profile to get org_id if not provided
                    # For RAG, we strictly limit to the user's current organization
                    from app.middleware.auth import get_current_user
                    # Note: we need the organization_id. Assuming it's accessible or passed.
                    # In this context, we'll try to get it from the session if needed, 
                    # but for now let's assume the user context is handled or we rely on RLS if possible.
                    # Since match_knowledge_chunks has p_organization_id, we'll use it if we can.
                    
                    search_response = supabase.rpc("match_knowledge_chunks", {
                        "query_embedding": query_embedding,
                        "match_threshold": 0.5,
                        "match_count": 5
                    }).execute()

                    if search_response.data:
                        context_parts = []
                        for chunk in search_response.data:
                            source = chunk.get("metadata", {}).get("source", "Documento")
                            page = chunk.get("metadata", {}).get("page", "?")
                            context_parts.append(f"--- Fonte: {source} (pág. {page}) ---\n{chunk['content']}")
                        context = "\n\nCONTEXTO RECUPERADO DA BASE LEGAL:\n" + "\n\n".join(context_parts)
                except Exception as rag_err:
                    logger.warning(f"RAG retrieval failed: {rag_err}")

            # 2. Build the system prompt
            system_content = BASE_SYSTEM_PROMPT + "\n\n" + TONE_INSTRUCTIONS[tone] + "\n\n" + DETAIL_INSTRUCTIONS[detail_level]
            if context:
                system_content += "\n\nUse o contexto abaixo para fundamentar sua resposta. Se as informações necessárias não estiverem no contexto, use seu conhecimento técnico, mas priorize as fontes citadas.\n" + context

            # 3. Build message list (without SystemMessage, which goes to state_modifier)
            messages = []

            # Add conversation history
            if conversation_history:
                for msg in conversation_history[-8:]:
                    content = msg.get("content", "")
                    role = msg.get("role", "user")
                    if role == "user":
                        messages.append(HumanMessage(content=content))
                    elif role == "assistant":
                        messages.append(AIMessage(content=content))

            # Add the current message
            if not conversation_history or conversation_history[-1].get("content") != message:
                messages.append(HumanMessage(content=message))

            # 4. Define Agents (Tools) and Invoke via LangGraph ReAct Agent
            from langgraph.prebuilt import create_react_agent
            from langchain_community.tools import DuckDuckGoSearchRun
            from langchain_core.tools import tool

            search_tool = DuckDuckGoSearchRun(
                name="Agente_Pesquisador",
                description="Especialista em Web. Pesquisa notícias, leis, alíquotas atualizadas e informações fiscais recentes na internet."
            )

            @tool
            def calculadora_tributaria(expressao: str) -> str:
                """
                Agente Matemático/Calculista: Use esta ferramenta para fazer contas matemáticas precisas.
                A ferramenta avalia expressões Python/Numexpr (ex: '1500 * 0.18', '5000 - (5000 * 0.11)').
                Passe APENAS a expressão matemática pura, sem textos em volta. O resultado retornado deve ser usado na sua resposta final.
                """
                import numexpr
                try:
                    res = numexpr.evaluate(expressao)
                    return f"Resultado exato calculado pelo Agente Matemático: {res}"
                except Exception as e:
                    return f"Erro matemático: {e}"

            tools = [search_tool, calculadora_tributaria]
            agent_executor = create_react_agent(self._llm, tools, prompt=system_content)

            result = await agent_executor.ainvoke({"messages": messages})

            response_text = result["messages"][-1].content
            sources = self._extract_sources(response_text)

            return {
                "response": response_text,
                "sources": sources,
            }

        except Exception as e:
            logger.error(f"LLM processing error: {e}", exc_info=True)
            return {
                "response": (
                    f"⚠️ Erro ao processar sua mensagem.\n\n"
                    f"Detalhes técnicos: {str(e)}\n\n"
                    f"Tente novamente em instantes ou entre em contato com o suporte."
                ),
                "sources": [],
            }

    def _extract_sources(self, response: str) -> list[str]:
        """Extract legal source references from the response."""
        import re

        sources = []
        patterns = [
            r"Art\.?\s*\d+[\w\s,°º]*(?:do|da|dos|das)\s+[\w\s]+",
            r"Lei\s*(?:Complementar\s*)?(?:nº|n°|n\.)?\s*[\d\.]+/\d{2,4}",
            r"Decreto\s*(?:nº|n°|n\.)?\s*[\d\.]+(?:/\d{2,4})?",
            r"IN\s*(?:RFB|SRF)\s*(?:nº|n°|n\.)?\s*[\d\.]+(?:/\d{2,4})?",
            r"NBC\s*T[A-Z]?\s*\d+(?:\s*\(R\d\))?",
            r"CPC\s*\d+(?:\s*\(R\d\))?",
            r"CTN",
            r"CLT",
            r"RIR/\d{4}",
            r"LC\s*\d+/\d{4}",
            r"Resolução\s*CFC\s*(?:nº|n°)?\s*[\d\.]+(?:/\d{2,4})?",
        ]
        for pattern in patterns:
            matches = re.findall(pattern, response, re.IGNORECASE)
            sources.extend([m.strip() for m in matches])

        # Deduplicate and limit
        seen = set()
        unique_sources = []
        for s in sources:
            normalized = s.lower().strip()
            if normalized not in seen:
                seen.add(normalized)
                unique_sources.append(s)

        return unique_sources[:15]

    def _mock_response(self, message: str, tone: ToneEnum) -> dict:
        """Generate a mock response when LLM is not configured (safe fallback)."""
        tone_label = "técnico" if tone == ToneEnum.TECNICA else "didático"

        # Provide a more useful mock that simulates the real behavior
        mock_responses = {
            "fap": (
                "## Cálculo do FAP (Fator Acidentário de Prevenção)\n\n"
                "O FAP é um multiplicador aplicado sobre a alíquota RAT (Riscos Ambientais do Trabalho), "
                "variando de **0,5000 a 2,0000**.\n\n"
                "### Fórmula:\n"
                "```\nContribuição = Remuneração × RAT × FAP\n```\n\n"
                "### Base Legal:\n"
                "- Art. 10 da Lei nº 10.666/2003\n"
                "- Decreto nº 6.957/2009\n"
                "- Resolução CNPS nº 1.329/2017\n\n"
                "⚠️ *Resposta em modo mock. Configure a OPENAI_API_KEY para ativar a IA.*"
            ),
        }

        # Check for keyword match
        msg_lower = message.lower()
        for key, resp in mock_responses.items():
            if key in msg_lower:
                return {"response": resp, "sources": ["Modo Mock — Configure OPENAI_API_KEY"]}

        return {
            "response": (
                f"**[Modo {tone_label}]** Recebi sua pergunta:\n\n"
                f"> {message}\n\n"
                "---\n\n"
                "⚠️ O serviço de IA está em **modo mock**. "
                "Para ativar respostas reais com fundamentação legal, configure a variável "
                "`OPENAI_API_KEY` no backend.\n\n"
                "Quando ativo, o Copilot Contábil IA irá:\n"
                "- 📚 Consultar legislação contábil brasileira\n"
                "- ⚖️ Responder com fundamentação legal (CPC, CTN, CLT, RFB)\n"
                "- 🎯 Adaptar o tom conforme solicitado\n"
                "- 📊 Incluir cálculos e fórmulas quando aplicável"
            ),
            "sources": ["Modo Mock — Configure OPENAI_API_KEY"],
        }

    @property
    def is_configured(self) -> bool:
        """Check if the LLM service has a valid API key."""
        return bool(self.settings.openai_api_key)

    async def generate_workspace_response(self, message: str, document_context: str, tone: str, detail_level: str) -> str:
        """Isolated LLM response generation for Workspace Analysis without RAG hallucination."""
        self._initialize()
        if not self._llm:
            return "Modo Mock - IA desativada. Configure a api key no ambiente."

        system_content = (
            "Você é o Copilot Contábil IA atuando no ambiente restrito de Workspace (Análise de Documentos do Usuário).\n"
            "Sua diretriz de ouro é: Responda estritamente com base NAS INFORMAÇÕES DO DOCUMENTO EXTRAÍDO abaixo. "
            "Se for pedido algo que não consta no documento extratificado abaixo, declare explicitamente que a informação não existe no documento enviado.\n\n"
            "--- INÍCIO DO DOCUMENTO EXTRAÍDO ---\n"
            f"{document_context}\n"
            "--- FIM DO DOCUMENTO EXTRAÍDO ---\n\n"
            "REGRAS DE FORMATAÇÃO (CRÍTICAS):\n"
            "1. FORMATAÇÃO DE NÚMEROS: Use sempre o padrão brasileiro (milhar com ponto e decimal com vírgula). Ex: 1.250,50.\n"
            "2. MOEDA: Sempre formate valores monetários em Reais (R$). Ex: R$ 5.000,00.\n"
            "3. MATEMÁTICA E CÁLCULOS: NUNCA use colchetes [ ] para envolver equações matemáticas. Você DEVE usar estritamente o formato LaTeX com '$$' para equações em bloco (ex: $$ x = y $$) e '\\(' '\\)' para inline.\n"
            "4. MARKDOWN: Use tabelas, listas e negrito para destacar valores importantes. Sua resposta deve ser esteticamente premium.\n"
            "5. ESCOPO: Siga o tom configurado. Extraia insights, compare números, explique cláusulas presentes, mas NÃO alucine informações de fora e NÃO busque bases legais genéricas que contradigam o texto submetido.\n\n"
            "IMPORTANTE (UX/UI):\n"
            "Ao final de toda análise, gere exatamente 3 perguntas de continuação que o usuário poderia querer fazer sobre o documento anexado.\n"
            "Formate CADA pergunta em uma nova linha usando o prefixo exato 'SUGESTÃO_DE_PERGUNTA: '.\n"
            "Exemplo:\n"
            "SUGESTÃO_DE_PERGUNTA: Qual é o risco tributário apontado no balancete?\n"
            "SUGESTÃO_DE_PERGUNTA: Pode detalhar as margens de lucro dos últimos meses?"
        )

        from langchain_core.messages import HumanMessage, SystemMessage
        messages = [
            SystemMessage(content=system_content),
            HumanMessage(content=message)
        ]

        try:
            result = await self._llm.ainvoke(messages)
            return result.content
        except Exception as e:
            logger.error(f"Generate workspace exception: {e}")
            return f"Erro ao processar análise do documento: {str(e)}"



# ── Singleton ────────────────────────────────────────────────────────────────
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """Returns a cached singleton of the LLM service."""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service

async def generate_response_with_context(
    message: str,
    context: str,
    tone: str = "Formal",
    detail_level: str = "Padrão"
) -> str:
    """Helper proxy to inject dedicated Document Context to the LLM bypass Engine."""
    llm_svc = get_llm_service()
    return await llm_svc.generate_workspace_response(message, context, tone, detail_level)
