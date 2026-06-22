import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[CasalCost]', error, info.componentStack);
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  override render() {
    if (this.state.error) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-4 py-8">
          <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FEF2F2] text-[#B91C1C]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                <line x1="12" x2="12" y1="9" y2="13" />
                <line x1="12" x2="12.01" y1="17" y2="17" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-950">Algo inesperado aconteceu</h1>
            <p className="mt-2 text-sm text-slate-600">
              Tivemos um problema ao exibir esta página. Por favor, recarregue para tentar novamente.
              Se o erro continuar, volte mais tarde.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-[#071A3D] px-5 text-sm font-semibold text-white shadow hover:bg-[#0B2D5C] focus:outline-none focus:ring-2 focus:ring-[#103B73] focus:ring-offset-2"
            >
              Recarregar
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
