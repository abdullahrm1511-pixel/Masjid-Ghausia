export const REGISTRATION_NUMBER_PREFIX = "11";

export function formatRegistrationNumber(sequence: number, prefix = REGISTRATION_NUMBER_PREFIX) {
  let remaining = Math.max(1, Math.floor(sequence));
  let width = 3;
  let capacity = 10 ** width - 1;

  while (remaining > capacity) {
    remaining -= capacity;
    width += 1;
    capacity = 10 ** width - 1;
  }

  return `${prefix}-${String(remaining).padStart(width, "0")}`;
}

export function isRegistrationNumber(value: string) {
  return /^11-\d{3,}$/.test(value.trim());
}

export function registrationSequence(value: string) {
  const match = value.trim().match(/^11-(\d+)$/);
  if (!match || match[1].length < 3) return null;

  const width = match[1].length;
  const numberWithinSet = Number(match[1]);
  if (!Number.isInteger(numberWithinSet) || numberWithinSet < 1) return null;

  let previousCapacity = 0;
  for (let currentWidth = 3; currentWidth < width; currentWidth += 1) {
    previousCapacity += 10 ** currentWidth - 1;
  }

  return previousCapacity + numberWithinSet;
}
