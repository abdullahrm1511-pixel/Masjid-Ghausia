CREATE TABLE "FuneralApplication" (
    "id" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "formData" JSONB,
    "signatureData" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FuneralApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FuneralApplication_accessToken_key" ON "FuneralApplication"("accessToken");
CREATE INDEX "FuneralApplication_status_idx" ON "FuneralApplication"("status");
CREATE INDEX "FuneralApplication_createdAt_idx" ON "FuneralApplication"("createdAt");
CREATE INDEX "FuneralApplication_submittedAt_idx" ON "FuneralApplication"("submittedAt");
