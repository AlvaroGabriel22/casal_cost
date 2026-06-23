# CasalCost

Financial management for couples: individual privacy by default, optional partner access, shared couple area, installments, recurring and projected cash flow.

## Rodar no navegador (desenvolvimento)

1. **Banco:** na raiz do projeto, com Docker instalado: `docker compose up -d`
2. **Backend:**
   ```bash
   cd backend && npx prisma migrate deploy && npx prisma db seed && npm run start:dev
   ```
3. **Frontend (outro terminal):**
   ```bash
   cd frontend && npm install && npm run dev
   ```
   Por defeito, em [`frontend/.env.development`](frontend/.env.development) o `VITE_API_URL` está **comentado**: o Axios usa o prefixo **`/api`** (ver [`frontend/src/api/client.ts`](frontend/src/api/client.ts)) e o [`frontend/vite.config.ts`](frontend/vite.config.ts) faz **proxy** de `/api` para `http://127.0.0.1:3000`. O Nest expõe os endpoints em **`/api/...`** (ex.: `POST /api/auth/login`). **Reinicie** o `npm run dev` após alterar variáveis `VITE_*`.
4. Abra **http://localhost:5173** (ou `http://127.0.0.1:5173`) — login de teste: `alvaro.g` / `admin@user`.

## Prerequisites

- Node.js 20+
- PostgreSQL 15+ (local or Docker)

## Database

Configure **`backend/.env`** (ficheiro único oficial do backend; não é versionado).

**Opção A — Docker (recomendado para desenvolvimento)**  
Instale o [Docker](https://docs.docker.com/engine/install/), depois na raiz do repositório:

```bash
docker compose up -d
```

Isso sobe PostgreSQL em `localhost:5434` com usuário `user`, senha `password` e banco `couple_finance_db` (veja `docker-compose.yml`).

**Opção B — PostgreSQL local**  
Crie o banco e um usuário compatível com a sua `DATABASE_URL`, por exemplo:

```bash
createdb couple_finance_db
# ou: psql -c "CREATE DATABASE couple_finance_db;"
```

## Backend

Crie ou edite **`backend/.env`** antes de arrancar (ver secção [Variáveis de ambiente (backend)](#variáveis-de-ambiente-backend)).

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

API listens on `http://localhost:3000` by default. Os endpoints HTTP estão sob o prefixo glob **`/api`** (ex.: `http://localhost:3000/api/auth/login`).

**Prisma commands** (as required by spec):

- `npx prisma migrate dev` — create/apply migrations in development
- `npx prisma generate` — regenerate Prisma Client
- `npx prisma db seed` — run `prisma/seed.ts`
- `npx prisma studio` — open data browser

### Default dev user (seed only — not for production)

| Field    | Value        |
|----------|-------------|
| Username | `alvaro.g`  |
| Password | `admin@user`|

Partner demo user: `partner.demo` / same password.

## Frontend

- **`VITE_API_URL` / `VITE_API_BASE_URL` vazios (recomendado em dev no mesmo PC):** o Axios usa `baseURL` **`/api`**; o Vite (`5173`) encaminha `/api` para o Nest em `127.0.0.1:3000` ([`frontend/vite.config.ts`](frontend/vite.config.ts)).
- **`VITE_API_URL` definido:** o browser chama esse URL diretamente (útil para LAN ou API noutro domínio); veja comentários em [`frontend/.env.example`](frontend/.env.example).

Se a página abrir **em branco**, faça um hard refresh (**Ctrl+Shift+R**), confirme que usa `npm run dev` (não abra `index.html` diretamente) e veja erros na consola do browser (F12).

```bash
cd frontend
npm install
npm run dev
```

Opens Vite dev server (default `5173`).

## Deploy na Vercel

O projeto está configurado para **frontend estático + API Nest numa Serverless Function** na mesma origem (`/api/*`), via [`vercel.json`](vercel.json), [`api/server.js`](api/server.js) e bootstrap serverless em [`backend/src/serverless.ts`](backend/src/serverless.ts).

- **URL de produção:** https://casalcost.vercel.app
- **CLI:** na raiz do repositório, `npx vercel deploy` (preview) ou `npx vercel deploy --prod`. O MCP da Vercel no Cursor remete para este fluxo com o CLI.
- **Variáveis de ambiente obrigatórias** no projeto Vercel (Production; opcionalmente Preview):
  - **`DATABASE_URL`** — PostgreSQL (ex.: [Neon](https://neon.tech)). Sem isto, o build omite `prisma migrate deploy` e a API falha ao iniciar.
  - **`DATABASE_URL_UNPOOLED`** — conexão directa para migrations (Neon).
  - **`JWT_SECRET`** — segredo forte para JWT.
  - **`RESEND_API_KEY`** — chave da [Resend](https://resend.com) para e-mails de recuperação de senha.
  - **`MAIL_FROM`** — remetente (ex.: `CasalCost <noreply@seudominio.com>`).
  - **`APP_URL`** — URL pública do frontend (ex.: `https://casalcost.vercel.app`).
- Depois de configurares **`DATABASE_URL`**, faz **redeploy** para aplicar migrações durante o build ([`scripts/run-prisma-migrate-deploy.js`](scripts/run-prisma-migrate-deploy.js)).
- **Seed:** com a mesma `DATABASE_URL`: `cd backend && npx prisma db seed`.

[`.vercelignore`](.vercelignore) evita enviar `backend/.env` para a cloud.

## Diagnóstico: «Sem ligação ao servidor» ou falha no login

1. **Dois tipos de erro**
   - Mensagem vermelha **no formulário** de login → falha de rede no Axios (sem resposta HTTP). Confirme backend em `npm run start:dev` na porta **3000** e Postgres (`docker compose up -d` + `backend/.env`).
   - Página **«Erro ao mostrar a aplicação»** (caixa com mensagem técnica) → excepção React; abra a consola (F12) para o stack trace.

2. **URL na barra de endereços:** em dev no mesmo PC, prefira `http://localhost:5173` ou `http://127.0.0.1:5173`. Se abrir por **`http://<IP-da-LAN>:5173`** (outro dispositivo ou teste na rede) **e** tiver `VITE_API_URL=http://127.0.0.1:3000`, o browser tenta falar com **127.0.0.1 na máquina do cliente**, não no servidor — falha esperada. Soluções: **comentar** `VITE_API_URL` e reiniciar o dev server (proxy no PC onde corre o Vite), ou definir `VITE_API_URL=http://<IP-do-PC-com-o-Nest>:3000`.

3. **DevTools → Network** no pedido de login: estado «failed» / sem status HTTP vs **401** ou **500** com corpo JSON (neste caso já há ligação; veja mensagem no corpo).

## Tests (backend)

```bash
cd backend && npm test
```

## Recuperação de senha

Fluxo por **link no e-mail** (válido 30 minutos):

1. Login → **Esqueci minha senha** → informe o e-mail cadastrado.
2. O backend envia um link via [Resend](https://resend.com) (ou regista o link nos logs em dev, se `RESEND_API_KEY` não estiver definida).
3. O utilizador abre o link e define uma nova senha.

Variáveis em **`backend/.env`** (local) ou no painel Vercel (produção): `RESEND_API_KEY`, `MAIL_FROM`, `APP_URL`.

## Variáveis de ambiente (backend)

Ficheiro único: **`backend/.env`** (gitignored). Exemplo para desenvolvimento local com Docker:

```env
DATABASE_URL="postgresql://user:password@localhost:5434/couple_finance_db?schema=public"
DATABASE_URL_UNPOOLED="postgresql://user:password@localhost:5434/couple_finance_db?schema=public"
JWT_SECRET="change-me-use-long-random-string"
RESEND_API_KEY="re_..."
MAIL_FROM="CasalCost <onboarding@resend.dev>"
APP_URL="http://localhost:5173"
```

Em produção (Vercel), define as mesmas chaves no painel — **nunca** commites segredos no repositório.

## Tech summary

- **Backend:** NestJS, TypeScript, Prisma 5, PostgreSQL, JWT, bcrypt, class-validator
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Axios, React Router
