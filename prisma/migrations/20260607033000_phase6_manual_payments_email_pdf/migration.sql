DO $$ BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'CASH', 'EXTERNAL_IDEAL', 'EXTERNAL_SEPA', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "EmailLogStatus" AS ENUM ('PREPARED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "PaymentObligation"
  ADD COLUMN IF NOT EXISTS "updatedByAdminId" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod",
  ADD COLUMN IF NOT EXISTS "adminNote" TEXT;

DO $$ BEGIN
  ALTER TABLE "PaymentObligation"
    ADD CONSTRAINT "PaymentObligation_updatedByAdminId_fkey"
    FOREIGN KEY ("updatedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "EmailTemplate" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "bodyHtml" TEXT NOT NULL,
  "bodyText" TEXT,
  "availablePlaceholders" JSONB NOT NULL,
  "isSystem" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmailLog" (
  "id" TEXT NOT NULL,
  "templateKey" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "bodyHtml" TEXT NOT NULL,
  "bodyText" TEXT,
  "status" "EmailLogStatus" NOT NULL DEFAULT 'PREPARED',
  "entityType" TEXT,
  "entityId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailTemplate_key_key" ON "EmailTemplate"("key");
CREATE INDEX IF NOT EXISTS "EmailTemplate_key_idx" ON "EmailTemplate"("key");
CREATE INDEX IF NOT EXISTS "EmailLog_templateKey_idx" ON "EmailLog"("templateKey");
CREATE INDEX IF NOT EXISTS "EmailLog_recipient_idx" ON "EmailLog"("recipient");
CREATE INDEX IF NOT EXISTS "EmailLog_entityType_entityId_idx" ON "EmailLog"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "PaymentObligation_updatedByAdminId_idx" ON "PaymentObligation"("updatedByAdminId");
