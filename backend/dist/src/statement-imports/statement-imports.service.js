"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatementImportsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const api_response_1 = require("../common/api-response");
const audit_log_service_1 = require("../audit/audit-log.service");
const auth_service_1 = require("../auth/auth.service");
const billing_cycle_1 = require("./billing-cycle");
const category_guess_1 = require("./parsers/category-guess");
const statement_parser_1 = require("./parsers/statement.parser");
const utils_1 = require("./parsers/utils");
const statement_reconciliation_service_1 = require("./statement-reconciliation.service");
const SOURCE_LABELS = {
    BANK_ACCOUNT: 'Conta corrente',
    CREDIT_CARD: 'Cartão de crédito',
};
let StatementImportsService = class StatementImportsService {
    constructor(prisma, audit, auth, reconciliation) {
        this.prisma = prisma;
        this.audit = audit;
        this.auth = auth;
        this.reconciliation = reconciliation;
    }
    detectFormat(fileName, mime) {
        const lower = fileName.toLowerCase();
        if (lower.endsWith('.ofx') || lower.endsWith('.qfx'))
            return client_1.BankStatementFormat.OFX;
        if (lower.endsWith('.csv'))
            return client_1.BankStatementFormat.CSV;
        if (mime?.includes('csv'))
            return client_1.BankStatementFormat.CSV;
        if (mime?.includes('ofx') || mime?.includes('qfx'))
            return client_1.BankStatementFormat.OFX;
        return null;
    }
    resolveSourceType(fileName, requested) {
        if (requested)
            return requested;
        if (/cartao|cartão|fatura|credit.?card|credit_card|credito|crédito/i.test(fileName)) {
            return client_1.StatementSourceType.CREDIT_CARD;
        }
        return client_1.StatementSourceType.BANK_ACCOUNT;
    }
    async invalidateRagIndex(userId) {
        await this.prisma.financeIndexState.deleteMany({ where: { userId } });
    }
    async resolveBillingConfig(userId) {
        const card = await this.prisma.userCard.findFirst({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
        });
        if (!card)
            return null;
        return {
            dueDay: card.dueDay,
            ...(card.closingDay != null ? { closingDay: card.closingDay } : {}),
        };
    }
    resolveReferenceMonths(lines, sourceType, bank, billingConfig) {
        if (sourceType === client_1.StatementSourceType.CREDIT_CARD) {
            return (0, billing_cycle_1.assignCreditCardReferenceMonths)(lines, billingConfig, bank);
        }
        return lines.map((line) => (0, utils_1.refMonthFromDate)(line.transactionDate));
    }
    async preview(userId, buffer, fileName, bankHint, sourceTypeHint) {
        const format = this.detectFormat(fileName);
        if (!format) {
            throw new common_1.UnsupportedMediaTypeException('Formato não suportado. Envie arquivos .csv ou .ofx.');
        }
        const sourceType = this.resolveSourceType(fileName, sourceTypeHint);
        const content = buffer.toString('utf-8');
        const parsed = (0, statement_parser_1.parseStatementFile)({
            content,
            fileName,
            format,
            bankHint,
            sourceType,
        });
        if (parsed.lines.length === 0) {
            throw new common_1.BadRequestException('Nenhum lançamento encontrado no arquivo. Verifique se exportou o extrato completo do mês.');
        }
        const billingConfig = sourceType === client_1.StatementSourceType.CREDIT_CARD
            ? await this.resolveBillingConfig(userId)
            : null;
        const importLines = sourceType === client_1.StatementSourceType.CREDIT_CARD
            ? (0, billing_cycle_1.filterCreditCardImportLines)(parsed.lines, parsed.bank)
            : parsed.lines;
        if (importLines.length === 0) {
            throw new common_1.BadRequestException('Nenhum lançamento utilizável no arquivo (pagamentos de fatura do cartão são ignorados — use o extrato da conta).');
        }
        const referenceMonths = this.resolveReferenceMonths(importLines, sourceType, parsed.bank, billingConfig);
        const months = (0, billing_cycle_1.billingMonthsCovered)(referenceMonths);
        const debits = importLines.filter((l) => l.direction === 'DEBIT');
        const credits = importLines.filter((l) => l.direction === 'CREDIT');
        const skippedPayments = parsed.lines.length - importLines.length;
        return (0, api_response_1.ok)({
            bank: parsed.bank,
            bankLabel: statement_parser_1.BANK_LABELS[parsed.bank],
            sourceType,
            sourceTypeLabel: SOURCE_LABELS[sourceType],
            format,
            fileName,
            accountLabel: parsed.accountLabel,
            lineCount: importLines.length,
            monthsCovered: months,
            billingCycleApplied: sourceType === client_1.StatementSourceType.CREDIT_CARD,
            skippedCardPayments: skippedPayments > 0 ? skippedPayments : undefined,
            debitTotal: debits.reduce((s, l) => s + l.amount, 0).toFixed(2),
            creditTotal: credits.reduce((s, l) => s + l.amount, 0).toFixed(2),
            sample: importLines.slice(0, 8).map((line, i) => ({
                date: line.transactionDate.toISOString().slice(0, 10),
                description: line.description,
                amount: line.amount.toFixed(2),
                direction: line.direction,
                category: line.category ?? (0, category_guess_1.guessCategory)(line.description),
                billingMonth: (0, utils_1.ym)(referenceMonths[i]),
            })),
        }, 'Pré-visualização gerada com sucesso.');
    }
    async import(userId, buffer, fileName, bankHint, sourceTypeHint) {
        const format = this.detectFormat(fileName);
        if (!format) {
            throw new common_1.UnsupportedMediaTypeException('Formato não suportado. Envie arquivos .csv ou .ofx.');
        }
        const sourceType = this.resolveSourceType(fileName, sourceTypeHint);
        const content = buffer.toString('utf-8');
        const parsed = (0, statement_parser_1.parseStatementFile)({
            content,
            fileName,
            format,
            bankHint,
            sourceType,
        });
        if (parsed.lines.length === 0) {
            throw new common_1.BadRequestException('Nenhum lançamento encontrado no arquivo.');
        }
        const billingConfig = sourceType === client_1.StatementSourceType.CREDIT_CARD
            ? await this.resolveBillingConfig(userId)
            : null;
        const importLines = sourceType === client_1.StatementSourceType.CREDIT_CARD
            ? (0, billing_cycle_1.filterCreditCardImportLines)(parsed.lines, parsed.bank)
            : parsed.lines;
        if (importLines.length === 0) {
            throw new common_1.BadRequestException('Nenhum lançamento utilizável no arquivo (pagamentos de fatura do cartão são ignorados — use o extrato da conta).');
        }
        const referenceMonths = this.resolveReferenceMonths(importLines, sourceType, parsed.bank, billingConfig);
        const monthsCovered = (0, billing_cycle_1.billingMonthsCovered)(referenceMonths);
        const fingerprints = (0, utils_1.buildFingerprintsForImport)(userId, parsed.bank, importLines, sourceType);
        const result = await this.prisma.$transaction(async (tx) => {
            for (const monthYm of monthsCovered) {
                const [y, m] = monthYm.split('-').map(Number);
                const ref = new Date(Date.UTC(y, m - 1, 1));
                await tx.bankStatementEntry.deleteMany({
                    where: {
                        userId,
                        bank: parsed.bank,
                        sourceType,
                        referenceMonth: ref,
                    },
                });
            }
            await tx.bankStatementEntry.deleteMany({
                where: {
                    userId,
                    bank: parsed.bank,
                    sourceType,
                    fingerprint: { in: fingerprints },
                },
            });
            const imp = await tx.bankStatementImport.create({
                data: {
                    userId,
                    bank: parsed.bank,
                    sourceType,
                    format,
                    fileName,
                    accountLabel: parsed.accountLabel,
                    lineCount: importLines.length,
                    monthsCovered,
                },
            });
            let created = 0;
            for (let i = 0; i < importLines.length; i++) {
                const line = importLines[i];
                const fingerprint = fingerprints[i];
                const refMonth = referenceMonths[i];
                await tx.bankStatementEntry.create({
                    data: {
                        userId,
                        importId: imp.id,
                        fingerprint,
                        bank: parsed.bank,
                        sourceType,
                        transactionDate: line.transactionDate,
                        referenceMonth: refMonth,
                        description: line.description,
                        amount: new client_1.Prisma.Decimal(line.amount),
                        direction: line.direction === 'CREDIT'
                            ? client_1.BankTransactionDirection.CREDIT
                            : client_1.BankTransactionDirection.DEBIT,
                        category: line.category ?? (0, category_guess_1.guessCategory)(line.description),
                        paymentMethod: line.paymentMethod ??
                            (0, category_guess_1.guessPaymentMethod)(line.description, parsed.bank, sourceType === client_1.StatementSourceType.CREDIT_CARD),
                        externalId: line.externalId,
                    },
                });
                created += 1;
            }
            return { importId: imp.id, created, monthsCovered, sourceType };
        });
        let reconciliationResult = { matched: 0, skipped: 0 };
        if (sourceType === client_1.StatementSourceType.BANK_ACCOUNT) {
            reconciliationResult = await this.reconciliation.reconcileAfterAccountImport(userId, result.monthsCovered);
        }
        await this.invalidateRagIndex(userId);
        await this.audit.log({
            userId,
            entity: 'BankStatementImport',
            entityId: result.importId,
            action: 'IMPORT',
            newValue: {
                fileName,
                bank: parsed.bank,
                sourceType,
                lineCount: parsed.lines.length,
                monthsCovered: result.monthsCovered,
                reconciled: reconciliationResult.matched,
            },
        });
        const typeLabel = SOURCE_LABELS[sourceType];
        return (0, api_response_1.ok)({
            importId: result.importId,
            bank: parsed.bank,
            bankLabel: statement_parser_1.BANK_LABELS[parsed.bank],
            sourceType,
            sourceTypeLabel: typeLabel,
            fileName,
            imported: result.created,
            monthsCovered: result.monthsCovered,
            reconciled: reconciliationResult.matched,
            message: sourceType === client_1.StatementSourceType.BANK_ACCOUNT
                ? `Extrato de ${typeLabel} importado. ${reconciliationResult.matched} conta(s) quitada(s) automaticamente pelo extrato.`
                : `Extrato de ${typeLabel} importado. Compras detalhadas disponíveis para análise.`,
        }, 'Extrato importado com sucesso.');
    }
    async deleteImport(userId, importId, password) {
        await this.auth.verifyPassword(userId, password);
        const imp = await this.prisma.bankStatementImport.findFirst({
            where: { id: importId, userId },
        });
        if (!imp) {
            throw new common_1.NotFoundException('Importação não encontrada.');
        }
        const reverted = await this.reconciliation.revertForImport(userId, imp.id);
        const deletedEntries = await this.prisma.$transaction(async (tx) => {
            const removed = await tx.bankStatementEntry.deleteMany({
                where: { importId: imp.id, userId },
            });
            await tx.bankStatementImport.delete({ where: { id: imp.id } });
            return removed.count;
        });
        await this.invalidateRagIndex(userId);
        await this.audit.log({
            userId,
            entity: 'BankStatementImport',
            entityId: imp.id,
            action: 'DELETE',
            oldValue: {
                fileName: imp.fileName,
                bank: imp.bank,
                sourceType: imp.sourceType,
                lineCount: imp.lineCount,
                monthsCovered: imp.monthsCovered,
                entriesRemoved: deletedEntries,
                reconciliationsReverted: reverted,
            },
        });
        return (0, api_response_1.ok)({
            importId: imp.id,
            fileName: imp.fileName,
            bank: imp.bank,
            bankLabel: statement_parser_1.BANK_LABELS[imp.bank],
            sourceType: imp.sourceType,
            sourceTypeLabel: SOURCE_LABELS[imp.sourceType],
            monthsCovered: imp.monthsCovered,
            entriesRemoved: deletedEntries,
            reconciliationsReverted: reverted,
            message: 'Extrato excluído. Os lançamentos importados foram removidos.',
        }, 'Extrato excluído com sucesso.');
    }
    async listImports(userId) {
        const rows = await this.prisma.bankStatementImport.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        return (0, api_response_1.ok)(rows.map((row) => ({
            ...row,
            bankLabel: statement_parser_1.BANK_LABELS[row.bank],
            sourceTypeLabel: SOURCE_LABELS[row.sourceType],
        })), 'Operation completed successfully');
    }
    async listEntries(userId, month, bank, sourceType) {
        const where = {
            userId,
            deletedAt: null,
        };
        if (month && /^\d{4}-\d{2}$/.test(month)) {
            const [y, m] = month.split('-').map(Number);
            where.referenceMonth = new Date(Date.UTC(y, m - 1, 1));
        }
        if (bank)
            where.bank = bank;
        if (sourceType)
            where.sourceType = sourceType;
        const rows = await this.prisma.bankStatementEntry.findMany({
            where,
            orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
            take: 500,
        });
        return (0, api_response_1.ok)(rows.map((row) => ({
            ...row,
            amount: row.amount.toFixed(2),
            bankLabel: statement_parser_1.BANK_LABELS[row.bank],
            sourceTypeLabel: SOURCE_LABELS[row.sourceType],
        })), 'Operation completed successfully');
    }
};
exports.StatementImportsService = StatementImportsService;
exports.StatementImportsService = StatementImportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_log_service_1.AuditLogService,
        auth_service_1.AuthService,
        statement_reconciliation_service_1.StatementReconciliationService])
], StatementImportsService);
//# sourceMappingURL=statement-imports.service.js.map