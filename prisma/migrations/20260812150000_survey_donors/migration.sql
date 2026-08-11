ALTER TABLE "SurveyMemberAccess" ALTER COLUMN "donorProfileId" DROP NOT NULL;
ALTER TABLE "SurveyMemberRequest" ALTER COLUMN "donorProfileId" DROP NOT NULL;

CREATE TABLE "SurveyDonor" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "monthlyAmountCents" INTEGER,
  "directDebitConsent" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'PENDING_MOLLIE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SurveyDonor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SurveyDonor_email_key" ON "SurveyDonor"("email");
CREATE INDEX "SurveyDonor_status_idx" ON "SurveyDonor"("status");
CREATE INDEX "SurveyDonor_createdAt_idx" ON "SurveyDonor"("createdAt");

-- Neem eerdere positieve enquête-aanmeldingen mee in de aparte enquêtedonateurslijst.
INSERT INTO "SurveyDonor" ("id", "email", "firstName", "lastName", "phone", "monthlyAmountCents", "directDebitConsent", "status", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text),
  previous."email",
  previous."firstName",
  previous."lastName",
  previous."phone",
  CASE WHEN previous."amount" ~ '^[0-9]+$' THEN previous."amount"::INTEGER ELSE NULL END,
  previous."consent" = 'true',
  'PENDING_MOLLIE',
  previous."submittedAt",
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT ON (lower("email"))
    lower("email") AS "email",
    "firstName",
    "lastName",
    "phone",
    "answers"->>'monthlyAmountCents' AS "amount",
    "answers"->>'directDebitConsent' AS "consent",
    "submittedAt"
  FROM "SurveyResponse"
  WHERE "email" <> '' AND "answers"->>'wantsToBecomeDonor' = 'true'
  ORDER BY lower("email"), "submittedAt" DESC
) AS previous
ON CONFLICT ("email") DO NOTHING;

ALTER TABLE "SurveyMemberAccess" ADD COLUMN "surveyDonorId" TEXT;
ALTER TABLE "SurveyMemberRequest" ADD COLUMN "surveyDonorId" TEXT;
CREATE INDEX "SurveyMemberAccess_surveyDonorId_idx" ON "SurveyMemberAccess"("surveyDonorId");
CREATE INDEX "SurveyMemberRequest_surveyDonorId_idx" ON "SurveyMemberRequest"("surveyDonorId");

ALTER TABLE "SurveyMemberAccess" ADD CONSTRAINT "SurveyMemberAccess_surveyDonorId_fkey" FOREIGN KEY ("surveyDonorId") REFERENCES "SurveyDonor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SurveyMemberRequest" ADD CONSTRAINT "SurveyMemberRequest_surveyDonorId_fkey" FOREIGN KEY ("surveyDonorId") REFERENCES "SurveyDonor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
