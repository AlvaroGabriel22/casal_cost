import type { AuthUser } from '../auth/current-user.decorator';
import { FinancialCalculationService } from '../financial/financial-calculation.service';
import { FinancialProjectionService } from '../financial/financial-projection.service';
import { PermissionService } from '../permission/permission.service';
export declare class DashboardController {
    private readonly calc;
    private readonly projection;
    private readonly permission;
    constructor(calc: FinancialCalculationService, projection: FinancialProjectionService, permission: PermissionService);
    private defaultYm;
    individual(user: AuthUser, month?: string): unknown;
    couple(user: AuthUser, month?: string): unknown;
    proj(user: AuthUser, months?: string): unknown;
}
