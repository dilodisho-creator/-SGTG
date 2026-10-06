import { randomUUID } from 'node:crypto';
import { AppError } from '../errors';
import {
  ALL_PERMISSIONS,
  AppUser,
  DEFAULT_ROLES,
  Permission,
  Role,
  hashPassword,
  readUsersStore,
  saveUsersStore,
  verifyPassword,
} from '../store/users.store';

export async function listRoles(): Promise<Role[]> {
  const store = await readUsersStore();
  return store.roles;
}

export async function createRole(body: unknown): Promise<Role> {
  if (!body || typeof body !== 'object') throw new AppError(400, 'INVALID_BODY', 'El cuerpo de la solicitud no es válido.');
  const src = body as Record<string, unknown>;

  const nombre = typeof src.nombre === 'string' ? src.nombre.trim() : '';
  if (!nombre) throw new AppError(400, 'MISSING_NOMBRE', 'El nombre del rol es obligatorio.');
  if (nombre.length > 60) throw new AppError(400, 'NOMBRE_TOO_LONG', 'El nombre no puede superar 60 caracteres.');

  const descripcion = typeof src.descripcion === 'string' ? src.descripcion.trim().slice(0, 200) : '';
  const rawPermisos = Array.isArray(src.permisos) ? src.permisos : [];
  const permisos = rawPermisos.filter((p): p is Permission => ALL_PERMISSIONS.includes(p as Permission));

  const store = await readUsersStore();
  if (store.roles.some((r) => r.nombre.toLowerCase() === nombre.toLowerCase())) {
    throw new AppError(409, 'ROLE_EXISTS', 'Ya existe un rol con ese nombre.');
  }

  const role: Role = {
    id: randomUUID(),
    nombre,
    descripcion,
    permisos,
    esInterno: false,
    creadoEn: new Date().toISOString(),
  };
  store.roles.push(role);
  await saveUsersStore(store);
  return role;
}

export async function updateRole(id: string, body: unknown): Promise<Role> {
  if (!body || typeof body !== 'object') throw new AppError(400, 'INVALID_BODY', 'El cuerpo de la solicitud no es válido.');
  const src = body as Record<string, unknown>;

  const store = await readUsersStore();
  const role = store.roles.find((r) => r.id === id);
  if (!role) throw new AppError(404, 'ROLE_NOT_FOUND', 'El rol no existe.');
  if (role.id === 'superadmin') throw new AppError(403, 'FORBIDDEN', 'El rol Super Administrador no puede modificarse.');

  if (typeof src.nombre === 'string') {
    const nombre = src.nombre.trim();
    if (!nombre) throw new AppError(400, 'MISSING_NOMBRE', 'El nombre del rol es obligatorio.');
    if (store.roles.some((r) => r.id !== id && r.nombre.toLowerCase() === nombre.toLowerCase())) {
      throw new AppError(409, 'ROLE_EXISTS', 'Ya existe un rol con ese nombre.');
    }
    role.nombre = nombre.slice(0, 60);
  }
  if (typeof src.descripcion === 'string') role.descripcion = src.descripcion.trim().slice(0, 200);
  if (Array.isArray(src.permisos)) {
    role.permisos = src.permisos.filter((p): p is Permission => ALL_PERMISSIONS.includes(p as Permission));
  }

  await saveUsersStore(store);
  return role;
}

export async function deleteRole(id: string): Promise<void> {
  const store = await readUsersStore();
  const role = store.roles.find((r) => r.id === id);
  if (!role) throw new AppError(404, 'ROLE_NOT_FOUND', 'El rol no existe.');
  if (role.esInterno) throw new AppError(403, 'FORBIDDEN', 'Los roles del sistema no pueden eliminarse.');
  if (store.users.some((u) => u.rolId === id)) {
    throw new AppError(409, 'ROLE_IN_USE', 'El rol tiene usuarios asignados. Reasígnelos antes de eliminar el rol.');
  }
  store.roles = store.roles.filter((r) => r.id !== id);
  await saveUsersStore(store);
}

export type PublicUser = Omit<AppUser, 'passwordHash'> & { rol: Role | null };

function toPublic(user: AppUser, roles: Role[]): PublicUser {
  const { passwordHash: _pw, ...rest } = user;
  return { ...rest, rol: roles.find((r) => r.id === user.rolId) ?? null };
}

export async function listUsers(): Promise<PublicUser[]> {
  const store = await readUsersStore();
  return store.users.map((u) => toPublic(u, store.roles));
}

export async function createUser(body: unknown): Promise<PublicUser> {
  if (!body || typeof body !== 'object') throw new AppError(400, 'INVALID_BODY', 'El cuerpo de la solicitud no es válido.');
  const src = body as Record<string, unknown>;

  const username = typeof src.username === 'string' ? src.username.trim().toLowerCase() : '';
  if (!username) throw new AppError(400, 'MISSING_USERNAME', 'El nombre de usuario es obligatorio.');
  if (!/^[a-z0-9_]{3,30}$/.test(username)) throw new AppError(400, 'INVALID_USERNAME', 'El usuario solo puede tener letras, números y guiones bajos (3-30 caracteres).');

  const password = typeof src.password === 'string' ? src.password : '';
  if (password.length < 6) throw new AppError(400, 'WEAK_PASSWORD', 'La contraseña debe tener al menos 6 caracteres.');

  const rolId = typeof src.rolId === 'string' ? src.rolId : '';
  const store = await readUsersStore();
  if (!store.roles.find((r) => r.id === rolId)) throw new AppError(404, 'ROLE_NOT_FOUND', 'El rol especificado no existe.');
  if (store.users.some((u) => u.username === username)) throw new AppError(409, 'USER_EXISTS', 'Ya existe un usuario con ese nombre.');

  const user: AppUser = {
    id: randomUUID(),
    username,
    passwordHash: hashPassword(password),
    rolId,
    activo: true,
    creadoEn: new Date().toISOString(),
    ultimoAcceso: null,
  };
  store.users.push(user);
  await saveUsersStore(store);
  return toPublic(user, store.roles);
}

export async function updateUser(id: string, body: unknown, requestingUsername: string): Promise<PublicUser> {
  if (!body || typeof body !== 'object') throw new AppError(400, 'INVALID_BODY', 'El cuerpo de la solicitud no es válido.');
  const src = body as Record<string, unknown>;

  const store = await readUsersStore();
  const user = store.users.find((u) => u.id === id);
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'El usuario no existe.');

  const requestingUser = store.users.find((u) => u.username === requestingUsername);
  if (requestingUser?.id === user.id && src.rolId && src.rolId !== user.rolId) {
    throw new AppError(403, 'FORBIDDEN', 'No puedes cambiar tu propio rol.');
  }
  if (requestingUser?.id === user.id && src.activo === false) {
    throw new AppError(403, 'FORBIDDEN', 'No puedes desactivar tu propia cuenta.');
  }

  const superadminUsers = store.users.filter((u) => u.rolId === 'superadmin' && u.activo);
  if (user.rolId === 'superadmin' && superadminUsers.length === 1) {
    if (src.rolId && src.rolId !== 'superadmin') throw new AppError(403, 'FORBIDDEN', 'No se puede cambiar el rol del último Super Administrador activo.');
    if (src.activo === false) throw new AppError(403, 'FORBIDDEN', 'No se puede desactivar al último Super Administrador activo.');
  }

  if (typeof src.rolId === 'string') {
    if (!store.roles.find((r) => r.id === src.rolId)) throw new AppError(404, 'ROLE_NOT_FOUND', 'El rol especificado no existe.');
    user.rolId = src.rolId;
  }
  if (typeof src.activo === 'boolean') user.activo = src.activo;
  if (typeof src.password === 'string' && src.password.length > 0) {
    if (src.password.length < 6) throw new AppError(400, 'WEAK_PASSWORD', 'La contraseña debe tener al menos 6 caracteres.');
    user.passwordHash = hashPassword(src.password);
  }

  await saveUsersStore(store);
  return toPublic(user, store.roles);
}

export async function deleteUser(id: string, requestingUsername: string): Promise<void> {
  const store = await readUsersStore();
  const user = store.users.find((u) => u.id === id);
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'El usuario no existe.');

  const requestingUser = store.users.find((u) => u.username === requestingUsername);
  if (requestingUser?.id === user.id) throw new AppError(403, 'FORBIDDEN', 'No puedes eliminar tu propia cuenta.');

  const superadminUsers = store.users.filter((u) => u.rolId === 'superadmin' && u.activo);
  if (user.rolId === 'superadmin' && superadminUsers.length === 1) {
    throw new AppError(403, 'FORBIDDEN', 'No se puede eliminar al último Super Administrador activo.');
  }

  store.users = store.users.filter((u) => u.id !== id);
  await saveUsersStore(store);
}

export async function authenticateUser(username: string, password: string): Promise<{ user: AppUser; role: Role }> {
  const store = await readUsersStore();
  const user = store.users.find((u) => u.username === username.toLowerCase());
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Usuario o contraseña incorrectos.');
  }
  if (!user.activo) throw new AppError(403, 'ACCOUNT_DISABLED', 'La cuenta está desactivada. Contacta al administrador.');
  const role = store.roles.find((r) => r.id === user.rolId);
  if (!role) throw new AppError(500, 'ROLE_NOT_FOUND', 'El rol del usuario no existe. Contacta al administrador.');

  user.ultimoAcceso = new Date().toISOString();
  await saveUsersStore(store);

  return { user, role };
}

export async function getUserByUsername(username: string): Promise<{ user: AppUser; role: Role } | null> {
  const store = await readUsersStore();
  const user = store.users.find((u) => u.username === username.toLowerCase());
  if (!user) return null;
  const role = store.roles.find((r) => r.id === user.rolId);
  if (!role) return null;
  return { user, role };
}

export { ALL_PERMISSIONS, DEFAULT_ROLES };