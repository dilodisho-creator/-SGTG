import { useState, useEffect, useCallback } from 'react';
import { sileo } from 'sileo';
import { AppUser, Permission, Role } from '../types';
import {
  getUsers, getRoles, getPermissionsCatalog,
  createUser, updateAppUser, deleteAppUser,
  createRole, updateRole, deleteRole,
} from '../services/api';
import { useConfirm } from '../components/ui/ConfirmDialog';

const PERM_LABELS: Record<Permission, string> = {
  'usuarios.ver': 'Ver usuarios',
  'usuarios.crear': 'Crear usuarios',
  'usuarios.editar': 'Editar usuarios',
  'usuarios.eliminar': 'Eliminar usuarios',
  'roles.ver': 'Ver roles',
  'roles.crear': 'Crear roles',
  'roles.editar': 'Editar roles',
  'roles.eliminar': 'Eliminar roles',
  'torneo.ver': 'Ver torneo',
  'torneo.editar': 'Editar torneo',
  'peleas.ver': 'Ver peleas',
  'peleas.editar': 'Editar peleas',
  'registro.ver': 'Ver registro',
  'registro.editar': 'Editar registro',
  'ranking.ver': 'Ver ranking',
  'exportaciones.ver': 'Ver exportaciones',
  'respaldos.ver': 'Ver respaldos',
  'respaldos.crear': 'Crear respaldos',
  'respaldos.restaurar': 'Restaurar respaldos',
  'respaldos.eliminar': 'Eliminar respaldos',
  'auditoria.ver': 'Ver auditoría',
  'configuracion.ver': 'Ver configuración',
  'configuracion.editar': 'Editar configuración',
  'galpones.ver': 'Ver galpones',
  'galpones.editar': 'Editar galpones',
};

const PERM_GROUPS: { label: string; perms: Permission[] }[] = [
  { label: 'Usuarios', perms: ['usuarios.ver', 'usuarios.crear', 'usuarios.editar', 'usuarios.eliminar'] },
  { label: 'Roles', perms: ['roles.ver', 'roles.crear', 'roles.editar', 'roles.eliminar'] },
  { label: 'Torneo y Peleas', perms: ['torneo.ver', 'torneo.editar', 'peleas.ver', 'peleas.editar'] },
  { label: 'Registro y Galpones', perms: ['registro.ver', 'registro.editar', 'galpones.ver', 'galpones.editar'] },
  { label: 'Ranking y Exportaciones', perms: ['ranking.ver', 'exportaciones.ver'] },
  { label: 'Respaldos', perms: ['respaldos.ver', 'respaldos.crear', 'respaldos.restaurar', 'respaldos.eliminar'] },
  { label: 'Auditoría', perms: ['auditoria.ver'] },
  { label: 'Configuración', perms: ['configuracion.ver', 'configuracion.editar'] },
];

function getCurrentUsername(): string {
  return '';
}

function RoleBadge({ role }: { role: Role | null }) {
  if (!role) return <span className="text-slate-400 text-xs">Sin rol</span>;
  const colors: Record<string, string> = {
    superadmin: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    admin: 'bg-brand-500/15 text-brand-400 border-brand-500/30',
    operador: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    visualizador: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  };
  const cls = colors[role.id] ?? 'bg-purple-500/15 text-purple-400 border-purple-500/30';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {role.nombre}
    </span>
  );
}

interface UserModalProps {
  user?: AppUser;
  roles: Role[];
  onClose: () => void;
  onSave: (data: { username: string; password: string; rolId: string }) => Promise<void>;
}

function UserModal({ user, roles, onClose, onSave }: UserModalProps) {
  const [username, setUsername] = useState(user?.username ?? '');
  const [password, setPassword] = useState('');
  const [rolId, setRolId] = useState(user?.rolId ?? (roles[0]?.id ?? ''));
  const [saving, setSaving] = useState(false);
  const isEdit = !!user;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ username, password, rolId });
      onClose();
    } catch (err) {
      sileo.error({ title: 'Error', description: err instanceof Error ? err.message : 'No se pudo guardar el usuario.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {isEdit ? 'Editar usuario' : 'Nuevo usuario'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Usuario</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isEdit}
              placeholder="solo letras, números y _"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              {isEdit ? 'Nueva contraseña (vacío = sin cambio)' : 'Contraseña'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Rol</label>
            <select
              value={rolId}
              onChange={(e) => setRolId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold transition-colors disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface RoleModalProps {
  role?: Role;
  allPerms: Permission[];
  onClose: () => void;
  onSave: (data: { nombre: string; descripcion: string; permisos: Permission[] }) => Promise<void>;
}

function RoleModal({ role, allPerms, onClose, onSave }: RoleModalProps) {
  const [nombre, setNombre] = useState(role?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(role?.descripcion ?? '');
  const [permisos, setPermisos] = useState<Permission[]>(role?.permisos ?? []);
  const [saving, setSaving] = useState(false);
  const isEdit = !!role;
  const isSuperadmin = role?.id === 'superadmin';

  function togglePerm(p: Permission) {
    setPermisos((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  }

  function toggleGroup(group: Permission[]) {
    const allSelected = group.every((p) => permisos.includes(p));
    if (allSelected) {
      setPermisos((prev) => prev.filter((p) => !group.includes(p)));
    } else {
      setPermisos((prev) => [...new Set([...prev, ...group])]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ nombre, descripcion, permisos });
      onClose();
    } catch (err) {
      sileo.error({ title: 'Error', description: err instanceof Error ? err.message : 'No se pudo guardar el rol.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
        <div className="flex items-center gap-3 p-6 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{isEdit ? 'Editar rol' : 'Nuevo rol'}</h2>
            {isSuperadmin && <p className="text-xs text-amber-500">Los permisos del Super Administrador no pueden modificarse.</p>}
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 space-y-4 flex-shrink-0">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Nombre del rol</label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  disabled={isSuperadmin}
                  placeholder="Ej. Anotador"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Descripción</label>
                <input
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  disabled={isSuperadmin}
                  placeholder="Descripción breve"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div className="px-6 pb-2 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Permisos</p>
              {!isSuperadmin && (
                <button type="button" onClick={() => setPermisos(permisos.length === allPerms.length ? [] : [...allPerms])}
                  className="text-xs text-brand-500 hover:text-brand-400 font-semibold">
                  {permisos.length === allPerms.length ? 'Quitar todos' : 'Seleccionar todos'}
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto flex-1 px-6 pb-6 space-y-3">
            {PERM_GROUPS.map((group) => {
              const available = group.perms.filter((p) => allPerms.includes(p));
              if (!available.length) return null;
              const allSelected = available.every((p) => permisos.includes(p));
              const someSelected = available.some((p) => permisos.includes(p));
              return (
                <div key={group.label} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => !isSuperadmin && toggleGroup(available)}
                    disabled={isSuperadmin}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide transition-colors
                      ${allSelected ? 'bg-purple-500/10 text-purple-500 dark:text-purple-400' : someSelected ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400'}
                      disabled:cursor-default`}
                  >
                    <span>{group.label}</span>
                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors
                      ${allSelected ? 'bg-purple-500 border-purple-500' : someSelected ? 'border-purple-400 bg-purple-200 dark:bg-purple-900/30' : 'border-slate-300 dark:border-slate-600'}`}>
                      {allSelected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </span>
                  </button>
                  <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 dark:divide-slate-700/50">
                    {available.map((p) => {
                      const active = permisos.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          disabled={isSuperadmin}
                          onClick={() => togglePerm(p)}
                          className={`flex items-center gap-2.5 px-4 py-2 text-left text-xs transition-colors disabled:cursor-default
                            ${active ? 'bg-purple-500/5 text-purple-600 dark:text-purple-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                        >
                          <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center transition-colors
                            ${active ? 'bg-purple-500 border-purple-500' : 'border-slate-300 dark:border-slate-600'}`}>
                            {active && <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                          </span>
                          {PERM_LABELS[p]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 p-6 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving || isSuperadmin} className="flex-1 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold transition-colors disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar rol'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface UsersPageProps {
  currentUsername: string;
  currentRolId: string;
}

export function UsersPage({ currentUsername, currentRolId }: UsersPageProps) {
  const [tab, setTab] = useState<'usuarios' | 'roles'>('usuarios');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPerms, setAllPerms] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [userModal, setUserModal] = useState<{ open: boolean; user?: AppUser }>({ open: false });
  const [roleModal, setRoleModal] = useState<{ open: boolean; role?: Role }>({ open: false });
  const { confirm, dialog: confirmDialog } = useConfirm();

  const load = useCallback(async () => {
    try {
      const [u, r, p] = await Promise.all([getUsers(), getRoles(), getPermissionsCatalog()]);
      setUsers(u);
      setRoles(r);
      setAllPerms(p.permisos);
    } catch (err) {
      sileo.error({ title: 'Error', description: 'No se pudieron cargar los usuarios.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleSaveUser(data: { username: string; password: string; rolId: string }) {
    if (userModal.user) {
      const body: { rolId?: string; password?: string } = { rolId: data.rolId };
      if (data.password) body.password = data.password;
      await updateAppUser(userModal.user.id, body);
      sileo.success({ title: 'Usuario actualizado', description: `${userModal.user.username} fue actualizado.` });
    } else {
      await createUser(data);
      sileo.success({ title: 'Usuario creado', description: `${data.username} fue registrado correctamente.` });
    }
    await load();
  }

  async function handleToggleUser(user: AppUser) {
    const action = user.activo ? 'desactivar' : 'activar';
    const ok = await confirm({
      title: `¿${user.activo ? 'Desactivar' : 'Activar'} usuario?`,
      description: `El usuario "${user.username}" será ${action === 'desactivar' ? 'desactivado y no podrá iniciar sesión' : 'reactivado'}.`,
      confirmLabel: user.activo ? 'Desactivar' : 'Activar',
      variant: user.activo ? 'danger' : 'info',
    });
    if (!ok) return;
    try {
      await updateAppUser(user.id, { activo: !user.activo });
      sileo.success({ title: `Usuario ${user.activo ? 'desactivado' : 'activado'}`, description: `${user.username} fue ${user.activo ? 'desactivado' : 'reactivado'}.` });
      await load();
    } catch (err) {
      sileo.error({ title: 'Error', description: err instanceof Error ? err.message : 'No se pudo actualizar el usuario.' });
    }
  }

  async function handleDeleteUser(user: AppUser) {
    const ok = await confirm({
      title: 'Eliminar usuario',
      description: `¿Eliminar permanentemente al usuario "${user.username}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Sí, eliminar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await deleteAppUser(user.id);
      sileo.success({ title: 'Usuario eliminado', description: `${user.username} fue eliminado del sistema.` });
      await load();
    } catch (err) {
      sileo.error({ title: 'Error', description: err instanceof Error ? err.message : 'No se pudo eliminar el usuario.' });
    }
  }

  async function handleSaveRole(data: { nombre: string; descripcion: string; permisos: Permission[] }) {
    if (roleModal.role) {
      await updateRole(roleModal.role.id, data);
      sileo.success({ title: 'Rol actualizado', description: `El rol "${data.nombre}" fue actualizado.` });
    } else {
      await createRole(data);
      sileo.success({ title: 'Rol creado', description: `El rol "${data.nombre}" fue creado correctamente.` });
    }
    await load();
  }

  async function handleDeleteRole(role: Role) {
    const ok = await confirm({
      title: 'Eliminar rol',
      description: `¿Eliminar el rol "${role.nombre}"? Los usuarios asignados a este rol deben ser reasignados antes.`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await deleteRole(role.id);
      sileo.success({ title: 'Rol eliminado', description: `El rol "${role.nombre}" fue eliminado.` });
      await load();
    } catch (err) {
      sileo.error({ title: 'Error', description: err instanceof Error ? err.message : 'No se pudo eliminar el rol.' });
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit mb-6">
        {(['usuarios', 'roles'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all capitalize
              ${tab === t ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            {t === 'usuarios' ? `Usuarios (${users.length})` : `Roles (${roles.length})`}
          </button>
        ))}
      </div>

      {tab === 'usuarios' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">{users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}</p>
            <button
              onClick={() => setUserModal({ open: true })}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-bold transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo usuario
            </button>
          </div>

          <div className="grid gap-3">
            {users.map((user) => {
              const isMe = user.username === currentUsername;
              const isSuperadminUser = user.rolId === 'superadmin';
              return (
                <div key={user.id} className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 flex items-center gap-4 transition-all
                  ${user.activo ? 'border-slate-200 dark:border-slate-700' : 'border-slate-100 dark:border-slate-800 opacity-60'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0
                    ${isSuperadminUser ? 'bg-amber-500/10 text-amber-500' : 'bg-brand-500/10 text-brand-500'}`}>
                    {user.username.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{user.username}</span>
                      {isMe && <span className="text-xs bg-brand-500/10 text-brand-500 px-1.5 py-0.5 rounded-md font-semibold">Tú</span>}
                      {!user.activo && <span className="text-xs bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded-md font-semibold">Inactivo</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <RoleBadge role={user.rol} />
                      {user.ultimoAcceso && (
                        <span className="text-xs text-slate-400">
                          Último acceso: {new Date(user.ultimoAcceso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setUserModal({ open: true, user })}
                      title="Editar"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {!isMe && (
                      <button
                        onClick={() => handleToggleUser(user)}
                        title={user.activo ? 'Desactivar' : 'Activar'}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                          ${user.activo ? 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10' : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'}`}
                      >
                        {user.activo ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </button>
                    )}
                    {!isMe && currentRolId === 'superadmin' && (
                      <button
                        onClick={() => handleDeleteUser(user)}
                        title="Eliminar"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'roles' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">{roles.length} rol{roles.length !== 1 ? 'es' : ''} configurado{roles.length !== 1 ? 's' : ''}</p>
            <button
              onClick={() => setRoleModal({ open: true })}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo rol
            </button>
          </div>

          <div className="grid gap-4">
            {roles.map((role) => {
              const usersWithRole = users.filter((u) => u.rolId === role.id);
              return (
                <div key={role.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="flex items-start gap-4 p-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                      ${role.id === 'superadmin' ? 'bg-amber-500/10 text-amber-500' : role.id === 'admin' ? 'bg-brand-500/10 text-brand-500' : 'bg-purple-500/10 text-purple-500'}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{role.nombre}</span>
                        {role.esInterno && (
                          <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-md font-semibold">Sistema</span>
                        )}
                        {role.id === 'superadmin' && (
                          <span className="text-xs bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-md font-semibold">⭐ Máximo nivel</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{role.descripcion}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-slate-400">
                          {role.permisos.length} permiso{role.permisos.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-xs text-slate-400">
                          {usersWithRole.length} usuario{usersWithRole.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setRoleModal({ open: true, role })}
                        title={role.id === 'superadmin' ? 'Ver permisos' : 'Editar'}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {!role.esInterno && (
                        <button
                          onClick={() => handleDeleteRole(role)}
                          title="Eliminar"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="px-4 pb-4">
                    <div className="flex flex-wrap gap-1.5">
                      {role.permisos.slice(0, 8).map((p) => (
                        <span key={p} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
                          {PERM_LABELS[p]}
                        </span>
                      ))}
                      {role.permisos.length > 8 && (
                        <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                          +{role.permisos.length - 8} más
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {userModal.open && (
        <UserModal
          user={userModal.user}
          roles={roles}
          onClose={() => setUserModal({ open: false })}
          onSave={handleSaveUser}
        />
      )}
      {roleModal.open && (
        <RoleModal
          role={roleModal.role}
          allPerms={allPerms}
          onClose={() => setRoleModal({ open: false })}
          onSave={handleSaveRole}
        />
      )}
      {confirmDialog}
    </div>
  );
}