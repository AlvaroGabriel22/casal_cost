-- CreateEnum
CREATE TYPE "BankStatementFormat" AS ENUM ('CSV', 'OFX');

-- CreateEnum
CREATE TYPE "DetectedBank" AS ENUM ('NUBANK', 'INTER', 'BRADESCO', 'PICPAY', 'ITAU', 'SANTANDER', 'CAIXA', 'GENERIC');

-- CreateEnum
CREATE TYPE "BankTransactionDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateTable
CREATE TABLE "BankStatementImport" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "bank" "DetectedBank" NOT NULL,
    "format" "BankStatementFormat" NOT NULL,
    "fileName" TEXT NOT NULL,
    "accountLabel" TEXT,
    "lineCount" INTEGER NOT NULL,
    "monthsCovered" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankStatementImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankStatementEntry" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "importId" UUID NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "bank" "DetectedBank" NOT NULL,
    "transactionDate" DATE NOT NULL,
    "referenceMonth" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "direction" "BankTransactionDirection" NOT NULL,
    "category" TEXT,
    "paymentMethod" "PaymentMethod",
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BankStatementEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankStatementImport_userId_createdAt_idx" ON "BankStatementImport"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BankStatementEntry_userId_fingerprint_key" ON "BankStatementEntry"("userId", "fingerprint");

-- CreateIndex
CREATE INDEX "BankStatementEntry_userId_referenceMonth_idx" ON "BankStatementEntry"("userId", "referenceMonth");

-- CreateIndex
CREATE INDEX "BankStatementEntry_userId_bank_referenceMonth_idx" ON "BankStatementEntry"("userId", "bank", "referenceMonth");

-- CreateIndex
CREATE INDEX "BankStatementEntry_importId_idx" ON "BankStatementEntry"("importId");

-- AddForeignKey
ALTER TABLE "BankStatementImport" ADD CONSTRAINT "BankStatementImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementEntry" ADD CONSTRAINT "BankStatementEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementEntry" ADD CONSTRAINT "BankStatementEntry_importId_fkey" FOREIGN KEY ("importId") REFERENCES "BankStatementImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
