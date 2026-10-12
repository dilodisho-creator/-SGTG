import { randomUUID } from 'node:crypto';
import { pool } from '../db';
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

async function readRegistry(): Promise<TournamentRegistry> {
  const result = await pool.query<{ value: TournamentRegistry }>(
    `SELECT value FROM tournament_registry WHERE key = 'registry'`,
  );

  if (result.rows.length > 0) {
    const registry = result.rows[0].value;
    if (registry.activoId && Array.isArray(registry.torneos) && registry.torneos.length) {
      return registry;
    }
  }

  const id = randomUUID();
  const data = createEmptyTournament();
  const now = new Date().toISOString();
  const summary: TournamentSummary = {
    id,
    nombre: 'Torneo principal',
    fecha: now.slice(0, 10),
    estado: 'activo',
    creadoEn: now,
    actualizadoEn: now,
  };
  const registry: TournamentRegistry = { activoId: id, torneos: [summary] };

  await pool.query(
    `INSERT INTO tournaments (id, data, created_at, updated_at)
     VALUES ($1, $2::jsonb, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    [id, JSON.stringify(data)],
  );
  await pool.query(
    `INSERT INTO tournament_registry (key, value, updated_at)
     VALUES ('registry', $1::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [JSON.stringify(registry)],
  );

  return registry;
}

async function writeRegistry(registry: TournamentRegistry): Promise<void> {
  await pool.query(
    `INSERT INTO tournament_registry (key, value, updated_at)
     VALUES ('registry', $1::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [JSON.stringify(registry)],
  );
}

export async function readTournament(): Promise<TournamentData> {
  const registry = await readRegistry();

  const result = await pool.query<{ data: TournamentData }>(
    `SELECT data FROM tournaments WHERE id = $1`,
    [registry.activoId],
  );

  let data: TournamentData;
  if (!result.rows.length) {
    data = createEmptyTournament();
    await pool.query(
      `INSERT INTO tournaments (id, data, created_at, updated_at)
       VALUES ($1, $2::jsonb, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [registry.activoId, JSON.stringify(data)],
    );
  } else {
    data = result.rows[0].data;
  }

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
    await pool.query(
      `INSERT INTO tournaments (id, data, created_at, updated_at)
       VALUES ($1, $2::jsonb, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      [registry.activoId, JSON.stringify(data)],
    );
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
  const current = await readTournament();
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

  await pool.query(
    `INSERT INTO tournaments (id, data, created_at, updated_at)
     VALUES ($1, $2::jsonb, NOW(), NOW())`,
    [id, JSON.stringify(data)],
  );
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
    await pool.query(
      `UPDATE tournaments SET data = $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(data), id],
    );
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

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `respaldo-eliminado-${safeName}-${timestamp}.json`;

  await pool.query(`DELETE FROM tournaments WHERE id = $1`, [id]);

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
