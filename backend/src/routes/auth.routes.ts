import { Router } from 'express';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth';
import { login, logout } from '../services/auth.service';
import { recordAccess } from '../services/management.service';

export const authRoutes = Router();

authRoutes.post('/login', async (request, response, next) => {
  try {
    const result = await login(request.body?.username, request.body?.password);
    await recordAccess('ENTRAR', result.user.username);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

authRoutes.get('/session', authenticate, (request: AuthenticatedRequest, response) => {
  response.json({ user: request.user });
});

authRoutes.post('/logout', authenticate, async (request: AuthenticatedRequest, response, next) => {
  try {
    await recordAccess('SALIR', request.user?.username ?? 'admin');
    if (request.token) logout(request.token);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});