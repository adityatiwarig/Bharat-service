/*
  Warnings:

  - You are about to drop the `Complaint` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ComplaintUpdate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Rating` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Ward` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Worker` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('citizen', 'worker', 'admin', 'leader');

-- CreateEnum
CREATE TYPE "complaint_status" AS ENUM ('received', 'assigned', 'in_progress', 'resolved', 'rejected');

-- CreateEnum
CREATE TYPE "complaint_priority" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "complaint_category" AS ENUM ('pothole', 'streetlight', 'water', 'waste', 'sanitation', 'drainage', 'sewer', 'encroachment', 'other');

-- DropForeignKey
ALTER TABLE "Complaint" DROP CONSTRAINT "Complaint_assigned_worker_id_fkey";

-- DropForeignKey
ALTER TABLE "Complaint" DROP CONSTRAINT "Complaint_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Complaint" DROP CONSTRAINT "Complaint_ward_id_fkey";

-- DropForeignKey
ALTER TABLE "ComplaintUpdate" DROP CONSTRAINT "ComplaintUpdate_complaint_id_fkey";

-- DropForeignKey
ALTER TABLE "ComplaintUpdate" DROP CONSTRAINT "ComplaintUpdate_updated_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Rating" DROP CONSTRAINT "Rating_complaint_id_fkey";

-- DropForeignKey
ALTER TABLE "Worker" DROP CONSTRAINT "Worker_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Worker" DROP CONSTRAINT "Worker_ward_id_fkey";

-- DropTable
DROP TABLE "Complaint";

-- DropTable
DROP TABLE "ComplaintUpdate";

-- DropTable
DROP TABLE "Rating";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "Ward";

-- DropTable
DROP TABLE "Worker";

-- DropEnum
DROP TYPE "ComplaintCategory";

-- DropEnum
DROP TYPE "ComplaintPriority";

-- DropEnum
DROP TYPE "ComplaintStatus";

-- DropEnum
DROP TYPE "UserRole";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'citizen',
    "phone" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wards" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Delhi',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "ward_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tracking_code" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "ward_id" INTEGER NOT NULL,
    "assigned_worker_id" UUID,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "category" "complaint_category" NOT NULL DEFAULT 'other',
    "status" "complaint_status" NOT NULL DEFAULT 'received',
    "priority" "complaint_priority" NOT NULL DEFAULT 'medium',
    "risk_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "sentiment_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "frequency_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "hotspot_count" INTEGER NOT NULL DEFAULT 0,
    "is_hotspot" BOOLEAN NOT NULL DEFAULT false,
    "is_spam" BOOLEAN NOT NULL DEFAULT false,
    "spam_reasons" JSONB NOT NULL DEFAULT '[]',
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "department_message" TEXT,
    "location_address" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "resolved_at" TIMESTAMPTZ(6),
    "resolution_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_updates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "complaint_id" UUID NOT NULL,
    "status" "complaint_status" NOT NULL,
    "note" TEXT,
    "updated_by_user_id" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ratings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "complaint_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "wards_name_key" ON "wards"("name");

-- CreateIndex
CREATE UNIQUE INDEX "workers_user_id_key" ON "workers"("user_id");

-- CreateIndex
CREATE INDEX "workers_ward_id_idx" ON "workers"("ward_id");

-- CreateIndex
CREATE UNIQUE INDEX "complaints_tracking_code_key" ON "complaints"("tracking_code");

-- CreateIndex
CREATE INDEX "complaints_ward_id_priority_status_created_at_idx" ON "complaints"("ward_id", "priority", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "complaints_status_created_at_idx" ON "complaints"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "complaints_user_id_created_at_idx" ON "complaints"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "complaint_updates_complaint_id_updated_at_idx" ON "complaint_updates"("complaint_id", "updated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ratings_complaint_id_key" ON "ratings"("complaint_id");

-- AddForeignKey
ALTER TABLE "workers" ADD CONSTRAINT "workers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workers" ADD CONSTRAINT "workers_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "wards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "wards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_assigned_worker_id_fkey" FOREIGN KEY ("assigned_worker_id") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_updates" ADD CONSTRAINT "complaint_updates_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_updates" ADD CONSTRAINT "complaint_updates_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
