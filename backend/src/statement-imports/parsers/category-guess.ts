import { PaymentMethod } from '@prisma/client';

const CATEGORY_RULES: Array<{ pattern: RegExp; category: string }> = [
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

export function guessCategory(description: string): string {
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(description)) return rule.category;
  }
  return 'Outros';
}

export function guessPaymentMethod(
  description: string,
  bank: string,
  isCreditCardStatement = false,
): PaymentMethod | undefined {
  if (isCreditCardStatement) return PaymentMethod.CREDIT_CARD;
  const d = description.toLowerCase();
  if (/pix/.test(d)) return PaymentMethod.PIX;
  if (/debito|débito/.test(d)) return PaymentMethod.DEBIT_CARD;
  if (/credito|crédito|cartao|cartão/.test(d)) return PaymentMethod.CREDIT_CARD;
  if (/boleto/.test(d)) return PaymentMethod.BOLETO;
  if (/transfer|ted|doc/.test(d)) return PaymentMethod.TRANSFER;
  if (bank === 'NUBANK') return PaymentMethod.CREDIT_CARD;
  return undefined;
}
