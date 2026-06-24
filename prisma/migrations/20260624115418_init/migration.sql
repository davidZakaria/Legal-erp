-- CreateEnum
CREATE TYPE "LawsuitStatus" AS ENUM ('UNDER_REVIEW', 'ACTIVE', 'RESERVED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "LegalTaskStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PowerOfAttorneyStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "ExecutionRequestStatus" AS ENUM ('PENDING_BAILIFF', 'EXECUTED');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REIMBURSED');

-- CreateEnum
CREATE TYPE "LegalDocumentCategory" AS ENUM ('CONTRACT_TEMPLATE', 'GAFI_FORM', 'LAWS', 'INTERNAL_MEMO');

-- AlterTable
ALTER TABLE "lawsuits" ADD COLUMN     "archive_number" TEXT,
ADD COLUMN     "client_name" TEXT NOT NULL DEFAULT 'NJD',
ADD COLUMN     "overall_status" "LawsuitStatus" NOT NULL DEFAULT 'UNDER_REVIEW',
ADD COLUMN     "registration_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "lawsuit_attachments" (
    "id" TEXT NOT NULL,
    "lawsuit_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lawsuit_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "deadline" TIMESTAMP(3) NOT NULL,
    "status" "LegalTaskStatus" NOT NULL DEFAULT 'PENDING',
    "assigned_lawyer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "power_of_attorneys" (
    "id" TEXT NOT NULL,
    "poa_number" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expiry_date" TIMESTAMP(3),
    "status" "PowerOfAttorneyStatus" NOT NULL DEFAULT 'ACTIVE',
    "assigned_lawyer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "power_of_attorneys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_requests" (
    "id" TEXT NOT NULL,
    "lawsuit_id" TEXT NOT NULL,
    "execution_type" TEXT NOT NULL,
    "status" "ExecutionRequestStatus" NOT NULL DEFAULT 'PENDING_BAILIFF',
    "assigned_lawyer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "execution_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "receipt_url" TEXT,
    "lawsuit_id" TEXT,
    "requested_by_id" TEXT NOT NULL,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "LegalDocumentCategory" NOT NULL,
    "file_url" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by_id" TEXT NOT NULL,

    CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lawsuit_attachments_lawsuit_id_idx" ON "lawsuit_attachments"("lawsuit_id");

-- CreateIndex
CREATE INDEX "legal_tasks_deadline_status_idx" ON "legal_tasks"("deadline", "status");

-- CreateIndex
CREATE INDEX "expenses_date_status_idx" ON "expenses"("date", "status");

-- CreateIndex
CREATE INDEX "expenses_requested_by_id_idx" ON "expenses"("requested_by_id");

-- CreateIndex
CREATE INDEX "legal_documents_category_idx" ON "legal_documents"("category");

-- AddForeignKey
ALTER TABLE "lawsuit_attachments" ADD CONSTRAINT "lawsuit_attachments_lawsuit_id_fkey" FOREIGN KEY ("lawsuit_id") REFERENCES "lawsuits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_tasks" ADD CONSTRAINT "legal_tasks_assigned_lawyer_id_fkey" FOREIGN KEY ("assigned_lawyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "power_of_attorneys" ADD CONSTRAINT "power_of_attorneys_assigned_lawyer_id_fkey" FOREIGN KEY ("assigned_lawyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_requests" ADD CONSTRAINT "execution_requests_lawsuit_id_fkey" FOREIGN KEY ("lawsuit_id") REFERENCES "lawsuits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_requests" ADD CONSTRAINT "execution_requests_assigned_lawyer_id_fkey" FOREIGN KEY ("assigned_lawyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_lawsuit_id_fkey" FOREIGN KEY ("lawsuit_id") REFERENCES "lawsuits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_documents" ADD CONSTRAINT "legal_documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
