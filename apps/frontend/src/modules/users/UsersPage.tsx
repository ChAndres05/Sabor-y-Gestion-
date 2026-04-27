import { useCallback, useEffect, useMemo, useState } from 'react';
import { USER_ROLE_OPTIONS, type UserRole } from '../../shared/constants/roles';
import BaseButton from '../../shared/components/BaseButton';
import BaseModal from '../../shared/components/BaseModal';
import PageSectionTitle from '../../shared/components/PageSectionTitle';
import ReadOnlyField from '../../shared/components/ReadOnlyField';
import SectionCard from '../../shared/components/SectionCard';
import { usersApi } from './api/users.api';
import type { UserListItem } from './types/users.types';

interface UsersPageProps {
  onBack: () => void;
}

type RoleFilter = 'ALL' | UserRole;

export default function UsersPage({ onBack }: UsersPageProps) {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [openMenuUserId, setOpenMenuUserId] = useState<number | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [showConfirmRoleModal, setShowConfirmRoleModal] = useState(false);

  const [statusUser, setStatusUser] = useState<UserListItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const filterLabel = useMemo(() => {
    if (roleFilter === 'ALL') return 'Seleccionar';
    return roleFilter;
  }, [roleFilter]);

  const loadUsers = useCallback(
    async (query = searchTerm, role = roleFilter) => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const data = await usersApi.search({
          q: query,
          rol: role,
        });

        setUsers(data);
      } catch (error) {
        if (error instanceof Error) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage('No se pudo cargar la lista de usuarios');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [searchTerm, roleFilter]
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadUsers(searchTerm, roleFilter);
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchTerm, roleFilter, loadUsers]);

  const handleOpenEdit = (user: UserListItem) => {
    setOpenMenuUserId(null);
    setEditingUser(user);
    setSelectedRole(user.rol);
    setIsRoleDropdownOpen(false);
  };

  const handleOpenStatus = (user: UserListItem) => {
    setOpenMenuUserId(null);
    setStatusUser(user);
  };

  const handleCloseEditModal = () => {
    setEditingUser(null);
    setSelectedRole('');
    setIsRoleDropdownOpen(false);
    setShowConfirmRoleModal(false);
  };

  const handleConfirmRoleChange = async () => {
    if (!editingUser || !selectedRole) return;

    setIsSaving(true);

    try {
      await usersApi.updateUser({
        id: editingUser.id,
        role: selectedRole,
      });

      setShowConfirmRoleModal(false);
      setEditingUser(null);
      setSelectedRole('');
      await loadUsers();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('No se pudo actualizar el rol');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!statusUser) return;

    setIsSaving(true);

    try {
      await usersApi.updateUser({
        id: statusUser.id,
        role: statusUser.rol,
        estado: !statusUser.estado,
      });

      setStatusUser(null);
      await loadUsers();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('No se pudo actualizar el estado del usuario');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen bg-background">
      <div className="mx-auto flex h-full max-w-md flex-col px-4 py-6">
        <div className="shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="mb-4 text-2xl text-text"
          >
            ☰
          </button>

          <PageSectionTitle
            title="Usuarios"
            subtitle="Gestiona los usuarios de tu sistema"
          />

          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="buscar usuarios"
            className="mb-4 mt-6 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-text outline-none focus:border-primary"
          />

          <h2 className="mb-4 text-subtitle font-semibold text-text">
            Todos usuarios
          </h2>

          <div className="relative mb-6">
            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white"
            >
              <span>{filterLabel}</span>
              <span>˅</span>
            </button>

            {isFilterOpen && (
              <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl bg-white shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setRoleFilter('ALL');
                    setIsFilterOpen(false);
                  }}
                  className="block w-full px-4 py-3 text-left text-sm text-text hover:bg-gray-50"
                >
                  Seleccionar
                </button>

                {USER_ROLE_OPTIONS.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setRoleFilter(role);
                      setIsFilterOpen(false);
                    }}
                    className="block w-full px-4 py-3 text-left text-sm text-text hover:bg-gray-50"
                  >
                    {role}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mb-4 border-t border-primary" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-2">
          {isLoading ? (
            <p className="text-sm text-gray-500">Cargando usuarios...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-gray-500">No se encontraron usuarios.</p>
          ) : (
            <div className="space-y-4 pr-1">
              {users.map((user) => {
                const isMenuOpen = openMenuUserId === user.id;

                return (
                  <SectionCard key={user.backendId} className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuUserId((prev) =>
                          prev === user.id ? null : user.id
                        )
                      }
                      className="absolute right-3 top-3 text-xl text-text"
                    >
                      ⋮
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-8 top-8 z-10 min-w-[140px] overflow-hidden rounded-xl bg-white py-2 shadow-lg">
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
                          {user.estado ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                      <span className="text-text">Nombres</span>
                      <span className="text-gray-500">{user.nombre}</span>

                      <span className="text-text">Apellidos</span>
                      <span className="text-gray-500">{user.apellido}</span>

                      <span className="text-text">Documento</span>
                      <span className="text-gray-500">{user.documento}</span>

                      <span className="text-text">Correo</span>
                      <span className="text-gray-500">{user.correo}</span>

                      <span className="text-text">Rol</span>
                      <span className="text-gray-500">{user.rol}</span>

                      <span className="text-text">Estado</span>
                      <span className={user.estado ? 'text-success' : 'text-alert'}>
                        {user.estado ? 'activo' : 'inactivo'}
                      </span>
                    </div>
                  </SectionCard>
                );
              })}
            </div>
          )}
        </div>

        <BaseModal
          open={Boolean(editingUser)}
          title="Editar usuario"
          onClose={handleCloseEditModal}
        >
          {editingUser && (
            <div className="space-y-4">
              <ReadOnlyField label="Nombres" value={editingUser.nombre} />
              <ReadOnlyField label="Apellidos" value={editingUser.apellido} />
              <ReadOnlyField label="Correo" value={editingUser.correo} />

              <div>
                <label className="mb-1 block text-sm font-semibold text-text">
                  Rol
                </label>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsRoleDropdownOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-2xl bg-primary px-4 py-3 text-sm text-white"
                  >
                    <span>{selectedRole || 'Seleccionar'}</span>
                    <span>˅</span>
                  </button>

                  {isRoleDropdownOpen && (
                    <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl bg-white shadow-lg">
                      {USER_ROLE_OPTIONS.map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => {
                            setSelectedRole(role);
                            setIsRoleDropdownOpen(false);
                          }}
                          className="block w-full px-4 py-3 text-left text-sm text-text hover:bg-gray-50"
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <ReadOnlyField label="Documento" value={editingUser.documento} />
                <ReadOnlyField
                  label="Estado"
                  value={editingUser.estado ? 'activo' : 'inactivo'}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <BaseButton variant="outline" onClick={handleCloseEditModal}>
                  Cancelar
                </BaseButton>

                <BaseButton
                  disabled={!selectedRole || selectedRole === editingUser.rol}
                  onClick={() => setShowConfirmRoleModal(true)}
                >
                  Listo
                </BaseButton>
              </div>
            </div>
          )}
        </BaseModal>

        <BaseModal
          open={showConfirmRoleModal && Boolean(editingUser)}
          title="¿Confirmar cambios?"
          onClose={() => setShowConfirmRoleModal(false)}
          maxWidthClassName="max-w-[340px]"
        >
          <div className="flex gap-4">
            <BaseButton
              variant="outline"
              fullWidth
              onClick={() => setShowConfirmRoleModal(false)}
            >
              Cancelar
            </BaseButton>

            <BaseButton
              fullWidth
              disabled={isSaving}
              onClick={handleConfirmRoleChange}
            >
              {isSaving ? 'Guardando...' : 'Confirmar'}
            </BaseButton>
          </div>
        </BaseModal>

        <BaseModal
          open={Boolean(statusUser)}
          title={
            statusUser?.estado ? '¿Desactivar cuenta?' : '¿Activar cuenta?'
          }
          onClose={() => setStatusUser(null)}
          maxWidthClassName="max-w-[340px]"
        >
          <div className="flex gap-4">
            <BaseButton
              variant="outline"
              fullWidth
              onClick={() => setStatusUser(null)}
            >
              Cancelar
            </BaseButton>

            <BaseButton
              fullWidth
              disabled={isSaving}
              onClick={handleConfirmStatusChange}
            >
              {isSaving ? 'Guardando...' : 'Confirmar'}
            </BaseButton>
          </div>
        </BaseModal>

        <BaseModal
          open={Boolean(errorMessage)}
          onClose={() => setErrorMessage('')}
          maxWidthClassName="max-w-[340px]"
        >
          <div className="text-center">
            <p className="mb-6 text-[18px] font-semibold text-text">
              {errorMessage}
            </p>

            <BaseButton fullWidth onClick={() => setErrorMessage('')}>
              Confirmar
            </BaseButton>
          </div>
        </BaseModal>
      </div>
    </div>
  );
}