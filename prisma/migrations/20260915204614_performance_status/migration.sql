-- CreateEnum
CREATE TYPE "PerformanceStatus" AS ENUM ('ON_TRACK', 'NEEDS_ATTENTION', 'LEAD_FLAGGED', 'AT_RISK', 'NEW_JOINER');

-- AlterTable
ALTER TABLE "EmployeeProfile" ADD COLUMN     "status" "PerformanceStatus",
ADD COLUMN     "statusReason" TEXT,
ADD COLUMN     "statusSetAt" TIMESTAMP(3),
ADD COLUMN     "statusSetById" TEXT;

-- CreateTable
CREATE TABLE "StatusChange" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PerformanceStatus" NOT NULL,
    "reason" TEXT,
    "setById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StatusChange_userId_createdAt_idx" ON "StatusChange"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "StatusChange" ADD CONSTRAINT "StatusChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusChange" ADD CONSTRAINT "StatusChange_setById_fkey" FOREIGN KEY ("setById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
