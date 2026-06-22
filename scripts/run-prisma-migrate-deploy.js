/**
 * Local: corre migrate com `backend/.env`.
 * Vercel: usa só `DATABASE_URL` do painel; sem variável, omite migrate (evita falhar no build).
 */
const { execSync } = require('child_process');
const path = require('path');

const backendDir = path.join(__dirname, '..', 'backend');

if (process.env.VERCEL === '1' && !process.env.DATABASE_URL?.trim()) {
  console.warn(
    '[CasalCost] Build na Vercel sem DATABASE_URL — omitindo prisma migrate deploy. Adicione DATABASE_URL ao projeto e faça redeploy.',
  );
  process.exit(0);
}

execSync('npx prisma migrate deploy', {
  stdio: 'inherit',
  cwd: backendDir,
  env: process.env,
});
