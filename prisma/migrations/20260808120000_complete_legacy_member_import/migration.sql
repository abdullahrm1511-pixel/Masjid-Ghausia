ALTER TABLE "DonorProfile"
ADD COLUMN IF NOT EXISTS "middleName" TEXT,
ADD COLUMN IF NOT EXISTS "bsn" TEXT,
ADD COLUMN IF NOT EXISTS "legacyData" JSONB;

ALTER TABLE "FamilyMember"
ADD COLUMN IF NOT EXISTS "middleName" TEXT,
ADD COLUMN IF NOT EXISTS "phone" TEXT,
ADD COLUMN IF NOT EXISTS "email" TEXT,
ADD COLUMN IF NOT EXISTS "maritalStatus" "MaritalStatus",
ADD COLUMN IF NOT EXISTS "legacyRecordStatus" TEXT,
ADD COLUMN IF NOT EXISTS "legacyData" JSONB;

CREATE INDEX IF NOT EXISTS "DonorProfile_bsn_idx" ON "DonorProfile"("bsn");

CREATE TABLE IF NOT EXISTS "LegacyImportArchive" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "workbookData" BYTEA NOT NULL,
    "importedById" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LegacyImportArchive_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LegacyImportArchive_importedAt_idx" ON "LegacyImportArchive"("importedAt");
CREATE INDEX IF NOT EXISTS "LegacyImportArchive_filename_idx" ON "LegacyImportArchive"("filename");
