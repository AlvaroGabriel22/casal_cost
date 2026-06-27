"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCardBillPayment = isCardBillPayment;
exports.shouldSkipCreditCardImportLine = shouldSkipCreditCardImportLine;
exports.nubankBillingPeriodForDueMonth = nubankBillingPeriodForDueMonth;
exports.isWithinNubankBillingPeriod = isWithinNubankBillingPeriod;
exports.nubankReferenceMonthForPurchase = nubankReferenceMonthForPurchase;
exports.defaultClosingDay = defaultClosingDay;
exports.purchaseBillingReferenceMonth = purchaseBillingReferenceMonth;
exports.assignCreditCardReferenceMonths = assignCreditCardReferenceMonths;
exports.filterCreditCardImportLines = filterCreditCardImportLines;
exports.billingMonthsCovered = billingMonthsCovered;
const client_1 = require("@prisma/client");
const utils_1 = require("./parsers/utils");
const PAYMENT_LINE = /pagamento\s*(?:recebido|de\s*fatura|fatura)/i;
function isCardBillPayment(line) {
    return line.direction === 'CREDIT' && PAYMENT_LINE.test(line.description);
}
function shouldSkipCreditCardImportLine(line, bank) {
    return bank === client_1.DetectedBank.NUBANK && isCardBillPayment(line);
}
function utcDate(y, m, d) {
    return new Date(Date.UTC(y, m, d));
}
function utcDayKey(d) {
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
function nubankBillingPeriodForDueMonth(dueYear, dueMonth, dueDay) {
    const dueDate = utcDate(dueYear, dueMonth - 1, dueDay);
    const periodEnd = new Date(dueDate);
    periodEnd.setUTCDate(periodEnd.getUTCDate() - 7);
    const prevDue = utcDate(dueYear, dueMonth - 2, dueDay);
    const periodStart = new Date(prevDue);
    periodStart.setUTCDate(periodStart.getUTCDate() - 7);
    return { periodStart, periodEnd };
}
function isWithinNubankBillingPeriod(txDate, referenceMonthYm, dueDay) {
    const [y, m] = referenceMonthYm.split('-').map(Number);
    const { periodStart, periodEnd } = nubankBillingPeriodForDueMonth(y, m, dueDay);
    const t = utcDayKey(txDate);
    return t >= utcDayKey(periodStart) && t <= utcDayKey(periodEnd);
}
function nubankReferenceMonthForPurchase(txDate, dueDay) {
    const y = txDate.getUTCFullYear();
    const m = txDate.getUTCMonth();
    for (let offset = -3; offset <= 4; offset++) {
        let dueM = m + offset;
        let dueY = y;
        while (dueM > 11) {
            dueM -= 12;
            dueY += 1;
        }
        while (dueM < 0) {
            dueM += 12;
            dueY -= 1;
        }
        const { periodStart, periodEnd } = nubankBillingPeriodForDueMonth(dueY, dueM + 1, dueDay);
        const t = utcDayKey(txDate);
        if (t >= utcDayKey(periodStart) && t <= utcDayKey(periodEnd)) {
            return utcDate(dueY, dueM, 1);
        }
    }
    return (0, utils_1.refMonthFromDate)(txDate);
}
function defaultClosingDay(dueDay, bank) {
    if (bank === client_1.DetectedBank.NUBANK) {
        let closing = dueDay - 7;
        while (closing < 1)
            closing += 28;
        return closing;
    }
    let closing = dueDay - 11;
    while (closing < 1)
        closing += 28;
    return Math.min(28, closing);
}
function purchaseBillingReferenceMonth(txDate, closingDay) {
    const day = txDate.getUTCDate();
    let closingMonth = txDate.getUTCMonth();
    let closingYear = txDate.getUTCFullYear();
    if (day > closingDay) {
        closingMonth += 1;
        if (closingMonth > 11) {
            closingMonth = 0;
            closingYear += 1;
        }
    }
    let dueMonth = closingMonth + 1;
    let dueYear = closingYear;
    if (dueMonth > 11) {
        dueMonth = 0;
        dueYear += 1;
    }
    return utcDate(dueYear, dueMonth, 1);
}
function addMonths(ref, delta) {
    let m = ref.getUTCMonth() + delta;
    let y = ref.getUTCFullYear();
    while (m > 11) {
        m -= 12;
        y += 1;
    }
    while (m < 0) {
        m += 12;
        y -= 1;
    }
    return utcDate(y, m, 1);
}
function assignFromPaymentAnchors(lines) {
    const indexed = lines.map((line, index) => ({ line, index }));
    const sorted = [...indexed].sort((a, b) => a.line.transactionDate.getTime() - b.line.transactionDate.getTime() ||
        a.index - b.index);
    const payments = sorted.filter(({ line }) => isCardBillPayment(line));
    const result = new Map();
    if (payments.length === 0)
        return result;
    for (let p = 0; p < payments.length; p++) {
        const { line: paymentLine, index: paymentIndex } = payments[p];
        const prevTime = p > 0 ? payments[p - 1].line.transactionDate.getTime() : Number.NEGATIVE_INFINITY;
        const paymentTime = paymentLine.transactionDate.getTime();
        const paymentRef = addMonths((0, utils_1.refMonthFromDate)(paymentLine.transactionDate), 1);
        result.set(paymentIndex, paymentRef);
        for (const { line, index } of sorted) {
            if (line.direction !== 'DEBIT')
                continue;
            const t = line.transactionDate.getTime();
            if (t >= prevTime && t <= paymentTime) {
                result.set(index, paymentRef);
            }
        }
    }
    const lastPayment = payments[payments.length - 1];
    for (const { line, index } of sorted) {
        if (result.has(index))
            continue;
        if (isCardBillPayment(line))
            continue;
        if (line.transactionDate.getTime() > lastPayment.line.transactionDate.getTime()) {
            result.set(index, purchaseBillingReferenceMonth(line.transactionDate, 20));
        }
    }
    return result;
}
function assignCreditCardReferenceMonths(lines, config, bank) {
    const dueDay = config?.dueDay ?? 1;
    if (bank === client_1.DetectedBank.NUBANK) {
        return lines.map((line) => {
            if (shouldSkipCreditCardImportLine(line, bank)) {
                return (0, utils_1.refMonthFromDate)(line.transactionDate);
            }
            if (line.direction !== 'DEBIT') {
                return (0, utils_1.refMonthFromDate)(line.transactionDate);
            }
            return nubankReferenceMonthForPurchase(line.transactionDate, dueDay);
        });
    }
    const closingDay = config?.closingDay ?? defaultClosingDay(dueDay, bank);
    const anchorMap = assignFromPaymentAnchors(lines);
    const hasAnchors = anchorMap.size > 0;
    return lines.map((line, index) => {
        if (isCardBillPayment(line)) {
            return addMonths((0, utils_1.refMonthFromDate)(line.transactionDate), 1);
        }
        if (line.direction !== 'DEBIT') {
            return (0, utils_1.refMonthFromDate)(line.transactionDate);
        }
        if (hasAnchors && anchorMap.has(index)) {
            return anchorMap.get(index);
        }
        return purchaseBillingReferenceMonth(line.transactionDate, closingDay);
    });
}
function filterCreditCardImportLines(lines, bank) {
    return lines.filter((line) => !shouldSkipCreditCardImportLine(line, bank));
}
function billingMonthsCovered(referenceMonths) {
    return [...new Set(referenceMonths.map(utils_1.ym))].sort();
}
//# sourceMappingURL=billing-cycle.js.map