import React, { useState } from 'react';
import BaseModal from '../../../../shared/components/BaseModal';
import BaseButton from '../../../../shared/components/BaseButton';
import { Input } from '../../../../shared/components/Input';

interface CrearCategoriaModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (nombre: string, descripcion?: string) => Promise<void>;
}

export default function CrearCategoriaModal({
  open,
  onClose,
  onSave,
}: CrearCategoriaModalProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('El nombre de la categoría es obligatorio');
      return;
    }

    try {
      setSaving(true);
      setError(undefined);
      await onSave(nombre.trim(), descripcion.trim() || undefined);
      setNombre('');
      setDescripcion('');
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error al guardar la categoría');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setNombre('');
    setDescripcion('');
    setError(undefined);
    onClose();
  };

  return (
    <BaseModal 
      open={open} 
      title="Crear Categoría de Ingredientes" 
      onClose={handleClose}
      maxWidthClassName="max-w-[400px]"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Nombre de la Categoría"
          placeholder="Ej. Salsas, Condimentos..."
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value);
            if (error) setError(undefined);
          }}
          error={error}
          autoFocus
          disabled={saving}
        />

        <Input
          label="Descripción (Opcional)"
          placeholder="Ej. Insumos para la sazón y acompañamiento"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          disabled={saving}
        />

        <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <BaseButton 
            variant="outline" 
            onClick={handleClose}
            className="sm:w-auto w-full"
            disabled={saving}
          >
            Cancelar
          </BaseButton>
          <BaseButton 
            type="submit" 
            variant="primary"
            className="sm:w-auto w-full"
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar Categoría'}
          </BaseButton>
        </div>
      </form>
    </BaseModal>
  );
}
