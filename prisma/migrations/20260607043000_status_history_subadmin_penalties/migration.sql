DO $$ BEGIN
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'REGISTRATION_ADMIN';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "DonorProfile"
  ADD COLUMN IF NOT EXISTS "statusChangedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "activeSince" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "inactiveSince" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deceasedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "statusInternalNote" TEXT,
  ADD COLUMN IF NOT EXISTS "statusDonorMessage" TEXT;

CREATE TABLE IF NOT EXISTS "DonorStatusHistory" (
  "id" TEXT NOT NULL,
  "donorProfileId" TEXT NOT NULL,
  "changedById" TEXT,
  "fromStatus" "DonorStatus",
  "toStatus" "DonorStatus" NOT NULL,
  "internalNote" TEXT NOT NULL,
  "donorMessage" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DonorStatusHistory_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "DonorStatusHistory"
    ADD CONSTRAINT "DonorStatusHistory_donorProfileId_fkey"
    FOREIGN KEY ("donorProfileId") REFERENCES "DonorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "DonorStatusHistory"
    ADD CONSTRAINT "DonorStatusHistory_changedById_fkey"
    FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "DonorStatusHistory_donorProfileId_idx" ON "DonorStatusHistory"("donorProfileId");
CREATE INDEX IF NOT EXISTS "DonorStatusHistory_changedById_idx" ON "DonorStatusHistory"("changedById");
CREATE INDEX IF NOT EXISTS "DonorStatusHistory_toStatus_idx" ON "DonorStatusHistory"("toStatus");
CREATE INDEX IF NOT EXISTS "DonorStatusHistory_createdAt_idx" ON "DonorStatusHistory"("createdAt");

UPDATE "DonorProfile"
SET
  "statusChangedAt" = COALESCE("statusChangedAt", "updatedAt"),
  "activeSince" = CASE WHEN "status" = 'ACTIVE' THEN COALESCE("activeSince", "approvedAt", "updatedAt") ELSE "activeSince" END,
  "inactiveSince" = CASE WHEN "status" IN ('INACTIVE', 'PAYMENT_REQUIRED') THEN COALESCE("inactiveSince", "updatedAt") ELSE "inactiveSince" END,
  "deceasedAt" = CASE WHEN "status" = 'DECEASED' THEN COALESCE("deceasedAt", "updatedAt") ELSE "deceasedAt" END;
