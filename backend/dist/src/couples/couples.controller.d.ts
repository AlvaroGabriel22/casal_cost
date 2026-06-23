import type { AuthUser } from '../auth/current-user.decorator';
import { CouplesService } from './couples.service';
import { InvitePartnerDto } from './dto/couple.dto';
export declare class CouplesController {
    private readonly couples;
    constructor(couples: CouplesService);
    invite(user: AuthUser, dto: InvitePartnerDto): Promise<{
        success: true;
        data: {
            id: string;
            status: import(".prisma/client").$Enums.CoupleStatus;
            createdAt: Date;
            updatedAt: Date;
            userAId: string;
            userBId: string;
        };
        message: string;
    }>;
    accept(user: AuthUser): Promise<{
        success: true;
        data: {
            id: string;
            status: import(".prisma/client").$Enums.CoupleStatus;
            createdAt: Date;
            updatedAt: Date;
            userAId: string;
            userBId: string;
        };
        message: string;
    }>;
    me(user: AuthUser): Promise<{
        success: true;
        data: ({
            userA: {
                id: string;
                name: string;
                username: string;
                email: string;
            };
            userB: {
                id: string;
                name: string;
                username: string;
                email: string;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.CoupleStatus;
            createdAt: Date;
            updatedAt: Date;
            userAId: string;
            userBId: string;
        }) | null;
        message: string;
    }>;
    remove(user: AuthUser, id: string): Promise<{
        success: true;
        data: {
            id: string;
            status: import(".prisma/client").$Enums.CoupleStatus;
            createdAt: Date;
            updatedAt: Date;
            userAId: string;
            userBId: string;
        };
        message: string;
    }>;
}
