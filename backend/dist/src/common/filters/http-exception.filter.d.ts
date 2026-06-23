import { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import type { Response } from 'express';
export declare class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger;
    catch(exception: unknown, host: ArgumentsHost): Response<any, Record<string, any>>;
    private isPrismaError;
    private mapPrismaError;
}
