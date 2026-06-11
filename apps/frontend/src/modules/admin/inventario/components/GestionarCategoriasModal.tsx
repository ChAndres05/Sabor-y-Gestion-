import React, { useState } from 'react';
import BaseModal from '../../../../shared/components/BaseModal';
import BaseButton from '../../../../shared/components/BaseButton';
import { Input } from '../../../../shared/components/Input';
import type { CategoriaInsumo } from '../../../../shared/mocks/inventario';

interface GestionarCategoriasModalProps {
  open: boolean;
  onClose: () => void;
  categorias: CategoriaInsumo[];
  onSave: (nombre: string, descripcion?: string) => Promise<void>;
  onEdit: (id: number, nombre: string, descripcion?: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function GestionarCategoriasModal({
  open,
  onClose,
  categorias,
  onSave,
  onEdit,
  onDelete,
}: GestionarCategoriasModalProps) {
  // Estado para creación de categoría
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [errorCrear, setErrorCrear] = useState<string | undefined>(undefined);
  const [savingCrear, setSavingCrear] = useState(false);

  // Estado para edición en línea
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [errorEditar, setErrorEditar] = useState<string | undefined>(undefined);
  const [savingEditar, setSavingEditar] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorCrear('El nombre es obligatorio');
      return;
    }
    try {
      setSavingCrear(true);
      setErrorCrear(undefined);
      await onSave(nombre.trim(), descripcion.trim() || undefined);
      setNombre('');
      setDescripcion('');
    } catch (err) {
      console.error(err);
      setErrorCrear(err instanceof Error ? err.message : 'Error al guardar la categoría');
    } finally {
      setSavingCrear(false);
    }
  };

  const handleStartEdit = (cat: CategoriaInsumo) => {
    setEditingId(cat.id_categoria_insumo);
    setEditNombre(cat.nombre);
    setEditDescripcion(cat.descripcion || '');
    setErrorEditar(undefined);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditNombre('');
    setEditDescripcion('');
    setErrorEditar(undefined);
  };

  const handleSaveEdit = async (id: number) => {
    if (!editNombre.trim()) {
      setErrorEditar('El nombre es obligatorio');
      return;
    }
    try {
      setSavingEditar(true);
      setErrorEditar(undefined);
      await onEdit(id, editNombre.trim(), editDescripcion.trim() || undefined);
      setEditingId(null);
    } catch (err) {
      console.error(err);
      setErrorEditar(err instanceof Error ? err.message : 'Error al actualizar la categoría');
    } finally {
      setSavingEditar(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta categoría?')) {
      try {
        await onDelete(id);
      } catch (err) {
        console.error(err);
        alert(err instanceof Error ? err.message : 'Error al eliminar la categoría');
      }
    }
  };

  return (
    <BaseModal 
      open={open} 
      title="Gestionar Categorías de Ingredientes" 
      onClose={onClose}
      maxWidthClassName="max-w-[600px]"
    >
      <div className="flex flex-col gap-6">
        
        {/* Formulario de creación */}
        <form onSubmit={handleCreate} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
          <h4 className="mb-3 text-xs font-black uppercase tracking-wider text-gray-400">Nueva Categoría</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Nombre"
              placeholder="Ej. Salsas"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                if (errorCrear) setErrorCrear(undefined);
              }}
              error={errorCrear}
              disabled={savingCrear}
            />
            <Input
              label="Descripción (Opcional)"
              placeholder="Ej. Salsas para hamburguesas"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              disabled={savingCrear}
            />
          </div>
          <div className="mt-3 flex justify-end">
            <BaseButton
              type="submit"
              variant="primary"
              disabled={savingCrear}
              className="h-[40px] px-6"
            >
              {savingCrear ? 'Agregando...' : 'Agregar Categoría'}
            </BaseButton>
          </div>
        </form>

        {/* Listado de categorías */}
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">Categorías Registradas</h4>
          
          <div className="max-h-[300px] overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-100 bg-white">
            {categorias.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-400">No hay categorías registradas.</div>
            ) : (
              categorias.map((cat) => {
                const isEditing = editingId === cat.id_categoria_insumo;

                if (isEditing) {
                  return (
                    <div key={cat.id_categoria_insumo} className="flex flex-col gap-3 p-3 bg-primary/5">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Input
                          label="Nombre"
                          placeholder="Nombre de categoría"
                          value={editNombre}
                          onChange={(e) => {
                            setEditNombre(e.target.value);
                            if (errorEditar) setErrorEditar(undefined);
                          }}
                          error={errorEditar}
                          disabled={savingEditar}
                          className="bg-white"
                        />
                        <Input
                          label="Descripción"
                          placeholder="Descripción"
                          value={editDescripcion}
                          onChange={(e) => setEditDescripcion(e.target.value)}
                          disabled={savingEditar}
                          className="bg-white"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <BaseButton
                          variant="outline"
                          onClick={handleCancelEdit}
                          disabled={savingEditar}
                          className="h-[32px] px-3 text-xs"
                        >
                          Cancelar
                        </BaseButton>
                        <BaseButton
                          variant="primary"
                          onClick={() => handleSaveEdit(cat.id_categoria_insumo)}
                          disabled={savingEditar}
                          className="h-[32px] px-3 text-xs"
                        >
                          {savingEditar ? 'Guardando...' : 'Guardar'}
                        </BaseButton>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={cat.id_categoria_insumo} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col gap-0.5 max-w-[70%]">
                      <span className="text-sm font-bold text-gray-900">{cat.nombre}</span>
                      {cat.descripcion ? (
                        <span className="text-xs text-gray-500">{cat.descripcion}</span>
                      ) : (
                        <span className="text-xs italic text-gray-300">Sin descripción</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartEdit(cat)}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-primary transition-all"
                        title="Editar"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id_categoria_insumo)}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-alert transition-all"
                        title="Eliminar"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-end mt-2">
          <BaseButton variant="outline" onClick={onClose} className="h-[40px] px-6">
            Cerrar
          </BaseButton>
        </div>

      </div>
    </BaseModal>
  );
}
