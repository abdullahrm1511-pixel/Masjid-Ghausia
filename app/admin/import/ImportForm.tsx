"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type { ImportPreviewRow } from "@/lib/admin/import";
import { previewImport, commitImport, type ImportPreviewState, type ImportResultState } from "./actions";
import { formatCurrency, formatDate } from "@/lib/display";
import { formatIban } from "@/lib/iban";

const initialPreview: ImportPreviewState = { rows: [], fileName: "" };
const initialResult: ImportResultState = { created: 0, linked: 0, invalid: 0, review: 0, duplicates: 0, inactive: 0 };
type PreviewFilter = "all" | "new" | "linked" | "duplicates" | "warnings" | "review" | "invalid" | "ignored" | "required";

const unignorableMessages = new Set(["Lidnummer ontbreekt", "Naam ontbreekt"]);

function actionLabel(action: string, isMemberImport = false, relationshipToMember = "") {
  const isPrimaryMember = relationshipToMember.toLowerCase().includes("primary");
  if (isMemberImport && action === "DUPLICATE") return isPrimaryMember ? "Bestaand hoofdlid bijwerken" : "Gezinslid bijwerken / koppelen";
  if (isMemberImport && action === "NEW") return isPrimaryMember ? "Nieuw hoofdlid aanmaken" : "Koppelen aan hoofdlid";
  if (action === "UPDATE_STATUS") return "Status bijwerken";
  if (action === "STATUS_NOT_FOUND") return "Lidnummer niet gevonden";
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
  const [rows, setRows] = useState<ImportPreviewRow[]>([]);
  useEffect(() => setRows(preview.rows), [preview.rows]);

  const activeMessages = (row: ImportPreviewRow) => [...row.errors, ...row.reviewReasons, ...row.warnings].filter((message) => !(row.ignoredMessages ?? []).includes(message));
  const isBankImport = rows.some((row) => row.importMode === "bank-transactions");
  const isMemberImport = rows.some((row) => row.importMode === "member-personal-details");
  const isStatusImport = rows.some((row) => row.importMode === "donor-status");
  const invalidRows = rows.filter((row) => row.errors.some((message) => !(row.ignoredMessages ?? []).includes(message))).length;
  const reviewRows = rows.filter((row) => row.reviewReasons.some((message) => !(row.ignoredMessages ?? []).includes(message))).length;
  const warningRows = rows.filter((row) => row.warnings.some((message) => !(row.ignoredMessages ?? []).includes(message))).length;
  const ignoredRows = rows.filter((row) => (row.ignoredMessages ?? []).length > 0).length;
  const requiredRows = rows.filter((row) => activeMessages(row).length > 0).length;
  const duplicateRows = rows.filter((row) => row.detectedAction === "DUPLICATE_PAYMENT" || row.detectedAction === "DUPLICATE_IMPORT_ROW").length;
  const newRows = rows.filter((row) => row.detectedAction === "NEW").length;
  const linkedRows = rows.filter((row) => Boolean(row.existingDonorId)).length;
  const filteredRows = useMemo(() => {
    if (filter === "new") return rows.filter((row) => row.detectedAction === "NEW");
    if (filter === "linked") return rows.filter((row) => Boolean(row.existingDonorId));
    if (filter === "duplicates") return rows.filter((row) => row.detectedAction === "DUPLICATE_PAYMENT" || row.detectedAction === "DUPLICATE_IMPORT_ROW");
    if (filter === "warnings") return rows.filter((row) => row.warnings.some((message) => !(row.ignoredMessages ?? []).includes(message)));
    if (filter === "review") return rows.filter((row) => row.reviewReasons.some((message) => !(row.ignoredMessages ?? []).includes(message)));
    if (filter === "invalid") return rows.filter((row) => row.errors.some((message) => !(row.ignoredMessages ?? []).includes(message)));
    if (filter === "ignored") return rows.filter((row) => (row.ignoredMessages ?? []).length > 0);
    if (filter === "required") return rows.filter((row) => activeMessages(row).length > 0);
    return rows;
  }, [filter, rows]);

  const updateRow = (rowNumber: number, changes: Partial<ImportPreviewRow>) => {
    setRows((current) => current.map((row) => row.rowNumber === rowNumber ? { ...row, ...changes } : row));
  };

  const updateMemberField = (row: ImportPreviewRow, field: keyof ImportPreviewRow, value: string) => {
    const changes: Partial<ImportPreviewRow> = { [field]: value };
    if (field === "registrationNumber" && value.trim()) changes.errors = row.errors.filter((message) => message !== "Lidnummer ontbreekt");
    if (["firstName", "middleName", "lastName"].includes(String(field))) {
      const next = { firstName: row.firstName ?? "", middleName: row.middleName ?? "", lastName: row.lastName ?? "", [field]: value };
      const fullName = [next.firstName, next.middleName, next.lastName].filter(Boolean).join(" ").trim();
      changes.fullName = fullName;
      if (fullName) changes.errors = row.errors.filter((message) => message !== "Naam ontbreekt");
    }
    updateRow(row.rowNumber, changes);
  };

  const toggleIgnored = (row: ImportPreviewRow, message: string) => {
    if (unignorableMessages.has(message)) return;
    const ignored = new Set(row.ignoredMessages ?? []);
    if (ignored.has(message)) ignored.delete(message); else ignored.add(message);
    updateRow(row.rowNumber, { ignoredMessages: [...ignored] });
  };

  const messageControls = (row: ImportPreviewRow) => {
    const messages = [...row.errors, ...row.reviewReasons, ...row.warnings];
    if (!messages.length) return <span>-</span>;
    return <div className="grid min-w-64 gap-2">{messages.map((message) => {
      const ignored = (row.ignoredMessages ?? []).includes(message);
      const locked = unignorableMessages.has(message);
      return <div className={`rounded-md border p-2 ${ignored ? "border-slate-200 bg-slate-100 text-slate-500 line-through" : "border-amber-200 bg-white"}`} key={message}>
        <p>{message}</p>
        <button className="mt-2 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-bold no-underline disabled:cursor-not-allowed disabled:opacity-50" disabled={locked} onClick={() => toggleIgnored(row, message)} type="button">
          {locked ? "Verplicht oplossen" : ignored ? "Niet meer negeren" : "Negeren"}
        </button>
      </div>;
    })}</div>;
  };

  const filterButtonClass = (name: PreviewFilter, baseClass: string) =>
    `rounded-xl p-4 text-left transition hover:ring-2 hover:ring-[#1483d6]/30 ${baseClass} ${filter === name ? "ring-2 ring-[#1483d6]" : ""}`;

  return (
    <div className="mt-6 grid gap-6">
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-[#1483d6]">Stap 1</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">Bestand kiezen</h2>
          <p className="mt-2 text-sm text-slate-600">Ondersteund: .xlsx, .xls en .csv.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-[#1483d6]">Stap 2</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">Preview controleren</h2>
          <p className="mt-2 text-sm text-slate-600">Controleer alleen of de koppeling logisch is.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-[#1483d6]">Stap 3</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">Alles verwerken</h2>
          <p className="mt-2 text-sm text-slate-600">Geldige rijen worden automatisch aangemaakt of gekoppeld.</p>
        </div>
      </section>

      <form action={previewAction} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <label>
            Excel- of CSV-bestand
            <input name="file" type="file" accept=".xlsx,.xls,.xlsm,.csv" required />
          </label>
          <button className="rounded-lg bg-[#1483d6] px-5 py-3 font-bold text-white shadow-sm hover:bg-[#0f5f9f]" disabled={previewPending} type="submit">
            {previewPending ? "Preview maken..." : "Preview maken"}
          </button>
        </div>
        {preview.error ? <p className="font-semibold text-red-700">{preview.error}</p> : null}
      </form>

      {preview.rows.length ? (
        <form action={commitAction} className="grid gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <input name="fileName" type="hidden" value={preview.fileName} />
          <textarea className="hidden" name="archiveBase64" readOnly value={preview.archiveBase64 ?? ""} />
          <textarea className="hidden" name="rows" readOnly value={JSON.stringify(rows)} />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-950">Import preview</h2>
              <p className="mt-1 text-sm text-slate-600">{preview.fileName}</p>
            </div>
            <button className="rounded-lg bg-[#1483d6] px-5 py-3 font-bold text-white shadow-sm hover:bg-[#0f5f9f] disabled:cursor-not-allowed disabled:opacity-60" disabled={commitPending || requiredRows > 0} type="submit">
              {commitPending ? "Verwerken..." : "Import verwerken"}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-9">
            <button className={filterButtonClass("all", "bg-slate-100")} onClick={() => setFilter("all")} type="button">
              <p className="text-xs font-bold uppercase text-slate-500">Rijen</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{preview.rows.length}</p>
            </button>
            <button className={filterButtonClass("new", "bg-teal-50")} onClick={() => setFilter("new")} type="button">
              <p className="text-xs font-bold uppercase text-[#1483d6]">Nieuw</p>
              <p className="mt-1 text-2xl font-black text-teal-900">{newRows}</p>
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
            <button className={filterButtonClass("ignored", "bg-slate-100")} onClick={() => setFilter("ignored")} type="button">
              <p className="text-xs font-bold uppercase text-slate-600">Genegeerd</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{ignoredRows}</p>
            </button>
            <button className={filterButtonClass("required", "bg-rose-100")} onClick={() => setFilter("required")} type="button">
              <p className="text-xs font-bold uppercase text-rose-700">Actie vereist</p>
              <p className="mt-1 text-2xl font-black text-rose-950">{requiredRows}</p>
            </button>
          </div>

          {requiredRows > 0 ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-900">Los de meldingen bij Actie vereist op of kies Negeren. Lidnummer en naam moeten altijd worden ingevuld.</p> : null}

          {filter !== "all" ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-slate-100 p-3 text-sm font-semibold text-slate-800">
              <p>{filteredRows.length} van {rows.length} regels getoond.</p>
              <button className="rounded-md border border-slate-300 bg-white px-3 py-2 font-bold" onClick={() => setFilter("all")} type="button">
                Alle regels tonen
              </button>
            </div>
          ) : null}

          <div className="grid gap-2">
            <p className="rounded-md bg-teal-50 p-3 text-sm font-semibold text-teal-900">
              Bij verwerken worden alle geldige rijen geimporteerd. Bij bankimport is het lidnummer leidend; IBAN wordt alleen als betaalhistorie opgeslagen.
            </p>
            {isBankImport ? (
              <p className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                Bankexport herkend. Alleen SEPA Overboeking en SEPA Periodieke Overboeking worden meegenomen. Kolom Rekeningnummer is de rekening van de organisatie. De IBAN uit Omschrijving bepaalt niet wie betaald heeft.
                Ontbreekt het lidnummer of is controle nodig? Vul bij die regel zelf het lidnummer in, bijvoorbeeld 11-141 of 11-00141.
              </p>
            ) : null}
            {isMemberImport ? (
              <p className="rounded-md bg-sky-50 p-3 text-sm font-semibold text-sky-900">
                Volledig ledenbestand herkend. Persoonsgegevens worden exact overgenomen. MEM DETAIL NR KEY, RECORD STATUS en BEFORE 18 YR worden genegeerd. ADDR NR KEY wordt alleen gebruikt om het gedeelde adres te vinden. Alle huishoudens worden als actief en volledig betaald geïmporteerd.
              </p>
            ) : null}
            {isStatusImport ? (
              <p className="rounded-md bg-sky-50 p-3 text-sm font-semibold text-sky-900">
                Statusbestand herkend. Alleen bestaande donateurs worden bijgewerkt op lidnummer. Er worden geen nieuwe donateurs, betalingen of verplichtingen aangemaakt.
              </p>
            ) : null}
          </div>
          <div className="overflow-x-auto">
            {isStatusImport ? (
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-3">Rij</th>
                    <th className="p-3">Lidnummer</th>
                    <th className="p-3">Naam</th>
                    <th className="p-3">Nieuwe status</th>
                    <th className="p-3">Actie</th>
                    <th className="p-3">Controle / fouten</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr className={`border-t border-slate-200 align-top ${row.errors.length ? "border-l-4 border-l-red-700 bg-red-100/80" : row.reviewReasons.length ? "border-l-4 border-l-red-600 bg-red-50/80" : row.warnings.length ? "bg-amber-50/50" : "bg-white"}`} key={row.rowNumber}>
                      <td className="p-3">{row.rowNumber}</td>
                      <td className="p-3 font-semibold">{row.registrationNumber || "-"}</td>
                      <td className="p-3">{row.fullName || "-"}</td>
                      <td className="p-3 font-semibold">{row.status || "-"}</td>
                      <td className="p-3 font-semibold">{actionLabel(row.detectedAction)}</td>
                      <td className="p-3">{messageControls(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : isMemberImport ? (
              <table className="w-full min-w-[1700px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-3">Rij</th>
                    <th className="p-3">Lidnummer</th>
                    <th className="p-3">Rol</th>
                    <th className="p-3">Naam</th>
                    <th className="p-3">Geboortedatum</th>
                    <th className="p-3">Geslacht</th>
                    <th className="p-3">Telefoon</th>
                    <th className="p-3">E-mail</th>
                    <th className="p-3">Adres</th>
                    <th className="p-3">Postcode / plaats</th>
                    <th className="p-3">Land</th>
                    <th className="p-3">BSN / IBAN</th>
                    <th className="p-3">Importstatus</th>
                    <th className="p-3">Actie</th>
                    <th className="p-3">Fouten / waarschuwingen</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr className={`border-t border-slate-200 align-top ${row.errors.length ? "border-l-4 border-l-red-700 bg-red-100/80" : row.reviewReasons.length ? "border-l-4 border-l-red-600 bg-red-50/80" : row.warnings.length ? "bg-amber-50/50" : "bg-white"}`} key={row.rowNumber}>
                      <td className="p-3">{row.rowNumber}</td>
                      <td className="p-3"><input className="w-28 rounded border p-2 font-semibold" value={row.registrationNumber} onChange={(event) => updateMemberField(row, "registrationNumber", event.target.value)} /></td>
                      <td className="p-3"><select className="min-w-36 rounded border p-2" value={row.relationshipToMember ?? ""} onChange={(event) => updateMemberField(row, "relationshipToMember", event.target.value)}><option value="">Kies rol</option><option value="Primary Member">Hoofdlid</option><option value="Member's Partner">Partner</option><option value="Member's Child">Kind</option></select></td>
                      <td className="p-3"><div className="grid min-w-44 gap-1"><input className="rounded border p-2 font-semibold" placeholder="Voornaam" value={row.firstName ?? ""} onChange={(event) => updateMemberField(row, "firstName", event.target.value)} /><input className="rounded border p-2" placeholder="Tussenvoegsel" value={row.middleName ?? ""} onChange={(event) => updateMemberField(row, "middleName", event.target.value)} /><input className="rounded border p-2" placeholder="Achternaam" value={row.lastName ?? ""} onChange={(event) => updateMemberField(row, "lastName", event.target.value)} /></div></td>
                      <td className="p-3"><input className="w-36 rounded border p-2" type="date" value={row.birthDate ? row.birthDate.slice(0, 10) : ""} onChange={(event) => updateMemberField(row, "birthDate", event.target.value)} /></td>
                      <td className="p-3"><select className="rounded border p-2" value={row.gender ?? ""} onChange={(event) => updateMemberField(row, "gender", event.target.value)}><option value="">Onbekend</option><option value="Male">Man</option><option value="Female">Vrouw</option></select></td>
                      <td className="p-3"><input className="w-32 rounded border p-2" value={row.phone ?? ""} onChange={(event) => updateMemberField(row, "phone", event.target.value)} /></td>
                      <td className="p-3"><input className="w-52 rounded border p-2" type="email" value={row.email ?? ""} onChange={(event) => updateMemberField(row, "email", event.target.value)} /></td>
                      <td className="p-3"><input className="w-48 rounded border p-2" value={row.addressLine1 ?? ""} onChange={(event) => updateMemberField(row, "addressLine1", event.target.value)} /></td>
                      <td className="p-3"><div className="grid min-w-36 gap-1"><input className="rounded border p-2" placeholder="Postcode" value={row.postalCode ?? ""} onChange={(event) => updateMemberField(row, "postalCode", event.target.value)} /><input className="rounded border p-2" placeholder="Plaats" value={row.city ?? ""} onChange={(event) => updateMemberField(row, "city", event.target.value)} /></div></td>
                      <td className="p-3"><input className="w-28 rounded border p-2" value={row.country ?? ""} onChange={(event) => updateMemberField(row, "country", event.target.value)} /></td>
                      <td className="p-3"><div className="grid min-w-40 gap-1"><input className="rounded border p-2" inputMode="numeric" placeholder="BSN" value={row.bsn ?? ""} onChange={(event) => updateMemberField(row, "bsn", event.target.value)} /><input className="rounded border p-2" placeholder="IBAN" value={row.iban ?? ""} onChange={(event) => updateMemberField(row, "iban", event.target.value)} /></div></td>
                      <td className="p-3 font-semibold text-teal-800">Actief / volledig betaald</td>
                      <td className="p-3 font-semibold">{actionLabel(row.detectedAction, true, row.relationshipToMember)}</td>
                      <td className="p-3">{messageControls(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full min-w-[1250px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-3">Rij</th>
                    <th className="p-3">Datum</th>
                    <th className="p-3">Bedrag</th>
                    <th className="p-3">Org. rekeningnummer</th>
                    <th className="p-3">Lidnummer</th>
                    <th className="p-3">Betaalrekening</th>
                    <th className="p-3">Jaar</th>
                    <th className="p-3">Actie</th>
                    <th className="p-3">Controle / fouten</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const canOverrideRegistration =
                      row.importMode === "bank-transactions" &&
                      (row.detectedAction === "PAYMENT_ONLY_REQUIRES_REVIEW" || row.reviewReasons.length > 0 || !row.registrationNumber);
                    return (
                      <tr className={`border-t border-slate-200 align-top ${row.errors.length ? "border-l-4 border-l-red-700 bg-red-100/80" : row.reviewReasons.length || row.detectedAction === "PAYMENT_ONLY_REQUIRES_REVIEW" ? "border-l-4 border-l-red-600 bg-red-50/80" : row.warnings.length ? "bg-amber-50/50" : "bg-white"}`} key={row.rowNumber}>
                        <td className="p-3">{row.rowNumber}</td>
                        <td className="p-3">{formatDate(row.paidAt)}</td>
                        <td className="p-3">{formatCurrency(row.amountCents)}</td>
                        <td className="p-3">{row.organizationAccountNumber || "-"}</td>
                        <td className="p-3">
                          <div className="grid gap-2">
                            <span className="font-semibold">{row.registrationNumber || "-"}</span>
                            {canOverrideRegistration ? (
                              <input
                                className="w-36 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-950 shadow-sm outline-none focus:border-[#1483d6] focus:ring-2 focus:ring-[#1483d6]/20"
                                defaultValue={row.registrationNumber ?? ""}
                                name={`overrideRegistrationNumber:${row.rowNumber}`}
                                placeholder="11-00141"
                              />
                            ) : null}
                          </div>
                        </td>
                        <td className="p-3">{row.iban ? formatIban(row.iban) : "-"}</td>
                        <td className="p-3">{row.contributionYear ?? "-"}</td>
                        <td className="p-3 font-semibold">{actionLabel(row.detectedAction)}</td>
                        <td className="p-3">{messageControls(row)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </form>
      ) : null}

      {result.created || result.linked || result.invalid || result.review || result.duplicates || result.inactive ? (
        <section className="rounded-lg border border-teal-200 bg-teal-50 p-5 text-sm font-bold text-teal-950">
          Verwerkt: {result.created} aangemaakt - {result.linked} gekoppeld - {result.duplicates ?? 0} duplicaten - {result.review} controle nodig - {result.invalid} ongeldig - {result.inactive ?? 0} inactief gezet
        </section>
      ) : null}
    </div>
  );
}
