CREATE TABLE "FuneralApplicationDocument" (
    "id" TEXT NOT NULL,
    "funeralApplicationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FuneralApplicationDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FuneralApplicationDocument_funeralApplicationId_kind_key" ON "FuneralApplicationDocument"("funeralApplicationId", "kind");
CREATE INDEX "FuneralApplicationDocument_funeralApplicationId_idx" ON "FuneralApplicationDocument"("funeralApplicationId");
CREATE INDEX "FuneralApplicationDocument_kind_idx" ON "FuneralApplicationDocument"("kind");
ALTER TABLE "FuneralApplicationDocument" ADD CONSTRAINT "FuneralApplicationDocument_funeralApplicationId_fkey" FOREIGN KEY ("funeralApplicationId") REFERENCES "FuneralApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
