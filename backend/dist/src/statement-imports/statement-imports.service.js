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
const category_guess_1 = require("./parsers/category-guess");
const statement_parser_1 = require("./parsers/statement.parser");
const utils_1 = require("./parsers/utils");
let StatementImportsService = class StatementImportsService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
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
    preview(userId, buffer, fileName, bankHint) {
        const format = this.detectFormat(fileName);
        if (!format) {
            throw new common_1.UnsupportedMediaTypeException('Formato não suportado. Envie arquivos .csv ou .ofx.');
        }
        const content = buffer.toString('utf-8');
        const parsed = (0, statement_parser_1.parseStatementFile)({
            content,
            fileName,
            format,
            bankHint,
        });
        if (parsed.lines.length === 0) {
            throw new common_1.BadRequestException('Nenhum lançamento encontrado no arquivo. Verifique se exportou o extrato completo do mês.');
        }
        const months = [...new Set(parsed.lines.map((l) => (0, utils_1.ym)((0, utils_1.refMonthFromDate)(l.transactionDate))))];
        const debits = parsed.lines.filter((l) => l.direction === 'DEBIT');
        const credits = parsed.lines.filter((l) => l.direction === 'CREDIT');
        return (0, api_response_1.ok)({
            bank: parsed.bank,
            bankLabel: statement_parser_1.BANK_LABELS[parsed.bank],
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
                category: line.category ?? (0, category_guess_1.guessCategory)(line.description),
            })),
        }, 'Pré-visualização gerada com sucesso.');
    }
    async import(userId, buffer, fileName, bankHint) {
        const format = this.detectFormat(fileName);
        if (!format) {
            throw new common_1.UnsupportedMediaTypeException('Formato não suportado. Envie arquivos .csv ou .ofx.');
        }
        const content = buffer.toString('utf-8');
        const parsed = (0, statement_parser_1.parseStatementFile)({
            content,
            fileName,
            format,
            bankHint,
        });
        if (parsed.lines.length === 0) {
            throw new common_1.BadRequestException('Nenhum lançamento encontrado no arquivo.');
        }
        const monthsCovered = [
            ...new Set(parsed.lines.map((l) => (0, utils_1.ym)((0, utils_1.refMonthFromDate)(l.transactionDate)))),
        ].sort();
        const result = await this.prisma.$transaction(async (tx) => {
            for (const monthYm of monthsCovered) {
                const [y, m] = monthYm.split('-').map(Number);
                const ref = new Date(Date.UTC(y, m - 1, 1));
                await tx.bankStatementEntry.updateMany({
                    where: {
                        userId,
                        bank: parsed.bank,
                        referenceMonth: ref,
                        deletedAt: null,
                    },
                    data: { deletedAt: new Date() },
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
                const fingerprint = (0, utils_1.buildFingerprint)(userId, parsed.bank, line);
                const refMonth = (0, utils_1.refMonthFromDate)(line.transactionDate);
                await tx.bankStatementEntry.create({
                    data: {
                        userId,
                        importId: imp.id,
                        fingerprint,
                        bank: parsed.bank,
                        transactionDate: line.transactionDate,
                        referenceMonth: refMonth,
                        description: line.description,
                        amount: new client_1.Prisma.Decimal(line.amount),
                        direction: line.direction === 'CREDIT'
                            ? client_1.BankTransactionDirection.CREDIT
                            : client_1.BankTransactionDirection.DEBIT,
                        category: line.category ?? (0, category_guess_1.guessCategory)(line.description),
                        paymentMethod: line.paymentMethod ??
                            (0, category_guess_1.guessPaymentMethod)(line.description, parsed.bank),
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
        return (0, api_response_1.ok)({
            importId: result.importId,
            bank: parsed.bank,
            bankLabel: statement_parser_1.BANK_LABELS[parsed.bank],
            fileName,
            imported: result.created,
            monthsCovered: result.monthsCovered,
            message: 'Extrato importado. Os meses do arquivo substituíram os lançamentos anteriores desse banco.',
        }, 'Extrato importado com sucesso.');
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
        })), 'Operation completed successfully');
    }
    async listEntries(userId, month, bank) {
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
        const rows = await this.prisma.bankStatementEntry.findMany({
            where,
            orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
            take: 500,
        });
        return (0, api_response_1.ok)(rows.map((row) => ({
            ...row,
            amount: row.amount.toFixed(2),
            bankLabel: statement_parser_1.BANK_LABELS[row.bank],
        })), 'Operation completed successfully');
    }
};
exports.StatementImportsService = StatementImportsService;
exports.StatementImportsService = StatementImportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_log_service_1.AuditLogService])
], StatementImportsService);
//# sourceMappingURL=statement-imports.service.js.map