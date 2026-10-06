import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { config } from '../config';

export type Permission =
  | 'usuarios.ver'
  | 'usuarios.crear'
  | 'usuarios.editar'
  | 'usuarios.eliminar'
  | 'roles.ver'
  | 'roles.crear'
  | 'roles.editar'
  | 'roles.eliminar'
  | 'torneo.ver'
  | 'torneo.editar'
  | 'peleas.ver'
  | 'peleas.editar'
  | 'registro.ver'
  | 'registro.editar'
  | 'ranking.ver'
  | 'exportaciones.ver'
  | 'respaldos.ver'
  | 'respaldos.crear'
  | 'respaldos.restaurar'
  | 'respaldos.eliminar'
  | 'auditoria.ver'
  | 'configuracion.ver'
  | 'configuracion.editar'
  | 'galpones.ver'
  | 'galpones.editar';

export const ALL_PERMISSIONS: Permission[] = [
  'usuarios.ver', 'usuarios.crear', 'usuarios.editar', 'usuarios.eliminar',
  'roles.ver', 'roles.crear', 'roles.editar', 'roles.eliminar',
  'torneo.ver', 'torneo.editar',
  'peleas.ver', 'peleas.editar',
  'registro.ver', 'registro.editar',
  'ranking.ver',
  'exportaciones.ver',
  'respaldos.ver', 'respaldos.crear', 'respaldos.restaurar', 'respaldos.eliminar',
  'auditoria.ver',
  'configuracion.ver', 'configuracion.editar',
  'galpones.ver', 'galpones.editar',
];

export interface Role {
  id: string;
  nombre: string;
  descripcion: string;
  permisos: Permission[];
  esInterno: boolean;
  creadoEn: string;
}

export interface AppUser {
  id: string;
  username: string;
  passwordHash: string;
  rolId: string;
  activo: boolean;
  creadoEn: string;
  ultimoAcceso: string | null;
}

export interface UsersStore {
  roles: Role[];
  users: AppUser[];
}

export const DEFAULT_ROLES: Role[] = [
  {
    id: 'superadmin',
    nombre: 'Super Administrador',
    descripcion: 'Acceso total al sistema. No se puede eliminar ni modificar sus permisos.',
    permisos: [...ALL_PERMISSIONS],
    esInterno: true,
    creadoEn: new Date().toISOString(),
  },
  {
    id: 'admin',
    nombre: 'Administrador',
    descripcion: 'Administrador del sistema con acceso completo excepto gestión de Super Administradores.',
    permisos: ALL_PERMISSIONS.filter((p) => p !== 'usuarios.eliminar' && p !== 'roles.eliminar'),
    esInterno: true,
    creadoEn: new Date().toISOString(),
  },
  {
    id: 'operador',
    nombre: 'Operador',
    descripcion: 'Puede gestionar peleas, registro y ranking. Sin acceso a configuración avanzada.',
    permisos: [
      'torneo.ver', 'peleas.ver', 'peleas.editar',
      'registro.ver', 'registro.editar',
      'ranking.ver', 'exportaciones.ver',
      'galpones.ver', 'galpones.editar',
    ],
    esInterno: false,
    creadoEn: new Date().toISOString(),
  },
  {
    id: 'visualizador',
    nombre: 'Visualizador',
    descripcion: 'Solo puede ver información. No puede realizar cambios.',
    permisos: [
      'torneo.ver', 'peleas.ver', 'registro.ver', 'ranking.ver',
      'exportaciones.ver', 'galpones.ver', 'configuracion.ver',
    ],
    esInterno: false,
    creadoEn: new Date().toISOString(),
  },
];

export function hashPassword(password: string): string {
  return createHash('sha256').update(`gallos:${password}`).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

function usersFilePath(): string {
  return path.resolve(path.dirname(config.dataFile), 'users.json');
}

let writeQueue = Promise.resolve();

async function writeUsers(store: UsersStore): Promise<void> {
  const file = usersFilePath();
  const tmp = `${file}.tmp`;
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(tmp, JSON.stringify(store, null, 2), 'utf8');
  await rename(tmp, file);
}

function seedStore(): UsersStore {
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
  const adminUsername = process.env.ADMIN_USER ?? 'admin';
  return {
    roles: DEFAULT_ROLES,
    users: [
      {
        id: randomUUID(),
        username: adminUsername,
        passwordHash: hashPassword(adminPassword),
        rolId: 'superadmin',
        activo: true,
        creadoEn: new Date().toISOString(),
        ultimoAcceso: null,
      },
    ],
  };
}

export async function readUsersStore(): Promise<UsersStore> {
  const file = usersFilePath();
  if (!existsSync(file)) {
    const store = seedStore();
    await writeUsers(store);
    return store;
  }
  const raw = await readFile(file, 'utf8');
  const parsed = JSON.parse(raw) as UsersStore;
  for (const defaultRole of DEFAULT_ROLES) {
    if (!parsed.roles.find((r) => r.id === defaultRole.id)) {
      parsed.roles.unshift(defaultRole);
    } else if (defaultRole.id === 'superadmin') {
      const existing = parsed.roles.find((r) => r.id === 'superadmin')!;
      existing.permisos = [...ALL_PERMISSIONS];
    }
  }
  return parsed;
}

export async function saveUsersStore(store: UsersStore): Promise<void> {
  writeQueue = writeQueue.then(() => writeUsers(store)).catch(() => writeUsers(store));
  return writeQueue;
}