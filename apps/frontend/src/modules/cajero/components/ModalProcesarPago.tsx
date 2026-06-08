import React, { useState } from 'react';
import { MOCK_CUPONES } from '../../../shared/mocks/cuponesMocks';
import type { PagoConfirmacion } from '../types';
import type { TableOrderItem } from '../../tables/types/table-order.types';

// NUEVO: Importamos la imagen del QR directamente desde la carpeta assets
import qrImage from '../../../assets/qr.png';

interface ModalProcesarPagoProps {
  numeroMesa: number;
  detalles: TableOrderItem[];
  onClose: () => void;
  onConfirmarPago: (datos: PagoConfirmacion) => void;
  ci_cliente?: string;
  nombre_cliente?: string;
  correo_cliente?: string;
}

export const ModalProcesarPago: React.FC<ModalProcesarPagoProps> = ({
  numeroMesa,
  detalles,
  onClose,
  onConfirmarPago,
  ci_cliente,
  nombre_cliente,
  correo_cliente
}) => {
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TRANSFERENCIA'>('EFECTIVO');
  const [codigoDescuento, setCodigoDescuento] = useState('');
  const [montoRecibido, setMontoRecibido] = useState<number>(0);
  const [referenciaPago, setReferenciaPago] = useState('');
  const [ciCliente, setCiCliente] = useState(ci_cliente || '');
  const [nombreCliente, setNombreCliente] = useState(nombre_cliente || '');

  const [correoCliente, setCorreoCliente] = useState(correo_cliente || '');
  const [enviarCorreo, setEnviarCorreo] = useState(false);

  // 2. Lógica de validación de cupones y cálculo de totales
  const subtotal = detalles.reduce((acc, item) => acc + item.subtotal, 0);
  const cuponEncontrado = MOCK_CUPONES.find(c => c.codigo === codigoDescuento.toUpperCase());
  const montoDescuento = cuponEncontrado ? subtotal * cuponEncontrado.descuento : 0;

  const subtotalConDescuento = subtotal - montoDescuento;
  const totalFinal = subtotalConDescuento;
  const cambio = montoRecibido > totalFinal ? montoRecibido - totalFinal : 0;

  // 1. Bloqueo de números negativos, límite de decimales divisibles por 10
  const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    let rawValue = e.target.value;

    if (rawValue.includes('.')) {
      const [entero, decimal] = rawValue.split('.');
      if (decimal.length > 1) {
        const primerDecimal = decimal.charAt(0);
        rawValue = `${entero}.${primerDecimal}0`;
        e.target.value = rawValue;
      }
    }

    const value = rawValue === '' ? 0 : Number(rawValue);
    const maxPermitido = totalFinal + 200;

    if (value > maxPermitido) {
      setMontoRecibido(maxPermitido);
      e.target.value = maxPermitido.toFixed(2);
    } else if (value < 0) {
      setMontoRecibido(0);
      e.target.value = '0';
    } else {
      setMontoRecibido(value);
    }
  };

  React.useEffect(() => {
    const maxPermitido = totalFinal + 200;
    if (montoRecibido > maxPermitido) {
      setMontoRecibido(maxPermitido);
      const inputEl = document.getElementById('input-monto-recibido') as HTMLInputElement | null;
      if (inputEl) {
        inputEl.value = maxPermitido.toFixed(2);
      }
    }
  }, [totalFinal, montoRecibido]);

  const puedeConfirmar = metodoPago !== 'EFECTIVO' || montoRecibido >= totalFinal;

  const handleConfirmar = (): void => {
    const datos: PagoConfirmacion = {
      monto_pagado: totalFinal,
      metodo_pago: metodoPago,
      monto_recibido: metodoPago === 'EFECTIVO' ? montoRecibido : undefined,
      monto_cambio: metodoPago === 'EFECTIVO' ? cambio : 0,
      descuento_aplicado: montoDescuento,
      codigo_cupon: cuponEncontrado ? codigoDescuento.toUpperCase() : undefined,
      referencia_pago: metodoPago === 'TRANSFERENCIA' ? referenciaPago : undefined,
      ci_cliente: ciCliente,
      nombre_cliente: nombreCliente,
      correo_cliente: correoCliente,
      enviar_recibo: enviarCorreo
    };

    onConfirmarPago(datos);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/20 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[var(--color-primary)] p-6 text-white flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold tracking-tight">Procesar Pago - Mesa {numeroMesa}</h2>
          <button onClick={onClose} className="text-2xl hover:rotate-90 transition-transform">&times;</button>
        </div>

        {/* Contenedor scrolleable central */}
        <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Resumen de Items */}
          <div className="space-y-3">
            {detalles.map((item) => (
              <div key={item.id} className="flex justify-between text-sm border-b border-dashed pb-2">
                <span className="text-gray-600 font-medium">{item.cantidad}x {item.nombreProducto}</span>
                <span className="font-bold text-[var(--color-text)]">Bs {item.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Datos del Cliente */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">CI / NIT</label>
                <input
                  type="text"
                  value={ciCliente}
                  onChange={(e) => setCiCliente(e.target.value)}
                  placeholder="1234567"
                  className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold focus:ring-4 ring-[var(--color-primary)]/10 outline-none transition-all border-2 border-transparent focus:border-[var(--color-primary)]"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Nombre Cliente</label>
                <input
                  type="text"
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  placeholder="Juan Perez"
                  className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold focus:ring-4 ring-[var(--color-primary)]/10 outline-none transition-all border-2 border-transparent focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={correoCliente}
                onChange={(e) => setCorreoCliente(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold focus:ring-4 outline-none transition-all border-2 border-transparent focus:border-[var(--color-primary)] ring-[var(--color-primary)]/10"
              />
            </div>
          </div>

          {/* Panel de Totales */}
          <div className="bg-gray-50 p-5 rounded-3xl space-y-3">
            <div className="flex justify-between text-sm text-gray-500 font-medium">
              <span>Subtotal</span>
              <span>Bs {subtotal.toFixed(2)}</span>
            </div>
            {montoDescuento > 0 && (
              <div className="flex justify-between text-[var(--color-success)] font-bold text-sm">
                <span>Descuento aplicado</span>
                <span>- Bs {montoDescuento.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-2xl font-black text-[var(--color-primary)] tracking-tighter border-t pt-3">
              <span>Total a pagar</span>
              <span>Bs {totalFinal.toFixed(2)}</span>
            </div>
          </div>

          {/* Selector de Método */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setMetodoPago('EFECTIVO')}
              className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-1 ${metodoPago === 'EFECTIVO' ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-4 ring-[var(--color-primary)]/10' : 'border-gray-100 opacity-60'}`}
            >
              <span className="text-2xl">💵</span>
              <span className="font-black text-[10px] uppercase tracking-widest">Efectivo</span>
            </button>
            <button
              onClick={() => setMetodoPago('TRANSFERENCIA')}
              className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-1 ${metodoPago === 'TRANSFERENCIA' ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-4 ring-[var(--color-primary)]/10' : 'border-gray-100 opacity-60'}`}
            >
              <span className="text-2xl">📱</span>
              <span className="font-black text-[10px] uppercase tracking-widest">QR / Transf.</span>
            </button>
          </div>

          {/* Contenido Dinámico según Método */}
          {metodoPago === 'EFECTIVO' ? (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Monto Recibido</label>
                <input
                  id="input-monto-recibido"
                  type="number"
                  min="0"
                  onKeyDown={(e) => ["-", "+", "e", "E"].includes(e.key) && e.preventDefault()}
                  onChange={handleMontoChange}
                  className="w-full bg-gray-50 p-4 rounded-2xl text-2xl font-black focus:ring-4 ring-[var(--color-primary)]/10 outline-none transition-all text-center border-2 border-transparent focus:border-[var(--color-primary)]"
                  placeholder="0.00"
                />
              </div>
              <div className="flex justify-between items-center p-4 bg-[var(--color-success)]/10 rounded-2xl text-[var(--color-success)]">
                <span className="font-bold text-sm uppercase tracking-wider">Cambio:</span>
                <span className="text-2xl font-black underline decoration-2">Bs {cambio.toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div className="text-center p-5 border-2 border-dashed border-gray-200 rounded-[2rem] bg-gray-50">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Escanea el código QR</p>
                {/* NUEVO: Reemplazamos el emoji por la imagen del QR */}
                <div className="w-40 h-40 bg-white mx-auto rounded-2xl shadow-sm flex items-center justify-center p-2 border border-gray-100 overflow-hidden">
                  <img src={qrImage} alt="Código QR para Pago" className="w-full h-full object-contain" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Número de Referencia</label>
                <input
                  type="text"
                  value={referenciaPago}
                  onChange={(e) => setReferenciaPago(e.target.value)}
                  placeholder="Ej: TRANS-98765"
                  className="w-full bg-gray-50 p-4 rounded-2xl font-mono text-sm focus:ring-4 ring-[var(--color-primary)]/10 outline-none transition-all border-2 border-transparent focus:border-[var(--color-primary)]"
                />
              </div>
            </div>
          )}

          {/* Cupón */}
          <div className="relative">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Cupón de Descuento</label>
            <input
              type="text"
              placeholder="Ingresa un código..."
              className={`w-full p-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none transition-all border-2 ${cuponEncontrado ? 'border-[var(--color-success)] bg-[var(--color-success)]/5' : 'border-transparent focus:border-gray-200'}`}
              onChange={(e) => setCodigoDescuento(e.target.value)}
            />
            {cuponEncontrado && (
              <span className="absolute right-4 bottom-4 text-[var(--color-success)] font-black text-[10px] tracking-widest">✓ APLICADO</span>
            )}
          </div>
        </div>

        {/* Footer fijo con Toggle y Botón */}
        <div className="p-8 bg-gray-50/50 border-t border-gray-100 shrink-0">
          <div className="flex items-center gap-3 mb-5">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={enviarCorreo}
                onChange={(e) => setEnviarCorreo(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
            </label>
            <span className="text-sm font-bold text-gray-600">Enviar comprobante por correo</span>
          </div>

          <button
            disabled={!puedeConfirmar}
            className="w-full py-5 bg-[var(--color-primary)] text-white font-black rounded-[2rem] shadow-xl hover:bg-[var(--color-primary-hover)] transition-all uppercase tracking-widest disabled:opacity-30 disabled:grayscale"
            onClick={handleConfirmar}
          >
            Confirmar Pago
          </button>
        </div>
      </div>
    </div>
  );
};