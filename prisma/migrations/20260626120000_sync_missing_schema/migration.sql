-- CreateEnum
CREATE TYPE "AssemblyType" AS ENUM ('ORDINARY', 'EXTRAORDINARY');

-- CreateEnum
CREATE TYPE "BackupType" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "LegalNoticeDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED_SUCCESS', 'DELIVERED_REFUSED', 'NOT_FOUND');

-- CreateEnum
CREATE TYPE "ProsecutionStatus" AS ENUM ('POLICE_REPORT', 'IN_COURT', 'RECONCILED', 'ARCHIVED_SAVED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "secondary_email" TEXT,
ADD COLUMN     "otp_code" TEXT,
ADD COLUMN     "otp_expiry" TIMESTAMP(3),
ADD COLUMN     "otp_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "otp_locked_until" TIMESTAMP(3),
ADD COLUMN     "requires_password_change" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "lawsuits" ADD COLUMN     "is_at_experts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "expert_office" TEXT,
ADD COLUMN     "expert_name" TEXT,
ADD COLUMN     "expert_file_number" TEXT,
ADD COLUMN     "awarded_compensation" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "judicial_fees" DOUBLE PRECISION DEFAULT 0;

-- AlterTable
ALTER TABLE "court_sessions" ADD COLUMN     "session_type" TEXT NOT NULL DEFAULT 'COURT';

-- AlterTable
ALTER TABLE "prosecutions" ADD COLUMN     "report_number" TEXT;

-- AlterTable (convert status from TEXT to ProsecutionStatus enum)
ALTER TABLE "prosecutions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "prosecutions" ALTER COLUMN "status" TYPE "ProsecutionStatus" USING "status"::"ProsecutionStatus";
ALTER TABLE "prosecutions" ALTER COLUMN "status" SET DEFAULT 'POLICE_REPORT';

-- CreateTable
CREATE TABLE "subsidiary_companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "commercial_register" TEXT,
    "cr_expiry_date" TIMESTAMP(3),
    "tax_card" TEXT,
    "tax_card_expiry_date" TIMESTAMP(3),
    "board_expiry_date" TIMESTAMP(3),
    "capital_paid_details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subsidiary_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assembly_archives" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "type" "AssemblyType" NOT NULL,
    "date_held" TIMESTAMP(3) NOT NULL,
    "file_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assembly_archives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_notices" (
    "id" TEXT NOT NULL,
    "notice_number" TEXT,
    "year" TEXT NOT NULL,
    "bailiff_office" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "opponent_name" TEXT NOT NULL,
    "notice_type" TEXT NOT NULL,
    "submission_date" TIMESTAMP(3) NOT NULL,
    "delivery_status" "LegalNoticeDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "delivery_date" TIMESTAMP(3),
    "follow_up_date" TIMESTAMP(3),
    "assigned_lawyer_id" TEXT NOT NULL,
    "contract_id" TEXT,
    "lawsuit_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "court_lookups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "court_lookups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "police_station_lookups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "police_station_lookups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expert_office_lookups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expert_office_lookups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_logs" (
    "id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "type" "BackupType" NOT NULL,
    "size" TEXT,
    "files_count" INTEGER NOT NULL DEFAULT 1,
    "is_encrypted" BOOLEAN NOT NULL DEFAULT false,
    "file_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backup_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "court_lookups_name_key" ON "court_lookups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "police_station_lookups_name_key" ON "police_station_lookups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "expert_office_lookups_name_key" ON "expert_office_lookups"("name");

-- CreateIndex
CREATE INDEX "assembly_archives_company_id_idx" ON "assembly_archives"("company_id");

-- CreateIndex
CREATE INDEX "legal_notices_assigned_lawyer_id_idx" ON "legal_notices"("assigned_lawyer_id");

-- CreateIndex
CREATE INDEX "legal_notices_contract_id_idx" ON "legal_notices"("contract_id");

-- CreateIndex
CREATE INDEX "legal_notices_lawsuit_id_idx" ON "legal_notices"("lawsuit_id");

-- CreateIndex
CREATE INDEX "legal_notices_delivery_status_follow_up_date_idx" ON "legal_notices"("delivery_status", "follow_up_date");

-- AddForeignKey
ALTER TABLE "assembly_archives" ADD CONSTRAINT "assembly_archives_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "subsidiary_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_notices" ADD CONSTRAINT "legal_notices_assigned_lawyer_id_fkey" FOREIGN KEY ("assigned_lawyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_notices" ADD CONSTRAINT "legal_notices_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_notices" ADD CONSTRAINT "legal_notices_lawsuit_id_fkey" FOREIGN KEY ("lawsuit_id") REFERENCES "lawsuits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
