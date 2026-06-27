-- CreateEnum
CREATE TYPE "StatementSourceType" AS ENUM ('BANK_ACCOUNT', 'CREDIT_CARD');

-- CreateEnum
CREATE TYPE "ReconciliationMatchType" AS ENUM ('AUTO', 'MANUAL');

-- AlterTable
ALTER TABLE "BankStatementImport" ADD COLUMN "sourceType" "StatementSourceType" NOT NULL DEFAULT 'BANK_ACCOUNT';

-- AlterTable
ALTER TABLE "BankStatementEntry" ADD COLUMN "sourceType" "StatementSourceType" NOT NULL DEFAULT 'BANK_ACCOUNT';

-- CreateIndex
CREATE INDEX "BankStatementImport_userId_sourceType_idx" ON "BankStatementImport"("userId", "sourceType");

-- CreateIndex
CREATE INDEX "BankStatementEntry_userId_sourceType_referenceMonth_idx" ON "BankStatementEntry"("userId", "sourceType", "referenceMonth");

-- CreateTable
CREATE TABLE "StatementReconciliation" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "bankStatementEntryId" UUID NOT NULL,
    "expenseOccurrenceId" UUID NOT NULL,
    "matchType" "ReconciliationMatchType" NOT NULL DEFAULT 'AUTO',
    "confidence" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatementReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StatementReconciliation_bankStatementEntryId_key" ON "StatementReconciliation"("bankStatementEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "StatementReconciliation_expenseOccurrenceId_key" ON "StatementReconciliation"("expenseOccurrenceId");

-- CreateIndex
CREATE INDEX "StatementReconciliation_userId_idx" ON "StatementReconciliation"("userId");

-- AddForeignKey
ALTER TABLE "StatementReconciliation" ADD CONSTRAINT "StatementReconciliation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatementReconciliation" ADD CONSTRAINT "StatementReconciliation_bankStatementEntryId_fkey" FOREIGN KEY ("bankStatementEntryId") REFERENCES "BankStatementEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatementReconciliation" ADD CONSTRAINT "StatementReconciliation_expenseOccurrenceId_fkey" FOREIGN KEY ("expenseOccurrenceId") REFERENCES "ExpenseOccurrence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
