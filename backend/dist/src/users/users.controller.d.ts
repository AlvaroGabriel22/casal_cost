import type { AuthUser } from '../auth/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto, UpdateSalaryDto } from './dto/update-user.dto';
export declare class UsersController {
    private readonly users;
    constructor(users: UsersService);
    me(user: AuthUser): unknown;
    update(user: AuthUser, dto: UpdateProfileDto): unknown;
    salary(user: AuthUser, dto: UpdateSalaryDto): unknown;
}
