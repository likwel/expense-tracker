-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "is_recurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recurring_expense_id" INTEGER;

-- CreateTable
CREATE TABLE "recurring_expenses" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "category_id" INTEGER,
    "amount" DECIMAL(15,2) NOT NULL,
    "description" TEXT,
    "frequency" TEXT NOT NULL,
    "day_of_month" INTEGER,
    "day_of_week" INTEGER,
    "day_type" TEXT NOT NULL DEFAULT 'all',
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_holidays" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "country" VARCHAR(5) NOT NULL DEFAULT 'MG',

    CONSTRAINT "public_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurring_expenses_user_id_is_active_idx" ON "recurring_expenses"("user_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "public_holidays_date_key" ON "public_holidays"("date");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recurring_expense_id_fkey" FOREIGN KEY ("recurring_expense_id") REFERENCES "recurring_expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
