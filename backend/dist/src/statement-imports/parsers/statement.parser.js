"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BANK_LABELS = void 0;
exports.parseOfx = parseOfx;
exports.parseCsv = parseCsv;
exports.parseStatementFile = parseStatementFile;
const client_1 = require("@prisma/client");
const category_guess_1 = require("./category-guess");
const utils_1 = require("./utils");
function ofxTag(block, tag) {
    const re = new RegExp(`<${tag}>([^<\\n]+)`, 'i');
    const match = re.exec(block);
    return match?.[1]?.trim() ?? null;
}
function parseOfxDate(raw) {
    if (!raw)
        return null;
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    if (digits.length < 8)
        return null;
    const y = Number(digits.slice(0, 4));
    const m = Number(digits.slice(4, 6));
    const d = Number(digits.slice(6, 8));
    return new Date(Date.UTC(y, m - 1, d));
}
function detectBankFromOfx(content, hint) {
    if (hint && hint !== client_1.DetectedBank.GENERIC)
        return hint;
    const org = (ofxTag(content, 'ORG') ?? ofxTag(content, 'FI') ?? '').toLowerCase();
    if (/nubank|nu pagamentos/.test(org))
        return client_1.DetectedBank.NUBANK;
    if (/inter|banco inter/.test(org))
        return client_1.DetectedBank.INTER;
    if (/bradesco/.test(org))
        return client_1.DetectedBank.BRADESCO;
    if (/picpay/.test(org))
        return client_1.DetectedBank.PICPAY;
    if (/itau|itaú/.test(org))
        return client_1.DetectedBank.ITAU;
    if (/santander/.test(org))
        return client_1.DetectedBank.SANTANDER;
    if (/caixa/.test(org))
        return client_1.DetectedBank.CAIXA;
    return client_1.DetectedBank.GENERIC;
}
function parseOfx(input) {
    const content = input.content.replace(/\r\n/g, '\n');
    const bank = detectBankFromOfx(content, input.bankHint);
    const accountLabel = ofxTag(content, 'ACCTID') ?? ofxTag(content, 'DESC') ?? undefined;
    const blocks = content.split(/<STMTTRN>/i).slice(1);
    const lines = [];
    for (const block of blocks) {
        const amountRaw = ofxTag(block, 'TRNAMT');
        if (!amountRaw)
            continue;
        const signed = Number(amountRaw.replace(',', '.'));
        if (!Number.isFinite(signed) || signed === 0)
            continue;
        const amount = Math.abs(signed);
        const date = parseOfxDate(ofxTag(block, 'DTPOSTED')) ??
            parseOfxDate(ofxTag(block, 'DTUSER'));
        if (!date)
            continue;
        const memo = ofxTag(block, 'MEMO') ?? '';
        const name = ofxTag(block, 'NAME') ?? '';
        const description = [name, memo].filter(Boolean).join(' — ').trim() || 'Lançamento';
        const trnType = (ofxTag(block, 'TRNTYPE') ?? '').toUpperCase();
        const direction = trnType === 'CREDIT' || trnType === 'DEP' || signed > 0 ? 'CREDIT' : 'DEBIT';
        lines.push({
            transactionDate: date,
            description,
            amount: Math.abs(amount),
            direction,
            externalId: ofxTag(block, 'FITID') ?? undefined,
            category: (0, category_guess_1.guessCategory)(description),
            paymentMethod: (0, category_guess_1.guessPaymentMethod)(description, bank, true),
        });
    }
    return { bank, accountLabel, lines };
}
function splitCsvLine(line, delimiter) {
    const out = [];
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
function detectDelimiter(headerLine) {
    const semicolons = (headerLine.match(/;/g) ?? []).length;
    const commas = (headerLine.match(/,/g) ?? []).length;
    return semicolons > commas ? ';' : ',';
}
function normHeader(h) {
    return h
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .trim();
}
function findColumn(headers, patterns) {
    return headers.findIndex((h) => patterns.some((p) => p.test(h)));
}
function detectBankFromCsv(headers, fileName, hint) {
    if (hint && hint !== client_1.DetectedBank.GENERIC)
        return hint;
    const joined = headers.join(' ').toLowerCase();
    const fn = fileName.toLowerCase();
    if (/nubank|nu_/.test(joined + fn))
        return client_1.DetectedBank.NUBANK;
    if (/inter|banco inter/.test(joined + fn))
        return client_1.DetectedBank.INTER;
    if (/bradesco/.test(joined + fn))
        return client_1.DetectedBank.BRADESCO;
    if (/picpay/.test(joined + fn))
        return client_1.DetectedBank.PICPAY;
    if (/itau|itaú/.test(joined + fn))
        return client_1.DetectedBank.ITAU;
    if (/santander/.test(joined + fn))
        return client_1.DetectedBank.SANTANDER;
    if (/caixa/.test(joined + fn))
        return client_1.DetectedBank.CAIXA;
    if (/data.*lancamento.*historico.*valor/.test(joined.replace(/\s/g, ''))) {
        return client_1.DetectedBank.INTER;
    }
    if (/debito.*credito|credito.*debito/.test(joined))
        return client_1.DetectedBank.BRADESCO;
    if (/identificador|descricao|descri/.test(joined) && /valor/.test(joined)) {
        return client_1.DetectedBank.NUBANK;
    }
    return client_1.DetectedBank.GENERIC;
}
function parseBradescoRow(cols, dateIdx, descIdx, creditIdx, debitIdx, bank) {
    const date = (0, utils_1.parseFlexibleDate)(cols[dateIdx] ?? '');
    if (!date)
        return null;
    const description = (cols[descIdx] ?? cols[dateIdx + 1] ?? '').trim() || 'Lançamento';
    const credit = (0, utils_1.parseBrazilianAmount)(cols[creditIdx] ?? '');
    const debit = (0, utils_1.parseBrazilianAmount)(cols[debitIdx] ?? '');
    if (credit && credit > 0) {
        return {
            transactionDate: date,
            description,
            amount: credit,
            direction: 'CREDIT',
            category: (0, category_guess_1.guessCategory)(description),
            paymentMethod: (0, category_guess_1.guessPaymentMethod)(description, bank),
        };
    }
    if (debit && debit > 0) {
        return {
            transactionDate: date,
            description,
            amount: debit,
            direction: 'DEBIT',
            category: (0, category_guess_1.guessCategory)(description),
            paymentMethod: (0, category_guess_1.guessPaymentMethod)(description, bank),
        };
    }
    return null;
}
function parseCsv(input) {
    const rawLines = input.content
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
    if (rawLines.length < 2) {
        return { bank: input.bankHint ?? client_1.DetectedBank.GENERIC, lines: [] };
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
    const lines = [];
    for (let i = 1; i < rawLines.length; i++) {
        const cols = splitCsvLine(rawLines[i], delimiter);
        if (cols.every((c) => !c.trim()))
            continue;
        if (creditIdx >= 0 && debitIdx >= 0 && dateIdx >= 0) {
            const row = parseBradescoRow(cols, dateIdx, descIdx >= 0 ? descIdx : dateIdx + 1, creditIdx, debitIdx, bank);
            if (row)
                lines.push(row);
            continue;
        }
        const date = (0, utils_1.parseFlexibleDate)(cols[dateIdx >= 0 ? dateIdx : 0] ?? '');
        if (!date)
            continue;
        let signedAmount = null;
        if (amountIdx >= 0) {
            signedAmount = (0, utils_1.parseBrazilianAmount)(cols[amountIdx] ?? '');
        }
        else {
            signedAmount = (0, utils_1.parseBrazilianAmount)(cols[cols.length - 1] ?? '');
        }
        if (signedAmount === null || signedAmount === 0)
            continue;
        const descriptionParts = [];
        if (descIdx >= 0 && cols[descIdx])
            descriptionParts.push(cols[descIdx]);
        if (bank === client_1.DetectedBank.INTER) {
            const histIdx = findColumn(headers, [/historico/]);
            if (histIdx >= 0 && cols[histIdx])
                descriptionParts.unshift(cols[histIdx]);
        }
        const description = descriptionParts.filter(Boolean).join(' — ').trim() ||
            cols.slice(1, -1).filter(Boolean).join(' ') ||
            'Lançamento';
        const direction = signedAmount < 0 ? 'DEBIT' : 'CREDIT';
        const isCard = /cartao|fatura|credit card/i.test(input.fileName + headers.join(' '));
        lines.push({
            transactionDate: date,
            description,
            amount: Math.abs(signedAmount),
            direction,
            externalId: idIdx >= 0 ? cols[idIdx] || undefined : undefined,
            category: (0, category_guess_1.guessCategory)(description),
            paymentMethod: (0, category_guess_1.guessPaymentMethod)(description, bank, isCard),
        });
    }
    return { bank, lines };
}
function parseStatementFile(input) {
    if (input.format === 'OFX')
        return parseOfx(input);
    return parseCsv(input);
}
exports.BANK_LABELS = {
    NUBANK: 'Nubank',
    INTER: 'Banco Inter',
    BRADESCO: 'Bradesco',
    PICPAY: 'PicPay',
    ITAU: 'Itaú',
    SANTANDER: 'Santander',
    CAIXA: 'Caixa',
    GENERIC: 'Outro banco',
};
//# sourceMappingURL=statement.parser.js.map