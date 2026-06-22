ALTER TABLE "Expense" ADD COLUMN "paidByUserId" UUID;

ALTER TABLE "Expense"
ADD CONSTRAINT "Expense_paidByUserId_fkey"
FOREIGN KEY ("paidByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Expense_paidByUserId_idx" ON "Expense"("paidByUserId");
