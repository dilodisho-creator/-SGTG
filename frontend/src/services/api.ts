import * as XLSX from 'xlsx-js-style';
import ExcelJS from 'exceljs';
import { AppUser, AuditEntry, BackupEntry, Establishment, Fight, Permission, RankingEntry, RegisteredRooster, Role, TournamentData, TournamentSettings, TournamentSummary } from '../types';
import { weightForExcel, weightFromExcel } from '../utils/weight';

const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  const token = localStorage.getItem('gallos_simple_token');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(payload?.error?.message ?? 'No se pudo completar la operación.');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function login(username: string, password: string) {
  const result = await request<{ token: string; user: { username: string; role: string; rolId: string; permisos: Permission[] } }>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem('gallos_simple_token', result.token);
  return result.user;
}

export async function getSession() {
  return request<{ user: { username: string; role: string; rolId: string; permisos: Permission[] } }>('/auth/session');
}

export async function logout(): Promise<void> {
  try {
    await request('/auth/logout', { method: 'POST' });
  } finally {
    localStorage.removeItem('gallos_simple_token');
  }
}

export async function getTournamentData(): Promise<TournamentData> {
  return request<TournamentData>('/tournament');
}

export async function updateFight(peleaNum: number, fight: Partial<Fight>): Promise<Fight> {
  return request<Fight>(`/fights/${peleaNum}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fight),
  });
}

export async function syncPollones(): Promise<void> {
  await request('/sync/pollones', { method: 'POST' });
}

export async function syncFrentes(): Promise<void> {
  await request('/sync/frentes', { method: 'POST' });
}

export async function syncPremios(): Promise<void> {
  await request('/sync/premios', { method: 'POST' });
}

export async function resetTournamentData(): Promise<TournamentData> {
  const data = await request<{ tournament: TournamentData }>('/reset', { method: 'POST' });
  return data.tournament;
}

export async function resetFightsData(): Promise<TournamentData> {
  const data = await request<{ tournament: TournamentData }>('/fights/reset', { method: 'POST' });
  return data.tournament;
}

function excelTime(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const text = String(value).trim().replace(',', ':');
  const parts = text.split(':');
  if (parts.length >= 3) return `${Number(parts[0])}:${parts[1].padStart(2, '0')}`;
  if (parts.length === 2) return `${Number(parts[0])}:${parts[1].padStart(2, '0')}`;
  return '';
}

function officialExcelTime(value: string): string {
  if (!value) return '';
  const [minutes, seconds] = value.split(':');
  return `${String(Number(minutes)).padStart(2, '0')}:${String(Number(seconds)).padStart(2, '0')}:00`;
}

function numberValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function sheetRows(workbook: XLSX.WorkBook, sheetName: string): unknown[][] {
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: false, defval: null }) as unknown[][];
}

function comparableName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleUpperCase('es-PE').replace(/[^A-Z0-9]/g, '');
}

function nameSimilarity(first: string, second: string): number {
  const left = comparableName(first);
  const right = comparableName(second);
  if (!left || !right) return 0;
  if (left.includes(right) || right.includes(left)) return Math.min(left.length, right.length) / Math.max(left.length, right.length);
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row++) {
    const current = [row];
    for (let column = 1; column <= right.length; column++) current[column] = Math.min(current[column - 1] + 1, previous[column] + 1, previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1));
    previous.splice(0, previous.length, ...current);
  }
  return 1 - previous[right.length] / Math.max(left.length, right.length);
}

export async function readOfficialWorkbook(file: File): Promise<{ data: Partial<TournamentData>; warnings: string[] }> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
  const fightSheets = workbook.SheetNames.filter((name) => /^hoja\s*\d+$/i.test(name)).slice(0, 9);
  if (fightSheets.length === 0) throw new Error('El archivo no contiene hojas de pelea con el formato oficial.');
  const warnings: string[] = [];
  let incompleteFights = 0;
  let unmatchedWinners = 0;
  const hojas: Record<string, Fight[]> = {};
  const fightMap = new Map<number, Fight>();
  let coliseo = '';
  for (const sheetName of fightSheets) {
    const rows = sheetRows(workbook, sheetName);
    const importedWeightUnit = String(rows[3]?.[3] ?? '').toLocaleUpperCase('es-PE').includes('OZ') && !String(rows[3]?.[3] ?? '').toLocaleUpperCase('es-PE').includes('LB') ? 'onzas' : 'libras_onzas';
    if (!coliseo) coliseo = String(rows[1]?.[0] ?? '').trim();
    const fights: Fight[] = [];
    for (let rowIndex = 4; rowIndex < rows.length; rowIndex += 2) {
      const first = rows[rowIndex] ?? [];
      const second = rows[rowIndex + 1] ?? [];
      const numero = Number(first[0]);
      if (!Number.isInteger(numero) || numero <= 0) continue;
      const fight: Fight = {
        numero,
        hoja: sheetName,
        gallo1: { galpon: String(first[1] ?? '').trim(), color: String(first[2] ?? '').trim(), peso: weightFromExcel(first[3], importedWeightUnit), ficha: String(first[4] ?? '').trim(), resultado: '' },
        gallo2: { galpon: String(second[1] ?? '').trim(), color: String(second[2] ?? '').trim(), peso: weightFromExcel(second[3], importedWeightUnit), ficha: String(second[4] ?? '').trim(), resultado: '' },
        caja: numberValue(first[5]),
        tiempo: excelTime(first[7]),
      };
      fights.push(fight);
      fightMap.set(numero, fight);
      if (!fight.gallo1.galpon || !fight.gallo2.galpon) incompleteFights++;
    }
    hojas[sheetName] = fights;
  }
  const pollonSheet = workbook.SheetNames.find((name) => name.toLocaleLowerCase('es-PE').includes('pollon'));
  const pollones = Array.from({ length: 40 }, (_, index) => ({ numero: index + 1, galpon: '', firma: '', tiempo: '' }));
  if (pollonSheet) {
    const rows = sheetRows(workbook, pollonSheet);
    for (let index = 0; index < 40; index++) {
      const row = rows[index + 4] ?? [];
      pollones[index] = { numero: index + 1, galpon: String(row[1] ?? '').trim(), firma: String(row[2] ?? '').trim(), tiempo: excelTime(row[3]) };
    }
  }
  const frenteSheet = workbook.SheetNames.find((name) => name.toLocaleLowerCase('es-PE').includes('frente'));
  const frentes = Array.from({ length: 93 }, (_, index) => ({ numero: index + 1, galpon: '', peleas: '', tiempo1: '', tiempo2: '', resultado: '' }));
  if (frenteSheet) {
    const rows = sheetRows(workbook, frenteSheet);
    for (let index = 0; index < 93; index++) {
      const row = rows[index + 4] ?? [];
      const galpon = String(row[1] ?? '').trim();
      const references = String(row[2] ?? '').split(/\D+/).filter(Boolean).map(Number);
      const times = [excelTime(row[3]), excelTime(row[4])];
      const totalSeconds = times.filter(Boolean).reduce((sum, item) => {
        const [minutes, seconds] = item.split(':').map(Number);
        return sum + minutes * 60 + seconds;
      }, 0);
      frentes[index] = { numero: index + 1, galpon, peleas: references.join(' -- '), tiempo1: times[0], tiempo2: times[1], resultado: totalSeconds ? `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}` : '' };
      references.forEach((fightNumber, referenceIndex) => {
        const fight = fightMap.get(fightNumber);
        if (!fight || !galpon) return;
        const normalized = comparableName(galpon);
        const firstSimilarity = nameSimilarity(galpon, fight.gallo1.galpon);
        const secondSimilarity = nameSimilarity(galpon, fight.gallo2.galpon);
        if (comparableName(fight.gallo1.galpon) === normalized || firstSimilarity >= 0.65 && firstSimilarity > secondSimilarity) {
          fight.gallo1.resultado = 'GANÓ';
          fight.gallo2.resultado = 'PERDIÓ';
        } else if (comparableName(fight.gallo2.galpon) === normalized || secondSimilarity >= 0.65 && secondSimilarity > firstSimilarity) {
          fight.gallo2.resultado = 'GANÓ';
          fight.gallo1.resultado = 'PERDIÓ';
        } else {
          unmatchedWinners++;
        }
        if (times[referenceIndex]) fight.tiempo = times[referenceIndex];
      });
    }
  } else {
    warnings.push('No se encontró la hoja Lista de Frentes; los resultados no pudieron reconstruirse.');
  }
  const prizeSheet = workbook.SheetNames.find((name) => name.trim().toLocaleUpperCase('es-PE') === 'PREMIOS');
  const defaultPlaces = ['1ER PUESTO', '2DO PUESTO', '3ER PUESTO', 'CAMPEON DE DESAFIO'];
  const defaultAmounts = [3500, 2500, 1000, 0];
  const premios = defaultPlaces.map((puesto, index) => ({ id: index + 1, puesto, premio: defaultAmounts[index], galpon: '', tiempo: '', firma: '' }));
  if (prizeSheet) {
    const rows = sheetRows(workbook, prizeSheet);
    const headerRows = [0, 6, 12, 16];
    const winnerRows = [1, 7, 13, 17];
    premios.forEach((prize, index) => {
      const header = String(rows[headerRows[index]]?.[0] ?? prize.puesto).trim();
      const amount = header.match(/\((\d[\d,.]*)\)/)?.[1];
      const winner = String(rows[winnerRows[index]]?.[1] ?? '').trim();
      const timed = winner.match(/^(.*?)\s*\((\d+)[,:](\d{1,2})\)\s*$/);
      prize.puesto = header.replace(/\s*\([^)]*\)\s*$/, '').trim() || prize.puesto;
      prize.premio = amount ? Number(amount.replace(/[, .]/g, '')) : prize.premio;
      prize.galpon = timed ? timed[1].trim() : winner;
      prize.tiempo = timed ? `${Number(timed[2])}:${timed[3].padStart(2, '0')}` : '';
    });
  }
  if (incompleteFights) warnings.push(`${incompleteFights} peleas tienen participantes sin completar en el Excel.`);
  if (unmatchedWinners) warnings.push(`${unmatchedWinners} resultados de Frentes no coinciden con los nombres escritos en las hojas de pelea y quedaron pendientes de revisión.`);
  return { data: { coliseo, hojas, pollones, frentes, premios }, warnings };
}

export function importTournamentData(data: Partial<TournamentData>): Promise<TournamentData> {
  return request('/importar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}

type EJBorderStyle = 'thin' | 'medium' | 'thick' | 'dotted' | 'hair' | 'dashed' | 'mediumDashed' | 'dashDot' | 'mediumDashDot' | 'dashDotDot' | 'mediumDashDotDot' | 'slantDashDot';

type EJBorderSide = { style: EJBorderStyle; color: { argb: string } };
type EJBorder = { top?: EJBorderSide; bottom?: EJBorderSide; left?: EJBorderSide; right?: EJBorderSide };

function ejThin(): EJBorder {
  const s: EJBorderSide = { style: 'thin', color: { argb: 'FF000000' } };
  return { top: s, bottom: s, left: s, right: s };
}
function ejMedium(): EJBorder {
  const s: EJBorderSide = { style: 'medium', color: { argb: 'FF000000' } };
  return { top: s, bottom: s, left: s, right: s };
}

function ejStyle(opts: {
  bold?: boolean; italic?: boolean; fontSize?: number; center?: boolean;
  bgColor?: string; border?: EJBorder; wrapText?: boolean; color?: string;
}): Partial<ExcelJS.Style> {
  return {
    font: {
      bold: opts.bold ?? false,
      italic: opts.italic ?? false,
      size: opts.fontSize ?? 11,
      color: opts.color ? { argb: `FF${opts.color}` } : { argb: 'FF000000' },
    },
    alignment: {
      horizontal: opts.center ? 'center' : 'left',
      vertical: 'middle',
      wrapText: opts.wrapText ?? false,
    },
    fill: opts.bgColor
      ? { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${opts.bgColor}` } }
      : { type: 'pattern', pattern: 'none' },
    border: opts.border ?? {},
  };
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

async function triggerDownload(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportTournament(data: TournamentData): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const coliseoTitle = data.configuracion.nombreColiseo || data.coliseo || 'COLISEO';

  const logoBase64 = data.configuracion.logoBase64 || '';
  const hasLogo = Boolean(logoBase64 && logoBase64.startsWith('data:image'));
  const rawExt = hasLogo ? (logoBase64.match(/data:image\/(png|jpeg|jpg|gif|webp)/i)?.[1] ?? 'png').toLowerCase() : 'png';
  const logoExt = (rawExt === 'jpg' ? 'jpeg' : rawExt) as 'png' | 'jpeg' | 'gif';

  let logoImageId: number | null = null;
  if (hasLogo) {
    const b64Data = logoBase64.split(',')[1] ?? '';
    const buf = base64ToArrayBuffer(b64Data);
    logoImageId = workbook.addImage({ buffer: buf, extension: logoExt });
  }

  const headerBg = 'C5D9F1';
  const resultBg = 'C5D9F1';
  const LOGO_W = 75;
  const LOGO_H = 60;
  const ROW1_H = 35;
  const ROW2_H = 35;
  const ROW3_H = 8;

  function addLogoImages(ws: ExcelJS.Worksheet, lastColIndex: number) {
    if (logoImageId === null) return;
    ws.addImage(logoImageId, {
      tl: { col: 0.15, row: 0.1 },
      ext: { width: LOGO_W, height: LOGO_H },
    });
    ws.addImage(logoImageId, {
      tl: { col: lastColIndex + 0.1, row: 0.1 },
      ext: { width: LOGO_W, height: LOGO_H },
    });
  }

  function buildHeaderRows(ws: ExcelJS.Worksheet, numCols: number) {
    const r1 = ws.addRow(Array<null>(numCols).fill(null));
    r1.height = ROW1_H;
    const r2 = ws.addRow([null, coliseoTitle, ...Array<null>(numCols - 2).fill(null)]);
    r2.height = ROW2_H;
    const mergeEnd = numCols >= 6 ? numCols - 1 : numCols;
    if (mergeEnd > 2) ws.mergeCells(2, 2, 2, mergeEnd);
    ws.getCell('B2').style = {
      font: { bold: true, italic: true, underline: true, size: 14, color: { argb: 'FF000000' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'none' },
    };
    const r3 = ws.addRow(Array<null>(numCols).fill(null));
    r3.height = ROW3_H;
  }

  Object.entries(data.hojas).slice(0, 9).forEach(([sheetName, fights]) => {
    const ws = workbook.addWorksheet(sheetName);
    ws.columns = [
      { width: 6 },
      { width: 28 },
      { width: 16 },
      { width: 10 },
      { width: 15 },
      { width: 12 },
      { width: 13 },
      { width: 12 },
    ];

    buildHeaderRows(ws, 8);

    const headers = ['Nº', 'NOMBRE GALPÓN', 'COLOR', data.configuracion.unidadPeso === 'onzas' ? 'PESO (OZ)' : 'PESO', 'FICHA / PLACA', 'CAJA', 'RESULTADO', 'TIEMPO'];
    const r4 = ws.addRow(headers);
    r4.height = 18;
    r4.eachCell((cell) => {
      cell.style = ejStyle({ bold: true, center: true, border: ejMedium() });
    });

    fights.forEach((fight) => {
      const row1 = ws.addRow([fight.numero, fight.gallo1.galpon, fight.gallo1.color, weightForExcel(fight.gallo1.peso, data.configuracion.unidadPeso), fight.gallo1.ficha, fight.caja, fight.gallo1.resultado, fight.tiempo]);
      const row2 = ws.addRow([null, fight.gallo2.galpon, fight.gallo2.color, weightForExcel(fight.gallo2.peso, data.configuracion.unidadPeso), fight.gallo2.ficha, null, fight.gallo2.resultado, null]);

      row1.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.style = ejStyle({ bold: true, center: colNum !== 2, border: ejMedium() });
      });
      row2.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.style = ejStyle({ bold: true, center: colNum !== 2, border: ejMedium() });
      });

      const r1n = row1.number;
      ws.mergeCells(r1n, 1, r1n + 1, 1);
      ws.mergeCells(r1n, 6, r1n + 1, 6);
      ws.mergeCells(r1n, 8, r1n + 1, 8);
    });

    addLogoImages(ws, 7);
  });

  {
    const ws = workbook.addWorksheet('Lista de pollones');
    ws.properties.tabColor = { argb: 'FFFFC000' };
    ws.columns = [{ width: 6 }, { width: 32 }, { width: 24 }, { width: 14 }];

    buildHeaderRows(ws, 4);

    const r4 = ws.addRow(['Nº', 'NOMBRE GALPÓN', 'FIRMA', 'TIEMPO']); r4.height = 18;
    r4.eachCell((cell) => { cell.style = ejStyle({ bold: true, center: true, border: ejMedium() }); });

    const pollonRecords = Array.from({ length: 40 }, (_, index) => data.pollones[index] ?? { numero: index + 1, galpon: '', firma: '', tiempo: '' });
    pollonRecords.forEach((item, index) => {
      const row = ws.addRow([index + 1, item.galpon, item.firma, officialExcelTime(item.tiempo)]);
      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.style = ejStyle({ bold: true, center: colNum !== 2, border: ejMedium() });
      });
    });

    addLogoImages(ws, 3);
  }

  {
    const ws = workbook.addWorksheet('Lista de Frentes');
    ws.properties.tabColor = { argb: 'FF4472C4' };
    ws.columns = [{ width: 6 }, { width: 28 }, { width: 20 }, { width: 14 }, { width: 14 }, { width: 14 }];

    buildHeaderRows(ws, 6);

    const r4 = ws.addRow(['Nº', 'NOMBRE GALPÓN', 'NUMERO DE PELEA', 'TIEMPO 1', 'TIEMPO 2', 'RESULTADO']); r4.height = 18;
    r4.eachCell((cell) => { cell.style = ejStyle({ bold: true, center: true, border: ejMedium() }); });

    const frenteRecords = Array.from({ length: 93 }, (_, index) => data.frentes[index] ?? { numero: index + 1, galpon: '', peleas: '', tiempo1: '', tiempo2: '', resultado: '' });
    frenteRecords.forEach((item, index) => {
      const row = ws.addRow([
        index + 1,
        item.galpon,
        item.peleas.split(',').map((v) => v.trim()).join('--'),
        officialExcelTime(item.tiempo1),
        officialExcelTime(item.tiempo2),
        officialExcelTime(item.resultado),
      ]);
      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.style = ejStyle({ bold: true, center: colNum !== 2, border: ejMedium() });
      });
    });

    addLogoImages(ws, 5);
  }

  {
    const ws = workbook.addWorksheet('PREMIOS');
    ws.properties.tabColor = { argb: 'FF375623' };
    ws.columns = [{ width: 4 }, { width: 14 }, { width: 30 }, { width: 4 }];

    const prizePositions = [1, 7, 13, 17];
    const championBg = 'BFBFBF';

    for (let i = 0; i < 22; i++) {
      const row = ws.addRow([null, null, null, null]);
      row.height = 16;
    }

    data.premios.slice(0, 4).forEach((prize, index) => {
      const startRow = prizePositions[index];
      const isChampion = index === 3;
      const bg = isChampion ? championBg : undefined;

      ws.getRow(startRow).height = 20;
      ws.getRow(startRow + 1).height = 20;
      ws.getRow(startRow + 2).height = 30;
      if (isChampion) ws.getRow(startRow + 3).height = 20;

      const titleCell = ws.getCell(startRow, 2);
      titleCell.value = prize.premio > 0 ? `${prize.puesto}  (${prize.premio})` : prize.puesto;
      titleCell.style = ejStyle({ bold: true, center: true, bgColor: bg, border: ejMedium() });
      ws.mergeCells(startRow, 2, startRow, 4);

      const glpLabel = ws.getCell(startRow + 1, 2);
      glpLabel.value = 'GLP';
      glpLabel.style = ejStyle({ bold: isChampion, bgColor: bg, border: ejMedium() });
      const glpValue = ws.getCell(startRow + 1, 3);
      glpValue.value = prize.tiempo ? `${prize.galpon} (${prize.tiempo.replace(':', ',')})` : prize.galpon;
      glpValue.style = ejStyle({ bold: isChampion, center: true, bgColor: bg, border: ejMedium() });
      ws.mergeCells(startRow + 1, 3, startRow + 1, 4);

      const firmaLabel = ws.getCell(startRow + 2, 2);
      firmaLabel.value = isChampion ? 'FIRMA' : 'FIRMA :';
      firmaLabel.style = ejStyle({ bold: isChampion, bgColor: bg, border: ejMedium() });
      const firmaValue = ws.getCell(startRow + 2, 3);
      firmaValue.value = '';
      firmaValue.style = ejStyle({ bgColor: bg, border: ejMedium() });
      ws.mergeCells(startRow + 2, 3, startRow + 2, 4);

      if (isChampion) {
        const extraLabel = ws.getCell(startRow + 3, 2);
        extraLabel.style = ejStyle({ bgColor: championBg, border: ejMedium() });
        const extraValue = ws.getCell(startRow + 3, 3);
        extraValue.style = ejStyle({ bgColor: championBg, border: ejMedium() });
        ws.mergeCells(startRow + 3, 3, startRow + 3, 4);
      }
    });
  }

  await triggerDownload(workbook, `${data.configuracion.nombreTorneo || 'Torneo'}_Formato_Oficial.xlsx`);
}



export function updatePrize(id: number, data: { galpon: string; tiempo: string; firma: string }) {
  return request(`/premios/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}

export function createEstablishment(data: Pick<Establishment, 'nombre' | 'propietario' | 'telefono'>): Promise<Establishment> {
  return request('/galpones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function deleteEstablishment(id: string): Promise<void> {
  return request(`/galpones/${id}`, { method: 'DELETE' });
}

export function updateEstablishment(id: string, data: Pick<Establishment, 'nombre' | 'propietario' | 'telefono' | 'estado'>): Promise<Establishment> {
  return request(`/galpones/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}

export function createRooster(data: Pick<RegisteredRooster, 'galponId' | 'ficha' | 'color' | 'peso'>): Promise<RegisteredRooster> {
  return request('/gallos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function deleteRooster(id: string): Promise<void> {
  return request(`/gallos/${id}`, { method: 'DELETE' });
}

export function updateRooster(id: string, data: Pick<RegisteredRooster, 'galponId' | 'ficha' | 'color' | 'peso' | 'estado'>): Promise<RegisteredRooster> {
  return request(`/gallos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}

export function assignFight(data: { numero: number; gallo1Id: string; gallo2Id: string; caja: number | null }): Promise<Fight> {
  return request('/fights/assign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function cancelFight(numero: number): Promise<void> {
  return request(`/fights/${numero}`, { method: 'DELETE' });
}

export function drawFights(cantidad?: number, confirmar = true): Promise<{ creadas: number; sinPareja: number; propuestas: Array<{ numero: number; gallo1: string; gallo2: string; diferenciaOnzas: number }> }> {
  return request('/fights/draw', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cantidad, confirmar }) });
}

export function getTournaments(): Promise<{ activoId: string; torneos: TournamentSummary[] }> {
  return request('/torneos');
}

export function createTournament(data: { nombre: string; fecha: string }): Promise<TournamentData> {
  return request('/torneos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}

export function selectTournament(id: string): Promise<TournamentData> {
  return request(`/torneos/${id}/seleccionar`, { method: 'POST' });
}

export function editTournament(id: string, data: { nombre: string; fecha: string }): Promise<TournamentSummary> {
  return request(`/torneos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}

export function archiveTournament(id: string): Promise<TournamentData> {
  return request(`/torneos/${id}/archivar`, { method: 'POST' });
}

export function reactivateTournament(id: string): Promise<TournamentData> {
  return request(`/torneos/${id}/reactivar`, { method: 'POST' });
}

export function deleteTournament(id: string): Promise<{ backupFilename: string; switched: boolean; newActiveId: string }> {
  return request(`/torneos/${id}`, { method: 'DELETE' });
}

export function getRanking(): Promise<RankingEntry[]> {
  return request('/ranking');
}

export function getAudit(): Promise<AuditEntry[]> {
  return request('/auditoria');
}

export function updateSettings(data: TournamentSettings): Promise<TournamentSettings> {
  return request('/configuracion', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}

export function getBackups(): Promise<BackupEntry[]> {
  return request('/respaldos');
}

export function createBackup(): Promise<BackupEntry> {
  return request('/respaldos', { method: 'POST' });
}

export function restoreBackup(filename: string): Promise<TournamentData> {
  return request(`/respaldos/${encodeURIComponent(filename)}/restaurar`, { method: 'POST' });
}

export function deleteBackup(filename: string): Promise<void> {
  return request(`/respaldos/${encodeURIComponent(filename)}`, { method: 'DELETE' });
}

const ADMIN_BASE = '/admin';

async function adminRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  const token = localStorage.getItem('gallos_simple_token');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`/api${ADMIN_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(payload?.error?.message ?? 'No se pudo completar la operación.');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function getPermissionsCatalog(): Promise<{ permisos: Permission[] }> {
  return adminRequest('/permisos');
}

export function getRoles(): Promise<Role[]> {
  return adminRequest('/roles');
}

export function createRole(body: { nombre: string; descripcion: string; permisos: Permission[] }): Promise<Role> {
  return adminRequest('/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

export function updateRole(id: string, body: { nombre?: string; descripcion?: string; permisos?: Permission[] }): Promise<Role> {
  return adminRequest(`/roles/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

export function deleteRole(id: string): Promise<void> {
  return adminRequest(`/roles/${id}`, { method: 'DELETE' });
}

export function getUsers(): Promise<AppUser[]> {
  return adminRequest('/usuarios');
}

export function createUser(body: { username: string; password: string; rolId: string }): Promise<AppUser> {
  return adminRequest('/usuarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

export function updateAppUser(id: string, body: { rolId?: string; activo?: boolean; password?: string }): Promise<AppUser> {
  return adminRequest(`/usuarios/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

export function deleteAppUser(id: string): Promise<void> {
  return adminRequest(`/usuarios/${id}`, { method: 'DELETE' });
}