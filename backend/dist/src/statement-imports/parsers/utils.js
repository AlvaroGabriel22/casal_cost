"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildFingerprint = buildFingerprint;
exports.refMonthFromDate = refMonthFromDate;
exports.ym = ym;
exports.parseBrazilianAmount = parseBrazilianAmount;
exports.parseFlexibleDate = parseFlexibleDate;
const crypto_1 = require("crypto");
function buildFingerprint(userId, bank, line) {
    const date = line.transactionDate.toISOString().slice(0, 10);
    const key = line.externalId
        ? `${userId}|${bank}|${line.externalId}`
        : `${userId}|${bank}|${date}|${line.amount.toFixed(2)}|${normalizeDesc(line.description)}`;
    return (0, crypto_1.createHash)('sha256').update(key).digest('hex');
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
    const cleaned = raw
        .trim()
        .replace(/[R$\s]/gi, '')
        .replace(/\./g, '')
        .replace(',', '.');
    if (!cleaned || cleaned === '-')
        return null;
    const n = Number(cleaned);
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