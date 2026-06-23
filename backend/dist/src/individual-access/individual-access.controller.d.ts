import type { AuthUser } from '../auth/current-user.decorator';
import { IndividualAccessService } from './individual-access.service';
import { CreateAccessDto, UpdateAccessDto } from './dto/access.dto';
export declare class IndividualAccessController {
    private readonly access;
    constructor(access: IndividualAccessService);
    create(user: AuthUser, dto: CreateAccessDto): Promise<{
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
    update(user: AuthUser, id: string, dto: UpdateAccessDto): Promise<{
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
    remove(user: AuthUser, id: string): Promise<{
        success: true;
        data: {
            id: string;
        };
        message: string;
    }>;
    list(user: AuthUser): Promise<{
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
