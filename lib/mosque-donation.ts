type PaymentLike = {
  source: string | null;
  lidnummer: string | null;
  notes: string | null;
  adminNote: string | null;
  amountCents: number;
  status: string;
  dueDate: Date | null;
  paidAt: Date | null;
  createdAt: Date;
};

export function isMosqueDonation(item: Pick<PaymentLike, "source" | "lidnummer" | "notes" | "adminNote">) {
  const text = [item.source, item.lidnummer, item.notes, item.adminNote].filter(Boolean).join(" ");
  return /DONATIE|moskee donatie|maandelijkse moskee/i.test(text);
}

export function mosqueDonationSummary(items: PaymentLike[]) {
  const donationItems = items.filter(isMosqueDonation);
  const dueItems = donationItems.filter((item) => item.status === "DUE" && item.amountCents > 0);
  const paidItems = donationItems.filter((item) => item.status === "PAID" && item.amountCents > 0);
  const latestDue = dueItems[0] ?? null;
  const latestPaid = paidItems[0] ?? null;
  const monthlyAmountCents = latestDue?.amountCents ?? donationItems.find((item) => item.amountCents > 0)?.amountCents ?? 0;
  const dueTotalCents = dueItems.reduce((sum, item) => sum + item.amountCents, 0);
  const paidTotalCents = paidItems.reduce((sum, item) => sum + item.amountCents, 0);

  return {
    items: donationItems,
    monthlyAmountCents,
    dueTotalCents,
    paidTotalCents,
    latestDue,
    latestPaid,
    hasDonation: donationItems.length > 0 || monthlyAmountCents > 0
  };
}
