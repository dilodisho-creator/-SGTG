import { Fight, TournamentData } from '../types';
import { timeToSeconds } from './time';

export interface WinningFight {
  fight: Fight;
  galpon: string;
  seconds: number;
}

export function winningFights(data: TournamentData): WinningFight[] {
  return Object.values(data.hojas).flat()
    .map((fight) => ({
      fight,
      galpon: fight.gallo1.resultado === 'GANÓ' ? fight.gallo1.galpon : fight.gallo2.resultado === 'GANÓ' ? fight.gallo2.galpon : '',
      seconds: timeToSeconds(fight.tiempo),
    }))
    .filter((entry) => entry.galpon && Number.isFinite(entry.seconds));
}

export function pollonWinners(data: TournamentData): WinningFight[] {
  const winners = winningFights(data).sort((first, second) => first.seconds - second.seconds || first.fight.numero - second.fight.numero);
  if (data.configuracion.pollonCriterio === 'mejores') return winners.slice(0, data.configuracion.pollonCantidadMejores);
  const limit = Number(data.configuracion.pollonCriterio);
  return winners.filter((entry) => entry.seconds <= limit);
}

export function pollonFightNumbers(data: TournamentData): Set<number> {
  return new Set(pollonWinners(data).map((entry) => entry.fight.numero));
}