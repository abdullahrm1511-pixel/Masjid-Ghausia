CREATE TABLE "DonationPayment" (
    "id" TEXT NOT NULL,
    "surveyResponseId" TEXT NOT NULL,
    "molliePaymentId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "checkoutUrl" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DonationPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DonationPayment_surveyResponseId_key" ON "DonationPayment"("surveyResponseId");
CREATE UNIQUE INDEX "DonationPayment_molliePaymentId_key" ON "DonationPayment"("molliePaymentId");
CREATE INDEX "DonationPayment_status_idx" ON "DonationPayment"("status");
CREATE INDEX "DonationPayment_createdAt_idx" ON "DonationPayment"("createdAt");
ALTER TABLE "DonationPayment" ADD CONSTRAINT "DonationPayment_surveyResponseId_fkey" FOREIGN KEY ("surveyResponseId") REFERENCES "SurveyResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
