export declare function normalizeMatchLabel(text: string): string;
export interface ContextRuleLike {
    matchLabel: string;
    displayLabel: string;
    category: string | null;
    motive: string;
}
export declare function findMatchingRule(rules: ContextRuleLike[], description: string, merchantLabel: string): ContextRuleLike | null;
