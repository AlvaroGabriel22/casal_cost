import type { AuthUser } from '../auth/current-user.decorator';
import { IncomesService } from './incomes.service';
import { CreateIncomeDto, UpdateIncomeDto } from './dto/income.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
export declare class IncomesController {
    private readonly incomes;
    constructor(incomes: IncomesService);
    create(user: AuthUser, dto: CreateIncomeDto): unknown;
    list(user: AuthUser, q: PaginationQueryDto): unknown;
    update(user: AuthUser, id: string, dto: UpdateIncomeDto): unknown;
    remove(user: AuthUser, id: string): unknown;
}
