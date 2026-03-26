/*
  Warnings:

  - The `plan` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `plan_id` to the `payment_requests` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "plan_type" AS ENUM ('free', 'pro', 'family', 'business');

-- AlterTable
ALTER TABLE "payment_requests" ADD COLUMN     "plan_id" "plan_type" NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "trial_plan" "plan_type",
DROP COLUMN "plan",
ADD COLUMN     "plan" "plan_type" NOT NULL DEFAULT 'free';
