import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { ok } from '../common/api-response';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(body: {
    name: string;
    username: string;
    email: string;
    password: string;
  }) {
    const exists = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: body.username }, { email: body.email }],
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
        email: body.email,
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

  private signToken(sub: string, username: string) {
    return this.jwt.signAsync({ sub, username });
  }
}
