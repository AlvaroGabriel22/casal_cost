import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const apiKey = this.config.get<string>('RESEND_API_KEY')?.trim();
    const from =
      this.config.get<string>('MAIL_FROM')?.trim() ??
      'CasalCost <onboarding@resend.dev>';

    const subject = 'Recuperação de senha — CasalCost';
    const html = `
      <p>Recebemos um pedido para redefinir a senha da sua conta CasalCost.</p>
      <p><a href="${resetUrl}">Clique aqui para definir uma nova senha</a></p>
      <p>O link expira em 30 minutos. Se você não solicitou isso, ignore este e-mail.</p>
      <p style="color:#64748b;font-size:12px">Se o botão não funcionar, copie e cole este endereço no navegador:<br>${resetUrl}</p>
    `.trim();

    if (!apiKey) {
      this.logger.warn(
        `RESEND_API_KEY não configurada — link de reset (dev): ${resetUrl}`,
      );
      return;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Falha ao enviar e-mail (${res.status}): ${body}`);
      throw new Error('Não foi possível enviar o e-mail de recuperação.');
    }
  }
}
