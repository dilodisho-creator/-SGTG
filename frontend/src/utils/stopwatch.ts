import { Fight } from '../types';

export function isStopwatchEligible(fight: Fight): boolean {
  return Boolean(fight.gallo1.galpon || fight.gallo2.galpon)
    && !fight.tiempo?.trim()
    && !fight.gallo1.resultado
    && !fight.gallo2.resultado;
}
