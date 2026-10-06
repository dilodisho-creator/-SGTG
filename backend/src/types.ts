export type FightResult = '' | 'GANÓ' | 'PERDIÓ' | 'TABLAS';

export interface RoosterParticipant {
  galpon: string;
  color: string;
  peso: number | null;
  ficha: string;
  resultado: FightResult;
}

export interface Fight {
  numero: number;
  hoja: string;
  gallo1: RoosterParticipant;
  gallo2: RoosterParticipant;
  caja: number | null;
  tiempo: string;
}

export interface PollonRecord {
  numero: number;
  galpon: string;
  firma: string;
  tiempo: string;
}

export interface FrenteRecord {
  numero: number;
  galpon: string;
  peleas: string;
  tiempo1: string;
  tiempo2: string;
  resultado: string;
}

export interface PrizeRecord {
  id: number;
  puesto: string;
  premio: number;
  galpon: string;
  tiempo: string;
  firma: string;
}

export interface Establishment {
  id: string;
  nombre: string;
  propietario: string;
  telefono: string;
  estado: 'activo' | 'inactivo';
  creadoEn: string;
}

export interface RegisteredRooster {
  id: string;
  galponId: string;
  ficha: string;
  color: string;
  peso: number;
  estado: 'disponible' | 'asignado' | 'retirado';
  creadoEn: string;
}

export interface TournamentSettings {
  nombreColiseo: string;
  nombreTorneo: string;
  nombreSistema: string;
  logoBase64?: string;
  unidadPeso: 'libras_onzas' | 'onzas';
  rankingModo: 'puntos' | 'tiempo';
  rankingFiltrarPorPeleas: boolean;
  rankingMinimosPeleas: number;
  victoriasRequeridasTiempo: number;
  permitirEmpatesTiempo: boolean;
  permitirDerrotasTiempo: boolean;
  usarTiempoReglamentarioEmpate: boolean;
  puntosPollon: number;
  puntosVictoria: number;
  puntosEmpate: number;
  puntosDerrota: number;
  duracionMaximaSegundos: number;
  limiteTiempoActivo: boolean;
  diferenciaPesoMaximaOnzas: number;
  pollonMaximoSegundos: number;
  pollonCriterio: '30' | '60' | '120' | 'mejores';
  pollonCantidadMejores: number;
  pollonesActivos: boolean;
  pollonPremios: Array<{ maximoSegundos: number; premio: number }>;
  premiosMontos: number[];
  premiosCantidad: number;
}

export interface TournamentSummary {
  id: string;
  nombre: string;
  fecha: string;
  estado: 'activo' | 'archivado';
  creadoEn: string;
  actualizadoEn: string;
}

export interface AuditEntry {
  id: string;
  usuario: string;
  accion: string;
  entidad: string;
  entidadId: string;
  detalle: string;
  fecha: string;
}

export interface RankingEntry {
  posicion: number;
  galpon: string;
  peleas: number;
  victorias: number;
  empates: number;
  derrotas: number;
  puntos: number;
  tiempoSegundos: number;
  premioPollon: number;
  clasificado?: boolean;
}

export interface TournamentData {
  coliseo: string;
  totalPeleas: number;
  hojas: Record<string, Fight[]>;
  pollones: PollonRecord[];
  frentes: FrenteRecord[];
  premios: PrizeRecord[];
  galpones: Establishment[];
  gallos: RegisteredRooster[];
  configuracion: TournamentSettings;
  auditoria: AuditEntry[];
}