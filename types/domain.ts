export type SelectOption = {
  label: string;
  value: string;
};

export type PersonCharge = {
  name: string;
  role: "hoofddonateur" | "partner" | "kind";
  age: number;
  oneTimeContribution: number;
  annualContribution: number;
  penaltyContribution: number;
  annualYearsDue?: number;
  annualPaymentWindowLabel?: string;
  oneTimeDeadline?: Date | null;
  oneTimeDaysRemaining?: number | null;
  total: number;
  paymentStatus: "Niet betaald" | "Betaald" | "Kwijtgescholden";
};
