import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import {
  BankStatementFormat,
  BankTransactionDirection,
  DetectedBank,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ok } from '../common/api-response';
import { AuditLogService } from '../audit/audit-log.service';
import { AuthService } from '../auth/auth.service';
import { guessCategory, guessPaymentMethod } from './parsers/category-guess';
import {
  BANK_LABELS,
  parseStatementFile,
} from './parsers/statement.parser';
import {
  buildFingerprint,
  refMonthFromDate,
  ym,
} from './parsers/utils';

@Injectable()
export class StatementImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly auth: AuthService,
  ) {}

  detectFormat(fileName: string, mime?: string): BankStatementFormat | null {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.ofx') || lower.endsWith('.qfx')) return BankStatementFormat.OFX;
    if (lower.endsWith('.csv')) return BankStatementFormat.CSV;
    if (mime?.includes('csv')) return BankStatementFormat.CSV;
    if (mime?.includes('ofx') || mime?.includes('qfx')) return BankStatementFormat.OFX;
    return null;
  }

  preview(
    userId: string,
    buffer: Buffer,
    fileName: string,
    bankHint?: DetectedBank,
  ) {
    const format = this.detectFormat(fileName);
    if (!format) {
      throw new UnsupportedMediaTypeException(
        'Formato não suportado. Envie arquivos .csv ou .ofx.',
      );
    }

    const content = buffer.toString('utf-8');
    const parsed = parseStatementFile({
      content,
      fileName,
      format,
      bankHint,
    });

    if (parsed.lines.length === 0) {
      throw new BadRequestException(
        'Nenhum lançamento encontrado no arquivo. Verifique se exportou o extrato completo do mês.',
      );
    }

    const months = [...new Set(parsed.lines.map((l) => ym(refMonthFromDate(l.transactionDate))))];
    const debits = parsed.lines.filter((l) => l.direction === 'DEBIT');
    const credits = parsed.lines.filter((l) => l.direction === 'CREDIT');

    return ok(
      {
        bank: parsed.bank,
        bankLabel: BANK_LABELS[parsed.bank],
        format,
        fileName,
        accountLabel: parsed.accountLabel,
        lineCount: parsed.lines.length,
        monthsCovered: months.sort(),
        debitTotal: debits.reduce((s, l) => s + l.amount, 0).toFixed(2),
        creditTotal: credits.reduce((s, l) => s + l.amount, 0).toFixed(2),
        sample: parsed.lines.slice(0, 8).map((line) => ({
          date: line.transactionDate.toISOString().slice(0, 10),
          description: line.description,
          amount: line.amount.toFixed(2),
          direction: line.direction,
          category: line.category ?? guessCategory(line.description),
        })),
      },
      'Pré-visualização gerada com sucesso.',
    );
  }

  async import(
    userId: string,
    buffer: Buffer,
    fileName: string,
    bankHint?: DetectedBank,
  ) {
    const format = this.detectFormat(fileName);
    if (!format) {
      throw new UnsupportedMediaTypeException(
        'Formato não suportado. Envie arquivos .csv ou .ofx.',
      );
    }

    const content = buffer.toString('utf-8');
    const parsed = parseStatementFile({
      content,
      fileName,
      format,
      bankHint,
    });

    if (parsed.lines.length === 0) {
      throw new BadRequestException('Nenhum lançamento encontrado no arquivo.');
    }

    const monthsCovered = [
      ...new Set(parsed.lines.map((l) => ym(refMonthFromDate(l.transactionDate)))),
    ].sort();

    const result = await this.prisma.$transaction(async (tx) => {
      for (const monthYm of monthsCovered) {
        const [y, m] = monthYm.split('-').map(Number);
        const ref = new Date(Date.UTC(y, m - 1, 1));
        // Remove all entries for the month (including soft-deleted) so reimport
        // does not hit the unique fingerprint constraint.
        await tx.bankStatementEntry.deleteMany({
          where: {
            userId,
            bank: parsed.bank,
            referenceMonth: ref,
          },
        });
      }

      const imp = await tx.bankStatementImport.create({
        data: {
          userId,
          bank: parsed.bank,
          format,
          fileName,
          accountLabel: parsed.accountLabel,
          lineCount: parsed.lines.length,
          monthsCovered,
        },
      });

      let created = 0;
      for (const line of parsed.lines) {
        const fingerprint = buildFingerprint(userId, parsed.bank, line);
        const refMonth = refMonthFromDate(line.transactionDate);
        await tx.bankStatementEntry.create({
          data: {
            userId,
            importId: imp.id,
            fingerprint,
            bank: parsed.bank,
            transactionDate: line.transactionDate,
            referenceMonth: refMonth,
            description: line.description,
            amount: new Prisma.Decimal(line.amount),
            direction:
              line.direction === 'CREDIT'
                ? BankTransactionDirection.CREDIT
                : BankTransactionDirection.DEBIT,
            category: line.category ?? guessCategory(line.description),
            paymentMethod:
              line.paymentMethod ??
              guessPaymentMethod(line.description, parsed.bank),
            externalId: line.externalId,
          },
        });
        created += 1;
      }

      return { importId: imp.id, created, monthsCovered };
    });

    await this.audit.log({
      userId,
      entity: 'BankStatementImport',
      entityId: result.importId,
      action: 'IMPORT',
      newValue: {
        fileName,
        bank: parsed.bank,
        lineCount: parsed.lines.length,
        monthsCovered: result.monthsCovered,
      },
    });

    return ok(
      {
        importId: result.importId,
        bank: parsed.bank,
        bankLabel: BANK_LABELS[parsed.bank],
        fileName,
        imported: result.created,
        monthsCovered: result.monthsCovered,
        message:
          'Extrato importado. Os meses do arquivo substituíram os lançamentos anteriores desse banco.',
      },
      'Extrato importado com sucesso.',
    );
  }

  async deleteImport(userId: string, importId: string, password: string) {
    await this.auth.verifyPassword(userId, password);

    const imp = await this.prisma.bankStatementImport.findFirst({
      where: { id: importId, userId },
    });
    if (!imp) {
      throw new NotFoundException('Importação não encontrada.');
    }

    const deletedEntries = await this.prisma.$transaction(async (tx) => {
      const removed = await tx.bankStatementEntry.deleteMany({
        where: { importId: imp.id, userId },
      });
      await tx.bankStatementImport.delete({ where: { id: imp.id } });
      return removed.count;
    });

    await this.audit.log({
      userId,
      entity: 'BankStatementImport',
      entityId: imp.id,
      action: 'DELETE',
      oldValue: {
        fileName: imp.fileName,
        bank: imp.bank,
        lineCount: imp.lineCount,
        monthsCovered: imp.monthsCovered,
        entriesRemoved: deletedEntries,
      },
    });

    return ok(
      {
        importId: imp.id,
        fileName: imp.fileName,
        bank: imp.bank,
        bankLabel: BANK_LABELS[imp.bank],
        monthsCovered: imp.monthsCovered,
        entriesRemoved: deletedEntries,
        message: 'Extrato excluído. Os lançamentos importados foram removidos.',
      },
      'Extrato excluído com sucesso.',
    );
  }

  async listImports(userId: string) {
    const rows = await this.prisma.bankStatementImport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return ok(
      rows.map((row) => ({
        ...row,
        bankLabel: BANK_LABELS[row.bank],
      })),
      'Operation completed successfully',
    );
  }

  async listEntries(userId: string, month?: string, bank?: DetectedBank) {
    const where: Prisma.BankStatementEntryWhereInput = {
      userId,
      deletedAt: null,
    };
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split('-').map(Number);
      where.referenceMonth = new Date(Date.UTC(y, m - 1, 1));
    }
    if (bank) where.bank = bank;

    const rows = await this.prisma.bankStatementEntry.findMany({
      where,
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });

    return ok(
      rows.map((row) => ({
        ...row,
        amount: row.amount.toFixed(2),
        bankLabel: BANK_LABELS[row.bank],
      })),
      'Operation completed successfully',
    );
  }
}
