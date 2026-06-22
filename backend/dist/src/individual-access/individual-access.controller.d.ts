import type { AuthUser } from '../auth/current-user.decorator';
import { IndividualAccessService } from './individual-access.service';
import { CreateAccessDto, UpdateAccessDto } from './dto/access.dto';
export declare class IndividualAccessController {
    private readonly access;
    constructor(access: IndividualAccessService);
    create(user: AuthUser, dto: CreateAccessDto): unknown;
    update(user: AuthUser, id: string, dto: UpdateAccessDto): unknown;
    remove(user: AuthUser, id: string): unknown;
    list(user: AuthUser): unknown;
}
