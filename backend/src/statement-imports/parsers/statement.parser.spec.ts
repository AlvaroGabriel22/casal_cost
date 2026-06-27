import { StatementSourceType } from '@prisma/client';
import {
  directionFromSignedAmount,
  parseStatementFile,
} from './statement.parser';

describe('directionFromSignedAmount', () => {
  it('uses bank account convention by default', () => {
    expect(directionFromSignedAmount(-100)).toBe('DEBIT');
    expect(directionFromSignedAmount(100)).toBe('CREDIT');
  });

  it('inverts sign for credit card exports (Nubank)', () => {
    expect(
      directionFromSignedAmount(67.9, StatementSourceType.CREDIT_CARD),
    ).toBe('DEBIT');
    expect(
      directionFromSignedAmount(-4785.78, StatementSourceType.CREDIT_CARD),
    ).toBe('CREDIT');
  });
});

describe('parseStatementFile (Nubank credit card CSV)', () => {
  const sampleTsv = `date\ttitle\tamount
2025-12-24\tVini Brasil\t5,5
2025-12-23\tPagamento recebido\t-4.785,78
2025-12-22\tHiper Db Cidade Nova\t67,9
2025-11-27\tiFood - NuPay\t-0,01`;

  it('maps positive purchases to DEBIT and invoice payments to CREDIT', () => {
    const parsed = parseStatementFile({
      content: sampleTsv,
      fileName: 'fatura-cartao.csv',
      format: 'CSV',
      sourceType: StatementSourceType.CREDIT_CARD,
    });

    expect(parsed.lines).toHaveLength(4);

    const vini = parsed.lines.find((l) => l.description === 'Vini Brasil');
    expect(vini?.direction).toBe('DEBIT');
    expect(vini?.amount).toBeCloseTo(5.5, 2);

    const bill = parsed.lines.find((l) => l.description === 'Pagamento recebido');
    expect(bill?.direction).toBe('CREDIT');
    expect(bill?.amount).toBeCloseTo(4785.78, 2);

    const purchase = parsed.lines.find(
      (l) => l.description === 'Hiper Db Cidade Nova',
    );
    expect(purchase?.direction).toBe('DEBIT');
    expect(purchase?.amount).toBeCloseTo(67.9, 2);

    const refund = parsed.lines.find((l) => l.description === 'iFood - NuPay');
    expect(refund?.direction).toBe('CREDIT');
    expect(refund?.amount).toBeCloseTo(0.01, 2);
  });

  it('keeps bank account convention when source is conta corrente', () => {
    const bankCsv = `date,title,amount
2025-12-23,Transferência recebida pelo Pix,1500.00
2025-12-22,Transferência enviada pelo Pix,-200.00`;

    const parsed = parseStatementFile({
      content: bankCsv,
      fileName: 'NU_conta.csv',
      format: 'CSV',
      sourceType: StatementSourceType.BANK_ACCOUNT,
    });

    expect(parsed.lines[0].direction).toBe('CREDIT');
    expect(parsed.lines[1].direction).toBe('DEBIT');
  });
});
