import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/seo";
import { prepareEmailLog } from "@/lib/email/templates";
import { createMollieSubscription, getMolliePayment, listMollieMandates, type MolliePayment } from "@/lib/mollie";

export function nextMonthDate(from = new Date()) {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth();
  const day = from.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 2, 0)).getUTCDate();
  const target = new Date(Date.UTC(year, month + 1, Math.min(day, lastDay)));
  return target.toISOString().slice(0, 10);
}

function centsFromPayment(payment: MolliePayment) {
  const value = Number(payment.amount?.value ?? "0");
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

export async function syncMonthlyMolliePayment(paymentId: string) {
  const payment = await getMolliePayment(paymentId);
  let record = await prisma.monthlyDonationPayment.findUnique({ where: { molliePaymentId: payment.id }, include: { surveyDonor: true, surveyResponse: { include: { survey: true } } } });

  if (!record && payment.subscriptionId) {
    const donor = await prisma.surveyDonor.findUnique({ where: { mollieSubscriptionId: payment.subscriptionId } });
    if (donor) {
      record = await prisma.monthlyDonationPayment.create({
        data: { surveyDonorId: donor.id, molliePaymentId: payment.id, mollieSubscriptionId: payment.subscriptionId, amountCents: centsFromPayment(payment), sequenceType: payment.sequenceType ?? "recurring", status: payment.status, paidAt: payment.status === "paid" && payment.paidAt ? new Date(payment.paidAt) : null },
        include: { surveyDonor: true, surveyResponse: { include: { survey: true } } }
      });
    }
  }
  if (!record) return { payment, donor: null };

  record = await prisma.monthlyDonationPayment.update({
    where: { id: record.id },
    data: { status: payment.status, paidAt: payment.status === "paid" && payment.paidAt ? new Date(payment.paidAt) : null, mollieSubscriptionId: payment.subscriptionId ?? record.mollieSubscriptionId },
    include: { surveyDonor: true, surveyResponse: { include: { survey: true } } }
  });

  const donor = record.surveyDonor;
  if (record.sequenceType === "first" && payment.status === "paid" && donor.mollieCustomerId && !donor.mollieSubscriptionId) {
    const mandates = await listMollieMandates(donor.mollieCustomerId);
    const mandate = mandates.find((item) => item.status === "valid" && item.method === "directdebit") ?? mandates.find((item) => item.status === "pending" || item.status === "valid");
    if (!mandate) {
      await prisma.surveyDonor.update({ where: { id: donor.id }, data: { status: "MANDATE_PENDING" } });
      return { payment, donor };
    }
    const subscription = await createMollieSubscription({ customerId: donor.mollieCustomerId, mandateId: mandate.id, amountCents: donor.monthlyAmountCents!, startDate: nextMonthDate(payment.paidAt ? new Date(payment.paidAt) : new Date()), webhookUrl: absoluteUrl("/api/mollie/webhook"), donorId: donor.id });
    const activated = await prisma.surveyDonor.update({ where: { id: donor.id }, data: { mollieMandateId: mandate.id, mollieSubscriptionId: subscription.id, subscriptionStartedAt: new Date(), status: "ACTIVE", cancelledAt: null } });
    const alreadyMailed = await prisma.emailLog.findFirst({ where: { templateKey: "SURVEY_MEMBERSHIP_ACTIVE", entityType: "SurveyDonor", entityId: donor.id } });
    if (!alreadyMailed) await prepareEmailLog({ templateKey: "SURVEY_MEMBERSHIP_ACTIVE", recipient: donor.email, entityType: "SurveyDonor", entityId: donor.id, data: { naam: `${donor.firstName} ${donor.lastName}`, bedrag: `€ ${(donor.monthlyAmountCents! / 100).toFixed(2).replace(".", ",")}` } });
    if (record.surveyResponse?.survey.notificationEmail) await prepareEmailLog({ templateKey: "ADMIN_NOTIFICATION", recipient: record.surveyResponse.survey.notificationEmail, entityType: "SurveyDonor", entityId: donor.id, data: { naam: "beheerder", organisatie: "Masjid Ghausia", status: `Nieuwe actieve maanddonateur: ${donor.firstName} ${donor.lastName}`, loginlink: absoluteUrl(`/admin/settings/surveys/${record.surveyResponse.survey.id}`), enquete_titel: record.surveyResponse.survey.title, enquete_antwoord: "Mollie-machtiging voltooid" } });
    return { payment, donor: activated };
  }

  return { payment, donor };
}
