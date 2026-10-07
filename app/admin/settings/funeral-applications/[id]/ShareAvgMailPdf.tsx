"use client";

import { useState } from "react";

type ShareAvgMailPdfProps = {
  applicationId: string;
  filename: string;
};

export function ShareAvgMailPdf({ applicationId, filename }: ShareAvgMailPdfProps) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function openMailShare() {
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch(`/admin/settings/funeral-applications/${applicationId}/avg-mail-pdf`);
      if (!response.ok) throw new Error("PDF ophalen mislukt");
      const file = new File([await response.blob()], filename, { type: "application/pdf" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "AVG begrafenisaanvraag"
        });
        setStatus("De PDF is als bijlage gedeeld. Controleer de e-mail en druk zelf op Verzenden.");
        return;
      }

      const downloadUrl = URL.createObjectURL(file);
      const download = document.createElement("a");
      download.href = downloadUrl;
      download.download = filename;
      download.click();
      URL.revokeObjectURL(downloadUrl);
      window.open("https://mail.google.com/mail/u/0/#inbox?compose=new", "_blank", "noopener,noreferrer");
      setStatus("Dit apparaat kan de bijlage niet rechtstreeks delen. De PDF is gedownload; voeg hem toe aan het geopende Gmail-concept.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("Het openen van Gmail is niet gelukt. Probeer het opnieuw of download de AVG-mail-PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button className="rounded-md bg-[#c5221f] px-4 py-3 text-center font-semibold text-white disabled:opacity-60" disabled={busy} onClick={openMailShare} type="button">
        {busy ? "PDF voorbereiden..." : "AVG-PDF als bijlage delen via Gmail"}
      </button>
      <p className="text-xs leading-5 text-slate-600">De PDF wordt als bijlage klaargezet. Kies Gmail, schrijf of controleer de tekst en druk daarna zelf op Verzenden.</p>
      {status ? <p aria-live="polite" className="rounded-md bg-slate-100 p-3 text-xs font-semibold leading-5 text-slate-700">{status}</p> : null}
    </div>
  );
}
