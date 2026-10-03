"use client";

import { useEffect } from "react";

function prepareTable(table: HTMLTableElement) {
  const headers = Array.from(table.querySelectorAll("thead th")).map((header) => header.textContent?.trim() || "Gegeven");
  if (!headers.length) return;

  table.classList.add("mobile-card-table");
  table.querySelectorAll("tbody tr").forEach((row) => {
    Array.from(row.children).forEach((cell, index) => {
      if (!(cell instanceof HTMLTableCellElement)) return;
      if (!cell.dataset.label) cell.dataset.label = headers[index] || "Gegeven";
    });
  });
}

/** Makes existing data tables readable as labelled cards on narrow screens. */
export function ResponsiveTables() {
  useEffect(() => {
    const prepareAll = (root: ParentNode = document) => root.querySelectorAll("table").forEach(prepareTable);
    prepareAll();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node instanceof HTMLTableElement) prepareTable(node);
        prepareAll(node);
      }));
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
