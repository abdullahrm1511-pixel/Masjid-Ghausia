import { normalizeIban } from "@/lib/iban";
import { type BankDescriptionParseResult } from "@/lib/import/bank-description-parser";

type AiBankDescriptionResult = {
  donorIban?: string;
  payerName?: string;
  paymentTargetName?: string;
  paymentTargetRegistrationNumber?: string;
  contributionYear?: number;
  birthDateText?: string;
  explanation?: string;
  reviewReasons?: string[];
};

function compactSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeRegistrationNumber(value?: string) {
  const match = String(value ?? "").match(/\b(11)\s*[- ]?\s*(\d{3,6})\b/i);
  return match ? `${match[1]}-${match[2]}` : undefined;
}

function asString(value: unknown) {
  const text = compactSpaces(String(value ?? ""));
  return text || undefined;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(asString).filter(Boolean) as string[] : [];
}

function cleanAiResult(value: unknown): AiBankDescriptionResult | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const donorIban = normalizeIban(data.donorIban);
  const contributionYear = Number(data.contributionYear);

  return {
    donorIban: donorIban || undefined,
    payerName: asString(data.payerName),
    paymentTargetName: asString(data.paymentTargetName),
    paymentTargetRegistrationNumber: normalizeRegistrationNumber(asString(data.paymentTargetRegistrationNumber)),
    contributionYear: Number.isInteger(contributionYear) && contributionYear >= 2000 && contributionYear <= 2100 ? contributionYear : undefined,
    birthDateText: asString(data.birthDateText),
    explanation: asString(data.explanation),
    reviewReasons: asStringArray(data.reviewReasons)
  };
}

function shouldUseAi(description: string, parsed: BankDescriptionParseResult) {
  if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_IMPORT_MODEL) return false;
  if (!description.trim()) return false;
  return Boolean(
    parsed.reviewReasons.length ||
      !parsed.lidnummer ||
      !parsed.donorName ||
      !parsed.donorIban ||
      /contributie\s+voor|contri|bijdrage/i.test(description)
  );
}

export async function improveBankDescriptionWithAi(description: string, parsed: BankDescriptionParseResult): Promise<BankDescriptionParseResult> {
  if (!shouldUseAi(description, parsed)) return parsed;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_IMPORT_MODEL,
        response_format: { type: "json_object" },
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "Je leest Nederlandse banktransactie-omschrijvingen voor een moskee ledenadministratie. Geef alleen JSON terug. Verzin geen gegevens. Als iemand contributie voor een ander betaalt, is paymentTargetName/paymentTargetRegistrationNumber de persoon wiens contributie wordt afgelost; payerName is alleen de rekeninghouder/betaler. Controleer IBAN, naam, bedrag, contributiejaar en lidnummer niet inhoudelijk; neem over wat in de omschrijving staat."
          },
          {
            role: "user",
            content: JSON.stringify({
              description,
              currentParserResult: parsed,
              expectedJsonShape: {
                donorIban: "NLxxBANK0123456789 of leeg",
                payerName: "naam van betaler/rekeninghouder of leeg",
                paymentTargetName: "naam van persoon voor wie betaald wordt of leeg",
                paymentTargetRegistrationNumber: "11-000 lidnummer van betalingsdoel of leeg",
                contributionYear: 2026,
                birthDateText: "dd-mm-jjjj/dd.mm.jj of leeg",
                explanation: "korte humane uitleg wat je zeker weet",
                reviewReasons: ["reden waarom handmatige tweede opinie nodig is"]
              }
            })
          }
        ]
      })
    });

    if (!response.ok) return parsed;
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    const ai = cleanAiResult(content ? JSON.parse(content) : null);
    if (!ai) return parsed;

    const reviewReasons = new Set([...parsed.reviewReasons, ...(ai.reviewReasons ?? [])]);
    const explanations = new Set(parsed.explanations);
    if (ai.explanation) explanations.add(`AI: ${ai.explanation}`);

    const paymentTargetRegistrationNumber = parsed.paymentTargetRegistrationNumber ?? ai.paymentTargetRegistrationNumber;
    const paymentTargetName = parsed.paymentTargetName ?? ai.paymentTargetName;
    const payerName = parsed.payerName ?? ai.payerName;

    return {
      ...parsed,
      donorIban: parsed.donorIban ?? ai.donorIban,
      detectedIban: parsed.detectedIban ?? ai.donorIban,
      payerName,
      donorName: paymentTargetName ?? parsed.donorName ?? payerName,
      lidnummer: paymentTargetRegistrationNumber ?? parsed.lidnummer,
      paymentTargetName,
      paymentTargetRegistrationNumber,
      contributionYear: parsed.contributionYear ?? ai.contributionYear,
      birthDateText: parsed.birthDateText ?? ai.birthDateText,
      explanations: [...explanations],
      reviewReasons: [...reviewReasons]
    };
  } catch {
    return {
      ...parsed,
      reviewReasons: [...parsed.reviewReasons, "AI kon deze omschrijving niet betrouwbaar uitlezen; handmatige controle nodig."]
    };
  }
}
