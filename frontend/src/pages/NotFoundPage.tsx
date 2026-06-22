import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold uppercase text-[#0B2D5C]">404</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Página não encontrada</h1>
        <p className="mt-2 text-slate-500">A rota solicitada não existe neste painel.</p>
        <Link to="/dashboard/individual" className="mt-5 inline-flex">
          <Button type="button">Voltar ao dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
