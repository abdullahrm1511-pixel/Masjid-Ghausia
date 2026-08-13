import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function wrap(text: string, max = 92) { const words = text.split(/\s+/); const lines: string[] = []; let line = ""; for (const word of words) { if (`${line} ${word}`.trim().length > max) { lines.push(line); line = word; } else line = `${line} ${word}`.trim(); } if (line) lines.push(line); return lines; }

export async function monthlyAgreementPdf(a: { agreementNumber: string; termsText: string; signerName: string; acceptedAt: Date; email: string; phone: string; amountCents: number; mollieCustomerId?: string | null; mollieMandateId?: string | null; mollieSubscriptionId?: string | null }) {
  const pdf = await PDFDocument.create(); const font = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]); let y = 800;
  const write = (text: string, size = 10, isBold = false) => { for (const line of wrap(text, size >= 14 ? 65 : 92)) { if (y < 55) { page = pdf.addPage([595, 842]); y = 800; } page.drawText(line, { x: 48, y, size, font: isBold ? bold : font, color: rgb(.08,.23,.21) }); y -= size + 5; } };
  write("Doorlopende SEPA-incassomachtiging", 18, true); write("Maandelijkse donatie aan Masjid Ghausia", 14, true); y -= 10;
  write(`Machtigingsnummer: ${a.agreementNumber}`, 10, true); write(`Donateur: ${a.signerName}`); write(`E-mail: ${a.email}`); write(`Mobiel: ${a.phone}`); write(`Maandbedrag: € ${(a.amountCents / 100).toFixed(2).replace(".", ",")}`); write(`Digitaal ondertekend op: ${a.acceptedAt.toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" })}`);
  if (a.mollieCustomerId) write(`Mollie Customer: ${a.mollieCustomerId}`); if (a.mollieMandateId) write(`Mollie Mandate: ${a.mollieMandateId}`); if (a.mollieSubscriptionId) write(`Mollie Subscription: ${a.mollieSubscriptionId}`);
  y -= 14; for (const paragraph of a.termsText.split(/\n+/).filter(Boolean)) { write(paragraph, paragraph === paragraph.toUpperCase() ? 11 : 9, paragraph === paragraph.toUpperCase()); y -= 5; }
  y -= 12; write(`Digitale ondertekening: ${a.signerName}`, 11, true); write("De donateur heeft de machtiging, voorwaarden en digitale ondertekening afzonderlijk bevestigd.");
  return Buffer.from(await pdf.save());
}
