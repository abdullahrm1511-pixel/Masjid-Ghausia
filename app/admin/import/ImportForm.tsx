"use client";

import { useActionState, useMemo, useState } from "react";
import { previewImport, commitImport, type ImportPreviewState, type ImportResultState } from "./actions";
import { formatCurrency, formatDate } from "@/lib/display";
import { formatIban } from "@/lib/iban";

const initialPreview: ImportPreviewState = { rows: [], fileName: "" };
const initialResult: ImportResultState = { created: 0, linked: 0, invalid: 0, review: 0, duplicates: 0, inactive: 0 };
type PreviewFilter = "all" | "new" | "linked" | "duplicates" | "warnings" | "review" | "invalid";

function actionLabel(action: string, isMemberImport = false) {
  if (isMemberImport && action === "DUPLICATE") return "Bestaand lid bijwerken";
  if (isMemberImport && action === "NEW") return "Nieuw lid aanmaken";
  if (action === "DUPLICATE_IMPORT_ROW") return "Dubbele rij in bestand";
  if (action === "LINK_PAYMENT_TO_EXISTING_DONOR") return "Bedrag verwerkt";
  if (action === "DUPLICATE" || action === "POSSIBLE_MATCH") return "Gekoppeld";
  if (action === "NEW") return "Nieuwe donateur aanmaken";
  if (action === "DUPLICATE_PAYMENT") return "Dubbele betaling mogelijk";
  if (action === "INVALID" || action === "INVALID_REQUIRES_REVIEW") return "Ongeldig";
  if (action === "PAYMENT_ONLY_REQUIRES_REVIEW") return "Lidnummer niet gevonden";
  return action;
}

export function ImportForm() {
  const [preview, previewAction, previewPending] = useActionState(previewImport, initialPreview);
  const [result, commitAction, commitPending] = useActionState(commitImport, initialResult);
  const [filter, setFilter] = useState<PreviewFilter>("all");
  const isBankImport = preview.rows.some((row) => row.importMode === "bank-transactions");
  const isMemberImport = preview.rows.some((row) => row.importMode === "member-personal-details");
  const invalidRows = preview.rows.filter((row) => row.errors.length > 0).length;
  const reviewRows = preview.rows.filter((row) => row.detectedAction === "PAYMENT_ONLY_REQUIRES_REVIEW" || row.reviewReasons.length > 0).length;
  const warningRows = preview.rows.filter((row) => row.errors.length === 0 && row.warnings.length > 0).length;
  const duplicateRows = preview.rows.filter((row) => row.detectedAction === "DUPLICATE_PAYMENT" || row.detectedAction === "DUPLICATE_IMPORT_ROW").length;
  const newRows = preview.rows.filter((row) => row.detectedAction === "NEW").length;
  const linkedRows = preview.rows.filter((row) => Boolean(row.existingDonorId)).length;
  const filteredRows = useMemo(() => {
    if (filter === "new") return preview.rows.filter((row) => row.detectedAction === "NEW");
    if (filter === "linked") return preview.rows.filter((row) => Boolean(row.existingDonorId));
    if (filter === "duplicates") return preview.rows.filter((row) => row.detectedAction === "DUPLICATE_PAYMENT" || row.detectedAction === "DUPLICATE_IMPORT_ROW");
    if (filter === "warnings") return preview.rows.filter((row) => row.errors.length === 0 && row.warnings.length > 0);
    if (filter === "review") return preview.rows.filter((row) => row.detectedAction === "PAYMENT_ONLY_REQUIRES_REVIEW" || row.reviewReasons.length > 0);
    if (filter === "invalid") return preview.rows.filter((row) => row.errors.length > 0);
    return preview.rows;
  }, [filter, preview.rows]);

  const filterButtonClass = (name: PreviewFilter, baseClass: string) =>
    `rounded-md p-4 text-left transition hover:ring-2 hover:ring-slate-300 ${baseClass} ${filter === name ? "ring-2 ring-slate-900" : ""}`;

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
            <input name="file" type="file" accept=".xlsx,.xls,.xlsm,.csv" required />
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

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            <button className={filterButtonClass("all", "bg-slate-100")} onClick={() => setFilter("all")} type="button">
              <p className="text-xs font-bold uppercase text-slate-500">Rijen</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{preview.rows.length}</p>
            </button>
            <button className={filterButtonClass("new", "bg-emerald-50")} onClick={() => setFilter("new")} type="button">
              <p className="text-xs font-bold uppercase text-emerald-700">Nieuw</p>
              <p className="mt-1 text-2xl font-black text-emerald-900">{newRows}</p>
            </button>
            <button className={filterButtonClass("linked", "bg-sky-50")} onClick={() => setFilter("linked")} type="button">
              <p className="text-xs font-bold uppercase text-sky-700">Koppelen</p>
              <p className="mt-1 text-2xl font-black text-sky-900">{linkedRows}</p>
            </button>
            <button className={filterButtonClass("duplicates", "bg-violet-50")} onClick={() => setFilter("duplicates")} type="button">
              <p className="text-xs font-bold uppercase text-violet-700">Duplicaten</p>
              <p className="mt-1 text-2xl font-black text-violet-900">{duplicateRows}</p>
            </button>
            <button className={filterButtonClass("warnings", "bg-amber-50")} onClick={() => setFilter("warnings")} type="button">
              <p className="text-xs font-bold uppercase text-amber-700">Waarschuwingen</p>
              <p className="mt-1 text-2xl font-black text-amber-900">{warningRows}</p>
            </button>
            <button className={filterButtonClass("review", "bg-orange-50")} onClick={() => setFilter("review")} type="button">
              <p className="text-xs font-bold uppercase text-orange-700">Controle nodig</p>
              <p className="mt-1 text-2xl font-black text-orange-900">{reviewRows}</p>
            </button>
            <button className={filterButtonClass("invalid", "bg-red-50")} onClick={() => setFilter("invalid")} type="button">
              <p className="text-xs font-bold uppercase text-red-700">Ongeldig</p>
              <p className="mt-1 text-2xl font-black text-red-900">{invalidRows}</p>
            </button>
          </div>

          {filter !== "all" ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-slate-100 p-3 text-sm font-semibold text-slate-800">
              <p>{filteredRows.length} van {preview.rows.length} regels getoond.</p>
              <button className="rounded-md border border-slate-300 bg-white px-3 py-2 font-bold" onClick={() => setFilter("all")} type="button">
                Alle regels tonen
              </button>
            </div>
          ) : null}

          <div className="grid gap-2">
            <p className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
              Bij verwerken worden alle geldige rijen geimporteerd. Bij bankimport is het lidnummer leidend; IBAN wordt alleen als betaalhistorie opgeslagen.
            </p>
            {isBankImport ? (
              <p className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                Bankexport herkend. Alleen SEPA Overboeking en SEPA Periodieke Overboeking worden meegenomen. Kolom Rekeningnummer is de rekening van de organisatie. De IBAN uit Omschrijving bepaalt niet wie betaald heeft.
              </p>
            ) : null}
            {isMemberImport ? (
              <p className="rounded-md bg-sky-50 p-3 text-sm font-semibold text-sky-900">
                Ledenbestand herkend. Dit maakt of werkt bestaande leden bij en koppelt partner/kinderen alleen als lidnummer en adresnummer allebei hetzelfde zijn. Betalingen, schulden en record status worden hierbij niet verwerkt.
              </p>
            ) : null}
          </div>
          <div className="overflow-x-auto">
            {isMemberImport ? (
              <table className="w-full min-w-[1300px] text-left text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-3">Rij</th>
                    <th className="p-3">Lidnummer</th>
                    <th className="p-3">Adresnr</th>
                    <th className="p-3">Rol</th>
                    <th className="p-3">Naam</th>
                    <th className="p-3">Geboortedatum</th>
                    <th className="p-3">Geslacht</th>
                    <th className="p-3">Telefoon</th>
                    <th className="p-3">E-mail</th>
                    <th className="p-3">Adres</th>
                    <th className="p-3">Actie</th>
                    <th className="p-3">Fouten / waarschuwingen</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr className={`border-t border-slate-200 align-top ${row.errors.length ? "border-l-4 border-l-red-700 bg-red-100/80" : row.reviewReasons.length ? "border-l-4 border-l-red-600 bg-red-50/80" : row.warnings.length ? "bg-amber-50/50" : "bg-white"}`} key={row.rowNumber}>
                      <td className="p-3">{row.rowNumber}</td>
                      <td className="p-3 font-semibold">{row.registrationNumber || "-"}</td>
                      <td className="p-3">{row.legacyAddressKey || "-"}</td>
                      <td className="p-3">{row.relationshipToMember || "-"}</td>
                      <td className="p-3 font-semibold">{row.fullName || "-"}</td>
                      <td className="p-3">{formatDate(row.birthDate)}</td>
                      <td className="p-3">{row.gender || "-"}</td>
                      <td className="p-3">{row.phone || "-"}</td>
                      <td className="p-3">{row.email || "-"}</td>
                      <td className="p-3">{row.addressLine1 || "-"}</td>
                      <td className="p-3 font-semibold">{actionLabel(row.detectedAction, true)}</td>
                      <td className="p-3">{[...row.errors, ...row.reviewReasons, ...row.warnings].length ? [...row.errors, ...row.reviewReasons, ...row.warnings].join(" | ") : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full min-w-[1250px] text-left text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-3">Rij</th>
                    <th className="p-3">Datum</th>
                    <th className="p-3">Bedrag</th>
                    <th className="p-3">Org. rekeningnummer</th>
                    <th className="p-3">Lidnummer</th>
                    <th className="p-3">IBAN betaler</th>
                    <th className="p-3">Jaar</th>
                    <th className="p-3">Actie</th>
                    <th className="p-3">Controle / fouten</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                      <tr className={`border-t border-slate-200 align-top ${row.errors.length ? "border-l-4 border-l-red-700 bg-red-100/80" : row.reviewReasons.length || row.detectedAction === "PAYMENT_ONLY_REQUIRES_REVIEW" ? "border-l-4 border-l-red-600 bg-red-50/80" : row.warnings.length ? "bg-amber-50/50" : "bg-white"}`} key={row.rowNumber}>
                        <td className="p-3">{row.rowNumber}</td>
                        <td className="p-3">{formatDate(row.paidAt)}</td>
                        <td className="p-3">{formatCurrency(row.amountCents)}</td>
                        <td className="p-3">{row.organizationAccountNumber || "-"}</td>
                        <td className="p-3 font-semibold">{row.registrationNumber || "-"}</td>
                        <td className="p-3">{row.iban ? formatIban(row.iban) : "-"}</td>
                        <td className="p-3">{row.contributionYear ?? "-"}</td>
                        <td className="p-3 font-semibold">{actionLabel(row.detectedAction)}</td>
                        <td className="p-3">{[...row.errors, ...row.reviewReasons, ...row.warnings].length ? [...row.errors, ...row.reviewReasons, ...row.warnings].join(" | ") : "-"}</td>
                      </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </form>
      ) : null}

      {result.created || result.linked || result.invalid || result.review || result.duplicates || result.inactive ? (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm font-bold text-emerald-950">
          Verwerkt: {result.created} aangemaakt - {result.linked} gekoppeld - {result.duplicates ?? 0} duplicaten - {result.review} controle nodig - {result.invalid} ongeldig - {result.inactive ?? 0} inactief gezet
        </section>
      ) : null}
    </div>
  );
}
