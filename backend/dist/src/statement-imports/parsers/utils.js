"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildFingerprint = buildFingerprint;
exports.buildFingerprintsForImport = buildFingerprintsForImport;
exports.refMonthFromDate = refMonthFromDate;
exports.ym = ym;
exports.parseBrazilianAmount = parseBrazilianAmount;
exports.parseFlexibleDate = parseFlexibleDate;
const crypto_1 = require("crypto");
const client_1 = require("@prisma/client");
function buildFingerprint(userId, bank, line, sourceType = client_1.StatementSourceType.BANK_ACCOUNT, duplicateIndex = 0) {
    const date = line.transactionDate.toISOString().slice(0, 10);
    const key = line.externalId
        ? `${userId}|${bank}|${sourceType}|${line.externalId}|${line.direction}|${line.amount.toFixed(2)}`
        : duplicateIndex > 0
            ? `${userId}|${bank}|${sourceType}|${date}|${line.amount.toFixed(2)}|${normalizeDesc(line.description)}|#${duplicateIndex}`
            : `${userId}|${bank}|${sourceType}|${date}|${line.amount.toFixed(2)}|${normalizeDesc(line.description)}`;
    return (0, crypto_1.createHash)('sha256').update(key).digest('hex');
}
function buildFingerprintsForImport(userId, bank, lines, sourceType = client_1.StatementSourceType.BANK_ACCOUNT) {
    const seen = new Map();
    return lines.map((line) => {
        if (line.externalId) {
            return buildFingerprint(userId, bank, line, sourceType);
        }
        const date = line.transactionDate.toISOString().slice(0, 10);
        const base = `${date}|${line.amount.toFixed(2)}|${normalizeDesc(line.description)}`;
        const index = seen.get(base) ?? 0;
        seen.set(base, index + 1);
        return buildFingerprint(userId, bank, line, sourceType, index);
    });
}
function normalizeDesc(value) {
    return value
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}
function refMonthFromDate(d) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function ym(d) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
function parseBrazilianAmount(raw) {
    let value = raw.trim().replace(/[R$\s]/gi, '');
    if (!value || value === '-')
        return null;
    let sign = 1;
    if (value.startsWith('-')) {
        sign = -1;
        value = value.slice(1);
    }
    else if (value.startsWith('(') && value.endsWith(')')) {
        sign = -1;
        value = value.slice(1, -1);
    }
    if (/^\d{1,12}\.\d{1,2}$/.test(value)) {
        const n = Number(value) * sign;
        return Number.isFinite(n) ? n : null;
    }
    if (/,\d{1,2}$/.test(value)) {
        value = value.replace(/\./g, '').replace(',', '.');
    }
    else if (/,\d{3}/.test(value)) {
        value = value.replace(/,/g, '');
    }
    const n = Number(value) * sign;
    return Number.isFinite(n) ? n : null;
}
function parseFlexibleDate(raw) {
    const value = raw.trim();
    if (!value)
        return null;
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (iso) {
        return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
    }
    const br = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/.exec(value);
    if (br) {
        let year = Number(br[3]);
        if (year < 100)
            year += 2000;
        return new Date(Date.UTC(year, Number(br[2]) - 1, Number(br[1])));
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
        return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
    }
    return null;
}
//# sourceMappingURL=utils.js.map