CREATE TABLE "MonthlyDonationAgreement" (
  "id" TEXT NOT NULL, "agreementNumber" TEXT NOT NULL, "surveyDonorId" TEXT NOT NULL, "surveyResponseId" TEXT NOT NULL,
  "termsVersion" TEXT NOT NULL, "termsText" TEXT NOT NULL, "signerName" TEXT NOT NULL, "amountCents" INTEGER NOT NULL,
  "mandateConsent" BOOLEAN NOT NULL, "termsAccepted" BOOLEAN NOT NULL, "signatureAccepted" BOOLEAN NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL, "ipAddress" TEXT, "userAgent" TEXT, "creditorLegalName" TEXT NOT NULL,
  "creditorIdentifier" TEXT NOT NULL, "creditorAddress" TEXT NOT NULL, "creditorEmail" TEXT NOT NULL,
  "mollieCustomerId" TEXT, "mollieMandateId" TEXT, "mollieSubscriptionId" TEXT, "status" TEXT NOT NULL DEFAULT 'PENDING_MOLLIE',
  "cancelledAt" TIMESTAMP(3), "pdfData" BYTEA, "documentSha256" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "MonthlyDonationAgreement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MonthlyDonationAgreement_agreementNumber_key" ON "MonthlyDonationAgreement"("agreementNumber");
CREATE UNIQUE INDEX "MonthlyDonationAgreement_surveyResponseId_key" ON "MonthlyDonationAgreement"("surveyResponseId");
CREATE INDEX "MonthlyDonationAgreement_surveyDonorId_idx" ON "MonthlyDonationAgreement"("surveyDonorId");
CREATE INDEX "MonthlyDonationAgreement_status_idx" ON "MonthlyDonationAgreement"("status");
CREATE INDEX "MonthlyDonationAgreement_acceptedAt_idx" ON "MonthlyDonationAgreement"("acceptedAt");
ALTER TABLE "MonthlyDonationAgreement" ADD CONSTRAINT "MonthlyDonationAgreement_surveyDonorId_fkey" FOREIGN KEY ("surveyDonorId") REFERENCES "SurveyDonor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MonthlyDonationAgreement" ADD CONSTRAINT "MonthlyDonationAgreement_surveyResponseId_fkey" FOREIGN KEY ("surveyResponseId") REFERENCES "SurveyResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
