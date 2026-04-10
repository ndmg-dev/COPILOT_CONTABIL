# Guia de Deploy no Coolify - Copilot Contábil IA

Este guia orienta o processo de deploy da plataforma utilizando o Coolify. O projeto já está preparado com arquivos de produção (`Dockerfile.prod` e `docker-compose.prod.yml`).

## 1. Preparação no Coolify

1. Acesse seu painel do Coolify.
2. Vá em **Resources** -> **New Resource** -> **Docker Compose**.
3. Escolha o seu servidor e destino (ex: `Main`).

## 2. Configuração do Git

1. Conecte sua conta do GitHub/GitLab.
2. Selecione o repositório `GESTAO_CONTABIL`.
3. Escolha a Branch principal (ex: `main`).

## 3. Configuração do Docker Compose

No campo de configuração do Compose, cole o conteúdo do arquivo `docker-compose.prod.yml` que criamos ou aponte para ele no repositório. O Coolify irá processar os serviços `backend` e `frontend`.

## 4. Variáveis de Ambiente (Secrets)

No Coolify, vá na aba **Environment Variables** e adicione as seguintes chaves:

### Backend Secrets:
- `SUPABASE_URL`: URL do seu projeto Supabase.
- `SUPABASE_KEY`: Anon Key do Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key.
- `OPENAI_API_KEY`: Sua chave da OpenAI.
- `CORS_ORIGINS`: O domínio final onde o frontend estará rodando (ex: `https://copiloto.seu-site.com.br`).

### Frontend Secrets (Build-Time):
- `VITE_SUPABASE_URL`: Mesma URL do Supabase.
- `VITE_SUPABASE_ANON_KEY`: Mesma Anon Key.
- `VITE_API_URL`: A URL pública do seu **Backend**.

## 5. Deployment

1. Clique em **Deploy** no topo da página do recurso.
2. Monitore os logs do build.

## ⚠️ Solução de Problemas: Erro 255 (OOM)

Se o seu deploy falhar com **Exit Code 255**, é quase certeza que o servidor ficou sem memória RAM durante o build (especialmente instalando pacotes pesados de Python e Node ao mesmo tempo).

### Opção A: Aumentar o Swap (Recomendado)
Execute no terminal do seu servidor (SSH) para aguentar o pico de memória:

```bash
sudo swapoff -a
sudo dd if=/dev/zero of=/swapfile bs=1G count=4
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Opção B: Deploy Individual
Se o servidor for muito pequeno, tente dar um novo **Deploy** agora que o Frontend já deve estar parcialmente em cache, ou buildar os serviços um de cada vez.
