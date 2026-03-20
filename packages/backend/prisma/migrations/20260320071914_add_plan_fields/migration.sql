-- AlterTable
ALTER TABLE "users" ADD COLUMN     "plan" VARCHAR(20) NOT NULL DEFAULT 'free',
ADD COLUMN     "plan_end_at" TIMESTAMP(3),
ADD COLUMN     "plan_start_at" TIMESTAMP(3),
ADD COLUMN     "trial_end_at" TIMESTAMP(3),
ADD COLUMN     "trial_start_at" TIMESTAMP(3);
