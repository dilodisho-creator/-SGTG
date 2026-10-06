import { copyFile, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { config } from '../config';
import { Establishment, Fight, RegisteredRooster, TournamentData, TournamentSettings, TournamentSummary } from '../types';

let writeQueue = Promise.resolve();

interface TournamentRegistry {
  activoId: string;
  torneos: TournamentSummary[];
}

function emptyParticipant() {
  return { galpon: '', color: '', peso: null, ficha: '', resultado: '' as const };
}

export function createEmptyTournament(): TournamentData {
  const hojas: Record<string, Fight[]> = {};
  for (let sheetIndex = 0; sheetIndex < 9; sheetIndex++) {
    const sheetName = sheetIndex === 0 ? 'Hoja1' : `Hoja ${sheetIndex + 1}`;
    hojas[sheetName] = Array.from({ length: 20 }, (_, index) => {
      const number = sheetIndex * 20 + index + 1;
      return { numero: number, hoja: sheetName, gallo1: emptyParticipant(), gallo2: emptyParticipant(), caja: null, tiempo: '' };
    });
  }
  return {
    coliseo: '',
    totalPeleas: 180,
    hojas,
    pollones: [],
    frentes: [],
    premios: [
      { id: 1, puesto: '1ER PUESTO', premio: 0, galpon: '', tiempo: '', firma: '' },
      { id: 2, puesto: '2DO PUESTO', premio: 0, galpon: '', tiempo: '', firma: '' },
      { id: 3, puesto: '3ER PUESTO', premio: 0, galpon: '', tiempo: '', firma: '' },
      { id: 4, puesto: 'CAMPEÓN DE DESAFÍO', premio: 0, galpon: '', tiempo: '', firma: '' },
    ],
    galpones: [],
    gallos: [],
    configuracion: {
      nombreColiseo: '',
      nombreTorneo: '',
      nombreSistema: '',
      logoBase64: '',
      unidadPeso: 'libras_onzas',
      rankingModo: 'puntos',
      rankingFiltrarPorPeleas: false,
      rankingMinimosPeleas: 2,
      victoriasRequeridasTiempo: 2,
      permitirEmpatesTiempo: false,
      permitirDerrotasTiempo: false,
      usarTiempoReglamentarioEmpate: true,
      puntosPollon: 4,
      puntosVictoria: 3,
      puntosEmpate: 1,
      puntosDerrota: 0,
      duracionMaximaSegundos: 360,
      limiteTiempoActivo: true,
      diferenciaPesoMaximaOnzas: 2,
      pollonMaximoSegundos: 30,
      pollonCriterio: '30',
      pollonCantidadMejores: 10,
      pollonesActivos: true,
      pollonPremios: [{ maximoSegundos: 30, premio: 0 }, { maximoSegundos: 60, premio: 0 }, { maximoSegundos: 120, premio: 0 }],
      premiosMontos: [0, 0, 0, 0],
      premiosCantidad: 4,
    },
    auditoria: [],
  };
}

function tournamentFile(id: string): string {
  return path.join(config.tournamentsDirectory, `${id}.json`);
}

async function readRegistry(): Promise<TournamentRegistry> {
  await mkdir(config.tournamentsDirectory, { recursive: true });
  try {
    const registry = JSON.parse(await readFile(config.tournamentRegistryFile, 'utf8')) as TournamentRegistry;
    if (registry.activoId && Array.isArray(registry.torneos) && registry.torneos.length) return registry;
  } catch {
  }
  await ensureDataFile();
  const id = randomUUID();
  const data = JSON.parse(await readFile(config.dataFile, 'utf8')) as TournamentData;
  const now = new Date().toISOString();
  const summary: TournamentSummary = {
    id,
    nombre: data.configuracion?.nombreTorneo?.trim() || 'Torneo principal',
    fecha: now.slice(0, 10),
    estado: 'activo',
    creadoEn: now,
    actualizadoEn: now,
  };
  await writeFile(tournamentFile(id), JSON.stringify(data, null, 2), 'utf8');
  const registry = { activoId: id, torneos: [summary] };
  await writeFile(config.tournamentRegistryFile, JSON.stringify(registry, null, 2), 'utf8');
  return registry;
}

async function writeRegistry(registry: TournamentRegistry): Promise<void> {
  const temporaryFile = `${config.tournamentRegistryFile}.tmp`;
  await writeFile(temporaryFile, JSON.stringify(registry, null, 2), 'utf8');
  await rename(temporaryFile, config.tournamentRegistryFile);
}

async function ensureDataFile(): Promise<void> {
  await mkdir(path.dirname(config.dataFile), { recursive: true });
  try {
    await readFile(config.dataFile, 'utf8');
  } catch {
    await writeFile(config.dataFile, JSON.stringify(createEmptyTournament(), null, 2), 'utf8');
  }
}

export async function readTournament(): Promise<TournamentData> {
  const registry = await readRegistry();
  const data = JSON.parse(await readFile(tournamentFile(registry.activoId), 'utf8')) as TournamentData;
  const fights = Object.values(data.hojas).flat();
  if (!Array.isArray(data.galpones)) {
    const names = Array.from(new Set(fights.flatMap((fight) => [fight.gallo1.galpon, fight.gallo2.galpon]).filter(Boolean))).sort();
    data.galpones = names.map((nombre, index): Establishment => ({
      id: `galpon-${index + 1}`,
      nombre,
      propietario: '',
      telefono: '',
      estado: 'activo',
      creadoEn: new Date(0).toISOString(),
    }));
  }
  if (!Array.isArray(data.gallos)) {
    const establishments = new Map(data.galpones.map((item) => [item.nombre.toLocaleUpperCase('es-PE'), item.id]));
    const seen = new Set<string>();
    data.gallos = [];
    for (const fight of fights) {
      for (const participant of [fight.gallo1, fight.gallo2]) {
        const key = `${participant.galpon}|${participant.ficha}`.toLocaleUpperCase('es-PE');
        if (!participant.galpon || !participant.ficha || seen.has(key)) continue;
        seen.add(key);
        data.gallos.push({
          id: `gallo-${data.gallos.length + 1}`,
          galponId: establishments.get(participant.galpon.toLocaleUpperCase('es-PE')) ?? '',
          ficha: participant.ficha,
          color: participant.color,
          peso: participant.peso ?? 0,
          estado: 'asignado',
          creadoEn: new Date(0).toISOString(),
        } as RegisteredRooster);
      }
    }
  }
  const existingSettings = data.configuracion as Partial<TournamentSettings> | undefined;
  data.configuracion = {
    nombreColiseo: data.coliseo ?? '',
    nombreTorneo: '',
    nombreSistema: '',
    logoBase64: '',
    unidadPeso: 'libras_onzas',
    rankingModo: 'puntos',
    rankingFiltrarPorPeleas: false,
    rankingMinimosPeleas: 2,
    victoriasRequeridasTiempo: 2,
    permitirEmpatesTiempo: false,
    permitirDerrotasTiempo: false,
    usarTiempoReglamentarioEmpate: true,
    puntosPollon: 4,
    puntosVictoria: 3,
    puntosEmpate: 1,
    puntosDerrota: 0,
    duracionMaximaSegundos: 360,
    limiteTiempoActivo: true,
    diferenciaPesoMaximaOnzas: 2,
    pollonMaximoSegundos: 30,
    pollonCriterio: '30',
    pollonCantidadMejores: 10,
    pollonesActivos: true,
    premiosMontos: data.premios.map((item) => item.premio),
    premiosCantidad: 4,
    ...existingSettings,
    pollonPremios: Array.isArray(existingSettings?.pollonPremios)
      ? existingSettings.pollonPremios
      : [{ maximoSegundos: 30, premio: 0 }, { maximoSegundos: 60, premio: 0 }, { maximoSegundos: 120, premio: 0 }],
  };
  const activeSummary = registry.torneos.find((item) => item.id === registry.activoId);
  if (!data.configuracion.nombreTorneo.trim() && activeSummary) data.configuracion.nombreTorneo = activeSummary.nombre;
  if (!Array.isArray(data.auditoria)) data.auditoria = [];
  return data;
}

export async function writeTournament(data: TournamentData): Promise<void> {
  const operation = async () => {
    const registry = await readRegistry();
    const destination = tournamentFile(registry.activoId);
    const temporaryFile = `${destination}.tmp`;
    await writeFile(temporaryFile, JSON.stringify(data, null, 2), 'utf8');
    await rename(temporaryFile, destination);
    const summary = registry.torneos.find((item) => item.id === registry.activoId);
    if (summary) {
      summary.nombre = data.configuracion.nombreTorneo.trim() || summary.nombre;
      summary.actualizadoEn = new Date().toISOString();
      await writeRegistry(registry);
    }
  };
  writeQueue = writeQueue.then(operation, operation);
  await writeQueue;
}

export async function resetTournament(): Promise<TournamentData> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await mkdir(config.backupDirectory, { recursive: true });
  const current = await readTournament();
  await writeFile(path.join(config.backupDirectory, `simple-${timestamp}.json`), JSON.stringify(current, null, 2), 'utf8');
  const empty = createEmptyTournament();
  empty.configuracion.nombreColiseo = current.configuracion.nombreColiseo;
  empty.configuracion.nombreTorneo = current.configuracion.nombreTorneo;
  empty.configuracion.nombreSistema = current.configuracion.nombreSistema ?? '';
  empty.coliseo = current.coliseo;
  await writeTournament(empty);
  return empty;
}

export async function listTournaments(): Promise<{ activoId: string; torneos: TournamentSummary[] }> {
  return readRegistry();
}

export async function createTournament(nombre: string, fecha: string): Promise<TournamentData> {
  const registry = await readRegistry();
  const id = randomUUID();
  const now = new Date().toISOString();
  const data = createEmptyTournament();
  data.configuracion.nombreTorneo = nombre;
  const current = await readTournament();
  data.configuracion.nombreColiseo = current.configuracion.nombreColiseo;
  data.coliseo = current.coliseo;
  await writeFile(tournamentFile(id), JSON.stringify(data, null, 2), 'utf8');
  registry.torneos.push({ id, nombre, fecha, estado: 'activo', creadoEn: now, actualizadoEn: now });
  registry.activoId = id;
  await writeRegistry(registry);
  return readTournament();
}

export async function selectTournament(id: string): Promise<TournamentData> {
  const registry = await readRegistry();
  const summary = registry.torneos.find((item) => item.id === id);
  if (!summary) throw new Error('TOURNAMENT_NOT_FOUND');
  if (summary.estado === 'archivado') throw new Error('TOURNAMENT_ARCHIVED');
  registry.activoId = id;
  await writeRegistry(registry);
  return readTournament();
}

export async function updateTournamentSummary(id: string, nombre: string, fecha: string): Promise<TournamentSummary> {
  const registry = await readRegistry();
  const summary = registry.torneos.find((item) => item.id === id);
  if (!summary) throw new Error('TOURNAMENT_NOT_FOUND');
  summary.nombre = nombre;
  summary.fecha = fecha;
  summary.actualizadoEn = new Date().toISOString();
  if (id === registry.activoId) {
    const data = await readTournament();
    data.configuracion.nombreTorneo = nombre;
    const destination = tournamentFile(id);
    await writeFile(destination, JSON.stringify(data, null, 2), 'utf8');
  }
  await writeRegistry(registry);
  return summary;
}

export async function archiveTournament(id: string): Promise<TournamentData> {
  const registry = await readRegistry();
  const summary = registry.torneos.find((item) => item.id === id);
  if (!summary) throw new Error('TOURNAMENT_NOT_FOUND');
  const available = registry.torneos.filter((item) => item.id !== id && item.estado === 'activo');
  if (id === registry.activoId && available.length === 0) throw new Error('LAST_ACTIVE_TOURNAMENT');
  summary.estado = 'archivado';
  summary.actualizadoEn = new Date().toISOString();
  if (id === registry.activoId) registry.activoId = available.sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn))[0].id;
  await writeRegistry(registry);
  return readTournament();
}

export async function reactivateTournament(id: string): Promise<TournamentData> {
  const registry = await readRegistry();
  const summary = registry.torneos.find((item) => item.id === id);
  if (!summary) throw new Error('TOURNAMENT_NOT_FOUND');
  summary.estado = 'activo';
  summary.actualizadoEn = new Date().toISOString();
  registry.activoId = id;
  await writeRegistry(registry);
  return readTournament();
}

export async function deleteTournament(id: string): Promise<{ backupFilename: string; switched: boolean; newActiveId: string }> {
  const registry = await readRegistry();
  const index = registry.torneos.findIndex((item) => item.id === id);
  if (index < 0) throw new Error('TOURNAMENT_NOT_FOUND');
  if (registry.torneos.length <= 1) throw new Error('CANNOT_DELETE_ONLY_TOURNAMENT');

  const tournamentToDelete = registry.torneos[index];
  const safeName = (tournamentToDelete.nombre || 'torneo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'torneo';

  await mkdir(config.backupDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `respaldo-eliminado-${safeName}-${timestamp}.json`;
  const backupPath = path.join(config.backupDirectory, backupFilename);

  try {
    await copyFile(tournamentFile(id), backupPath);
  } catch {
  }

  try {
    await unlink(tournamentFile(id));
  } catch {
  }

  registry.torneos.splice(index, 1);

  let switched = false;
  if (registry.activoId === id) {
    const nextActive = registry.torneos.find((item) => item.estado === 'activo') || registry.torneos[0];
    registry.activoId = nextActive.id;
    nextActive.estado = 'activo';
    switched = true;
  }

  await writeRegistry(registry);
  return { backupFilename, switched, newActiveId: registry.activoId };
}