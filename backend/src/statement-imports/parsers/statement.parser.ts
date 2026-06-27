import { DetectedBank, StatementSourceType } from '@prisma/client';
import { guessCategory, guessPaymentMethod } from './category-guess';
import type { ParsedBankLine, ParseInput, ParseResult } from './types';
import { parseBrazilianAmount, parseFlexibleDate } from './utils';

/** Conta: negativo = saída; cartão Nubank: positivo = compra, negativo = pagamento da fatura. */
export function directionFromSignedAmount(
  signedAmount: number,
  sourceType?: StatementSourceType,
  isCardFile = false,
): 'DEBIT' | 'CREDIT' {
  const isCreditCard =
    sourceType === StatementSourceType.CREDIT_CARD || isCardFile;
  if (isCreditCard) {
    return signedAmount < 0 ? 'CREDIT' : 'DEBIT';
  }
  return signedAmount < 0 ? 'DEBIT' : 'CREDIT';
}

function isCreditCardInput(input: ParseInput, headers: string[] = []): boolean {
  if (input.sourceType === StatementSourceType.CREDIT_CARD) return true;
  return /cartao|cartão|fatura|credit.?card|credit_card|credito|crédito/i.test(
    input.fileName + headers.join(' '),
  );
}

function ofxTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>([^<\\n]+)`, 'i');
  const match = re.exec(block);
  return match?.[1]?.trim() ?? null;
}

function parseOfxDate(raw: string | null): Date | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length < 8) return null;
  const y = Number(digits.slice(0, 4));
  const m = Number(digits.slice(4, 6));
  const d = Number(digits.slice(6, 8));
  return new Date(Date.UTC(y, m - 1, d));
}

function detectBankFromOfx(content: string, hint?: DetectedBank): DetectedBank {
  if (hint && hint !== DetectedBank.GENERIC) return hint;
  const org = (ofxTag(content, 'ORG') ?? ofxTag(content, 'FI') ?? '').toLowerCase();
  if (/nubank|nu pagamentos/.test(org)) return DetectedBank.NUBANK;
  if (/inter|banco inter/.test(org)) return DetectedBank.INTER;
  if (/bradesco/.test(org)) return DetectedBank.BRADESCO;
  if (/picpay/.test(org)) return DetectedBank.PICPAY;
  if (/itau|itaú/.test(org)) return DetectedBank.ITAU;
  if (/santander/.test(org)) return DetectedBank.SANTANDER;
  if (/caixa/.test(org)) return DetectedBank.CAIXA;
  return DetectedBank.GENERIC;
}

export function parseOfx(input: ParseInput): ParseResult {
  const content = input.content.replace(/\r\n/g, '\n');
  const bank = detectBankFromOfx(content, input.bankHint);
  const accountLabel =
    ofxTag(content, 'ACCTID') ?? ofxTag(content, 'DESC') ?? undefined;

  const blocks = content.split(/<STMTTRN>/i).slice(1);
  const lines: ParsedBankLine[] = [];

  for (const block of blocks) {
    const amountRaw = ofxTag(block, 'TRNAMT');
    if (!amountRaw) continue;
    const signed = Number(amountRaw.replace(',', '.'));
    if (!Number.isFinite(signed) || signed === 0) continue;
    const amount = Math.abs(signed);

    const date =
      parseOfxDate(ofxTag(block, 'DTPOSTED')) ??
      parseOfxDate(ofxTag(block, 'DTUSER'));
    if (!date) continue;

    const memo = ofxTag(block, 'MEMO') ?? '';
    const name = ofxTag(block, 'NAME') ?? '';
    const description = [name, memo].filter(Boolean).join(' — ').trim() || 'Lançamento';
    const trnType = (ofxTag(block, 'TRNTYPE') ?? '').toUpperCase();
    const isCard = isCreditCardInput(input);
    const direction = isCard
      ? directionFromSignedAmount(signed, StatementSourceType.CREDIT_CARD)
      : trnType === 'CREDIT' || trnType === 'DEP' || signed > 0
        ? 'CREDIT'
        : 'DEBIT';

    lines.push({
      transactionDate: date,
      description,
      amount: Math.abs(amount),
      direction,
      externalId: ofxTag(block, 'FITID') ?? undefined,
      category: guessCategory(description),
      paymentMethod: guessPaymentMethod(description, bank, true),
    });
  }

  return { bank, accountLabel, lines };
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      out.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  out.push(current.trim());
  return out;
}

function detectDelimiter(headerLine: string): string {
  const tabs = (headerLine.match(/\t/g) ?? []).length;
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  if (tabs > 0 && tabs >= semicolons && tabs >= commas) return '\t';
  return semicolons > commas ? ';' : ',';
}

function normHeader(h: string): string {
  return h
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

function findColumn(headers: string[], patterns: RegExp[]): number {
  return headers.findIndex((h) => patterns.some((p) => p.test(h)));
}

function detectBankFromCsv(headers: string[], fileName: string, hint?: DetectedBank): DetectedBank {
  if (hint && hint !== DetectedBank.GENERIC) return hint;
  const joined = headers.join(' ').toLowerCase();
  const fn = fileName.toLowerCase();
  if (/nubank|nu_/.test(joined + fn)) return DetectedBank.NUBANK;
  if (/inter|banco inter/.test(joined + fn)) return DetectedBank.INTER;
  if (/bradesco/.test(joined + fn)) return DetectedBank.BRADESCO;
  if (/picpay/.test(joined + fn)) return DetectedBank.PICPAY;
  if (/itau|itaú/.test(joined + fn)) return DetectedBank.ITAU;
  if (/santander/.test(joined + fn)) return DetectedBank.SANTANDER;
  if (/caixa/.test(joined + fn)) return DetectedBank.CAIXA;
  if (/data.*lancamento.*historico.*valor/.test(joined.replace(/\s/g, ''))) {
    return DetectedBank.INTER;
  }
  if (/debito.*credito|credito.*debito/.test(joined)) return DetectedBank.BRADESCO;
  if (/identificador|descricao|descri/.test(joined) && /valor/.test(joined)) {
    return DetectedBank.NUBANK;
  }
  return DetectedBank.GENERIC;
}

function parseBradescoRow(
  cols: string[],
  dateIdx: number,
  descIdx: number,
  creditIdx: number,
  debitIdx: number,
  bank: DetectedBank,
): ParsedBankLine | null {
  const date = parseFlexibleDate(cols[dateIdx] ?? '');
  if (!date) return null;
  const description = (cols[descIdx] ?? cols[dateIdx + 1] ?? '').trim() || 'Lançamento';
  const credit = parseBrazilianAmount(cols[creditIdx] ?? '');
  const debit = parseBrazilianAmount(cols[debitIdx] ?? '');
  if (credit && credit > 0) {
    return {
      transactionDate: date,
      description,
      amount: credit,
      direction: 'CREDIT',
      category: guessCategory(description),
      paymentMethod: guessPaymentMethod(description, bank),
    };
  }
  if (debit && debit > 0) {
    return {
      transactionDate: date,
      description,
      amount: debit,
      direction: 'DEBIT',
      category: guessCategory(description),
      paymentMethod: guessPaymentMethod(description, bank),
    };
  }
  return null;
}

export function parseCsv(input: ParseInput): ParseResult {
  const rawLines = input.content
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (rawLines.length < 2) {
    return { bank: input.bankHint ?? DetectedBank.GENERIC, lines: [] };
  }

  const delimiter = detectDelimiter(rawLines[0]);
  const headers = splitCsvLine(rawLines[0], delimiter).map(normHeader);
  const bank = detectBankFromCsv(headers, input.fileName, input.bankHint);

  const dateIdx = findColumn(headers, [
    /^data$/,
    /data lancamento/,
    /data do lancamento/,
    /data transacao/,
    /date/,
    /dt/,
  ]);
  const descIdx = findColumn(headers, [
    /descricao/,
    /descri/,
    /historico/,
    /title/,
    /estabelecimento/,
    /detalhe/,
  ]);
  const amountIdx = findColumn(headers, [/^valor$/, /amount/, /value/]);
  const creditIdx = findColumn(headers, [/credito/, /credit/]);
  const debitIdx = findColumn(headers, [/debito/, /debit/]);
  const idIdx = findColumn(headers, [/identificador/, /id transacao/, /uuid/]);

  const lines: ParsedBankLine[] = [];

  for (let i = 1; i < rawLines.length; i++) {
    const cols = splitCsvLine(rawLines[i], delimiter);
    if (cols.every((c) => !c.trim())) continue;

    if (creditIdx >= 0 && debitIdx >= 0 && dateIdx >= 0) {
      const row = parseBradescoRow(
        cols,
        dateIdx,
        descIdx >= 0 ? descIdx : dateIdx + 1,
        creditIdx,
        debitIdx,
        bank,
      );
      if (row) lines.push(row);
      continue;
    }

    const date = parseFlexibleDate(cols[dateIdx >= 0 ? dateIdx : 0] ?? '');
    if (!date) continue;

    let signedAmount: number | null = null;
    if (amountIdx >= 0) {
      signedAmount = parseBrazilianAmount(cols[amountIdx] ?? '');
    } else {
      signedAmount = parseBrazilianAmount(cols[cols.length - 1] ?? '');
    }
    if (signedAmount === null || signedAmount === 0) continue;

    const descriptionParts: string[] = [];
    if (descIdx >= 0 && cols[descIdx]) descriptionParts.push(cols[descIdx]);
    if (bank === DetectedBank.INTER) {
      const histIdx = findColumn(headers, [/historico/]);
      if (histIdx >= 0 && cols[histIdx]) descriptionParts.unshift(cols[histIdx]);
    }
    const description =
      descriptionParts.filter(Boolean).join(' — ').trim() ||
      cols.slice(1, -1).filter(Boolean).join(' ') ||
      'Lançamento';

    const isCard = isCreditCardInput(input, headers);
    const direction = directionFromSignedAmount(
      signedAmount,
      input.sourceType,
      isCard,
    );

    lines.push({
      transactionDate: date,
      description,
      amount: Math.abs(signedAmount),
      direction,
      externalId: idIdx >= 0 ? cols[idIdx] || undefined : undefined,
      category: guessCategory(description),
      paymentMethod: guessPaymentMethod(description, bank, isCard),
    });
  }

  return { bank, lines };
}

export function parseStatementFile(input: ParseInput): ParseResult {
  if (input.format === 'OFX') return parseOfx(input);
  return parseCsv(input);
}

export const BANK_LABELS: Record<DetectedBank, string> = {
  NUBANK: 'Nubank',
  INTER: 'Banco Inter',
  BRADESCO: 'Bradesco',
  PICPAY: 'PicPay',
  ITAU: 'Itaú',
  SANTANDER: 'Santander',
  CAIXA: 'Caixa',
  GENERIC: 'Outro banco',
};
