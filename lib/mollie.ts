export type MolliePayment = {
  id: string;
  status: string;
  paidAt?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
  sequenceType?: string | null;
  amount?: { currency: string; value: string };
  metadata?: Record<string, unknown> | null;
  _links: { checkout?: { href: string } };
};

type MollieCustomer = { id: string; name: string; email: string };
type MollieMandate = { id: string; status: string; method: string };
export type MollieSubscription = { id: string; status: string; customerId: string; nextPaymentDate?: string | null; amount: { currency: string; value: string } };

function apiKey() {
  const key = process.env.MOLLIE_API_KEY;
  if (!key) throw new Error("Mollie is nog niet ingesteld. Voeg MOLLIE_API_KEY toe aan de serverinstellingen.");
  return key;
}

async function mollieRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.mollie.com/v2${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store"
  });
  if (!response.ok) {
    const details = await response.text().catch(() => "");
    console.error(`Mollie API ${response.status} ${path}`, details.slice(0, 1000));
    throw new Error(`Mollie kon de aanvraag niet verwerken (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export async function createMolliePayment(input: { amountCents: number; description: string; redirectUrl: string; webhookUrl: string; responseId: string }) {
  const payment = await mollieRequest<MolliePayment>("/payments", {
    method: "POST",
    headers: { "Idempotency-Key": `donation-${input.responseId}` },
    body: JSON.stringify({ amount: { currency: "EUR", value: (input.amountCents / 100).toFixed(2) }, description: input.description.slice(0, 255), redirectUrl: input.redirectUrl, webhookUrl: input.webhookUrl, metadata: { surveyResponseId: input.responseId } })
  });
  const checkoutUrl = payment._links.checkout?.href;
  if (!checkoutUrl) throw new Error("Mollie heeft geen betaalpagina teruggegeven.");
  return { ...payment, checkoutUrl };
}

export function getMolliePayment(paymentId: string) {
  if (!/^tr_[A-Za-z0-9]+$/.test(paymentId)) throw new Error("Ongeldig Mollie-betaalnummer.");
  return mollieRequest<MolliePayment>(`/payments/${paymentId}`);
}

export function createMollieCustomer(input: { name: string; email: string; donorId: string }) {
  return mollieRequest<MollieCustomer>("/customers", { method: "POST", headers: { "Idempotency-Key": `monthly-donor-${input.donorId}` }, body: JSON.stringify({ name: input.name, email: input.email, metadata: { surveyDonorId: input.donorId } }) });
}

export async function createMollieFirstPayment(input: { customerId: string; amountCents: number; redirectUrl: string; webhookUrl: string; donorId: string; responseId: string }) {
  const payment = await mollieRequest<MolliePayment>(`/customers/${input.customerId}/payments`, {
    method: "POST",
    headers: { "Idempotency-Key": `monthly-first-${input.responseId}` },
    body: JSON.stringify({ amount: { currency: "EUR", value: (input.amountCents / 100).toFixed(2) }, sequenceType: "first", description: "Eerste maanddonatie Masjid Ghausia", redirectUrl: input.redirectUrl, webhookUrl: input.webhookUrl, metadata: { kind: "monthly_donation_first", surveyDonorId: input.donorId, surveyResponseId: input.responseId } })
  });
  const checkoutUrl = payment._links.checkout?.href;
  if (!checkoutUrl) throw new Error("Mollie heeft geen machtigingspagina teruggegeven.");
  return { ...payment, checkoutUrl };
}

export async function listMollieMandates(customerId: string) {
  if (!/^cst_.+$/.test(customerId)) throw new Error("Ongeldig Mollie-klantnummer.");
  const result = await mollieRequest<{ _embedded?: { mandates?: MollieMandate[] } }>(`/customers/${customerId}/mandates`);
  return result._embedded?.mandates ?? [];
}

export function createMollieSubscription(input: { customerId: string; mandateId: string; amountCents: number; startDate: string; webhookUrl: string; donorId: string }) {
  return mollieRequest<MollieSubscription>(`/customers/${input.customerId}/subscriptions`, {
    method: "POST",
    headers: { "Idempotency-Key": `monthly-subscription-${input.donorId}-${input.amountCents}-${input.startDate}` },
    body: JSON.stringify({ amount: { currency: "EUR", value: (input.amountCents / 100).toFixed(2) }, interval: "1 month", startDate: input.startDate, description: `Maanddonatie Masjid Ghausia ${input.donorId.slice(-8)}`, method: "directdebit", mandateId: input.mandateId, webhookUrl: input.webhookUrl, metadata: { kind: "monthly_donation", surveyDonorId: input.donorId } })
  });
}

export function getMollieSubscription(customerId: string, subscriptionId: string) {
  if (!/^cst_.+$/.test(customerId) || !/^sub_.+$/.test(subscriptionId)) throw new Error("Ongeldige Mollie-subscriptie.");
  return mollieRequest<MollieSubscription>(`/customers/${customerId}/subscriptions/${subscriptionId}`);
}

export function cancelMollieSubscription(customerId: string, subscriptionId: string) {
  if (!/^cst_.+$/.test(customerId) || !/^sub_.+$/.test(subscriptionId)) throw new Error("Ongeldige Mollie-subscriptie.");
  return mollieRequest<MollieSubscription>(`/customers/${customerId}/subscriptions/${subscriptionId}`, { method: "DELETE" });
}
