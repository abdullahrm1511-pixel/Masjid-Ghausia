CREATE TABLE "IdentityDocument" (
    "id" TEXT NOT NULL,
    "donorProfileId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentityDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IdentityDocument_donorProfileId_key" ON "IdentityDocument"("donorProfileId");
CREATE INDEX "IdentityDocument_donorProfileId_idx" ON "IdentityDocument"("donorProfileId");

ALTER TABLE "IdentityDocument"
ADD CONSTRAINT "IdentityDocument_donorProfileId_fkey"
FOREIGN KEY ("donorProfileId") REFERENCES "DonorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
