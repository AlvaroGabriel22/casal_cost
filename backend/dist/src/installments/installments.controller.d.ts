import type { AuthUser } from '../auth/current-user.decorator';
import { InstallmentsService } from './installments.service';
import { CreateInstallmentDto, DeleteInstallmentDto, UpdateInstallmentDto } from './dto/installment.dto';
export declare class InstallmentsController {
    private readonly installments;
    constructor(installments: InstallmentsService);
    create(user: AuthUser, dto: CreateInstallmentDto): unknown;
    list(user: AuthUser): unknown;
    one(user: AuthUser, id: string): unknown;
    update(user: AuthUser, id: string, dto: UpdateInstallmentDto): unknown;
    pay(user: AuthUser, id: string): unknown;
    remove(user: AuthUser, id: string, dto: DeleteInstallmentDto): unknown;
}
