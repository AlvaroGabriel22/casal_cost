"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeMatchLabel = normalizeMatchLabel;
exports.findMatchingRule = findMatchingRule;
function normalizeMatchLabel(text) {
    return text
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .replace(/\(\d{3,4}\).*$/i, '')
        .replace(/•••\.\d+\.\d+-••.*$/i, '')
        .replace(/\s+/g, ' ')
        .trim();
}
function findMatchingRule(rules, description, merchantLabel) {
    const candidates = [
        normalizeMatchLabel(merchantLabel),
        normalizeMatchLabel(description),
    ].filter(Boolean);
    for (const rule of rules) {
        const key = rule.matchLabel;
        for (const c of candidates) {
            if (c === key || c.includes(key) || key.includes(c)) {
                return rule;
            }
        }
    }
    return null;
}
//# sourceMappingURL=finance-context.matcher.js.map