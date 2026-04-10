# Copilot Contábil IA

O **Copilot Contábil IA** é uma plataforma SaaS Premium com dupla funcionalidade (RAG e RAG-Free) focada na automação e análise inteligente de dados para escritórios de contabilidade. Integrando motores potentes de linguagem natural com bases seguras e multi-tenant (RBAC).

## Visão Geral do Produto

Esta plataforma serve como um "Cérebro IA" para auditores e contadores, oferecendo as seguintes verticais de serviço:
- **Chat Global**: Uma base de conhecimento jurídica e fiscal expansível (Base Legal) unida num motor RAG para responder a consultas cotidianas do colaborador.
- **Análise de Arquivos (Workspace)**: Ambiente restrito de injeção direta de prompts sobre DREs, Balanços e Notas Fiscais (NFe), projetado para motor RAG-Free garantindo dados não enviesados para análises numéricas cruéis.
- **Gestão de Equipe**: Módulo administrativo de gestão de privilégios e licenças (Admin/Sócio vs Membro/Consultor).
- **Roteamento Omnichannel**: Automação via WhatsApp Business, habilitando chatbots autônomos por inteligência artificial para o atendimento externo ao cliente.

## Arquitetura Técnica

O projeto segue um padrão desacoplado, servido por infraestruturas de ponta:

*   **Frontend**: React + Vite, consumindo TailwindCSS para um Design System minimalista e focado no tema escuro ("Obsidian Dark").
*   **Backend**: Python com FastAPI guiando todas as requisições API, extração semântica e rotas lógicas.
*   **Database & Auth**: Supabase Cloud operando autenticação via JWT/OAuth, PostgresSQL escalável e Row Level Security (RLS) para restrição rigorosa multi-tenant.
*   **Motores de IA**: Integração com LangChain e os modelos pesados da OpenAI (ex: gpt-4o) para raciocínio analítico. O backend possui duas vias de pipeline de LLM: **Chain QA Com RAG** e **Injeção Direta Sem RAG**.
*   **Gateway Omni**: Conexões webhooks trafegam dados de WhatsApp através de instâncias nativas da _Evolution API_.

## Motores de Inteligência Artificial: RAG vs RAG-Free

A grande diferença arquitetural da aplicação acontece no fluxo de extração de dados da IA:

1.  **Chat Global (RAG Pipeline)**: Utiliza *Retrieval-Augmented Generation*. Sempre que o usuário faz uma pergunta, o modelo vetoriza a solicitação, realiza buscas de similaridade nos buffers de "Base Legal" persistidos no vector_store do Supabase, incorpora o documento mais relevante no prompt e gera fofineza contextualizada.
2.  **Workspace (RAG-Free Engine)**: Projetado para lidar com DREs curtas e confidenciais ou planilhas isoladas do mês vigente. Os uploads são processados em PDF/CSV no cliente e o payload integral (Direct Prompt Injection) é enviado à IA na mesma query. Zero buscas vetoriais cross-document. Reseta a cada ciclo, não misturando faturamentos antigos com novos.

---

## Setup e Execução

### Pré-requisitos
*   Docker & Docker Compose.
*   Node.js (LTS).
*   Keys de serviço da OpenAI e chaves do Supabase Cloud.

### Variáveis de Ambiente (`.env`)

No diretório **`/backend`**, crie o arquivo `.env`:
```env
SUPABASE_URL=seu_url_aqui
SUPABASE_KEY=sua_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_aqui
OPENAI_API_KEY=sk-xxxx
```

No diretório **`/frontend`**, crie seu `.env`:
```env
VITE_SUPABASE_URL=seu_url_aqui
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
VITE_API_URL=http://localhost:8000
```

### Rodando via Docker (Recomendado)
A aplicação possui `docker-compose.yml` pré-configurado tanto para o build do React servido por NGINX quanto o FastAPI via uvicorn. Na raiz do projeto:

```bash
# Build e start simultâneo em background
docker-compose up -d --build
```
- Frontend acessível em: `http://localhost:3000`
- Backend / Swagger: `http://localhost:8000/docs`

> Caso queira rodar os microsserviços separadamente (em ambiente DEV):
> 
> **Backend**: `cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload`
> 
> **Frontend**: `cd frontend && npm install && npm run dev`
