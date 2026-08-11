ALTER TABLE "Survey"
  ADD COLUMN "isDraft" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "thankYouMessage" TEXT,
  ADD COLUMN "notificationEmail" TEXT,
  ADD COLUMN "maxResponses" INTEGER,
  ADD COLUMN "identityMode" TEXT NOT NULL DEFAULT 'REQUIRED';

UPDATE "Survey" SET "isDraft" = false;

CREATE TABLE "SurveyResponseDocument" (
  "id" TEXT NOT NULL,
  "surveyResponseId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurveyResponseDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SurveyResponseDocument_surveyResponseId_idx" ON "SurveyResponseDocument"("surveyResponseId");
CREATE INDEX "SurveyResponseDocument_questionId_idx" ON "SurveyResponseDocument"("questionId");
ALTER TABLE "SurveyResponseDocument" ADD CONSTRAINT "SurveyResponseDocument_surveyResponseId_fkey" FOREIGN KEY ("surveyResponseId") REFERENCES "SurveyResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SurveyMemberAccess" (
  "id" TEXT NOT NULL, "surveyId" TEXT NOT NULL, "donorProfileId" TEXT NOT NULL, "codeHash" TEXT NOT NULL, "tokenHash" TEXT, "expiresAt" TIMESTAMP(3) NOT NULL, "verifiedAt" TIMESTAMP(3), "attempts" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurveyMemberAccess_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SurveyMemberAccess_surveyId_idx" ON "SurveyMemberAccess"("surveyId");
CREATE INDEX "SurveyMemberAccess_donorProfileId_idx" ON "SurveyMemberAccess"("donorProfileId");
CREATE INDEX "SurveyMemberAccess_expiresAt_idx" ON "SurveyMemberAccess"("expiresAt");
ALTER TABLE "SurveyMemberAccess" ADD CONSTRAINT "SurveyMemberAccess_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SurveyMemberAccess" ADD CONSTRAINT "SurveyMemberAccess_donorProfileId_fkey" FOREIGN KEY ("donorProfileId") REFERENCES "DonorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SurveyMemberRequest" (
  "id" TEXT NOT NULL, "surveyId" TEXT NOT NULL, "donorProfileId" TEXT NOT NULL, "requestType" TEXT NOT NULL, "requestedAmountCents" INTEGER, "status" TEXT NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurveyMemberRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SurveyMemberRequest_surveyId_idx" ON "SurveyMemberRequest"("surveyId");
CREATE INDEX "SurveyMemberRequest_donorProfileId_idx" ON "SurveyMemberRequest"("donorProfileId");
CREATE INDEX "SurveyMemberRequest_status_idx" ON "SurveyMemberRequest"("status");
ALTER TABLE "SurveyMemberRequest" ADD CONSTRAINT "SurveyMemberRequest_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SurveyMemberRequest" ADD CONSTRAINT "SurveyMemberRequest_donorProfileId_fkey" FOREIGN KEY ("donorProfileId") REFERENCES "DonorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
