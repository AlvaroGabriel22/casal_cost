import type { AuthUser } from '../auth/current-user.decorator';
import { InsightsService } from './insights.service';
export declare class InsightsController {
    private readonly insights;
    constructor(insights: InsightsService);
    overview(user: AuthUser, month?: string): Promise<{
        success: true;
        data: import("./insights.service").AssistantOverview;
        message: string;
    }>;
}
