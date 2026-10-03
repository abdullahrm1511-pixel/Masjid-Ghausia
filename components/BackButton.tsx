"use client";

import { useRouter } from "next/navigation";

type BackButtonProps = {
  fallbackHref?: string;
};

export function BackButton({ fallbackHref = "/" }: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:border-[#1483d6] hover:bg-sky-50 hover:text-[#0f5f9f] sm:w-auto"
      aria-label="Ga terug naar de vorige pagina"
    >
      <span aria-hidden="true">←</span>
      Terug
    </button>
  );
}
