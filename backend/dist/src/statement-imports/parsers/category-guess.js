"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guessCategory = guessCategory;
exports.guessPaymentMethod = guessPaymentMethod;
const client_1 = require("@prisma/client");
const CATEGORY_RULES = [
    { pattern: /ifood|rappi|uber\s*eats|z\s*delivery|ai\s*qfome/i, category: 'Alimentação' },
    { pattern: /uber(?!\s*eats)|99\s*app|cabify|transport/i, category: 'Transporte' },
    { pattern: /spotify|netflix|amazon\s*prime|disney|hbo|youtube|assinatura/i, category: 'Assinaturas' },
    { pattern: /farmacia|droga|drogasil|pacheco/i, category: 'Saúde' },
    { pattern: /supermerc|carrefour|pao\s*de\s*acucar|assai|atacadao|mercado/i, category: 'Mercado' },
    { pattern: /posto|combust|shell|ipiranga|br\s*distribuidora/i, category: 'Combustível' },
    { pattern: /energia|luz|enel|cpfl|cemig|agua|sabesp/i, category: 'Moradia' },
    { pattern: /aluguel|condominio|imobiliaria/i, category: 'Moradia' },
    { pattern: /pix\s*env|transferencia\s*env|ted\s*env|doc\s*env/i, category: 'Transferências' },
    { pattern: /pix\s*rec|transferencia\s*rec|salario|deposito/i, category: 'Receitas' },
    { pattern: /amazon|magalu|mercado\s*livre|shopee|shein|loja/i, category: 'Compras' },
    { pattern: /academia|gym|smart\s*fit/i, category: 'Saúde' },
];
function guessCategory(description) {
    for (const rule of CATEGORY_RULES) {
        if (rule.pattern.test(description))
            return rule.category;
    }
    return 'Outros';
}
function guessPaymentMethod(description, bank, isCreditCardStatement = false) {
    if (isCreditCardStatement)
        return client_1.PaymentMethod.CREDIT_CARD;
    const d = description.toLowerCase();
    if (/pix/.test(d))
        return client_1.PaymentMethod.PIX;
    if (/debito|débito/.test(d))
        return client_1.PaymentMethod.DEBIT_CARD;
    if (/credito|crédito|cartao|cartão/.test(d))
        return client_1.PaymentMethod.CREDIT_CARD;
    if (/boleto/.test(d))
        return client_1.PaymentMethod.BOLETO;
    if (/transfer|ted|doc/.test(d))
        return client_1.PaymentMethod.TRANSFER;
    if (bank === 'NUBANK')
        return client_1.PaymentMethod.CREDIT_CARD;
    return undefined;
}
//# sourceMappingURL=category-guess.js.map