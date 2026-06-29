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

export function ageLabel(value?: Date | string | null) {
  if (!value) return "-";
  const dateOfBirth = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateOfBirth.getTime())) return "-";

  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const hasHadBirthday =
    today.getMonth() > dateOfBirth.getMonth() ||
    (today.getMonth() === dateOfBirth.getMonth() && today.getDate() >= dateOfBirth.getDate());
  if (!hasHadBirthday) age -= 1;

  return `${age} jaar`;
}

export function formatDateWithAge(value?: Date | string | null) {
  const date = formatDate(value);
  const age = ageLabel(value);
  if (date === "-" || age === "-") return date;
  return `${date} (${age})`;
}
