import { PrismaService } from '../prisma/prisma.service';
import { PermissionService } from '../permission/permission.service';
import { AuditLogService } from '../audit/audit-log.service';
import { CreateAccessDto, UpdateAccessDto } from './dto/access.dto';
export declare class IndividualAccessService {
    private readonly prisma;
    private readonly permission;
    private readonly audit;
    constructor(prisma: PrismaService, permission: PermissionService, audit: AuditLogService);
    create(ownerId: string, body: CreateAccessDto): unknown;
    update(ownerId: string, id: string, body: UpdateAccessDto): unknown;
    remove(ownerId: string, id: string): unknown;
    listForMe(userId: string): unknown;
}
