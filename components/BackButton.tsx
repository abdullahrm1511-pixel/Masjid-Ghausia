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
      className="rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-stone-100"
    >
      Terug
    </button>
  );
}
