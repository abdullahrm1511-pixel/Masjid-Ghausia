export const REGISTRATION_NUMBER_PREFIX = "11";

const MIN_REGISTRATION_NUMBER_WIDTH = 5;

export function formatRegistrationNumber(sequence: number, prefix = REGISTRATION_NUMBER_PREFIX) {
  let remaining = Math.max(1, Math.floor(sequence));
  let width = MIN_REGISTRATION_NUMBER_WIDTH;
  let capacity = 10 ** width - 1;

  while (remaining > capacity) {
    remaining -= capacity;
    width += 1;
    capacity = 10 ** width - 1;
  }

  return `${prefix}-${String(remaining).padStart(width, "0")}`;
}

export function isRegistrationNumber(value: string) {
  return /^11-\d{5,}$/.test(value.trim());
}

export function registrationSequence(value: string) {
  const match = value.trim().match(/^11-(\d+)$/);
  if (!match || match[1].length < MIN_REGISTRATION_NUMBER_WIDTH) return null;

  const width = match[1].length;
  const numberWithinSet = Number(match[1]);
  if (!Number.isInteger(numberWithinSet) || numberWithinSet < 1) return null;

  let previousCapacity = 0;
  for (let currentWidth = MIN_REGISTRATION_NUMBER_WIDTH; currentWidth < width; currentWidth += 1) {
    previousCapacity += 10 ** currentWidth - 1;
  }

  return previousCapacity + numberWithinSet;
}
