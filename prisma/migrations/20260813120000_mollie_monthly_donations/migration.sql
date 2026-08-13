ALTER TABLE "SurveyDonor"
  ADD COLUMN "mollieCustomerId" TEXT,
  ADD COLUMN "mollieMandateId" TEXT,
  ADD COLUMN "mollieSubscriptionId" TEXT,
  ADD COLUMN "subscriptionStartedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "SurveyDonor_mollieCustomerId_key" ON "SurveyDonor"("mollieCustomerId");
CREATE UNIQUE INDEX "SurveyDonor_mollieSubscriptionId_key" ON "SurveyDonor"("mollieSubscriptionId");

CREATE TABLE "MonthlyDonationPayment" (
  "id" TEXT NOT NULL,
  "surveyDonorId" TEXT NOT NULL,
  "surveyResponseId" TEXT,
  "molliePaymentId" TEXT NOT NULL,
  "mollieSubscriptionId" TEXT,
  "amountCents" INTEGER NOT NULL,
  "sequenceType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "checkoutUrl" TEXT,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MonthlyDonationPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MonthlyDonationPayment_molliePaymentId_key" ON "MonthlyDonationPayment"("molliePaymentId");
CREATE INDEX "MonthlyDonationPayment_surveyDonorId_idx" ON "MonthlyDonationPayment"("surveyDonorId");
CREATE INDEX "MonthlyDonationPayment_surveyResponseId_idx" ON "MonthlyDonationPayment"("surveyResponseId");
CREATE INDEX "MonthlyDonationPayment_mollieSubscriptionId_idx" ON "MonthlyDonationPayment"("mollieSubscriptionId");
CREATE INDEX "MonthlyDonationPayment_status_idx" ON "MonthlyDonationPayment"("status");
CREATE INDEX "MonthlyDonationPayment_createdAt_idx" ON "MonthlyDonationPayment"("createdAt");

ALTER TABLE "MonthlyDonationPayment" ADD CONSTRAINT "MonthlyDonationPayment_surveyDonorId_fkey" FOREIGN KEY ("surveyDonorId") REFERENCES "SurveyDonor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MonthlyDonationPayment" ADD CONSTRAINT "MonthlyDonationPayment_surveyResponseId_fkey" FOREIGN KEY ("surveyResponseId") REFERENCES "SurveyResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
