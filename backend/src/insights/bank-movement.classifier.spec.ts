import { classifyBankMovement } from './bank-movement.classifier';

describe('classifyBankMovement', () => {
  it('detects RDB application and redemption', () => {
    expect(classifyBankMovement('Aplicação RDB', 'DEBIT')).toBe('INVESTMENT_APPLY');
    expect(classifyBankMovement('Resgate RDB', 'CREDIT')).toBe('INVESTMENT_REDEEM');
  });

  it('detects pix inflows and outflows', () => {
    expect(
      classifyBankMovement(
        'Transferência recebida pelo Pix - ALVARO GABRIEL',
        'CREDIT',
      ),
    ).toBe('INCOME');
    expect(
      classifyBankMovement(
        'Transferência enviada pelo Pix - Yrla Lima da Silva',
        'DEBIT',
      ),
    ).toBe('TRANSFER_OUT');
  });

  it('detects card bill payment', () => {
    expect(classifyBankMovement('Pagamento de fatura', 'DEBIT')).toBe('CARD_BILL');
  });
});
