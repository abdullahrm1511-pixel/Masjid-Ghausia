"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const submitSelector = 'button[type="submit"], button:not([type]), input[type="submit"]';

export function InteractionFeedback() {
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    cleanupRef.current?.();
    setBusy(false);
  }, [pathname]);

  useEffect(() => {
    const resetForm = (form: HTMLFormElement) => {
      delete form.dataset.globalSubmitting;
      form.querySelectorAll<HTMLInputElement | HTMLButtonElement>(submitSelector).forEach((control) => {
        if (control.dataset.globalSubmitDisabled === "true") control.disabled = false;
        delete control.dataset.globalSubmitDisabled;
        delete control.dataset.globalSubmitting;
        control.removeAttribute("aria-busy");
      });
      setBusy(false);
    };

    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (!form) return;

      if (form.dataset.globalSubmitting === "true") {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      form.dataset.globalSubmitting = "true";
      const submitter = event.submitter instanceof HTMLElement ? event.submitter : null;
      if (submitter) {
        submitter.dataset.globalSubmitting = "true";
        submitter.setAttribute("aria-busy", "true");
      }
      setBusy(true);

      window.setTimeout(() => {
        form.querySelectorAll<HTMLInputElement | HTMLButtonElement>(submitSelector).forEach((control) => {
          if (!control.disabled) {
            control.dataset.globalSubmitDisabled = "true";
            control.disabled = true;
          }
        });
      }, 0);

      let observer: MutationObserver | null = null;
      const fallback = window.setTimeout(() => resetForm(form), 30000);
      const startObserver = window.setTimeout(() => {
        observer = new MutationObserver(() => {
          observer?.disconnect();
          window.clearTimeout(fallback);
          window.setTimeout(() => resetForm(form), 350);
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      }, 250);

      cleanupRef.current = () => {
        observer?.disconnect();
        window.clearTimeout(startObserver);
        window.clearTimeout(fallback);
        resetForm(form);
      };
    };

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const target = new URL(link.href, window.location.href);
      if (target.origin !== window.location.origin || target.href === window.location.href || target.hash) return;
      link.dataset.globalNavigating = "true";
      link.setAttribute("aria-busy", "true");
      setBusy(true);
      window.setTimeout(() => {
        delete link.dataset.globalNavigating;
        link.removeAttribute("aria-busy");
        setBusy(false);
      }, 10000);
    };

    document.addEventListener("submit", handleSubmit, true);
    document.addEventListener("click", handleClick, true);
    const handlePageShow = () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      setBusy(false);
    };
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("submit", handleSubmit, true);
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("pageshow", handlePageShow);
      cleanupRef.current?.();
    };
  }, []);

  return (
    <div aria-hidden={!busy} aria-live="polite" className={`global-action-feedback ${busy ? "global-action-feedback--visible" : ""}`}>
      <span className="global-action-progress" />
      <span className="global-action-message"><span className="global-action-spinner" /> Bezig, een moment...</span>
    </div>
  );
}
