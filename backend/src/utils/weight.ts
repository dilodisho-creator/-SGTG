export function isValidStoredWeight(value: number): boolean {
  if (!Number.isFinite(value) || value <= 0) return false;
  const pounds = Math.floor(value);
  const encoded = Math.round((value - pounds) * 100);
  if (encoded > 15 && encoded % 10 !== 0) return false;
  const ounces = encoded > 15 ? encoded / 10 : encoded;
  return pounds <= 20 && ounces >= 0 && ounces <= 15;
}

export function storedWeightToOunces(value: number): number {
  const pounds = Math.floor(value);
  const encoded = Math.round((value - pounds) * 100);
  const ounces = encoded > 15 ? encoded / 10 : encoded;
  return pounds * 16 + ounces;
}