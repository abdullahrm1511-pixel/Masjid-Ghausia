DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FamilyMemberStatus') THEN
    CREATE TYPE "FamilyMemberStatus" AS ENUM (
      'ACTIVE_DEPENDENT',
      'UNDER_18',
      'ADULT_NEEDS_REGISTRATION',
      'REGISTERED_SEPARATELY',
      'NOT_A_MEMBER',
      'DECEASED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AdultChildTransitionStatus') THEN
    CREATE TYPE "AdultChildTransitionStatus" AS ENUM (
      'NEEDS_REGISTRATION',
      'INVITED',
      'REGISTERED',
      'DISMISSED'
    );
  END IF;
END $$;

ALTER TABLE "FamilyMember"
  ADD COLUMN IF NOT EXISTS "status" "FamilyMemberStatus" NOT NULL DEFAULT 'ACTIVE_DEPENDENT';

UPDATE "FamilyMember"
SET "status" =
  CASE
    WHEN "type" = 'CHILD' AND "dateOfBirth" <= (CURRENT_DATE - INTERVAL '18 years') THEN 'ADULT_NEEDS_REGISTRATION'::"FamilyMemberStatus"
    WHEN "type" = 'CHILD' THEN 'UNDER_18'::"FamilyMemberStatus"
    WHEN "isActive" = false THEN 'NOT_A_MEMBER'::"FamilyMemberStatus"
    ELSE 'ACTIVE_DEPENDENT'::"FamilyMemberStatus"
  END
WHERE "status" = 'ACTIVE_DEPENDENT';

CREATE TABLE IF NOT EXISTS "AdultChildTransition" (
  "id" TEXT NOT NULL,
  "familyMemberId" TEXT NOT NULL,
  "previousDonorProfileId" TEXT NOT NULL,
  "newDonorProfileId" TEXT,
  "status" "AdultChildTransitionStatus" NOT NULL DEFAULT 'NEEDS_REGISTRATION',
  "turned18At" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "resolvedById" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdultChildTransition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdultChildTransition_familyMemberId_key" ON "AdultChildTransition"("familyMemberId");
CREATE INDEX IF NOT EXISTS "AdultChildTransition_previousDonorProfileId_idx" ON "AdultChildTransition"("previousDonorProfileId");
CREATE INDEX IF NOT EXISTS "AdultChildTransition_newDonorProfileId_idx" ON "AdultChildTransition"("newDonorProfileId");
CREATE INDEX IF NOT EXISTS "AdultChildTransition_status_idx" ON "AdultChildTransition"("status");
CREATE INDEX IF NOT EXISTS "AdultChildTransition_turned18At_idx" ON "AdultChildTransition"("turned18At");
CREATE INDEX IF NOT EXISTS "FamilyMember_status_idx" ON "FamilyMember"("status");
CREATE INDEX IF NOT EXISTS "FamilyMember_type_status_idx" ON "FamilyMember"("type", "status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdultChildTransition_familyMemberId_fkey') THEN
    ALTER TABLE "AdultChildTransition"
      ADD CONSTRAINT "AdultChildTransition_familyMemberId_fkey"
      FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdultChildTransition_previousDonorProfileId_fkey') THEN
    ALTER TABLE "AdultChildTransition"
      ADD CONSTRAINT "AdultChildTransition_previousDonorProfileId_fkey"
      FOREIGN KEY ("previousDonorProfileId") REFERENCES "DonorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdultChildTransition_newDonorProfileId_fkey') THEN
    ALTER TABLE "AdultChildTransition"
      ADD CONSTRAINT "AdultChildTransition_newDonorProfileId_fkey"
      FOREIGN KEY ("newDonorProfileId") REFERENCES "DonorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdultChildTransition_resolvedById_fkey') THEN
    ALTER TABLE "AdultChildTransition"
      ADD CONSTRAINT "AdultChildTransition_resolvedById_fkey"
      FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "AdultChildTransition" (
  "id",
  "familyMemberId",
  "previousDonorProfileId",
  "status",
  "turned18At",
  "notes",
  "createdAt",
  "updatedAt"
)
SELECT
  'act_' || substr(md5(fm."id" || CURRENT_TIMESTAMP::text), 1, 24),
  fm."id",
  fm."donorProfileId",
  'NEEDS_REGISTRATION'::"AdultChildTransitionStatus",
  fm."dateOfBirth" + INTERVAL '18 years',
  'Automatisch aangemaakt voor bestaand 18+ familielid.',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "FamilyMember" fm
WHERE fm."type" = 'CHILD'
  AND fm."status" = 'ADULT_NEEDS_REGISTRATION'
  AND NOT EXISTS (
    SELECT 1 FROM "AdultChildTransition" act WHERE act."familyMemberId" = fm."id"
  );
