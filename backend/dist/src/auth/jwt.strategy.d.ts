import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export type JwtPayload = {
    sub: string;
    username: string;
};
declare const JwtStrategy_base: new (...args: any) => InstanceType<any> & {
    validate(...args: any[]): unknown | Promise<unknown>;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly config;
    private readonly prisma;
    constructor(config: ConfigService, prisma: PrismaService);
    validate(payload: JwtPayload): unknown;
}
export {};
