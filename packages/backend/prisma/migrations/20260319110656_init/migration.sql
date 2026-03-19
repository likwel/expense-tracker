-- AlterTable
ALTER TABLE "incomes" ADD COLUMN     "is_recurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recurring_income_id" INTEGER;

-- CreateTable
CREATE TABLE "recurring_incomes" (
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

    CONSTRAINT "recurring_incomes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurring_incomes_user_id_is_active_idx" ON "recurring_incomes"("user_id", "is_active");

-- AddForeignKey
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_recurring_income_id_fkey" FOREIGN KEY ("recurring_income_id") REFERENCES "recurring_incomes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_incomes" ADD CONSTRAINT "recurring_incomes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_incomes" ADD CONSTRAINT "recurring_incomes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
