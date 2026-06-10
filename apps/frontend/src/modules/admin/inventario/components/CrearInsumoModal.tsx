import React, { useState } from 'react';
import BaseModal from '../../../../shared/components/BaseModal';
import BaseButton from '../../../../shared/components/BaseButton';
import { Input } from '../../../../shared/components/Input';
import type { UnidadMedida } from '../../../../shared/mocks/inventario';

export interface CrearInsumoFormData {
  nombre: string;
  categoria: string;
  unidad_medida: UnidadMedida;
  stock_minimo: string;
  stock_inicial: string;
}

interface CrearInsumoModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CrearInsumoFormData) => void;
}

const valoresIniciales: CrearInsumoFormData = {
  nombre: '',
  categoria: '',
  unidad_medida: 'KILOGRAMO',
  stock_minimo: '',
  stock_inicial: '',
};

export default function CrearInsumoModal({
  open,
  onClose,
  onSave,
}: CrearInsumoModalProps) {
  const [formData, setFormData] = useState<CrearInsumoFormData>(valoresIniciales);
  const [errores, setErrores] = useState<Partial<Record<keyof CrearInsumoFormData, string>>>({});

  // Manejador genérico para inputs y selects que respeta el tipado estricto
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'stock_minimo' || name === 'stock_inicial') {
      // Permitir sólo números con hasta 2 decimales
      if (value !== '' && !/^\d*\.?\d{0,2}$/.test(value)) {
        return;
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Limpiar error al escribir
    if (errores[name as keyof CrearInsumoFormData]) {
      setErrores((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleKeyDownDecimal = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '-', '+'].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación básica
    const nuevosErrores: Partial<Record<keyof CrearInsumoFormData, string>> = {};
    if (!formData.nombre.trim()) nuevosErrores.nombre = 'El nombre es obligatorio';
    if (!formData.categoria) nuevosErrores.categoria = 'Selecciona una categoría';
    
    const stockMinNum = Number(formData.stock_minimo);
    if (formData.stock_minimo === '' || isNaN(stockMinNum) || stockMinNum < 0) {
      nuevosErrores.stock_minimo = 'Ingresa un valor válido (0 o mayor, máx. 2 decimales)';
    }

    const stockIniNum = Number(formData.stock_inicial);
    if (formData.stock_inicial === '' || isNaN(stockIniNum) || stockIniNum < 0) {
      nuevosErrores.stock_inicial = 'Ingresa un valor válido (0 o mayor, máx. 2 decimales)';
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      return;
    }

    onSave(formData);
    setFormData(valoresIniciales); // Resetear formulario
    onClose();
  };

  const handleClose = () => {
    setFormData(valoresIniciales);
    setErrores({});
    onClose();
  };

  return (
    <BaseModal 
      open={open} 
      title="Crear Insumo" 
      onClose={handleClose}
      maxWidthClassName="max-w-[480px]" // Ampliado para mejor UX en formularios
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        
        {/* Fila 1: Nombre (Ancho completo) */}
        <Input
          label="Nombre del Insumo"
          name="nombre"
          placeholder="Ej. Queso Mozzarella"
          value={formData.nombre}
          onChange={handleChange}
          error={errores.nombre}
          autoFocus
        />

        {/* Fila 2: Grid Responsivo (2 columnas en desktop, 1 en mobile) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          
          {/* Select personalizado que imita el estilo de tu Input.tsx */}
          <div className="mb-4 flex w-full flex-col gap-1">
            <label className="text-[14px] font-bold uppercase tracking-wider text-text">
              Categoría
            </label>
            <select
              name="categoria"
              value={formData.categoria}
              onChange={handleChange}
              className={`rounded-xl border bg-white p-3 outline-none transition-all focus:border-primary ${
                errores.categoria ? 'border-alert' : 'border-gray-200'
              }`}
            >
              <option value="">Selecciona...</option>
              <option value="Carnes y Aves">Carnes y Aves</option>
              <option value="Verduras">Verduras</option>
              <option value="Lácteos">Lácteos</option>
              <option value="Bebidas">Bebidas</option>
              <option value="Abarrotes / Secos">Abarrotes / Secos</option>
            </select>
            {errores.categoria && <span className="text-xs italic text-alert">{errores.categoria}</span>}
          </div>

          <div className="mb-4 flex w-full flex-col gap-1">
            <label className="text-[14px] font-bold uppercase tracking-wider text-text">
              Unidad
            </label>
            <select
              name="unidad_medida"
              value={formData.unidad_medida}
              onChange={handleChange}
              className="rounded-xl border border-gray-200 bg-white p-3 outline-none transition-all focus:border-primary"
            >
              {/* Valores estrictos mapeados de la base de datos */}
              <option value="KILOGRAMO">KG</option>
              <option value="GRAMO">Gramos</option>
              <option value="LITRO">Litros</option>
              <option value="MILILITRO">Mililitros</option>
              <option value="UNIDAD">Unidades</option>
            </select>
          </div>
        </div>

        {/* Fila 3: Stock Inicial */}
        <Input
          label="Stock Inicial"
          name="stock_inicial"
          type="number"
          min="0"
          step="0.01"
          placeholder="Ej. 50"
          value={formData.stock_inicial}
          onChange={handleChange}
          onKeyDown={handleKeyDownDecimal}
          error={errores.stock_inicial}
        />

        {/* Fila 4: Control de Alertas */}
        <div className="mt-2 rounded-2xl bg-gray-50 p-4 border border-gray-100">
          <h4 className="mb-3 text-sm font-bold text-text">CONTROL DE ALERTAS</h4>
          <Input
            label="Stock Mínimo"
            name="stock_minimo"
            type="number"
            min="0"
            step="0.01"
            placeholder="Ej. 10"
            value={formData.stock_minimo}
            onChange={handleChange}
            onKeyDown={handleKeyDownDecimal}
            error={errores.stock_minimo}
          />
          <p className="text-xs text-gray-500 leading-relaxed -mt-2">
            El sistema cambiará el estado a visualización amarilla o roja cuando el inventario caiga por debajo de este número.
          </p>
        </div>

        {/* Fila 4: Botones de Acción */}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <BaseButton 
            variant="outline" 
            onClick={handleClose}
            className="sm:w-auto w-full"
          >
            Cancelar
          </BaseButton>
          <BaseButton 
            type="submit" 
            variant="primary"
            className="sm:w-auto w-full"
          >
            Guardar Insumo
          </BaseButton>
        </div>

      </form>
    </BaseModal>
  );
}