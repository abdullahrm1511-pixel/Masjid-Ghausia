export type PricingConfig = {
  annualIndividual18Plus: number;
  annualSingleParent: number;
  annualFamily: number;
  paymentWindowStartMonth: number;
  paymentWindowStartDay: number;
  paymentWindowEndMonth: number;
  paymentWindowEndDay: number;
  monthlyPenaltyAfterWindow: number;
  oneTimeBrackets: Array<{
    minAge: number;
    maxAge: number | null;
    amount: number;
  }>;
};

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  annualIndividual18Plus: 72,
  annualSingleParent: 100,
  annualFamily: 144,
  paymentWindowStartMonth: 1,
  paymentWindowStartDay: 1,
  paymentWindowEndMonth: 3,
  paymentWindowEndDay: 31,
  monthlyPenaltyAfterWindow: 5,
  oneTimeBrackets: [
    { minAge: 0, maxAge: 18, amount: 0 },
    { minAge: 19, maxAge: 20, amount: 150 },
    { minAge: 21, maxAge: 25, amount: 300 },
    { minAge: 26, maxAge: 30, amount: 550 },
    { minAge: 31, maxAge: 35, amount: 950 },
    { minAge: 36, maxAge: 40, amount: 1250 },
    { minAge: 41, maxAge: 45, amount: 1650 },
    { minAge: 46, maxAge: 50, amount: 2050 },
    { minAge: 51, maxAge: 55, amount: 4000 },
    { minAge: 56, maxAge: 60, amount: 5000 },
    { minAge: 61, maxAge: null, amount: 6000 }
  ]
};

export const PRICING_CONFIG_KEY = "pricing.rules";
