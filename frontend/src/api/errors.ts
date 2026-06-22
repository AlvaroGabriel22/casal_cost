import axios from 'axios';

function fallbackMessageForStatus(status: number, fallback: string): string {
  if (status === 400) return 'Não foi possível completar a operação. Revise os dados informados.';
  if (status === 401) return 'Sua sessão expirou. Faça login novamente para continuar.';
  if (status === 403) return 'Você não tem permissão para realizar esta ação.';
  if (status === 404) return 'O item solicitado não foi encontrado.';
  if (status === 409) return 'Este registro entra em conflito com outro existente.';
  if (status === 422) return 'Alguns campos precisam ser revisados antes de continuar.';
  if (status === 429) return 'Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.';
  if (status >= 500) return 'Estamos com uma instabilidade temporária. Tente novamente em alguns instantes.';
  return fallback;
}

export function formatAxiosError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return 'Não foi possível conectar ao serviço. Verifique sua conexão com a internet e tente novamente.';
    }
    const status = err.response.status;
    const body = err.response.data as
      | { message?: string | string[]; error?: { message?: string; code?: string } }
      | undefined;
    const apiMessage =
      body?.error?.message ??
      (Array.isArray(body?.message) ? body!.message!.join(', ') : (body?.message as string | undefined));

    if (apiMessage && typeof apiMessage === 'string' && apiMessage.trim().length > 0) {
      return apiMessage;
    }
    return fallbackMessageForStatus(status, fallback);
  }
  return fallback;
}
