"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyBankMovement = classifyBankMovement;
exports.movementTypeLabel = movementTypeLabel;
const INVEST_APPLY = /aplica(?:ç|c)(?:ã|a)o\s*(?:rdb|cdb|lci|lca|tesouro)|aplica(?:ç|c)(?:ã|a)o|aplic\.?\s*rdb|investimento\s*em\s*rdb/i;
const INVEST_REDEEM = /resgate\s*(?:rdb|cdb|lci|lca|tesouro)|resgate\s*rdb|resgate/i;
const INCOME = /transfer(?:ê|e)ncia\s*recebida|pix\s*receb|sal[aá]rio|dep[oó]sito|cr[eé]dito\s*de/i;
const TRANSFER_OUT = /transfer(?:ê|e)ncia\s*enviada|pix\s*envi/i;
const CARD_BILL = /pagamento\s*(?:de\s*)?fatura|pagamento\s*recebido/i;
const EXPENSE = /compra\s*no\s*d[eé]bito|pagamento\s*de\s*boleto|boleto\s*efetuado|nupay|d[eé]bito\s*via/i;
function classifyBankMovement(description, direction) {
    const d = description.normalize('NFD').replace(/\p{M}/gu, '');
    if (INVEST_APPLY.test(d) && direction === 'DEBIT')
        return 'INVESTMENT_APPLY';
    if (INVEST_REDEEM.test(d) && direction === 'CREDIT')
        return 'INVESTMENT_REDEEM';
    if (CARD_BILL.test(d))
        return 'CARD_BILL';
    if (INCOME.test(d) && direction === 'CREDIT')
        return 'INCOME';
    if (TRANSFER_OUT.test(d) && direction === 'DEBIT')
        return 'TRANSFER_OUT';
    if (EXPENSE.test(d) && direction === 'DEBIT')
        return 'EXPENSE';
    if (direction === 'CREDIT')
        return 'INCOME';
    if (direction === 'DEBIT')
        return 'EXPENSE';
    return 'OTHER';
}
function movementTypeLabel(type) {
    const labels = {
        INVESTMENT_APPLY: 'Aplicação / investimento',
        INVESTMENT_REDEEM: 'Resgate de investimento',
        INCOME: 'Entrada',
        EXPENSE: 'Despesa',
        TRANSFER_IN: 'Transferência recebida',
        TRANSFER_OUT: 'Transferência enviada',
        CARD_BILL: 'Pagamento de fatura',
        OTHER: 'Outros',
    };
    return labels[type];
}
//# sourceMappingURL=bank-movement.classifier.js.map