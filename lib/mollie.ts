type MolliePayment = {
  id: string;
  status: string;
  paidAt?: string | null;
  _links: { checkout?: { href: string } };
};

function apiKey() {
  const key = process.env.MOLLIE_API_KEY;
  if (!key) throw new Error("Mollie is nog niet ingesteld. Voeg MOLLIE_API_KEY toe aan de serverinstellingen.");
  return key;
}

async function mollieRequest(path: string, init?: RequestInit): Promise<MolliePayment> {
  const response = await fetch(`https://api.mollie.com/v2${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`Mollie kon de betaling niet verwerken (${response.status}).`);
  return response.json() as Promise<MolliePayment>;
}

export async function createMolliePayment(input: { amountCents: number; description: string; redirectUrl: string; webhookUrl: string; responseId: string }) {
  const payment = await mollieRequest("/payments", {
    method: "POST",
    headers: { "Idempotency-Key": `donation-${input.responseId}` },
    body: JSON.stringify({
      amount: { currency: "EUR", value: (input.amountCents / 100).toFixed(2) },
      description: input.description.slice(0, 255),
      redirectUrl: input.redirectUrl,
      webhookUrl: input.webhookUrl,
      metadata: { surveyResponseId: input.responseId }
    })
  });
  const checkoutUrl = payment._links.checkout?.href;
  if (!checkoutUrl) throw new Error("Mollie heeft geen betaalpagina teruggegeven.");
  return { ...payment, checkoutUrl };
}

export function getMolliePayment(paymentId: string) {
  if (!/^tr_[A-Za-z0-9]+$/.test(paymentId)) throw new Error("Ongeldig Mollie-betaalnummer.");
  return mollieRequest(`/payments/${paymentId}`);
}
