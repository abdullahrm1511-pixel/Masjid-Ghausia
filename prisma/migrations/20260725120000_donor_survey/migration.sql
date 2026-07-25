CREATE TABLE "Survey" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "templateKey" TEXT NOT NULL DEFAULT 'DONOR_JOURNEY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SurveyResponse" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Survey_slug_key" ON "Survey"("slug");
CREATE INDEX "Survey_isActive_idx" ON "Survey"("isActive");
CREATE INDEX "Survey_startsAt_idx" ON "Survey"("startsAt");
CREATE INDEX "Survey_endsAt_idx" ON "Survey"("endsAt");
CREATE INDEX "Survey_createdAt_idx" ON "Survey"("createdAt");
CREATE INDEX "SurveyResponse_surveyId_idx" ON "SurveyResponse"("surveyId");
CREATE INDEX "SurveyResponse_email_idx" ON "SurveyResponse"("email");
CREATE INDEX "SurveyResponse_submittedAt_idx" ON "SurveyResponse"("submittedAt");
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
