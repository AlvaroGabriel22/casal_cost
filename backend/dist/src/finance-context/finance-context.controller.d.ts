import type { AuthUser } from '../auth/current-user.decorator';
import { FinanceContextService } from './finance-context.service';
import { AnswerFinanceContextQuestionDto, UpsertFinanceContextRuleDto } from './dto/finance-context.dto';
export declare class FinanceContextController {
    private readonly financeContext;
    constructor(financeContext: FinanceContextService);
    list(user: AuthUser): Promise<{
        success: true;
        data: import("./finance-context.service").FinanceContextPayload;
        message: string;
    }>;
    createRule(user: AuthUser, dto: UpsertFinanceContextRuleDto): Promise<{
        success: true;
        data: import("./finance-context.service").FinanceContextRuleDto;
        message: string;
    }>;
    updateRule(user: AuthUser, id: string, dto: UpsertFinanceContextRuleDto): Promise<{
        success: true;
        data: import("./finance-context.service").FinanceContextRuleDto;
        message: string;
    }>;
    deleteRule(user: AuthUser, id: string): Promise<{
        success: true;
        data: {
            deleted: boolean;
        };
        message: string;
    }>;
    answerQuestion(user: AuthUser, id: string, dto: AnswerFinanceContextQuestionDto): Promise<{
        success: true;
        data: import("./finance-context.service").FinanceContextRuleDto;
        message: string;
    }>;
    dismissQuestion(user: AuthUser, id: string): Promise<{
        success: true;
        data: {
            dismissed: boolean;
        };
        message: string;
    }>;
}
