import type { AuthUser } from '../auth/current-user.decorator';
import { CouplesService } from './couples.service';
import { InvitePartnerDto } from './dto/couple.dto';
export declare class CouplesController {
    private readonly couples;
    constructor(couples: CouplesService);
    invite(user: AuthUser, dto: InvitePartnerDto): unknown;
    accept(user: AuthUser): unknown;
    me(user: AuthUser): unknown;
    remove(user: AuthUser, id: string): unknown;
}
