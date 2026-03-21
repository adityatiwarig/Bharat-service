-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('citizen', 'worker', 'admin', 'leader');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('received', 'assigned', 'in_progress', 'resolved', 'rejected');

-- CreateEnum
CREATE TYPE "ComplaintPriority" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "ComplaintCategory" AS ENUM ('pothole', 'streetlight', 'water', 'waste', 'sanitation', 'drainage', 'sewer', 'encroachment', 'other');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'citizen',
    "phone" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ward" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Delhi',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worker" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "ward_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tracking_code" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "ward_id" INTEGER NOT NULL,
    "assigned_worker_id" UUID,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "category" "ComplaintCategory" NOT NULL DEFAULT 'other',
    "status" "ComplaintStatus" NOT NULL DEFAULT 'received',
    "priority" "ComplaintPriority" NOT NULL DEFAULT 'medium',
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

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplaintUpdate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "complaint_id" UUID NOT NULL,
    "status" "ComplaintStatus" NOT NULL,
    "note" TEXT,
    "updated_by_user_id" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplaintUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "complaint_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Ward_name_key" ON "Ward"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_user_id_key" ON "Worker"("user_id");

-- CreateIndex
CREATE INDEX "Worker_ward_id_idx" ON "Worker"("ward_id");

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_tracking_code_key" ON "Complaint"("tracking_code");

-- CreateIndex
CREATE INDEX "Complaint_ward_id_priority_status_created_at_idx" ON "Complaint"("ward_id", "priority", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "Complaint_status_created_at_idx" ON "Complaint"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "Complaint_user_id_created_at_idx" ON "Complaint"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ComplaintUpdate_complaint_id_updated_at_idx" ON "ComplaintUpdate"("complaint_id", "updated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Rating_complaint_id_key" ON "Rating"("complaint_id");

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "Ward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "Ward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_assigned_worker_id_fkey" FOREIGN KEY ("assigned_worker_id") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintUpdate" ADD CONSTRAINT "ComplaintUpdate_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintUpdate" ADD CONSTRAINT "ComplaintUpdate_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
