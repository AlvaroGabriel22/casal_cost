CREATE TABLE "ExpenseOccurrencePayment" (
    "id" UUID NOT NULL,
    "occurrenceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "paymentDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseOccurrencePayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExpenseOccurrencePayment_occurrenceId_userId_key"
ON "ExpenseOccurrencePayment"("occurrenceId", "userId");

CREATE INDEX "ExpenseOccurrencePayment_userId_idx"
ON "ExpenseOccurrencePayment"("userId");

CREATE INDEX "ExpenseOccurrencePayment_status_idx"
ON "ExpenseOccurrencePayment"("status");

ALTER TABLE "ExpenseOccurrencePayment"
ADD CONSTRAINT "ExpenseOccurrencePayment_occurrenceId_fkey"
FOREIGN KEY ("occurrenceId") REFERENCES "ExpenseOccurrence"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExpenseOccurrencePayment"
ADD CONSTRAINT "ExpenseOccurrencePayment_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
