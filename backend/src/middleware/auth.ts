import { NextFunction, Request, Response } from 'express';
import { getSession } from '../services/auth.service';
import { Permission } from '../store/users.store';

export interface AuthenticatedRequest extends Request {
  user?: { username: string; role: string; rolId: string; permisos: Permission[] };
  token?: string;
}

export function authenticate(request: AuthenticatedRequest, response: Response, next: NextFunction): void {
  const header = request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  const session = getSession(token);
  if (!session) {
    response.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Debe iniciar sesión.' } });
    return;
  }
  request.user = {
    username: session.username,
    role: session.role,
    rolId: session.rolId,
    permisos: session.permisos,
  };
  request.token = token;
  next();
}

export function requirePermission(permission: Permission) {
  return (request: AuthenticatedRequest, response: Response, next: NextFunction): void => {
    if (!request.user?.permisos.includes(permission)) {
      response.status(403).json({ error: { code: 'FORBIDDEN', message: 'No tienes permiso para realizar esta acción.' } });
      return;
    }
    next();
  };
}