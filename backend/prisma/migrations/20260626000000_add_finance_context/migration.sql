-- CreateEnum
CREATE TYPE "FinanceContextQuestionStatus" AS ENUM ('OPEN', 'ANSWERED', 'DISMISSED');

-- CreateTable
CREATE TABLE "FinanceContextRule" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "matchLabel" TEXT NOT NULL,
    "displayLabel" TEXT NOT NULL,
    "category" TEXT,
    "motive" TEXT NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceContextRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceContextQuestion" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "matchLabel" TEXT NOT NULL,
    "displayLabel" TEXT NOT NULL,
    "sampleAmount" DECIMAL(12,2),
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "status" "FinanceContextQuestionStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceContextQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinanceContextRule_userId_matchLabel_key" ON "FinanceContextRule"("userId", "matchLabel");

-- CreateIndex
CREATE INDEX "FinanceContextRule_userId_idx" ON "FinanceContextRule"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceContextQuestion_userId_matchLabel_key" ON "FinanceContextQuestion"("userId", "matchLabel");

-- CreateIndex
CREATE INDEX "FinanceContextQuestion_userId_status_idx" ON "FinanceContextQuestion"("userId", "status");

-- AddForeignKey
ALTER TABLE "FinanceContextRule" ADD CONSTRAINT "FinanceContextRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceContextQuestion" ADD CONSTRAINT "FinanceContextQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
