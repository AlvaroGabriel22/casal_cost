-- CreateEnum
CREATE TYPE "InvestmentScope" AS ENUM ('INDIVIDUAL', 'COUPLE');

-- CreateTable
CREATE TABLE "InvestmentContribution" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "coupleId" UUID,
    "scope" "InvestmentScope" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "referenceMonth" DATE NOT NULL,
    "contributedAt" DATE,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "InvestmentContribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvestmentContribution_userId_idx" ON "InvestmentContribution"("userId");

-- CreateIndex
CREATE INDEX "InvestmentContribution_coupleId_idx" ON "InvestmentContribution"("coupleId");

-- CreateIndex
CREATE INDEX "InvestmentContribution_referenceMonth_idx" ON "InvestmentContribution"("referenceMonth");

-- CreateIndex
CREATE INDEX "InvestmentContribution_scope_idx" ON "InvestmentContribution"("scope");

-- CreateIndex
CREATE INDEX "InvestmentContribution_userId_referenceMonth_idx" ON "InvestmentContribution"("userId", "referenceMonth");

-- CreateIndex
CREATE INDEX "InvestmentContribution_coupleId_referenceMonth_idx" ON "InvestmentContribution"("coupleId", "referenceMonth");

-- AddForeignKey
ALTER TABLE "InvestmentContribution" ADD CONSTRAINT "InvestmentContribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentContribution" ADD CONSTRAINT "InvestmentContribution_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE SET NULL ON UPDATE CASCADE;
