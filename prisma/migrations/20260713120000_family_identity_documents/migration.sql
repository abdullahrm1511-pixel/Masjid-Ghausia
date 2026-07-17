ALTER TABLE "IdentityDocument"
ALTER COLUMN "donorProfileId" DROP NOT NULL;

ALTER TABLE "IdentityDocument"
ADD COLUMN "familyMemberId" TEXT;

CREATE UNIQUE INDEX "IdentityDocument_familyMemberId_key" ON "IdentityDocument"("familyMemberId");
CREATE INDEX "IdentityDocument_familyMemberId_idx" ON "IdentityDocument"("familyMemberId");

ALTER TABLE "IdentityDocument"
ADD CONSTRAINT "IdentityDocument_familyMemberId_fkey"
FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IdentityDocument"
ADD CONSTRAINT "IdentityDocument_owner_check"
CHECK (
  ("donorProfileId" IS NOT NULL AND "familyMemberId" IS NULL)
  OR
  ("donorProfileId" IS NULL AND "familyMemberId" IS NOT NULL)
);
