import { AppError } from '../errors';
import { archiveTournament as archiveStoredTournament, createTournament as createStoredTournament, deleteTournament as deleteStoredTournament, listTournaments as listStoredTournaments, reactivateTournament as reactivateStoredTournament, readTournament, resetTournament, selectTournament as selectStoredTournament, updateTournamentSummary, writeTournament } from '../store/tournament.store';
import { Fight, FrenteRecord, PollonRecord, PrizeRecord, TournamentData } from '../types';
import { secondsToTime, timeToSeconds } from '../utils/time';
import { pollonWinners, winningFights } from '../utils/pollon';
import { isValidStoredWeight, storedWeightToOunces } from '../utils/weight';
import { validateFightUpdate } from '../validation/fight.validation';
import { randomUUID } from 'node:crypto';
import { appendAudit, buildRanking, createBackup } from './management.service';

function allFights(data: TournamentData): Fight[] {
  return Object.values(data.hojas).flat();
}

export async function getTournament(): Promise<TournamentData> {
  return readTournament();
}

export async function updateFight(number: number, body: unknown): Promise<Fight> {
  const data = await readTournament();
  const fight = allFights(data).find((item) => item.numero === number);
  if (!fight) throw new AppError(404, 'FIGHT_NOT_FOUND', `No existe la pelea ${number}.`);
  const updated = validateFightUpdate(fight, body);
  const updatedSeconds = timeToSeconds(updated.tiempo);
  if (data.configuracion.limiteTiempoActivo && Number.isFinite(updatedSeconds) && updatedSeconds > data.configuracion.duracionMaximaSegundos) throw new AppError(400, 'TIME_LIMIT_EXCEEDED', 'El tiempo supera el límite reglamentario configurado.');
  const sheet = data.hojas[fight.hoja];
  const index = sheet.findIndex((item) => item.numero === number);
  sheet[index] = updated;
  appendAudit(data, 'ACTUALIZAR', 'Pelea', String(number), 'Datos o resultado de pelea modificados');
  await writeTournament(data);
  return updated;
}

export async function calculatePollones(): Promise<PollonRecord[]> {
  const data = await readTournament();
  if (!data.configuracion.pollonesActivos) throw new AppError(400, 'POLLONES_DISABLED', 'La clasificación de pollones está desactivada en configuración.');
  const winners = pollonWinners(data);
  data.pollones = Array.from({ length: winners.length }, (_, index) => ({
    numero: index + 1,
    galpon: winners[index]?.galpon ?? '',
    firma: '',
    tiempo: winners[index]?.fight.tiempo ?? '',
  }));
  appendAudit(data, 'CALCULAR', 'Pollones', 'clasificacion', `${winners.length} ganadores clasificados`);
  await writeTournament(data);
  return data.pollones;
}

export async function calculateFrentes(): Promise<FrenteRecord[]> {
  const data = await readTournament();
  const groups = new Map<string, Array<{ number: number; time: string; seconds: number }>>();
  for (const entry of winningFights(data)) {
    const key = entry.galpon.trim().toLocaleUpperCase('es-PE');
    const values = groups.get(key) ?? [];
    values.push({ number: entry.fight.numero, time: entry.fight.tiempo, seconds: entry.seconds });
    groups.set(key, values);
  }
  const ranking = buildRanking(data).map((entry) => ({ galpon: entry.galpon, wins: (groups.get(entry.galpon.trim().toLocaleUpperCase('es-PE')) ?? []).sort((a, b) => a.seconds - b.seconds) })).filter((entry) => entry.wins.length > 0);
  data.frentes = Array.from({ length: ranking.length }, (_, index) => {
    const entry = ranking[index];
    const first = entry.wins[0];
    const second = entry.wins[1];
    const selected = entry.wins.slice(0, data.configuracion.victoriasRequeridasTiempo);
    const sum = selected.reduce((total, win) => total + win.seconds, 0);
    return {
      numero: index + 1,
      galpon: entry.galpon,
      peleas: selected.map((win) => win.number).join(', '),
      tiempo1: first.time,
      tiempo2: second?.time ?? '',
      resultado: secondsToTime(sum),
    };
  });
  appendAudit(data, 'CALCULAR', 'Frentes', 'clasificacion', `${ranking.length} galpones clasificados`);
  await writeTournament(data);
  return data.frentes;
}

export async function calculatePrizes(): Promise<TournamentData['premios']> {
  const data = await readTournament();
  const ranked = buildRanking(data);
  const eligible = data.configuracion.rankingModo === 'tiempo'
    ? ranked.filter((entry) => entry.clasificado)
    : ranked.filter((entry) => entry.peleas > 0 && entry.puntos > 0);
  const winners = eligible.slice(0, data.configuracion.premiosCantidad);
  data.premios = data.premios.map((prize, index) => ({
    ...prize,
    galpon: index < winners.length ? winners[index].galpon : '',
    tiempo: index < winners.length ? secondsToTime(winners[index].tiempoSegundos) : '',
    firma: '',
  }));
  appendAudit(data, 'CALCULAR', 'Premios', 'clasificacion', 'Premios asignados desde ranking');
  await writeTournament(data);
  return data.premios;
}

export async function updatePrize(id: number, body: unknown): Promise<PrizeRecord> {
  if (!body || typeof body !== 'object') throw new AppError(400, 'INVALID_BODY', 'Los datos no son válidos.');
  const source = body as Record<string, unknown>;
  const data = await readTournament();
  const prize = data.premios.find((item) => item.id === id);
  if (!prize) throw new AppError(404, 'PRIZE_NOT_FOUND', 'El premio no existe.');
  prize.galpon = typeof source.galpon === 'string' ? source.galpon.trim().slice(0, 100) : prize.galpon;
  prize.tiempo = typeof source.tiempo === 'string' ? source.tiempo.trim().slice(0, 8) : prize.tiempo;
  prize.firma = typeof source.firma === 'string' ? source.firma.trim().slice(0, 100) : prize.firma;
  appendAudit(data, 'ACTUALIZAR', 'Premio', String(id), `${prize.puesto}: ${prize.galpon || 'sin asignar'}`);
  await writeTournament(data);
  return prize;
}

function importedParticipant(value: unknown): Fight['gallo1'] {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const result = source.resultado;
  return {
    galpon: typeof source.galpon === 'string' ? source.galpon.trim().slice(0, 100) : '',
    color: typeof source.color === 'string' ? source.color.trim().slice(0, 50) : '',
    peso: Number.isFinite(Number(source.peso)) ? Number(source.peso) : null,
    ficha: source.ficha === null || source.ficha === undefined ? '' : String(source.ficha).trim().slice(0, 30),
    resultado: result === 'GANÓ' || result === 'PERDIÓ' || result === 'TABLAS' ? result : '',
  };
}

export async function importTournament(body: unknown): Promise<TournamentData> {
  if (!body || typeof body !== 'object') throw new AppError(400, 'INVALID_IMPORT', 'El archivo importado no contiene datos válidos.');
  const source = body as Record<string, unknown>;
  if (!source.hojas || typeof source.hojas !== 'object' || Array.isArray(source.hojas)) throw new AppError(400, 'INVALID_IMPORT', 'No se encontraron las hojas de peleas.');
  const current = await readTournament();
  const hojas: Record<string, Fight[]> = {};
  for (const [sheetName, records] of Object.entries(source.hojas as Record<string, unknown>)) {
    if (!Array.isArray(records)) continue;
    hojas[sheetName.slice(0, 30)] = records.map((record, index) => {
      const item = record && typeof record === 'object' ? record as Record<string, unknown> : {};
      const number = Number(item.numero);
      return {
        numero: Number.isInteger(number) && number > 0 ? number : index + 1,
        hoja: sheetName.slice(0, 30),
        gallo1: importedParticipant(item.gallo1),
        gallo2: importedParticipant(item.gallo2),
        caja: Number.isFinite(Number(item.caja)) ? Math.max(0, Number(item.caja)) : null,
        tiempo: typeof item.tiempo === 'string' && /^\d+:[0-5]\d$/.test(item.tiempo) ? item.tiempo : '',
      };
    });
  }
  const fights = Object.values(hojas).flat();
  if (fights.length === 0) throw new AppError(400, 'INVALID_IMPORT', 'No se encontraron peleas para importar.');
  const establishments = new Map<string, TournamentData['galpones'][number]>();
  const roosters = new Map<string, TournamentData['gallos'][number]>();
  for (const fight of fights) {
    for (const participant of [fight.gallo1, fight.gallo2]) {
      if (!participant.galpon) continue;
      const establishmentKey = participant.galpon.toLocaleUpperCase('es-PE');
      let establishment = establishments.get(establishmentKey);
      if (!establishment) {
        establishment = { id: randomUUID(), nombre: participant.galpon, propietario: '', telefono: '', estado: 'activo', creadoEn: new Date().toISOString() };
        establishments.set(establishmentKey, establishment);
      }
      if (!participant.ficha || participant.peso === null || !participant.color) continue;
      const roosterKey = `${establishmentKey}|${participant.ficha.toLocaleUpperCase('es-PE')}`;
      if (!roosters.has(roosterKey)) roosters.set(roosterKey, { id: randomUUID(), galponId: establishment.id, ficha: participant.ficha, color: participant.color, peso: participant.peso, estado: 'asignado', creadoEn: new Date().toISOString() });
    }
  }
  const pollones = Array.isArray(source.pollones) ? source.pollones.slice(0, 40).map((value, index) => {
    const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    return { numero: index + 1, galpon: String(item.galpon ?? '').trim(), firma: '', tiempo: String(item.tiempo ?? '').trim() };
  }).filter((item) => item.galpon || item.tiempo) : current.pollones;
  const frentes = Array.isArray(source.frentes) ? source.frentes.slice(0, 93).map((value, index) => {
    const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    return { numero: index + 1, galpon: String(item.galpon ?? '').trim(), peleas: String(item.peleas ?? '').trim(), tiempo1: String(item.tiempo1 ?? '').trim(), tiempo2: String(item.tiempo2 ?? '').trim(), resultado: String(item.resultado ?? '').trim() };
  }).filter((item) => item.galpon || item.peleas || item.resultado) : current.frentes;
  const prizes = Array.isArray(source.premios) ? source.premios.slice(0, 4).map((value, index) => {
    const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const fallback = current.premios[index];
    return { id: index + 1, puesto: String(item.puesto ?? fallback?.puesto ?? `PREMIO ${index + 1}`).trim(), premio: Number.isFinite(Number(item.premio)) ? Math.max(0, Number(item.premio)) : fallback?.premio ?? 0, galpon: String(item.galpon ?? '').trim(), tiempo: String(item.tiempo ?? '').trim(), firma: '' };
  }) : current.premios;
  await createBackup();
  const imported: TournamentData = {
    ...current,
    coliseo: typeof source.coliseo === 'string' && source.coliseo.trim() ? source.coliseo.trim().slice(0, 150) : current.coliseo,
    totalPeleas: fights.length,
    hojas,
    pollones,
    frentes,
    premios: prizes,
    galpones: Array.from(establishments.values()),
    gallos: Array.from(roosters.values()),
    configuracion: { ...current.configuracion, nombreColiseo: typeof source.coliseo === 'string' && source.coliseo.trim() ? source.coliseo.trim().slice(0, 150) : current.configuracion.nombreColiseo, premiosMontos: prizes.map((item) => item.premio) },
    auditoria: current.auditoria,
  };
  appendAudit(imported, 'IMPORTAR', 'Excel', 'formato-oficial', `${fights.length} peleas importadas`);
  await writeTournament(imported);
  return imported;
}

export async function resetFights(): Promise<TournamentData> {
  const data = await readTournament();
  let cleared = 0;
  for (const fight of allFights(data)) {
    if (fight.gallo1.galpon || fight.gallo2.galpon) cleared += 1;
    fight.gallo1 = clearParticipant();
    fight.gallo2 = clearParticipant();
    fight.caja = null;
    fight.tiempo = '';
  }
  data.gallos.forEach((rooster) => {
    if (rooster.estado === 'asignado') rooster.estado = 'disponible';
  });
  data.pollones = [];
  data.frentes = [];
  data.premios = data.premios.map((prize) => ({ ...prize, galpon: '', tiempo: '', firma: '' }));
  appendAudit(data, 'REINICIAR', 'Peleas', 'torneo-actual', `${cleared} enfrentamientos eliminados; gallos y galpones conservados`);
  await writeTournament(data);
  return data;
}

export async function restoreTournament(): Promise<TournamentData> {
  await resetTournament();
  const data = await readTournament();
  appendAudit(data, 'RESTABLECER', 'Torneo', 'datos-iniciales', 'Datos restaurados al estado inicial');
  await writeTournament(data);
  return data;
}

function requiredText(value: unknown, field: string, maxLength = 80): string {
  if (typeof value !== 'string' || !value.trim()) throw new AppError(400, 'INVALID_FIELD', `${field} es obligatorio.`);
  return value.trim().slice(0, maxLength);
}

export async function createEstablishment(body: unknown) {
  if (!body || typeof body !== 'object') throw new AppError(400, 'INVALID_BODY', 'Los datos no son válidos.');
  const source = body as Record<string, unknown>;
  const data = await readTournament();
  const nombre = requiredText(source.nombre, 'El nombre del galpón');
  if (data.galpones.some((item) => item.nombre.toLocaleUpperCase('es-PE') === nombre.toLocaleUpperCase('es-PE'))) {
    throw new AppError(409, 'DUPLICATE_ESTABLISHMENT', 'Ya existe un galpón con ese nombre.');
  }
  const establishment = {
    id: randomUUID(),
    nombre,
    propietario: typeof source.propietario === 'string' ? source.propietario.trim().slice(0, 100) : '',
    telefono: typeof source.telefono === 'string' ? source.telefono.trim().slice(0, 30) : '',
    estado: 'activo' as const,
    creadoEn: new Date().toISOString(),
  };
  data.galpones.push(establishment);
  appendAudit(data, 'CREAR', 'Galpón', establishment.id, establishment.nombre);
  await writeTournament(data);
  return establishment;
}

export async function updateEstablishment(id: string, body: unknown) {
  if (!body || typeof body !== 'object') throw new AppError(400, 'INVALID_BODY', 'Los datos no son válidos.');
  const source = body as Record<string, unknown>;
  const data = await readTournament();
  const establishment = data.galpones.find((item) => item.id === id);
  if (!establishment) throw new AppError(404, 'ESTABLISHMENT_NOT_FOUND', 'El galpón no existe.');
  const nombre = requiredText(source.nombre, 'El nombre del galpón');
  if (data.galpones.some((item) => item.id !== id && item.nombre.toLocaleUpperCase('es-PE') === nombre.toLocaleUpperCase('es-PE'))) throw new AppError(409, 'DUPLICATE_ESTABLISHMENT', 'Ya existe un galpón con ese nombre.');
  establishment.nombre = nombre;
  establishment.propietario = typeof source.propietario === 'string' ? source.propietario.trim().slice(0, 100) : '';
  establishment.telefono = typeof source.telefono === 'string' ? source.telefono.trim().slice(0, 30) : '';
  establishment.estado = source.estado === 'inactivo' ? 'inactivo' : 'activo';
  appendAudit(data, 'ACTUALIZAR', 'Galpón', id, nombre);
  await writeTournament(data);
  return establishment;
}

export async function deleteEstablishment(id: string): Promise<void> {
  const data = await readTournament();
  if (data.gallos.some((item) => item.galponId === id)) throw new AppError(409, 'ESTABLISHMENT_IN_USE', 'El galpón tiene gallos registrados.');
  const index = data.galpones.findIndex((item) => item.id === id);
  if (index < 0) throw new AppError(404, 'ESTABLISHMENT_NOT_FOUND', 'El galpón no existe.');
  appendAudit(data, 'ELIMINAR', 'Galpón', id, data.galpones[index].nombre);
  data.galpones.splice(index, 1);
  await writeTournament(data);
}

export async function createRooster(body: unknown) {
  if (!body || typeof body !== 'object') throw new AppError(400, 'INVALID_BODY', 'Los datos no son válidos.');
  const source = body as Record<string, unknown>;
  const data = await readTournament();
  const galponId = requiredText(source.galponId, 'El galpón');
  if (!data.galpones.some((item) => item.id === galponId)) throw new AppError(404, 'ESTABLISHMENT_NOT_FOUND', 'El galpón seleccionado no existe.');
  const ficha = requiredText(source.ficha, 'La ficha', 30);
  if (data.gallos.some((item) => item.galponId === galponId && item.ficha.toLocaleUpperCase('es-PE') === ficha.toLocaleUpperCase('es-PE'))) {
    throw new AppError(409, 'DUPLICATE_BAND', 'Ya existe un gallo con esa ficha en el galpón seleccionado.');
  }
  const peso = Number(source.peso);
  if (!isValidStoredWeight(peso)) throw new AppError(400, 'INVALID_WEIGHT', 'El peso no es válido. Use libras y onzas con un máximo de 15 onzas.');
  const rooster = {
    id: randomUUID(),
    galponId,
    ficha,
    color: requiredText(source.color, 'El color', 50),
    peso,
    estado: 'disponible' as const,
    creadoEn: new Date().toISOString(),
  };
  data.gallos.push(rooster);
  appendAudit(data, 'CREAR', 'Gallo', rooster.id, `Ficha ${rooster.ficha}`);
  await writeTournament(data);
  return rooster;
}

export async function updateRooster(id: string, body: unknown) {
  if (!body || typeof body !== 'object') throw new AppError(400, 'INVALID_BODY', 'Los datos no son válidos.');
  const source = body as Record<string, unknown>;
  const data = await readTournament();
  const rooster = data.gallos.find((item) => item.id === id);
  if (!rooster) throw new AppError(404, 'ROOSTER_NOT_FOUND', 'El gallo no existe.');
  const galponId = requiredText(source.galponId, 'El galpón');
  if (!data.galpones.some((item) => item.id === galponId)) throw new AppError(404, 'ESTABLISHMENT_NOT_FOUND', 'El galpón seleccionado no existe.');
  const ficha = requiredText(source.ficha, 'La ficha', 30);
  if (data.gallos.some((item) => item.id !== id && item.galponId === galponId && item.ficha.toLocaleUpperCase('es-PE') === ficha.toLocaleUpperCase('es-PE'))) throw new AppError(409, 'DUPLICATE_BAND', 'Ya existe un gallo con esa ficha en el galpón seleccionado.');
  const peso = Number(source.peso);
  if (!isValidStoredWeight(peso)) throw new AppError(400, 'INVALID_WEIGHT', 'El peso no es válido. Use libras y onzas con un máximo de 15 onzas.');
  rooster.galponId = galponId;
  rooster.ficha = ficha;
  rooster.color = requiredText(source.color, 'El color', 50);
  rooster.peso = peso;
  rooster.estado = source.estado === 'retirado' ? 'retirado' : source.estado === 'asignado' ? 'asignado' : 'disponible';
  appendAudit(data, 'ACTUALIZAR', 'Gallo', id, `Ficha ${ficha}`);
  await writeTournament(data);
  return rooster;
}

export async function deleteRooster(id: string): Promise<void> {
  const data = await readTournament();
  const index = data.gallos.findIndex((item) => item.id === id);
  if (index < 0) throw new AppError(404, 'ROOSTER_NOT_FOUND', 'El gallo no existe.');
  if (data.gallos[index].estado === 'asignado') throw new AppError(409, 'ROOSTER_ASSIGNED', 'No puede eliminar un gallo asignado. Cancele primero su pelea.');
  appendAudit(data, 'ELIMINAR', 'Gallo', id, `Ficha ${data.gallos[index].ficha}`);
  data.gallos.splice(index, 1);
  await writeTournament(data);
}

export async function assignFight(body: unknown): Promise<Fight> {
  if (!body || typeof body !== 'object') throw new AppError(400, 'INVALID_BODY', 'Los datos no son válidos.');
  const source = body as Record<string, unknown>;
  const data = await readTournament();
  const number = Number(source.numero);
  const fight = allFights(data).find((item) => item.numero === number);
  if (!fight) throw new AppError(404, 'FIGHT_NOT_FOUND', 'La pelea seleccionada no existe.');
  const first = data.gallos.find((item) => item.id === source.gallo1Id);
  const second = data.gallos.find((item) => item.id === source.gallo2Id);
  if (!first || !second) throw new AppError(404, 'ROOSTER_NOT_FOUND', 'Uno de los gallos seleccionados no existe.');
  if (first.estado !== 'disponible' || second.estado !== 'disponible') throw new AppError(409, 'ROOSTER_UNAVAILABLE', 'Uno de los gallos ya está asignado o retirado.');
  if (first.id === second.id) throw new AppError(400, 'SAME_ROOSTER', 'Debe seleccionar dos gallos diferentes.');
  const firstEstablishment = data.galpones.find((item) => item.id === first.galponId);
  const secondEstablishment = data.galpones.find((item) => item.id === second.galponId);
  if (!firstEstablishment || !secondEstablishment) throw new AppError(400, 'INVALID_ESTABLISHMENT', 'Los gallos deben pertenecer a un galpón válido.');
  if (firstEstablishment.id === secondEstablishment.id) throw new AppError(400, 'SAME_ESTABLISHMENT', 'Los gallos deben pertenecer a galpones diferentes.');
  const caja = source.caja === '' || source.caja === undefined || source.caja === null ? null : Number(source.caja);
  if (caja !== null && (!Number.isFinite(caja) || caja < 0)) throw new AppError(400, 'INVALID_AMOUNT', 'El importe de caja no es válido.');
  fight.gallo1 = { galpon: firstEstablishment.nombre, color: first.color, peso: first.peso, ficha: first.ficha, resultado: '' };
  fight.gallo2 = { galpon: secondEstablishment.nombre, color: second.color, peso: second.peso, ficha: second.ficha, resultado: '' };
  fight.caja = caja;
  fight.tiempo = '';
  first.estado = 'asignado';
  second.estado = 'asignado';
  appendAudit(data, 'PROGRAMAR', 'Pelea', String(number), `${firstEstablishment.nombre} contra ${secondEstablishment.nombre}`);
  await writeTournament(data);
  return fight;
}

function clearParticipant(): Fight['gallo1'] {
  return { galpon: '', color: '', peso: null, ficha: '', resultado: '' };
}

export async function cancelFight(number: number): Promise<void> {
  const data = await readTournament();
  const fight = allFights(data).find((item) => item.numero === number);
  if (!fight) throw new AppError(404, 'FIGHT_NOT_FOUND', 'La pelea seleccionada no existe.');
  if (!fight.gallo1.galpon || !fight.gallo2.galpon) throw new AppError(409, 'FIGHT_EMPTY', 'La pelea ya está disponible.');
  if (fight.gallo1.resultado || fight.gallo2.resultado) throw new AppError(409, 'FIGHT_COMPLETED', 'Una pelea finalizada no se puede cancelar. Primero quite el resultado.');
  for (const participant of [fight.gallo1, fight.gallo2]) {
    const establishment = data.galpones.find((item) => item.nombre.toLocaleUpperCase('es-PE') === participant.galpon.toLocaleUpperCase('es-PE'));
    const rooster = data.gallos.find((item) => item.galponId === establishment?.id && item.ficha.toLocaleUpperCase('es-PE') === participant.ficha.toLocaleUpperCase('es-PE'));
    if (rooster && rooster.estado === 'asignado') rooster.estado = 'disponible';
  }
  const detail = `${fight.gallo1.galpon} contra ${fight.gallo2.galpon}`;
  fight.gallo1 = clearParticipant();
  fight.gallo2 = clearParticipant();
  fight.caja = null;
  fight.tiempo = '';
  appendAudit(data, 'CANCELAR', 'Pelea', String(number), detail);
  await writeTournament(data);
}

export async function drawFights(body: unknown): Promise<{ creadas: number; sinPareja: number; propuestas: Array<{ numero: number; gallo1: string; gallo2: string; diferenciaOnzas: number }> }> {
  const source = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const data = await readTournament();
  const availableSlots = allFights(data).filter((fight) => !fight.gallo1.galpon && !fight.gallo2.galpon).sort((a, b) => a.numero - b.numero);
  const availableRoosters = data.gallos.filter((item) => item.estado === 'disponible' && data.galpones.some((establishment) => establishment.id === item.galponId && establishment.estado === 'activo'));
  const requested = source.cantidad === undefined ? availableSlots.length : Math.max(1, Math.floor(Number(source.cantidad)));
  if (!Number.isFinite(requested)) throw new AppError(400, 'INVALID_AMOUNT', 'La cantidad de peleas no es válida.');
  const candidates: Array<{ first: typeof availableRoosters[number]; second: typeof availableRoosters[number]; difference: number }> = [];
  for (let firstIndex = 0; firstIndex < availableRoosters.length; firstIndex++) {
    for (let secondIndex = firstIndex + 1; secondIndex < availableRoosters.length; secondIndex++) {
      const first = availableRoosters[firstIndex];
      const second = availableRoosters[secondIndex];
      if (first.galponId === second.galponId) continue;
      const difference = Math.abs(storedWeightToOunces(first.peso) - storedWeightToOunces(second.peso));
      if (difference <= data.configuracion.diferenciaPesoMaximaOnzas) candidates.push({ first, second, difference });
    }
  }
  candidates.sort((a, b) => a.difference - b.difference || a.first.creadoEn.localeCompare(b.first.creadoEn));
  const used = new Set<string>();
  const pairs = [];
  for (const candidate of candidates) {
    if (pairs.length >= Math.min(requested, availableSlots.length)) break;
    if (used.has(candidate.first.id) || used.has(candidate.second.id)) continue;
    used.add(candidate.first.id);
    used.add(candidate.second.id);
    pairs.push(candidate);
  }
  const propuestas = pairs.map((pair, index) => ({
    numero: availableSlots[index].numero,
    gallo1: `${data.galpones.find((item) => item.id === pair.first.galponId)?.nombre ?? ''} · ${pair.first.ficha}`,
    gallo2: `${data.galpones.find((item) => item.id === pair.second.galponId)?.nombre ?? ''} · ${pair.second.ficha}`,
    diferenciaOnzas: pair.difference,
  }));
  if (source.confirmar === false) return { creadas: pairs.length, sinPareja: availableRoosters.length - pairs.length * 2, propuestas };
  pairs.forEach((pair, index) => {
    const fight = availableSlots[index];
    const firstEstablishment = data.galpones.find((item) => item.id === pair.first.galponId)!;
    const secondEstablishment = data.galpones.find((item) => item.id === pair.second.galponId)!;
    fight.gallo1 = { galpon: firstEstablishment.nombre, color: pair.first.color, peso: pair.first.peso, ficha: pair.first.ficha, resultado: '' };
    fight.gallo2 = { galpon: secondEstablishment.nombre, color: pair.second.color, peso: pair.second.peso, ficha: pair.second.ficha, resultado: '' };
    fight.caja = null;
    fight.tiempo = '';
    pair.first.estado = 'asignado';
    pair.second.estado = 'asignado';
  });
  appendAudit(data, 'SORTEAR', 'Peleas', 'automatico', `${pairs.length} enfrentamientos creados`);
  await writeTournament(data);
  return { creadas: pairs.length, sinPareja: availableRoosters.length - pairs.length * 2, propuestas };
}

export async function listTournaments() {
  return listStoredTournaments();
}

export async function createTournament(body: unknown): Promise<TournamentData> {
  if (!body || typeof body !== 'object') throw new AppError(400, 'INVALID_BODY', 'Los datos no son válidos.');
  const source = body as Record<string, unknown>;
  const nombre = requiredText(source.nombre, 'El nombre del torneo', 100);
  const fecha = typeof source.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(source.fecha) ? source.fecha : new Date().toISOString().slice(0, 10);
  const data = await createStoredTournament(nombre, fecha);
  appendAudit(data, 'CREAR', 'Torneo', nombre, `Fecha ${fecha}`);
  await writeTournament(data);
  return data;
}

export async function selectTournament(id: string): Promise<TournamentData> {
  try {
    const data = await selectStoredTournament(id);
    appendAudit(data, 'SELECCIONAR', 'Torneo', id, data.configuracion.nombreTorneo);
    await writeTournament(data);
    return data;
  } catch (error) {
    if (error instanceof Error && error.message === 'TOURNAMENT_ARCHIVED') throw new AppError(409, 'TOURNAMENT_ARCHIVED', 'El torneo está archivado.');
    throw new AppError(404, 'TOURNAMENT_NOT_FOUND', 'El torneo no existe.');
  }
}

export async function editTournament(id: string, body: unknown) {
  if (!body || typeof body !== 'object') throw new AppError(400, 'INVALID_BODY', 'Los datos no son válidos.');
  const source = body as Record<string, unknown>;
  const nombre = requiredText(source.nombre, 'El nombre del torneo', 100);
  const fecha = typeof source.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(source.fecha) ? source.fecha : new Date().toISOString().slice(0, 10);
  try {
    const summary = await updateTournamentSummary(id, nombre, fecha);
    const registry = await listStoredTournaments();
    if (registry.activoId === id) {
      const data = await readTournament();
      appendAudit(data, 'ACTUALIZAR', 'Torneo', id, `${nombre} · ${fecha}`);
      await writeTournament(data);
    }
    return summary;
  } catch {
    throw new AppError(404, 'TOURNAMENT_NOT_FOUND', 'El torneo no existe.');
  }
}

export async function archiveTournament(id: string): Promise<TournamentData> {
  try {
    const data = await archiveStoredTournament(id);
    appendAudit(data, 'ARCHIVAR', 'Torneo', id, 'Torneo archivado');
    await writeTournament(data);
    return data;
  } catch (error) {
    if (error instanceof Error && error.message === 'LAST_ACTIVE_TOURNAMENT') throw new AppError(409, 'LAST_ACTIVE_TOURNAMENT', 'Debe existir por lo menos otro torneo activo antes de archivar el actual.');
    throw new AppError(404, 'TOURNAMENT_NOT_FOUND', 'El torneo no existe.');
  }
}

export async function reactivateTournament(id: string): Promise<TournamentData> {
  try {
    const data = await reactivateStoredTournament(id);
    appendAudit(data, 'REACTIVAR', 'Torneo', id, data.configuracion.nombreTorneo);
    await writeTournament(data);
    return data;
  } catch {
    throw new AppError(404, 'TOURNAMENT_NOT_FOUND', 'El torneo no existe.');
  }
}

export async function deleteTournament(id: string): Promise<{ backupFilename: string; switched: boolean; newActiveId: string }> {
  try {
    const result = await deleteStoredTournament(id);
    const activeData = await readTournament();
    appendAudit(activeData, 'ELIMINAR', 'Torneo', id, `Torneo eliminado con respaldo ${result.backupFilename}`);
    await writeTournament(activeData);
    return result;
  } catch (error) {
    if (error instanceof Error && error.message === 'CANNOT_DELETE_ONLY_TOURNAMENT') {
      throw new AppError(400, 'CANNOT_DELETE_ONLY_TOURNAMENT', 'No se puede eliminar el único torneo. Debe haber al menos un torneo en el sistema.');
    }
    throw new AppError(404, 'TOURNAMENT_NOT_FOUND', 'El torneo no existe.');
  }
}