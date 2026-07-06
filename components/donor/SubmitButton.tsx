"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel = "Bezig...",
  className = "",
  disabled
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const [showPending, setShowPending] = useState(false);

  useEffect(() => {
    if (pending) {
      setShowPending(true);
      return;
    }

    const timeout = window.setTimeout(() => setShowPending(false), 350);
    return () => window.clearTimeout(timeout);
  }, [pending]);

  const busy = pending || showPending;

  return (
    <button aria-busy={busy} className={`donor-submit-button ${className}`} disabled={disabled || busy} type="submit">
      {busy ? <span aria-hidden="true" className="donor-spinner" /> : null}
      <span>{busy ? pendingLabel : children}</span>
    </button>
  );
}
