DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MembershipMemberRole') THEN
    CREATE TYPE "MembershipMemberRole" AS ENUM ('PRIMARY', 'PARTNER', 'CHILD');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MembershipChangeType') THEN
    CREATE TYPE "MembershipChangeType" AS ENUM ('ADD_PARTNER', 'DIVORCE', 'PARTNER_DECEASED', 'CHILD_CUSTODY_CHANGE', 'PARTNER_OWN_MEMBERSHIP', 'CHILD_TURNING_18');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MembershipChangeStatus') THEN
    CREATE TYPE "MembershipChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "Membership" (
  "id" TEXT NOT NULL,
  "registrationNumber" TEXT NOT NULL,
  "status" "DonorStatus" NOT NULL DEFAULT 'PENDING',
  "primaryDonorProfileId" TEXT,
  "annualPayerDonorProfileId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MembershipMember" (
  "id" TEXT NOT NULL,
  "membershipId" TEXT NOT NULL,
  "donorProfileId" TEXT,
  "familyMemberId" TEXT,
  "role" "MembershipMemberRole" NOT NULL,
  "displayNumber" TEXT,
  "isPrimaryPayer" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "endReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MembershipMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MembershipChangeRequest" (
  "id" TEXT NOT NULL,
  "membershipId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "reviewedById" TEXT,
  "changeType" "MembershipChangeType" NOT NULL,
  "status" "MembershipChangeStatus" NOT NULL DEFAULT 'PENDING',
  "requestedData" JSONB NOT NULL,
  "currentData" JSONB,
  "memberNote" TEXT,
  "adminNote" TEXT,
  "memberMessage" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MembershipChangeRequest_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DonorProfile" ADD COLUMN IF NOT EXISTS "currentMembershipId" TEXT;
ALTER TABLE "PaymentObligation" ADD COLUMN IF NOT EXISTS "membershipId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Membership_registrationNumber_key" ON "Membership"("registrationNumber");
CREATE INDEX IF NOT EXISTS "Membership_status_idx" ON "Membership"("status");
CREATE INDEX IF NOT EXISTS "Membership_primaryDonorProfileId_idx" ON "Membership"("primaryDonorProfileId");
CREATE INDEX IF NOT EXISTS "Membership_annualPayerDonorProfileId_idx" ON "Membership"("annualPayerDonorProfileId");

CREATE UNIQUE INDEX IF NOT EXISTS "MembershipMember_membershipId_donorProfileId_key" ON "MembershipMember"("membershipId", "donorProfileId");
CREATE UNIQUE INDEX IF NOT EXISTS "MembershipMember_membershipId_familyMemberId_key" ON "MembershipMember"("membershipId", "familyMemberId");
CREATE INDEX IF NOT EXISTS "MembershipMember_membershipId_idx" ON "MembershipMember"("membershipId");
CREATE INDEX IF NOT EXISTS "MembershipMember_donorProfileId_idx" ON "MembershipMember"("donorProfileId");
CREATE INDEX IF NOT EXISTS "MembershipMember_familyMemberId_idx" ON "MembershipMember"("familyMemberId");
CREATE INDEX IF NOT EXISTS "MembershipMember_role_idx" ON "MembershipMember"("role");

CREATE INDEX IF NOT EXISTS "MembershipChangeRequest_membershipId_idx" ON "MembershipChangeRequest"("membershipId");
CREATE INDEX IF NOT EXISTS "MembershipChangeRequest_requestedById_idx" ON "MembershipChangeRequest"("requestedById");
CREATE INDEX IF NOT EXISTS "MembershipChangeRequest_reviewedById_idx" ON "MembershipChangeRequest"("reviewedById");
CREATE INDEX IF NOT EXISTS "MembershipChangeRequest_status_idx" ON "MembershipChangeRequest"("status");
CREATE INDEX IF NOT EXISTS "MembershipChangeRequest_changeType_idx" ON "MembershipChangeRequest"("changeType");
CREATE INDEX IF NOT EXISTS "MembershipChangeRequest_submittedAt_idx" ON "MembershipChangeRequest"("submittedAt");

CREATE INDEX IF NOT EXISTS "DonorProfile_currentMembershipId_idx" ON "DonorProfile"("currentMembershipId");
CREATE INDEX IF NOT EXISTS "PaymentObligation_membershipId_idx" ON "PaymentObligation"("membershipId");

INSERT INTO "Membership" ("id", "registrationNumber", "status", "primaryDonorProfileId", "annualPayerDonorProfileId", "createdAt", "updatedAt")
SELECT
  'm_' || "id",
  "registrationNumber",
  "status",
  "id",
  "id",
  "createdAt",
  "updatedAt"
FROM "DonorProfile"
WHERE "registrationNumber" IS NOT NULL
ON CONFLICT ("registrationNumber") DO NOTHING;

UPDATE "DonorProfile"
SET "currentMembershipId" = 'm_' || "id"
WHERE "registrationNumber" IS NOT NULL
  AND "currentMembershipId" IS NULL;

UPDATE "PaymentObligation"
SET "membershipId" = 'm_' || "donorProfileId"
WHERE "membershipId" IS NULL
  AND EXISTS (
    SELECT 1 FROM "Membership" WHERE "Membership"."id" = 'm_' || "PaymentObligation"."donorProfileId"
  );

INSERT INTO "MembershipMember" ("id", "membershipId", "donorProfileId", "role", "displayNumber", "isPrimaryPayer", "isActive", "activeFrom", "createdAt", "updatedAt")
SELECT
  'mm_dp_' || "id",
  'm_' || "id",
  "id",
  'PRIMARY',
  "registrationNumber",
  true,
  true,
  COALESCE("activeSince", "approvedAt", "createdAt"),
  "createdAt",
  "updatedAt"
FROM "DonorProfile"
WHERE "registrationNumber" IS NOT NULL
ON CONFLICT ("membershipId", "donorProfileId") DO NOTHING;

INSERT INTO "MembershipMember" ("id", "membershipId", "familyMemberId", "role", "displayNumber", "isPrimaryPayer", "isActive", "activeFrom", "createdAt", "updatedAt")
SELECT
  'mm_fm_' || fm."id",
  dp."currentMembershipId",
  fm."id",
  CASE WHEN fm."type" = 'PARTNER' THEN 'PARTNER'::"MembershipMemberRole" ELSE 'CHILD'::"MembershipMemberRole" END,
  CASE WHEN fm."type" = 'PARTNER' THEN dp."registrationNumber" || '-P' ELSE dp."registrationNumber" END,
  false,
  fm."isActive",
  fm."createdAt",
  fm."createdAt",
  fm."updatedAt"
FROM "FamilyMember" fm
JOIN "DonorProfile" dp ON dp."id" = fm."donorProfileId"
WHERE dp."currentMembershipId" IS NOT NULL
ON CONFLICT ("membershipId", "familyMemberId") DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Membership_primaryDonorProfileId_fkey') THEN
    ALTER TABLE "Membership"
      ADD CONSTRAINT "Membership_primaryDonorProfileId_fkey"
      FOREIGN KEY ("primaryDonorProfileId") REFERENCES "DonorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Membership_annualPayerDonorProfileId_fkey') THEN
    ALTER TABLE "Membership"
      ADD CONSTRAINT "Membership_annualPayerDonorProfileId_fkey"
      FOREIGN KEY ("annualPayerDonorProfileId") REFERENCES "DonorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DonorProfile_currentMembershipId_fkey') THEN
    ALTER TABLE "DonorProfile"
      ADD CONSTRAINT "DonorProfile_currentMembershipId_fkey"
      FOREIGN KEY ("currentMembershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MembershipMember_membershipId_fkey') THEN
    ALTER TABLE "MembershipMember"
      ADD CONSTRAINT "MembershipMember_membershipId_fkey"
      FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MembershipMember_donorProfileId_fkey') THEN
    ALTER TABLE "MembershipMember"
      ADD CONSTRAINT "MembershipMember_donorProfileId_fkey"
      FOREIGN KEY ("donorProfileId") REFERENCES "DonorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MembershipMember_familyMemberId_fkey') THEN
    ALTER TABLE "MembershipMember"
      ADD CONSTRAINT "MembershipMember_familyMemberId_fkey"
      FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MembershipChangeRequest_membershipId_fkey') THEN
    ALTER TABLE "MembershipChangeRequest"
      ADD CONSTRAINT "MembershipChangeRequest_membershipId_fkey"
      FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MembershipChangeRequest_requestedById_fkey') THEN
    ALTER TABLE "MembershipChangeRequest"
      ADD CONSTRAINT "MembershipChangeRequest_requestedById_fkey"
      FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MembershipChangeRequest_reviewedById_fkey') THEN
    ALTER TABLE "MembershipChangeRequest"
      ADD CONSTRAINT "MembershipChangeRequest_reviewedById_fkey"
      FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentObligation_membershipId_fkey') THEN
    ALTER TABLE "PaymentObligation"
      ADD CONSTRAINT "PaymentObligation_membershipId_fkey"
      FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
