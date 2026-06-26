"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInvestmentMovement = isInvestmentMovement;
exports.inferSpendingCategory = inferSpendingCategory;
exports.guessCategory = guessCategory;
exports.guessPaymentMethod = guessPaymentMethod;
const client_1 = require("@prisma/client");
const CATEGORY_RULES = [
    {
        pattern: /ifood|rappi|uber\s*eats|z\s*delivery|ai\s*qfome|china\s*in\s*box|habib|mcdonald|burger\s*king|subway|outback|pizza\s*hut|domino|kfc|bob\s*'s|giraffas|spoleto|sushi|acai|lanchonete|restaurante|padaria|panificadora|vini\s*brasil|nupay.*ifood|ze\s*delivery|i\s*food/i,
        category: 'Alimentação',
    },
    {
        pattern: /posto|campau[aã]|combust|shell|ipiranga|br\s*distribuidora|petrobras|texaco|ale\s*combust|auto\s*posto|abastec|deriv|deri\b|gasolina|etanol|petroleo/i,
        category: 'Combustível',
    },
    {
        pattern: /nissei|pague\s*menos|bom\s*pre[cç]o|santo\s*rem[eé]dio|drogasil|drogaraia|pacheco|panvel|extrafarma|farmacia|farm[aá]cia|droga\s*farma|drogaria|drogari|s[aá]o\s*jo[aã]o|ultrafarma|raia/i,
        category: 'Saúde',
    },
    { pattern: /uber(?!\s*eats)|99\s*app|cabify|99pop|transport/i, category: 'Transporte' },
    {
        pattern: /spotify|netflix|amazon\s*prime|disney|hbo|youtube|assinatura|deezer|globoplay/i,
        category: 'Assinaturas',
    },
    {
        pattern: /supermerc|carrefour|pao\s*de\s*acucar|assai|atacadao|mercado|comper|bompreco|extra\s*hiper/i,
        category: 'Mercado',
    },
    { pattern: /energia|luz|enel|cpfl|cemig|agua|sabesp|copasa/i, category: 'Moradia' },
    { pattern: /aluguel|condominio|imobiliaria/i, category: 'Moradia' },
    { pattern: /pagamento\s*de\s*fatura|pagamento\s*fatura|fatura\s*cart/i, category: 'Fatura cartão' },
    {
        pattern: /transferencia\s*enviad|pix\s*enviad|enviad.*pix|pix\s*env|transferencia\s*env|ted\s*env|doc\s*env/i,
        category: 'Transferências',
    },
    {
        pattern: /fidc|fundo\s*de\s*investimento|investimento\s*em\s*direit|direcional\s*reb|direcional\s*receb/i,
        category: 'Investimentos',
    },
    { pattern: /pix\s*rec|transferencia\s*rec|salario|deposito/i, category: 'Receitas' },
    {
        pattern: /aplica(?:ç|c)(?:ã|a)o\s*rdb|aplica(?:ç|c)(?:ã|a)o|resgate\s*rdb|resgate\s*cdb|resgate/i,
        category: 'Investimentos',
    },
    { pattern: /refrigeracao|refrigera/i, category: 'Alimentação' },
    { pattern: /amazon|magalu|mercado\s*livre|shopee|shein|americanas|casas\s*bahia/i, category: 'Compras' },
    { pattern: /academia|gym|smart\s*fit|bluefit/i, category: 'Saúde' },
    { pattern: /claro|vivo|tim|oi\s*movel|internet|net\s*serv/i, category: 'Assinaturas' },
    { pattern: /escola|curso|faculdade|udemy|aslan/i, category: 'Educação' },
];
function isInvestmentMovement(description) {
    const normalized = description
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase();
    return /fidc|fundo\s*de\s*investimento|investimento\s*em\s*direit|direcional\s*reb|direcional\s*receb|aplica(?:c|ç)(?:a|ã)o|rdb|cdb|lci|lca|tesouro|compromissada|resgate\s*rdb|resgate\s*cdb/i.test(normalized);
}
function inferSpendingCategory(description) {
    const normalized = description
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase();
    for (const rule of CATEGORY_RULES) {
        if (rule.pattern.test(normalized))
            return rule.category;
    }
    return 'Outros';
}
function guessCategory(description) {
    return inferSpendingCategory(description);
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