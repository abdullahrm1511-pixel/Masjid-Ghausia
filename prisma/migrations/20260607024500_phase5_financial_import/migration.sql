-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentObligationType') THEN
    CREATE TYPE "PaymentObligationType" AS ENUM ('ONE_TIME', 'ANNUAL', 'MANUAL');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentObligationStatus') THEN
    CREATE TYPE "PaymentObligationStatus" AS ENUM ('DUE', 'PAID', 'WAIVED', 'MANUAL_CORRECTION');
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PaymentObligation" (
    "id" TEXT NOT NULL,
    "donorProfileId" TEXT NOT NULL,
    "lidnummer" TEXT,
    "obligationType" "PaymentObligationType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "PaymentObligationStatus" NOT NULL DEFAULT 'DUE',
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentObligation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaymentObligation_donorProfileId_idx" ON "PaymentObligation"("donorProfileId");
CREATE INDEX IF NOT EXISTS "PaymentObligation_lidnummer_idx" ON "PaymentObligation"("lidnummer");
CREATE INDEX IF NOT EXISTS "PaymentObligation_status_idx" ON "PaymentObligation"("status");
CREATE INDEX IF NOT EXISTS "PaymentObligation_source_idx" ON "PaymentObligation"("source");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PaymentObligation_donorProfileId_fkey'
  ) THEN
    ALTER TABLE "PaymentObligation"
    ADD CONSTRAINT "PaymentObligation_donorProfileId_fkey"
    FOREIGN KEY ("donorProfileId") REFERENCES "DonorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
