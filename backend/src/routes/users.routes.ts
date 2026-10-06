import { Router } from 'express';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth';
import {
  listRoles, createRole, updateRole, deleteRole,
  listUsers, createUser, updateUser, deleteUser,
  ALL_PERMISSIONS,
} from '../services/users.service';

export const usersRoutes = Router();

usersRoutes.use(authenticate);

usersRoutes.get('/permisos', requirePermission('roles.ver'), (_request, response) => {
  response.json({ permisos: ALL_PERMISSIONS });
});

usersRoutes.get('/roles', requirePermission('roles.ver'), async (_request, response, next) => {
  try {
    response.json(await listRoles());
  } catch (error) { next(error); }
});

usersRoutes.post('/roles', requirePermission('roles.crear'), async (request, response, next) => {
  try {
    response.status(201).json(await createRole(request.body));
  } catch (error) { next(error); }
});

usersRoutes.put('/roles/:id', requirePermission('roles.editar'), async (request, response, next) => {
  try {
    response.json(await updateRole(request.params.id, request.body));
  } catch (error) { next(error); }
});

usersRoutes.delete('/roles/:id', requirePermission('roles.eliminar'), async (request, response, next) => {
  try {
    await deleteRole(request.params.id);
    response.status(204).end();
  } catch (error) { next(error); }
});

usersRoutes.get('/usuarios', requirePermission('usuarios.ver'), async (_request, response, next) => {
  try {
    response.json(await listUsers());
  } catch (error) { next(error); }
});

usersRoutes.post('/usuarios', requirePermission('usuarios.crear'), async (request, response, next) => {
  try {
    response.status(201).json(await createUser(request.body));
  } catch (error) { next(error); }
});

usersRoutes.put('/usuarios/:id', requirePermission('usuarios.editar'), async (request: AuthenticatedRequest, response, next) => {
  try {
    response.json(await updateUser(request.params.id, request.body, request.user!.username));
  } catch (error) { next(error); }
});

usersRoutes.delete('/usuarios/:id', requirePermission('usuarios.eliminar'), async (request: AuthenticatedRequest, response, next) => {
  try {
    await deleteUser(request.params.id, request.user!.username);
    response.status(204).end();
  } catch (error) { next(error); }
});