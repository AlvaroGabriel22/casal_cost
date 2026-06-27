-- CreateTable
CREATE TABLE "MonthlySalaryOverride" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "referenceMonth" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlySalaryOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthlySalaryOverride_userId_idx" ON "MonthlySalaryOverride"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlySalaryOverride_userId_referenceMonth_key" ON "MonthlySalaryOverride"("userId", "referenceMonth");

-- AddForeignKey
ALTER TABLE "MonthlySalaryOverride" ADD CONSTRAINT "MonthlySalaryOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
