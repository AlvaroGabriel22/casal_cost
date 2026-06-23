import { PrismaService } from '../prisma/prisma.service';
import { PermissionService } from '../permission/permission.service';
import { AuditLogService } from '../audit/audit-log.service';
import { CreateAccessDto, UpdateAccessDto } from './dto/access.dto';
export declare class IndividualAccessService {
    private readonly prisma;
    private readonly permission;
    private readonly audit;
    constructor(prisma: PrismaService, permission: PermissionService, audit: AuditLogService);
    create(ownerId: string, body: CreateAccessDto): Promise<{
        success: true;
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            canView: boolean;
            canEdit: boolean;
            ownerUserId: string;
            allowedUserId: string;
        };
        message: string;
    }>;
    update(ownerId: string, id: string, body: UpdateAccessDto): Promise<{
        success: true;
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            canView: boolean;
            canEdit: boolean;
            ownerUserId: string;
            allowedUserId: string;
        };
        message: string;
    }>;
    remove(ownerId: string, id: string): Promise<{
        success: true;
        data: {
            id: string;
        };
        message: string;
    }>;
    listForMe(userId: string): Promise<{
        success: true;
        data: {
            grantedToMe: ({
                owner: {
                    id: string;
                    name: string;
                    username: string;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                canView: boolean;
                canEdit: boolean;
                ownerUserId: string;
                allowedUserId: string;
            })[];
            grantedByMe: ({
                allowed: {
                    id: string;
                    name: string;
                    username: string;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                canView: boolean;
                canEdit: boolean;
                ownerUserId: string;
                allowedUserId: string;
            })[];
        };
        message: string;
    }>;
}
