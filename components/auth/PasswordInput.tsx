"use client";

import { useId, useState, type InputHTMLAttributes } from "react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function PasswordInput({ className = "", ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const tooltipId = useId();

  return (
    <span className="grid grid-cols-[1fr_auto] gap-2">
      <input {...props} className={className} type={visible ? "text" : "password"} />
      <button
        aria-describedby={tooltipId}
        aria-label={visible ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
        className="group relative flex h-11 w-11 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
        onClick={() => setVisible((value) => !value)}
        type="button"
      >
        {visible ? (
          <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C5 20 2 12 2 12a18.45 18.45 0 0 1 5.06-6.94" />
            <path d="M9.9 4.24A10.85 10.85 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19" />
            <path d="M14.12 14.12a3 3 0 0 1-4.24-4.24" />
            <path d="M1 1l22 22" />
          </svg>
        ) : (
          <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
        <span
          className="pointer-events-none absolute bottom-full right-0 mb-2 hidden whitespace-nowrap rounded-md bg-slate-950 px-2 py-1 text-xs font-semibold text-white group-hover:block"
          id={tooltipId}
        >
          {visible ? "Verbergen" : "Tonen"}
        </span>
      </button>
    </span>
  );
}
