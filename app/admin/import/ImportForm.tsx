"use client";

import { useActionState } from "react";
import { previewImport, commitImport, type ImportPreviewState, type ImportResultState } from "./actions";
import { formatCurrency, formatDate } from "@/lib/display";
import { formatIban } from "@/lib/iban";

const initialPreview: ImportPreviewState = { rows: [], fileName: "" };
const initialResult: ImportResultState = { created: 0, linked: 0, invalid: 0, review: 0, duplicates: 0 };

function actionLabel(action: string) {
  if (action === "LINK_PAYMENT_TO_EXISTING_DONOR" || action === "DUPLICATE" || action === "POSSIBLE_MATCH") return "Koppelen aan bestaande donateur";
  if (action === "CREATE_IMPORTED_DONOR_AND_PAYMENT" || action === "NEW") return "Nieuwe donateur aanmaken";
  if (action === "DUPLICATE_PAYMENT") return "Dubbele betaling";
  if (action === "INVALID" || action === "INVALID_REQUIRES_REVIEW") return "Ongeldig";
  if (action === "PAYMENT_ONLY_REQUIRES_REVIEW") return "Controle nodig";
  return action;
}

export function ImportForm() {
  const [preview, previewAction, previewPending] = useActionState(previewImport, initialPreview);
  const [result, commitAction, commitPending] = useActionState(commitImport, initialResult);
  const isBankImport = preview.rows.some((row) => row.importMode === "bank-transactions");
  const invalidRows = preview.rows.filter((row) => row.errors.length > 0).length;
  const reviewRows = preview.rows.filter((row) => row.detectedAction === "PAYMENT_ONLY_REQUIRES_REVIEW" || row.reviewReasons.length > 0).length;
  const warningRows = preview.rows.filter((row) => row.errors.length === 0 && row.warnings.length > 0).length;
  const newRows = preview.rows.filter((row) => row.detectedAction === "NEW" || row.detectedAction === "CREATE_IMPORTED_DONOR_AND_PAYMENT").length;
  const linkedRows = preview.rows.filter((row) => Boolean(row.existingDonorId)).length;

  return (
    <div className="mt-6 grid gap-6">
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-emerald-700">Stap 1</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">Bestand kiezen</h2>
          <p className="mt-2 text-sm text-slate-600">Ondersteund: .xlsx, .xls en .csv.</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-emerald-700">Stap 2</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">Preview controleren</h2>
          <p className="mt-2 text-sm text-slate-600">Controleer alleen of de koppeling logisch is.</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-emerald-700">Stap 3</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">Alles verwerken</h2>
          <p className="mt-2 text-sm text-slate-600">Geldige rijen worden automatisch aangemaakt of gekoppeld.</p>
        </div>
      </section>

      <form action={previewAction} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <label>
            Excel- of CSV-bestand
            <input name="file" type="file" accept=".xlsx,.xls,.csv" required />
          </label>
          <button className="rounded-md bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800" disabled={previewPending} type="submit">
            {previewPending ? "Preview maken..." : "Preview maken"}
          </button>
        </div>
        {preview.error ? <p className="font-semibold text-red-700">{preview.error}</p> : null}
      </form>

      {preview.rows.length ? (
        <form action={commitAction} className="grid gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <input name="fileName" type="hidden" value={preview.fileName} />
          <textarea className="hidden" name="rows" readOnly value={JSON.stringify(preview.rows)} />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-950">Import preview</h2>
              <p className="mt-1 text-sm text-slate-600">{preview.fileName}</p>
            </div>
            <button className="rounded-md bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-60" disabled={commitPending} type="submit">
              {commitPending ? "Verwerken..." : "Import verwerken"}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="rounded-md bg-slate-100 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Rijen</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{preview.rows.length}</p>
            </div>
            <div className="rounded-md bg-emerald-50 p-4">
              <p className="text-xs font-bold uppercase text-emerald-700">Nieuw</p>
              <p className="mt-1 text-2xl font-black text-emerald-900">{newRows}</p>
            </div>
            <div className="rounded-md bg-sky-50 p-4">
              <p className="text-xs font-bold uppercase text-sky-700">Koppelen</p>
              <p className="mt-1 text-2xl font-black text-sky-900">{linkedRows}</p>
            </div>
            <div className="rounded-md bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase text-amber-700">Waarschuwingen</p>
              <p className="mt-1 text-2xl font-black text-amber-900">{warningRows}</p>
            </div>
            <div className="rounded-md bg-orange-50 p-4">
              <p className="text-xs font-bold uppercase text-orange-700">Tweede opinie</p>
              <p className="mt-1 text-2xl font-black text-orange-900">{reviewRows}</p>
            </div>
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-xs font-bold uppercase text-red-700">Ongeldig</p>
              <p className="mt-1 text-2xl font-black text-red-900">{invalidRows}</p>
            </div>
          </div>

          <div className="grid gap-2">
            <p className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
              Bij verwerken worden alle geldige rijen geimporteerd. Bestaande lidnummers worden gekoppeld; nieuwe lidnummers worden als donateur aangemaakt.
            </p>
            {isBankImport ? (
              <p className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                Bankexport herkend. Alleen SEPA Overboeking en SEPA Periodieke Overboeking worden meegenomen. Incasso&apos;s worden overgeslagen. Kolom Rekeningnummer is de rekening van de organisatie; de donor-IBAN en het betalingsdoel worden uit Omschrijving gelezen.
              </p>
            ) : null}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1700px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-3">Rij</th>
                  <th className="p-3">Datum</th>
                  <th className="p-3">Bedrag</th>
                  <th className="p-3">Org. rekeningnummer</th>
                  <th className="p-3">Lidnummer</th>
                  <th className="p-3">Betalingsdoel</th>
                  <th className="p-3">Betaler</th>
                  <th className="p-3">Donor IBAN</th>
                  <th className="p-3">Jaar</th>
                  <th className="p-3">Actie</th>
                  <th className="p-3">Uitleg</th>
                  <th className="p-3">Tweede opinie / fouten</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                    <tr className={`border-t border-slate-200 align-top ${row.errors.length ? "border-l-4 border-l-red-700 bg-red-100/80" : row.reviewReasons.length || row.detectedAction === "PAYMENT_ONLY_REQUIRES_REVIEW" ? "border-l-4 border-l-red-600 bg-red-50/80" : row.warnings.length ? "bg-amber-50/50" : "bg-white"}`} key={row.rowNumber}>
                      <td className="p-3">{row.rowNumber}</td>
                      <td className="p-3">{formatDate(row.paidAt)}</td>
                      <td className="p-3">{formatCurrency(row.amountCents)}</td>
                      <td className="p-3">{row.organizationAccountNumber || "-"}</td>
                      <td className="p-3 font-semibold">{row.registrationNumber || "-"}</td>
                      <td className="p-3">{row.fullName || "-"}</td>
                      <td className="p-3">{row.payerName || "-"}</td>
                      <td className="p-3">{row.iban ? formatIban(row.iban) : "-"}</td>
                      <td className="p-3">{row.contributionYear ?? "-"}</td>
                      <td className="p-3 font-semibold">{actionLabel(row.detectedAction)}</td>
                      <td className="p-3">{row.aiExplanation.length ? row.aiExplanation.join(" | ") : "-"}</td>
                      <td className="p-3">{[...row.errors, ...row.reviewReasons, ...row.warnings].length ? [...row.errors, ...row.reviewReasons, ...row.warnings].join(" | ") : "-"}</td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </form>
      ) : null}

      {result.created || result.linked || result.invalid || result.review || result.duplicates ? (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm font-bold text-emerald-950">
          Verwerkt: {result.created} aangemaakt - {result.linked} gekoppeld - {result.duplicates ?? 0} duplicaten - {result.review} tweede opinie - {result.invalid} ongeldig
        </section>
      ) : null}
    </div>
  );
}
