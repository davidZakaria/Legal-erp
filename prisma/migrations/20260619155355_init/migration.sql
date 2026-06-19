-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'LEGAL_MANAGER', 'LAWYER');

-- CreateEnum
CREATE TYPE "CourtSessionStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'LAWYER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_name" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "contractor_name" TEXT NOT NULL,
    "total_value" DECIMAL(15,2) NOT NULL,
    "penalty_clause" TEXT NOT NULL,
    "guarantee_expiry_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gafi_tasks" (
    "id" TEXT NOT NULL,
    "task_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gafi_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lawsuits" (
    "id" TEXT NOT NULL,
    "case_number" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "court_name" TEXT NOT NULL,
    "opponent_name" TEXT NOT NULL,
    "assigned_lawyer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lawsuits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "court_sessions" (
    "id" TEXT NOT NULL,
    "lawsuit_id" TEXT NOT NULL,
    "session_date" TIMESTAMP(3) NOT NULL,
    "required_action" TEXT NOT NULL,
    "status" "CourtSessionStatus" NOT NULL DEFAULT 'PENDING',
    "session_outcome" TEXT,
    "next_session_date" TIMESTAMP(3),
    "is_reminder_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "court_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prosecutions" (
    "id" TEXT NOT NULL,
    "case_number" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "police_station" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "issue_type" TEXT NOT NULL,
    "assigned_lawyer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prosecutions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_timestamp_idx" ON "audit_logs"("user_id", "timestamp");

-- CreateIndex
CREATE INDEX "contracts_guarantee_expiry_date_idx" ON "contracts"("guarantee_expiry_date");

-- CreateIndex
CREATE INDEX "court_sessions_session_date_status_is_reminder_sent_idx" ON "court_sessions"("session_date", "status", "is_reminder_sent");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lawsuits" ADD CONSTRAINT "lawsuits_assigned_lawyer_id_fkey" FOREIGN KEY ("assigned_lawyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_sessions" ADD CONSTRAINT "court_sessions_lawsuit_id_fkey" FOREIGN KEY ("lawsuit_id") REFERENCES "lawsuits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prosecutions" ADD CONSTRAINT "prosecutions_assigned_lawyer_id_fkey" FOREIGN KEY ("assigned_lawyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
