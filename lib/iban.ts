export function normalizeIban(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function formatIban(value: unknown) {
  return normalizeIban(value).replace(/(.{4})/g, "$1 ").trim();
}

function mod97(input: string) {
  let remainder = 0;
  for (const char of input) {
    remainder = (remainder * 10 + Number(char)) % 97;
  }
  return remainder;
}

export function isValidIban(value: unknown) {
  const iban = normalizeIban(value);
  if (!/^NL\d{2}[A-Z]{4}\d{10}$/.test(iban)) {
    return false;
  }

  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
  const numeric = Array.from(rearranged)
    .map((char) => {
      if (/[A-Z]/.test(char)) {
        return String(char.charCodeAt(0) - 55);
      }
      return char;
    })
    .join("");

  return mod97(numeric) === 1;
}
