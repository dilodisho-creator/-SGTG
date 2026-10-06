import { TournamentSettings } from '../types';

export type WeightUnit = TournamentSettings['unidadPeso'];

export function storedWeightToOunces(weight: number): number {
  const pounds = Math.floor(weight);
  const encoded = Math.round((weight - pounds) * 100);
  const ounces = encoded > 15 ? Math.round(encoded / 10) : encoded;
  return pounds * 16 + ounces;
}

export function ouncesToStoredWeight(ounces: number): number {
  const total = Math.max(0, Math.round(ounces));
  return Number(`${Math.floor(total / 16)}.${String(total % 16).padStart(2, '0')}`);
}

export function weightForInput(weight: number | null, unit: WeightUnit): string {
  if (weight === null || !Number.isFinite(weight)) return '';
  if (unit === 'onzas') return String(storedWeightToOunces(weight));
  const pounds = Math.floor(weight);
  const ounces = storedWeightToOunces(weight) - pounds * 16;
  return `${pounds}.${String(ounces).padStart(2, '0')}`;
}

export function weightFromInput(value: string | number, unit: WeightUnit): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  if (unit === 'onzas') return numeric <= 320 ? ouncesToStoredWeight(numeric) : null;
  const pounds = Math.floor(numeric);
  const ounces = Math.round((numeric - pounds) * 100);
  if (pounds > 20 || ounces > 15) return null;
  return Number(`${pounds}.${String(ounces).padStart(2, '0')}`);
}

export function weightFromExcel(value: unknown, unit: WeightUnit): number | null {
  const parsed = weightFromInput(String(value ?? ''), unit);
  if (parsed !== null || unit === 'onzas') return parsed;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  const pounds = Math.floor(numeric);
  const encoded = Math.round((numeric - pounds) * 100);
  if (encoded <= 15 || encoded % 10 !== 0 || encoded / 10 > 15) return null;
  return Number(`${pounds}.${String(encoded / 10).padStart(2, '0')}`);
}

export function formatWeight(weight: number | null, unit: WeightUnit): string {
  if (weight === null) return '-';
  if (unit === 'onzas') return `${storedWeightToOunces(weight)} oz`;
  return `${weightForInput(weight, unit)} lb oz`;
}

export function weightForExcel(weight: number | null, unit: WeightUnit): number | string | null {
  if (weight === null) return null;
  return unit === 'onzas' ? storedWeightToOunces(weight) : weightForInput(weight, unit);
}