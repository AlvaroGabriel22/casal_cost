"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let MailService = MailService_1 = class MailService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(MailService_1.name);
    }
    async sendPasswordResetEmail(to, resetUrl) {
        const apiKey = this.config.get('RESEND_API_KEY')?.trim();
        const from = this.config.get('MAIL_FROM')?.trim() ??
            'CasalCost <onboarding@resend.dev>';
        const subject = 'Recuperação de senha — CasalCost';
        const html = `
      <p>Recebemos um pedido para redefinir a senha da sua conta CasalCost.</p>
      <p><a href="${resetUrl}">Clique aqui para definir uma nova senha</a></p>
      <p>O link expira em 30 minutos. Se você não solicitou isso, ignore este e-mail.</p>
      <p style="color:#64748b;font-size:12px">Se o botão não funcionar, copie e cole este endereço no navegador:<br>${resetUrl}</p>
    `.trim();
        if (!apiKey) {
            this.logger.warn(`RESEND_API_KEY não configurada — link de reset (dev): ${resetUrl}`);
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
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
//# sourceMappingURL=mail.service.js.map