export function donationFormPath(templateKey: string, slug: string) {
  return templateKey === "DONOR_JOURNEY" ? "/doneren/maandelijks" : `/doneren/${slug}`;
}

export function donationReturnPath(templateKey: string, slug: string, step: "betaling" | "machtiging") {
  return `${donationFormPath(templateKey, slug)}/${step}`;
}
