import { useEffect, useMemo, useState } from 'react';
import type { AuthUser } from '../auth/types/auth.types';
import {
  listUsersMock,
  updateUserRoleMock,
  updateUserStatusMock,
} from '../../shared/mocks/auth.mock';
import { USER_ROLE_OPTIONS, type UserRole } from '../../shared/constants/roles';

interface UsersPageProps {
  onBack: () => void;
}

type RoleFilter = 'ALL' | UserRole;
type UserMenuAction = 'edit' | 'status';

export default function UsersPage({ onBack }: UsersPageProps) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [openMenuUserId, setOpenMenuUserId] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [showRoleOptions, setShowRoleOptions] = useState(false);
  const [pendingAction, setPendingAction] = useState<UserMenuAction | null>(null);

  const [confirmRoleUser, setConfirmRoleUser] = useState<AuthUser | null>(null);
  const [confirmStatusUser, setConfirmStatusUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const data = await listUsersMock();
        setUsers(data);
      } finally {
        setIsLoading(false);
      }
    };

    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesRole = roleFilter === 'ALL' ? true : user.rol === roleFilter;

      const normalizedSearch = searchTerm.trim().toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0
          ? true
          : user.username.toLowerCase().includes(normalizedSearch) ||
            user.nombre.toLowerCase().includes(normalizedSearch) ||
            user.apellido.toLowerCase().includes(normalizedSearch) ||
            user.correo.toLowerCase().includes(normalizedSearch);

      return matchesRole && matchesSearch;
    });
  }, [roleFilter, searchTerm, users]);

  const handleOpenEdit = (user: AuthUser) => {
    setOpenMenuUserId(null);
    setEditingUser(user);
    setSelectedRole(user.rol);
    setShowRoleOptions(false);
    setPendingAction(null);
  };

  const handleOpenStatus = (user: AuthUser) => {
    setOpenMenuUserId(null);
    setConfirmStatusUser(user);
  };

  const handleConfirmRoleChange = async () => {
    if (!confirmRoleUser || !selectedRole) {
      return;
    }

    const updatedUser = await updateUserRoleMock(confirmRoleUser.id, selectedRole);

    setUsers((prev) =>
      prev.map((user) => (user.id === updatedUser.id ? updatedUser : user))
    );

    setConfirmRoleUser(null);
    setEditingUser(null);
    setSelectedRole('');
    setShowRoleOptions(false);
    setPendingAction(null);
  };

  const handleConfirmStatusChange = async () => {
    if (!confirmStatusUser) {
      return;
    }

    const updatedUser = await updateUserStatusMock(
      confirmStatusUser.id,
      !confirmStatusUser.activo
    );

    setUsers((prev) =>
      prev.map((user) => (user.id === updatedUser.id ? updatedUser : user))
    );

    setConfirmStatusUser(null);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-md">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 text-2xl text-text"
        >
          ☰
        </button>

        <h1 className="text-subtitle font-semibold text-text">Usuarios</h1>
        <p className="mb-6 text-sm text-gray-500">
          Gestiona los usuarios de tu sistema
        </p>

        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="buscar usuarios"
          className="mb-4 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-text outline-none focus:border-primary"
        />

        <h2 className="mb-4 text-subtitle font-semibold text-text">
          Todos usuarios
        </h2>

        <div className="relative mb-6">
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
            className="w-full appearance-none rounded-none bg-primary px-4 py-3 text-sm font-medium text-white outline-none"
          >
            <option value="ALL">Seleccionar</option>
            {USER_ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white">
            ˅
          </span>
        </div>

        <div className="mb-4 border-t border-primary" />

        {isLoading ? (
          <p className="text-sm text-gray-500">Cargando usuarios...</p>
        ) : filteredUsers.length === 0 ? (
          <p className="text-sm text-gray-500">No se encontraron usuarios.</p>
        ) : (
          <div className="space-y-6">
            {filteredUsers.map((user) => {
              const isMenuOpen = openMenuUserId === user.id;

              return (
                <div key={user.id} className="relative rounded-xl bg-white p-4 shadow-sm">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenuUserId((prev) => (prev === user.id ? null : user.id))
                    }
                    className="absolute right-3 top-3 text-xl text-text"
                  >
                    ⋮
                  </button>

                  {isMenuOpen && (
                    <div className="absolute right-8 top-8 z-10 min-w-[120px] rounded-md bg-white py-2 shadow-lg">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(user)}
                        className="block w-full px-4 py-2 text-left text-sm text-text hover:bg-gray-50"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenStatus(user)}
                        className="block w-full px-4 py-2 text-left text-sm text-text hover:bg-gray-50"
                      >
                        {user.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                    <span className="text-text">Nombre usuario</span>
                    <span className="text-gray-500">{user.username}</span>

                    <span className="text-text">Nombres</span>
                    <span className="text-gray-500">{user.nombre}</span>

                    <span className="text-text">Apellidos</span>
                    <span className="text-gray-500">{user.apellido}</span>

                    <span className="text-text">Correo</span>
                    <span className="text-gray-500">{user.correo}</span>

                    <span className="text-text">Rol</span>
                    <span className="text-gray-500">{user.rol}</span>

                    <span className="text-text">Telefono</span>
                    <span className="text-gray-500">{user.telefono}</span>

                    <span className="text-text">Ci</span>
                    <span className="text-gray-500">{user.ci ?? '-'}</span>

                    <span className="text-text">Estado</span>
                    <span className={user.activo ? 'text-success' : 'text-alert'}>
                      {user.activo ? 'activo' : 'inactivo'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {editingUser && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
            <div className="w-full max-w-[360px] rounded-[2rem] bg-white p-5 shadow-2xl">
              <div className="mb-4 flex items-start justify-between">
                <h3 className="text-lg font-semibold text-text">Editar usuario</h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditingUser(null);
                    setSelectedRole('');
                    setShowRoleOptions(false);
                    setPendingAction(null);
                  }}
                  className="text-lg text-text"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-text">
                    Nombre usuario
                  </label>
                  <input
                    type="text"
                    value={editingUser.username}
                    readOnly
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-500 outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-text">
                    Correo
                  </label>
                  <input
                    type="text"
                    value={editingUser.correo}
                    readOnly
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-500 outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-text">
                    Rol
                  </label>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowRoleOptions((prev) => !prev)}
                      className="flex w-full items-center justify-between bg-primary px-4 py-3 text-sm text-white"
                    >
                      <span>{selectedRole || 'Seleccionar'}</span>
                      <span>˅</span>
                    </button>

                    {showRoleOptions && (
                      <div className="absolute left-0 right-0 z-20 bg-white shadow-lg">
                        {USER_ROLE_OPTIONS.map((role) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => {
                              setSelectedRole(role);
                              setShowRoleOptions(false);
                            }}
                            className="block w-full px-4 py-3 text-center text-sm text-text hover:bg-gray-50"
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-text">
                      CI
                    </label>
                    <input
                      type="text"
                      value={editingUser.ci ?? ''}
                      readOnly
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-text">
                      Estado activo
                    </label>
                    <input
                      type="text"
                      value={editingUser.activo ? 'activo' : 'inactivo'}
                      readOnly
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUser(null);
                      setSelectedRole('');
                      setShowRoleOptions(false);
                      setPendingAction(null);
                    }}
                    className="rounded-full border border-text px-5 py-2 text-sm font-medium text-text"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    disabled={!selectedRole || selectedRole === editingUser.rol}
                    onClick={() => {
                      setConfirmRoleUser(editingUser);
                      setPendingAction('edit');
                    }}
                    className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
                  >
                    Listo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {confirmRoleUser && pendingAction === 'edit' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
            <div className="w-full max-w-[340px] rounded-[2rem] bg-white p-6 text-center shadow-2xl">
              <p className="mb-6 text-base font-semibold text-text">
                ¿Confirmar cambios?
              </p>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmRoleUser(null);
                    setPendingAction(null);
                  }}
                  className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-medium text-text"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmRoleChange}
                  className="flex-1 rounded-xl bg-primary py-3 text-sm font-medium text-white hover:bg-primary-hover"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmStatusUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
            <div className="w-full max-w-[340px] rounded-[2rem] bg-white p-6 text-center shadow-2xl">
              <p className="mb-6 text-base font-semibold text-text">
                {confirmStatusUser.activo
                  ? '¿Desactivar cuenta?'
                  : '¿Activar cuenta?'}
              </p>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setConfirmStatusUser(null)}
                  className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-medium text-text"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmStatusChange}
                  className="flex-1 rounded-xl bg-primary py-3 text-sm font-medium text-white hover:bg-primary-hover"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}