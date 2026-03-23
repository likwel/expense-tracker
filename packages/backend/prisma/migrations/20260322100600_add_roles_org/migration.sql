-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'member', 'viewer');

-- CreateEnum
CREATE TYPE "usage_type" AS ENUM ('personal', 'family', 'business');

-- CreateEnum
CREATE TYPE "org_status" AS ENUM ('active', 'suspended', 'closed');

-- CreateEnum
CREATE TYPE "org_type" AS ENUM ('family', 'business');

-- CreateEnum
CREATE TYPE "member_role" AS ENUM ('founder', 'admin', 'member', 'viewer');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "default_currency" VARCHAR(10) NOT NULL DEFAULT 'MGA',
ADD COLUMN     "role" "user_role" NOT NULL DEFAULT 'member',
ADD COLUMN     "usage_type" "usage_type" NOT NULL DEFAULT 'personal';

-- CreateTable
CREATE TABLE "organizations" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" "org_type" NOT NULL,
    "status" "org_status" NOT NULL DEFAULT 'active',
    "currency" VARCHAR(10) NOT NULL DEFAULT 'MGA',
    "founder_id" INTEGER NOT NULL,
    "description" VARCHAR(500),
    "logo_url" VARCHAR(300),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_members" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" "member_role" NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invited_by" INTEGER,

    CONSTRAINT "org_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "org_members_user_id_idx" ON "org_members"("user_id");

-- CreateIndex
CREATE INDEX "org_members_organization_id_idx" ON "org_members"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "org_members_organization_id_user_id_key" ON "org_members"("organization_id", "user_id");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_founder_id_fkey" FOREIGN KEY ("founder_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
