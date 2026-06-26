import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { ok } from '../common/api-response';

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const MAX_RESET_REQUESTS_PER_HOUR = 3;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async register(body: {
    name: string;
    username: string;
    email: string;
    password: string;
  }) {
    const email = body.email.trim().toLowerCase();
    const exists = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: body.username }, { email }],
        deletedAt: null,
      },
    });
    if (exists) {
      throw new ConflictException('Já existe uma conta com este usuário ou email.');
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
    return ok(
      {
        accessToken: token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
        },
      },
      'Operation completed successfully',
    );
  }

  async verifyPassword(userId: string, password?: string) {
    if (!password?.trim()) {
      throw new UnauthorizedException('Confirme sua senha para concluir esta ação.');
    }
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { passwordHash: true },
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Senha incorreta. Verifique e tente novamente.');
    }
  }

  async login(username: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { username, deletedAt: null },
    });
    if (!user) {
      throw new UnauthorizedException('Usuário ou senha incorretos.');
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      throw new UnauthorizedException('Usuário ou senha incorretos.');
    }
    const token = await this.signToken(user.id, user.username);
    return ok(
      {
        accessToken: token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
        },
      },
      'Operation completed successfully',
    );
  }

  async me(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return ok(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
      },
      'Operation completed successfully',
    );
  }

  /** Always returns the same message to avoid email enumeration. */
  async forgotPassword(email: string) {
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
        const rawToken = randomBytes(RESET_TOKEN_BYTES).toString('hex');
        const tokenHash = createHash('sha256').update(rawToken).digest('hex');
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

    return ok(
      null,
      'Se existir uma conta com este e-mail, enviaremos instruções para redefinir a senha.',
    );
  }

  async resetPassword(token: string, password: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
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
      throw new UnauthorizedException(
        'Link inválido ou expirado. Solicite uma nova recuperação de senha.',
      );
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

    return ok(null, 'Senha redefinida com sucesso. Você já pode entrar.');
  }

  private resolveAppUrl(): string {
    const configured = this.config.get<string>('APP_URL')?.trim();
    if (configured) return configured.replace(/\/$/, '');
    return 'http://localhost:5173';
  }

  private signToken(sub: string, username: string) {
    return this.jwt.signAsync({ sub, username });
  }
}
