"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcrypt"));
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
const api_response_1 = require("../common/api-response");
const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const MAX_RESET_REQUESTS_PER_HOUR = 3;
let AuthService = class AuthService {
    constructor(prisma, jwt, mail, config) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.mail = mail;
        this.config = config;
    }
    async register(body) {
        const email = body.email.trim().toLowerCase();
        const exists = await this.prisma.user.findFirst({
            where: {
                OR: [{ username: body.username }, { email }],
                deletedAt: null,
            },
        });
        if (exists) {
            throw new common_1.ConflictException('Já existe uma conta com este usuário ou email.');
        }
        const passwordHash = await bcrypt.hash(body.password, 10);
        const user = await this.prisma.user.create({
            data: {
                name: body.name,
                username: body.username,
                email,
                passwordHash,
                financialSettings: {
                    create: {
                        baseSalary: '0',
                        salaryPaymentDay: 1,
                        defaultCurrency: 'BRL',
                    },
                },
            },
        });
        const token = await this.signToken(user.id, user.username);
        return (0, api_response_1.ok)({
            accessToken: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                name: user.name,
            },
        }, 'Operation completed successfully');
    }
    async login(username, password) {
        const user = await this.prisma.user.findFirst({
            where: { username, deletedAt: null },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Usuário ou senha incorretos.');
        }
        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) {
            throw new common_1.UnauthorizedException('Usuário ou senha incorretos.');
        }
        const token = await this.signToken(user.id, user.username);
        return (0, api_response_1.ok)({
            accessToken: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                name: user.name,
            },
        }, 'Operation completed successfully');
    }
    async me(userId) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, deletedAt: null },
        });
        if (!user) {
            throw new common_1.UnauthorizedException();
        }
        return (0, api_response_1.ok)({
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
        }, 'Operation completed successfully');
    }
    async forgotPassword(email) {
        const normalized = email.trim().toLowerCase();
        const user = await this.prisma.user.findFirst({
            where: { email: normalized, deletedAt: null },
        });
        if (user) {
            const since = new Date(Date.now() - 60 * 60 * 1000);
            const recentCount = await this.prisma.passwordResetToken.count({
                where: { userId: user.id, createdAt: { gte: since } },
            });
            if (recentCount < MAX_RESET_REQUESTS_PER_HOUR) {
                const rawToken = (0, crypto_1.randomBytes)(RESET_TOKEN_BYTES).toString('hex');
                const tokenHash = (0, crypto_1.createHash)('sha256').update(rawToken).digest('hex');
                const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
                await this.prisma.$transaction([
                    this.prisma.passwordResetToken.updateMany({
                        where: { userId: user.id, usedAt: null },
                        data: { usedAt: new Date() },
                    }),
                    this.prisma.passwordResetToken.create({
                        data: { userId: user.id, tokenHash, expiresAt },
                    }),
                ]);
                const appUrl = this.resolveAppUrl();
                const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;
                await this.mail.sendPasswordResetEmail(user.email, resetUrl);
            }
        }
        return (0, api_response_1.ok)(null, 'Se existir uma conta com este e-mail, enviaremos instruções para redefinir a senha.');
    }
    async resetPassword(token, password) {
        const tokenHash = (0, crypto_1.createHash)('sha256').update(token).digest('hex');
        const row = await this.prisma.passwordResetToken.findFirst({
            where: {
                tokenHash,
                usedAt: null,
                expiresAt: { gt: new Date() },
                user: { deletedAt: null },
            },
            include: { user: true },
        });
        if (!row) {
            throw new common_1.UnauthorizedException('Link inválido ou expirado. Solicite uma nova recuperação de senha.');
        }
        const passwordHash = await bcrypt.hash(password, 10);
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: row.userId },
                data: { passwordHash },
            }),
            this.prisma.passwordResetToken.update({
                where: { id: row.id },
                data: { usedAt: new Date() },
            }),
            this.prisma.passwordResetToken.updateMany({
                where: { userId: row.userId, usedAt: null, id: { not: row.id } },
                data: { usedAt: new Date() },
            }),
        ]);
        return (0, api_response_1.ok)(null, 'Senha redefinida com sucesso. Você já pode entrar.');
    }
    resolveAppUrl() {
        const configured = this.config.get('APP_URL')?.trim();
        if (configured)
            return configured.replace(/\/$/, '');
        return 'http://localhost:5173';
    }
    signToken(sub, username) {
        return this.jwt.signAsync({ sub, username });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        mail_service_1.MailService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map