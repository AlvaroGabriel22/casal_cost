import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthService {
    private readonly prisma;
    private readonly jwt;
    constructor(prisma: PrismaService, jwt: JwtService);
    register(body: {
        name: string;
        username: string;
        email: string;
        password: string;
    }): unknown;
    login(username: string, password: string): unknown;
    me(userId: string): unknown;
    private signToken;
}
