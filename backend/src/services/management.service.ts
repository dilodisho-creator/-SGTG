import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from '../config';
import { AppError } from '../errors';
import { readTournament, writeTournament } from '../store/tournament.store';
import { AuditEntry, RankingEntry, TournamentData, TournamentSettings } from '../types';
import { timeToSeconds } from '../utils/time';
import { pollonFightNumbers } from '../utils/pollon';

export function appendAudit(data: TournamentData, accion: string, entidad: string, entidadId: string, detalle = '', usuario = 'admin'): void {
  data.auditoria.unshift({ id: randomUUID(), usuario, accion, entidad, entidadId, detalle, fecha: new Date().toISOString() });
  data.auditoria = data.auditoria.slice(0, 1000);
}

export async function getAudit(): Promise<AuditEntry[]> {
  return (await readTournament()).auditoria;
}

export async function recordAccess(accion: 'ENTRAR' | 'SALIR', usuario: string): Promise<void> {
  const data = await readTournament();
  appendAudit(data, accion, 'Sesión', usuario, accion === 'ENTRAR' ? 'Inicio de sesión' : 'Cierre de sesión', usuario);
  await writeTournament(data);
}

export async function updateSettings(body: unknown): Promise<TournamentSettings> {
  if (!body || typeof body !== 'object') throw new AppError(400, 'INVALID_BODY', 'La configuración no es válida.');
  const source = body as Record<string, unknown>;
  const data = await readTournament();
  const mode = source.rankingModo;
  if (mode !== 'puntos' && mode !== 'tiempo') throw new AppError(400, 'INVALID_RANKING_MODE', 'El modo de ranking no es válido.');
  const pollonCriterio = source.pollonCriterio;
  if (pollonCriterio !== '30' && pollonCriterio !== '60' && pollonCriterio !== '120' && pollonCriterio !== 'mejores') throw new AppError(400, 'INVALID_POLLON_MODE', 'El criterio de pollón no es válido.');
  const unidadPeso = source.unidadPeso;
  if (unidadPeso !== 'libras_onzas' && unidadPeso !== 'onzas') throw new AppError(400, 'INVALID_WEIGHT_UNIT', 'La unidad de peso no es válida.');
  const numeric = (key: string, minimum: number) => {
    const value = Number(source[key]);
    if (!Number.isFinite(value) || value < minimum) throw new AppError(400, 'INVALID_SETTING', `${key} no es válido.`);
    return value;
  };
  data.configuracion = {
    nombreColiseo: typeof source.nombreColiseo === 'string' && source.nombreColiseo.trim() ? source.nombreColiseo.trim().slice(0, 150) : data.configuracion.nombreColiseo,
    nombreTorneo: typeof source.nombreTorneo === 'string' && source.nombreTorneo.trim() ? source.nombreTorneo.trim().slice(0, 100) : data.configuracion.nombreTorneo,
    nombreSistema: typeof source.nombreSistema === 'string' ? source.nombreSistema.trim().slice(0, 150) : (data.configuracion.nombreSistema ?? ''),
    logoBase64: typeof source.logoBase64 === 'string' ? source.logoBase64.slice(0, 2_000_000) : (data.configuracion.logoBase64 ?? ''),
    unidadPeso,
    rankingModo: mode,
    rankingFiltrarPorPeleas: source.rankingFiltrarPorPeleas === true,
    rankingMinimosPeleas: Number.isFinite(Number(source.rankingMinimosPeleas)) && Number(source.rankingMinimosPeleas) >= 1 ? Math.floor(Number(source.rankingMinimosPeleas)) : (data.configuracion.rankingMinimosPeleas ?? 2),
    victoriasRequeridasTiempo: Math.min(2, Math.max(1, Math.floor(numeric('victoriasRequeridasTiempo', 1)))),
    permitirEmpatesTiempo: source.permitirEmpatesTiempo === true,
    permitirDerrotasTiempo: source.permitirDerrotasTiempo === true,
    usarTiempoReglamentarioEmpate: source.usarTiempoReglamentarioEmpate !== false,
    puntosPollon: numeric('puntosPollon', 0),
    puntosVictoria: numeric('puntosVictoria', 0),
    puntosEmpate: numeric('puntosEmpate', 0),
    puntosDerrota: numeric('puntosDerrota', 0),
    duracionMaximaSegundos: numeric('duracionMaximaSegundos', 1),
    limiteTiempoActivo: source.limiteTiempoActivo !== false,
    diferenciaPesoMaximaOnzas: numeric('diferenciaPesoMaximaOnzas', 0),
    pollonMaximoSegundos: pollonCriterio === 'mejores' ? numeric('pollonMaximoSegundos', 1) : Number(pollonCriterio),
    pollonCriterio,
    pollonCantidadMejores: Math.max(1, Math.floor(numeric('pollonCantidadMejores', 1))),
    pollonesActivos: source.pollonesActivos !== false,
    pollonPremios: Array.isArray(source.pollonPremios) ? source.pollonPremios.slice(0, 10).map((item) => {
      const rule = item && typeof item === 'object' ? item as Record<string, unknown> : {};
      const maximoSegundos = Number(rule.maximoSegundos);
      const premio = Number(rule.premio);
      if (!Number.isFinite(maximoSegundos) || maximoSegundos < 1 || !Number.isFinite(premio) || premio < 0) throw new AppError(400, 'INVALID_POLLON_PRIZE', 'Una regla de premio de pollón no es válida.');
      return { maximoSegundos: Math.floor(maximoSegundos), premio };
    }).sort((a, b) => a.maximoSegundos - b.maximoSegundos) : data.configuracion.pollonPremios,
    premiosMontos: Array.isArray(source.premiosMontos) ? source.premiosMontos.map((value) => Math.max(0, Number(value) || 0)).slice(0, data.premios.length) : data.configuracion.premiosMontos,
    premiosCantidad: Math.min(data.premios.length, Math.max(1, Math.floor(numeric('premiosCantidad', 1)))),
  };

  data.coliseo = data.configuracion.nombreColiseo;
  data.premios = data.premios.map((prize, index) => ({ ...prize, premio: data.configuracion.premiosMontos[index] ?? prize.premio }));
  appendAudit(data, 'ACTUALIZAR', 'Configuración', 'torneo', `Modo de ranking: ${mode}`);
  await writeTournament(data);
  return data.configuracion;
}

export function buildRanking(data: TournamentData): RankingEntry[] {
  const pollonFights = pollonFightNumbers(data);
  const entries = new Map<string, Omit<RankingEntry, 'posicion'>>();
  const winningTimes = new Map<string, number[]>();
  const ensure = (galpon: string) => {
    const key = galpon.trim().toLocaleUpperCase('es-PE');
    if (!entries.has(key)) {
      entries.set(key, {
        galpon: galpon.trim(),
        peleas: 0,
        victorias: 0,
        empates: 0,
        derrotas: 0,
        puntos: 0,
        tiempoSegundos: 0,
        premioPollon: 0,
        clasificado: false,
      });
    }
    return entries.get(key)!;
  };

  for (const g of data.galpones ?? []) {
    if (g.nombre && g.nombre.trim()) ensure(g.nombre);
  }

  for (const fight of Object.values(data.hojas).flat()) {
    if (fight.gallo1?.galpon?.trim()) ensure(fight.gallo1.galpon);
    if (fight.gallo2?.galpon?.trim()) ensure(fight.gallo2.galpon);

    const sides = [fight.gallo1, fight.gallo2];
    for (const side of sides) {
      if (!side.galpon || !side.resultado) continue;
      const entry = ensure(side.galpon);
      entry.peleas += 1;
      if (side.resultado === 'GANÓ') {
        entry.victorias += 1;
        entry.puntos += pollonFights.has(fight.numero) ? data.configuracion.puntosPollon : data.configuracion.puntosVictoria;
        const seconds = timeToSeconds(fight.tiempo);
        if (Number.isFinite(seconds) && seconds > 0) {
          const key = side.galpon.trim().toLocaleUpperCase('es-PE');
          const times = winningTimes.get(key) ?? [];
          times.push(seconds);
          winningTimes.set(key, times);
          const prizeRule = (data.configuracion.pollonPremios ?? []).find((rule) => seconds <= rule.maximoSegundos);
          if (prizeRule) entry.premioPollon += prizeRule.premio;
        }
      } else if (side.resultado === 'TABLAS') {
        entry.empates += 1;
        entry.puntos += data.configuracion.puntosEmpate;
      } else if (side.resultado === 'PERDIÓ') {
        entry.derrotas += 1;
        entry.puntos += data.configuracion.puntosDerrota;
      }
    }
  }

  const reqWins = data.configuracion.victoriasRequeridasTiempo || 2;
  const isTiempoMode = data.configuracion.rankingModo === 'tiempo';
  for (const [key, entry] of entries) {
    const times = (winningTimes.get(key) ?? []).sort((a, b) => a - b);
    entry.tiempoSegundos = isTiempoMode
      ? times.slice(0, reqWins).reduce((sum, value) => sum + value, 0)
      : times.reduce((sum, value) => sum + value, 0);

    const meetsWins = entry.victorias >= reqWins;
    const meetsDraws = data.configuracion.permitirEmpatesTiempo || entry.empates === 0;
    const meetsLosses = data.configuracion.permitirDerrotasTiempo || entry.derrotas === 0;
    entry.clasificado = meetsWins && meetsDraws && meetsLosses;
  }

  const allEntries = Array.from(entries.values());
  if (data.configuracion.rankingModo === 'tiempo') {
    allEntries.sort((first, second) => {
      const firstClas = first.clasificado ? 1 : 0;
      const secondClas = second.clasificado ? 1 : 0;
      if (firstClas !== secondClas) return secondClas - firstClas;

      if (firstClas && secondClas) {
        const firstTime = first.tiempoSegundos > 0 ? first.tiempoSegundos : 999999;
        const secondTime = second.tiempoSegundos > 0 ? second.tiempoSegundos : 999999;
        if (firstTime !== secondTime) return firstTime - secondTime;
        if (first.puntos !== second.puntos) return second.puntos - first.puntos;
        return first.galpon.localeCompare(second.galpon);
      }

      const firstEligible = (data.configuracion.permitirEmpatesTiempo || first.empates === 0) &&
        (data.configuracion.permitirDerrotasTiempo || first.derrotas === 0);
      const secondEligible = (data.configuracion.permitirEmpatesTiempo || second.empates === 0) &&
        (data.configuracion.permitirDerrotasTiempo || second.derrotas === 0);
      if (firstEligible !== secondEligible) return (secondEligible ? 1 : 0) - (firstEligible ? 1 : 0);

      if (first.victorias !== second.victorias) return second.victorias - first.victorias;

      const firstTime = first.tiempoSegundos > 0 ? first.tiempoSegundos : 999999;
      const secondTime = second.tiempoSegundos > 0 ? second.tiempoSegundos : 999999;
      if (firstTime !== secondTime) return firstTime - secondTime;

      if (first.puntos !== second.puntos) return second.puntos - first.puntos;
      return first.galpon.localeCompare(second.galpon);
    });
  } else {
    allEntries.sort((first, second) => {
      if (first.puntos !== second.puntos) return second.puntos - first.puntos;
      if (first.victorias !== second.victorias) return second.victorias - first.victorias;
      const firstTime = first.tiempoSegundos > 0 ? first.tiempoSegundos : 999999;
      const secondTime = second.tiempoSegundos > 0 ? second.tiempoSegundos : 999999;
      if (firstTime !== secondTime) return firstTime - secondTime;
      if (first.derrotas !== second.derrotas) return first.derrotas - second.derrotas;
      return first.galpon.localeCompare(second.galpon);
    });
  }

  return allEntries.map((entry, index) => ({ posicion: index + 1, ...entry }));
}

export async function getRanking(): Promise<RankingEntry[]> {
  return buildRanking(await readTournament());
}

export async function listBackups() {
  await mkdir(config.backupDirectory, { recursive: true });
  const files = (await readdir(config.backupDirectory)).filter((file) => file.endsWith('.json'));
  return Promise.all(files.map(async (filename) => {
    const info = await stat(path.join(config.backupDirectory, filename));
    return { filename, size: info.size, createdAt: info.mtime.toISOString() };
  })).then((items) => items.sort((first, second) => second.createdAt.localeCompare(first.createdAt)));
}

export async function createBackup() {
  const data = await readTournament();
  appendAudit(data, 'CREAR', 'Respaldo', 'manual', 'Respaldo manual creado');
  await writeTournament(data);
  await mkdir(config.backupDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `respaldo-simple-${timestamp}.json`;
  const destination = path.join(config.backupDirectory, filename);
  await writeFile(destination, JSON.stringify(data, null, 2), 'utf8');
  const info = await stat(destination);
  return { filename, size: info.size, createdAt: info.mtime.toISOString() };
}

export async function restoreBackup(filename: string): Promise<TournamentData> {
  if (path.basename(filename) !== filename || !filename.endsWith('.json')) throw new AppError(400, 'INVALID_BACKUP', 'El respaldo seleccionado no es válido.');
  const source = path.join(config.backupDirectory, filename);
  let parsed: Partial<TournamentData>;
  try {
    parsed = JSON.parse(await readFile(source, 'utf8')) as Partial<TournamentData>;
  } catch {
    throw new AppError(400, 'INVALID_BACKUP', 'No se pudo leer el respaldo.');
  }
  if (!parsed.hojas || typeof parsed.hojas !== 'object') throw new AppError(400, 'INVALID_BACKUP', 'El respaldo no contiene datos válidos.');
  await mkdir(config.backupDirectory, { recursive: true });
  const current = await readTournament();
  await writeFile(path.join(config.backupDirectory, `antes-de-restaurar-${Date.now()}.json`), JSON.stringify(current, null, 2), 'utf8');
  const restored = parsed as TournamentData;
  appendAudit(restored, 'RESTAURAR', 'Respaldo', filename, 'Datos restaurados desde respaldo');
  await writeTournament(restored);
  return restored;
}

export async function deleteBackup(filename: string): Promise<void> {
  if (path.basename(filename) !== filename || !filename.endsWith('.json')) throw new AppError(400, 'INVALID_BACKUP', 'El respaldo seleccionado no es válido.');
  const target = path.join(config.backupDirectory, filename);
  try {
    await stat(target);
  } catch {
    throw new AppError(404, 'BACKUP_NOT_FOUND', 'El respaldo no existe.');
  }
  await rm(target);
}