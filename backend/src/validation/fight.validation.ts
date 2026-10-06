import { AppError } from '../errors';
import { Fight, FightResult, RoosterParticipant } from '../types';
import { isValidStoredWeight } from '../utils/weight';
import { secondsToTime, timeToSeconds } from '../utils/time';

const results = new Set<FightResult>(['', 'GANÓ', 'PERDIÓ', 'TABLAS']);

function text(value: unknown, field: string, maxLength = 120): string {
  if (typeof value !== 'string') throw new AppError(400, 'INVALID_FIELD', `${field} debe ser texto.`);
  return value.trim().slice(0, maxLength);
}

function participant(value: unknown, field: string): RoosterParticipant {
  if (!value || typeof value !== 'object') throw new AppError(400, 'INVALID_FIELD', `${field} no es válido.`);
  const source = value as Record<string, unknown>;
  const resultado = text(source.resultado ?? '', `${field}.resultado`, 10) as FightResult;
  if (!results.has(resultado)) throw new AppError(400, 'INVALID_RESULT', `El resultado de ${field} no es válido.`);
  const peso = source.peso === null || source.peso === '' || source.peso === undefined ? null : Number(source.peso);
  if (peso !== null && !isValidStoredWeight(peso)) {
    throw new AppError(400, 'INVALID_WEIGHT', `El peso de ${field} no es válido.`);
  }
  return {
    galpon: text(source.galpon ?? '', `${field}.galpon`),
    color: text(source.color ?? '', `${field}.color`, 50),
    peso,
    ficha: text(source.ficha ?? '', `${field}.ficha`, 30),
    resultado,
  };
}

export function validateFightUpdate(current: Fight, value: unknown): Fight {
  if (!value || typeof value !== 'object') throw new AppError(400, 'INVALID_BODY', 'Los datos de la pelea no son válidos.');
  const source = value as Record<string, unknown>;
  const gallo1 = participant(source.gallo1 ?? current.gallo1, 'gallo1');
  const gallo2 = participant(source.gallo2 ?? current.gallo2, 'gallo2');
  let tiempo = text(source.tiempo ?? current.tiempo, 'tiempo', 15);
  if (tiempo) {
    const secs = timeToSeconds(tiempo);
    if (!Number.isFinite(secs) || secs < 0) {
      throw new AppError(400, 'INVALID_TIME', 'El tiempo debe usar el formato minutos:segundos.');
    }
    tiempo = secondsToTime(secs);
  }
  const cajaSource = Object.prototype.hasOwnProperty.call(source, 'caja') ? source.caja : current.caja;
  const caja = cajaSource === null || cajaSource === '' ? null : Number(cajaSource);
  if (caja !== null && (!Number.isFinite(caja) || caja < 0)) {
    throw new AppError(400, 'INVALID_AMOUNT', 'El importe de caja no es válido.');
  }
  if (gallo1.resultado === 'GANÓ' && gallo2.resultado === 'GANÓ') {
    throw new AppError(400, 'INVALID_RESULT', 'Los dos participantes no pueden ganar la misma pelea.');
  }
  return { ...current, gallo1, gallo2, caja, tiempo };
}