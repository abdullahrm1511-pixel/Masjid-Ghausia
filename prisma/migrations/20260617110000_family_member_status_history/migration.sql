CREATE TABLE IF NOT EXISTS "FamilyMemberStatusHistory" (
  "id" TEXT NOT NULL,
  "familyMemberId" TEXT NOT NULL,
  "donorProfileId" TEXT NOT NULL,
  "changedById" TEXT,
  "fromStatus" TEXT NOT NULL,
  "toStatus" TEXT NOT NULL,
  "internalNote" TEXT NOT NULL,
  "donorMessage" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FamilyMemberStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FamilyMemberStatusHistory_familyMemberId_idx" ON "FamilyMemberStatusHistory"("familyMemberId");
CREATE INDEX IF NOT EXISTS "FamilyMemberStatusHistory_donorProfileId_idx" ON "FamilyMemberStatusHistory"("donorProfileId");
CREATE INDEX IF NOT EXISTS "FamilyMemberStatusHistory_changedById_idx" ON "FamilyMemberStatusHistory"("changedById");
CREATE INDEX IF NOT EXISTS "FamilyMemberStatusHistory_createdAt_idx" ON "FamilyMemberStatusHistory"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FamilyMemberStatusHistory_familyMemberId_fkey'
  ) THEN
    ALTER TABLE "FamilyMemberStatusHistory"
      ADD CONSTRAINT "FamilyMemberStatusHistory_familyMemberId_fkey"
      FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FamilyMemberStatusHistory_donorProfileId_fkey'
  ) THEN
    ALTER TABLE "FamilyMemberStatusHistory"
      ADD CONSTRAINT "FamilyMemberStatusHistory_donorProfileId_fkey"
      FOREIGN KEY ("donorProfileId") REFERENCES "DonorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FamilyMemberStatusHistory_changedById_fkey'
  ) THEN
    ALTER TABLE "FamilyMemberStatusHistory"
      ADD CONSTRAINT "FamilyMemberStatusHistory_changedById_fkey"
      FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
