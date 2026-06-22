import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import type { CreateIncomeDto, UpdateIncomeDto } from './dto/income.dto';
export declare class IncomesService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditLogService);
    private refMonth;
    create(userId: string, dto: CreateIncomeDto): unknown;
    list(userId: string, page?: number, limit?: number): unknown;
    update(userId: string, id: string, dto: UpdateIncomeDto): unknown;
    remove(userId: string, id: string): unknown;
}
