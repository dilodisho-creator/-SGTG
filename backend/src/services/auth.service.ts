import { randomBytes } from 'node:crypto';
import { AppError } from '../errors';
import { authenticateUser, getUserByUsername } from './users.service';
import { Permission } from '../store/users.store';

interface Session {
  username: string;
  role: string;
  rolId: string;
  permisos: Permission[];
  expiresAt: number;
}

const sessions = new Map<string, Session>();
const duration = 12 * 60 * 60 * 1000;

export async function login(user: unknown, pass: unknown) {
  if (typeof user !== 'string' || typeof pass !== 'string') {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Usuario o contraseña incorrectos.');
  }
  const { user: appUser, role } = await authenticateUser(user, pass);
  const token = randomBytes(32).toString('hex');
  const session: Session = {
    username: appUser.username,
    role: role.nombre,
    rolId: role.id,
    permisos: role.permisos,
    expiresAt: Date.now() + duration,
  };
  sessions.set(token, session);
  return {
    token,
    user: { username: appUser.username, role: role.nombre, rolId: role.id, permisos: role.permisos },
    expiresAt: new Date(session.expiresAt).toISOString(),
  };
}

export function getSession(token: string): Session | null {
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

export function logout(token: string): void {
  sessions.delete(token);
}