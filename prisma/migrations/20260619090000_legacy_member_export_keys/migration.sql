ALTER TABLE "DonorProfile"
  ADD COLUMN IF NOT EXISTS "legacyMemberDetailKey" TEXT,
  ADD COLUMN IF NOT EXISTS "legacyAddressKey" TEXT;

ALTER TABLE "FamilyMember"
  ADD COLUMN IF NOT EXISTS "legacyMemberDetailKey" TEXT,
  ADD COLUMN IF NOT EXISTS "legacyAddressKey" TEXT;

CREATE INDEX IF NOT EXISTS "DonorProfile_legacyMemberDetailKey_idx" ON "DonorProfile"("legacyMemberDetailKey");
CREATE INDEX IF NOT EXISTS "DonorProfile_legacyAddressKey_idx" ON "DonorProfile"("legacyAddressKey");
CREATE INDEX IF NOT EXISTS "FamilyMember_legacyMemberDetailKey_idx" ON "FamilyMember"("legacyMemberDetailKey");
CREATE INDEX IF NOT EXISTS "FamilyMember_legacyAddressKey_idx" ON "FamilyMember"("legacyAddressKey");
