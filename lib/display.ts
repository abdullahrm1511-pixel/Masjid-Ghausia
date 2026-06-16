export function displayEmail(email?: string | null) {
  if (!email) return "-";
  return email.startsWith("legacy+") && email.endsWith("@stgbc.local") ? "-" : email;
}

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR"
  }).format(cents / 100);
}

export function formatDate(value?: Date | string | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("nl-NL");
}
