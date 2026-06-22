# CasalCost Frontend

SPA em React, Vite e TypeScript para gestão financeira individual e compartilhada de casais.

## Stack

- React + Vite + TypeScript
- TailwindCSS
- React Router DOM
- Axios
- React Hook Form + Zod
- Recharts
- Zustand
- Lucide React
- date-fns

## Variáveis de ambiente

Crie um `.env.development` ou `.env` se quiser chamar a API diretamente:

```bash
VITE_API_BASE_URL=http://127.0.0.1:3000
```

Em desenvolvimento local, pode deixar `VITE_API_BASE_URL` vazio. O Vite encaminha `/auth`, `/dashboard`, `/expenses`, `/incomes`, `/installments`, `/couples`, `/individual-access` e `/users` para `http://127.0.0.1:3000`.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Login de desenvolvimento

Depois de rodar o seed do backend:

- Usuário: `alvaro.g`
- Senha: `admin@user`
- Parceiro demo: `partner.demo`

## Telas

- Login, cadastro, recuperação de sessão e rotas protegidas
- Dashboard individual e dashboard do casal
- Despesas individuais e compartilhadas
- Criação de despesas únicas, fixas, recorrentes, parceladas e futuras
- Receitas
- Parcelamentos
- Gestão do casal
- Permissões de acesso individual
- Configurações financeiras
- Perfil
