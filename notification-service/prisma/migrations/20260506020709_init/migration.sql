-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('pending', 'sent', 'failed');

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_merchant_id_idx" ON "notifications"("merchant_id");

-- CreateIndex
CREATE INDEX "notifications_transaction_id_idx" ON "notifications"("transaction_id");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");
