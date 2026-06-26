import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
export declare class AuthService {
    private readonly prisma;
    private readonly jwt;
    private readonly mail;
    private readonly config;
    constructor(prisma: PrismaService, jwt: JwtService, mail: MailService, config: ConfigService);
    register(body: {
        name: string;
        username: string;
        email: string;
        password: string;
    }): Promise<{
        success: true;
        data: {
            accessToken: string;
            user: {
                id: string;
                username: string;
                email: string;
                name: string;
            };
        };
        message: string;
    }>;
    verifyPassword(userId: string, password?: string): Promise<void>;
    login(username: string, password: string): Promise<{
        success: true;
        data: {
            accessToken: string;
            user: {
                id: string;
                username: string;
                email: string;
                name: string;
            };
        };
        message: string;
    }>;
    me(userId: string): Promise<{
        success: true;
        data: {
            id: string;
            username: string;
            email: string;
            name: string;
        };
        message: string;
    }>;
    forgotPassword(email: string): Promise<{
        success: true;
        data: null;
        message: string;
    }>;
    resetPassword(token: string, password: string): Promise<{
        success: true;
        data: null;
        message: string;
    }>;
    private resolveAppUrl;
    private signToken;
}
