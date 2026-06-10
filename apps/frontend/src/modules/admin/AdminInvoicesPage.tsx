import { useState, useMemo, useEffect } from 'react';
import type { FacturaMock } from '../../shared/mocks/facturas.mock';
import { FeedbackModal } from '../../shared/components/FeedbackModal';
import { facturasApi } from '../../shared/api/facturas.api';
import { pusherClient } from '../../shared/utils/pusher';

interface AdminInvoicesPageProps {
  onBack: () => void;
}

type FeedbackState = { type: 'success' | 'error' | 'info'; title: string; message: string; } | null;

export default function AdminInvoicesPage({ onBack }: AdminInvoicesPageProps) {
  const [invoices, setInvoices] = useState<FacturaMock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODAS' | 'EMITIDA' | 'ANULADA'>('TODAS');
  const [selectedInvoice, setSelectedInvoice] = useState<FacturaMock | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');

  // Load Invoices from DB
  useEffect(() => {
    let active = true;
    const loadInvoices = async () => {
      try {
        setIsLoading(true);
        const data = await facturasApi.getFacturas();
        if (active) {
          setInvoices(data);
        }
      } catch (err) {
        console.error(err);
        setFeedback({
          type: 'error',
          title: 'Error de carga',
          message: (err as Error).message || 'No se pudieron cargar las facturas reales del backend.'
        });
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadInvoices();
    return () => {
      active = false;
    };
  }, []);

  // Listen to Pusher real-time events
  useEffect(() => {
    const channel = pusherClient.subscribe('facturas-channel');

    const handleFacturaCreada = (newInvoice: FacturaMock) => {
      setInvoices(prev => {
        if (prev.some(inv => inv.id_factura === newInvoice.id_factura)) {
          return prev;
        }
        return [newInvoice, ...prev];
      });
    };

    const handleFacturaAnulada = (updatedInvoice: FacturaMock) => {
      setInvoices(prev => prev.map(inv => inv.id_factura === updatedInvoice.id_factura ? updatedInvoice : inv));
      setSelectedInvoice(prev => prev && prev.id_factura === updatedInvoice.id_factura ? updatedInvoice : prev);
    };

    channel.bind('factura-creada', handleFacturaCreada);
    channel.bind('factura-anulada', handleFacturaAnulada);

    return () => {
      channel.unbind('factura-creada', handleFacturaCreada);
      channel.unbind('factura-anulada', handleFacturaAnulada);
      pusherClient.unsubscribe('facturas-channel');
    };
  }, []);

  // Calculations
  const stats = useMemo(() => {
    const active = invoices.filter(f => f.estado_documento === 'EMITIDA');
    const totalInvoiced = active.reduce((acc, curr) => acc + Number(curr.total), 0);
    const totalDiscount = active.reduce((acc, curr) => acc + Number(curr.descuento), 0);
    const voidedCount = invoices.filter(f => f.estado_documento === 'ANULADA').length;

    return {
      totalInvoiced,
      activeCount: active.length,
      voidedCount,
      totalDiscount,
    };
  }, [invoices]);

  // Filtering
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchSearch =
        inv.numero_documento.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.cliente_ci.includes(searchTerm) ||
        (inv.nombre_usuario_emision && inv.nombre_usuario_emision.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === 'TODAS' || inv.estado_documento === statusFilter;

      const amt = Number(inv.total);
      const matchMin = minAmount === '' || amt >= Number(minAmount);
      const matchMax = maxAmount === '' || amt <= Number(maxAmount);

      return matchSearch && matchStatus && matchMin && matchMax;
    });
  }, [invoices, searchTerm, statusFilter, minAmount, maxAmount]);

  // Voiding an invoice (Admin action)
  const handleVoidInvoice = async (id: number) => {
    if (window.confirm('¿Está seguro de que desea ANULAR esta factura? Esta acción no se puede deshacer.')) {
      try {
        const updated = await facturasApi.anularFactura(id);
        
        setInvoices(prev => prev.map(inv => inv.id_factura === id ? updated : inv));

        // Update selected detail modal in real-time
        if (selectedInvoice && selectedInvoice.id_factura === id) {
          setSelectedInvoice(updated);
        }

        setFeedback({
          type: 'success',
          title: 'Factura Anulada',
          message: 'La factura ha sido anulada con éxito y se han actualizado las estadísticas financieras.'
        });
      } catch (err) {
        console.error(err);
        setFeedback({
          type: 'error',
          title: 'Error al anular',
          message: (err as Error).message || 'No se pudo anular la factura en el servidor.'
        });
      }
    }
  };

  // Helper formatting functions
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(value).replace('BOB', 'Bs.');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-BO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC'
    });
  };

  return (
    <main className="min-h-full bg-background px-3 py-5 text-text md:px-6 md:py-8 font-sans">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <div className="mb-4 flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="text-[28px] leading-none text-text hover:opacity-85 transition-opacity"
            aria-label="Menú"
          >
            ☰
          </button>
          <div className="flex-1">
            <h1 className="text-title font-bold text-gray-900">Facturas y Comprobantes</h1>
            <p className="text-gray-500 text-[14px]">Administración y control fiscal del restaurante Sabor & Gestión.</p>
          </div>
        </div>

        {/* KPI metrics cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Total Facturado</span>
            <span className="text-[26px] font-extrabold text-primary mt-2">
              {formatCurrency(stats.totalInvoiced)}
            </span>
            <span className="text-[11px] text-green-500 mt-1">✓ Inresos reales confirmados</span>
          </div>

          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Facturas Emitidas</span>
            <span className="text-[26px] font-extrabold text-gray-800 mt-2">
              {stats.activeCount}
            </span>
            <span className="text-[11px] text-gray-500 mt-1">En estado EMITIDA</span>
          </div>

          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Facturas Anuladas</span>
            <span className="text-[26px] font-extrabold text-alert mt-2">
              {stats.voidedCount}
            </span>
            <span className="text-[11px] text-alert mt-1">Sin valor legal/fiscal</span>
          </div>

          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Descuentos Concedidos</span>
            <span className="text-[26px] font-extrabold text-info mt-2">
              {formatCurrency(stats.totalDiscount)}
            </span>
            <span className="text-[11px] text-gray-500 mt-1">Beneficios aplicados</span>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-[15px] font-bold mb-3 text-gray-700">Filtros de búsqueda</h2>
          
          <div className="grid gap-4 md:grid-cols-12">
            {/* Search Input */}
            <div className="md:col-span-4">
              <label className="text-[11px] font-bold text-gray-400 block mb-1">Buscar por cliente, CI o Nro</label>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Ej. Juan Perez, 1234567..."
                className="w-full rounded-xl border border-gray-200 px-4 py-2 text-[13px] outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Status Filter */}
            <div className="md:col-span-3">
              <label className="text-[11px] font-bold text-gray-400 block mb-1">Estado del documento</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as 'TODAS' | 'EMITIDA' | 'ANULADA')}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] outline-none bg-white focus:border-primary transition-colors"
              >
                <option value="TODAS">Todas las facturas</option>
                <option value="EMITIDA">Emitidas (Válidas)</option>
                <option value="ANULADA">Anuladas</option>
              </select>
            </div>

            {/* Price range filters */}
            <div className="md:col-span-5 grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">Monto Mínimo (Bs.)</label>
                <input
                  type="number"
                  value={minAmount}
                  onChange={e => setMinAmount(e.target.value)}
                  placeholder="Ej. 50"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-[13px] outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">Monto Máximo (Bs.)</label>
                <input
                  type="number"
                  value={maxAmount}
                  onChange={e => setMaxAmount(e.target.value)}
                  placeholder="Ej. 500"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-[13px] outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Reset Filters button */}
          {(searchTerm !== '' || statusFilter !== 'TODAS' || minAmount !== '' || maxAmount !== '') && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('TODAS');
                  setMinAmount('');
                  setMaxAmount('');
                }}
                className="text-[12px] font-bold text-primary hover:underline"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {/* Invoice list */}
        {isLoading ? (
          <div className="rounded-[1.5rem] bg-white p-12 text-center shadow-sm border border-gray-100">
            <div className="animate-spin inline-block w-8 h-8 border-[3px] border-current border-t-transparent text-primary rounded-full mb-3" role="status" aria-label="loading"></div>
            <p className="font-semibold text-gray-600">Cargando facturas...</p>
            <p className="text-gray-400 text-[13px] mt-1">Sincronizando con el servidor en tiempo real...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="rounded-[1.5rem] bg-white p-12 text-center shadow-sm border border-gray-100">
            <span className="text-[40px] block mb-2">📄</span>
            <p className="font-semibold text-gray-600">No se encontraron facturas</p>
            <p className="text-gray-400 text-[13px] mt-1">Pruebe ajustando los criterios de búsqueda o filtros.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-sm border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-left text-[14px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/55 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    <th className="px-6 py-4">Nro. Documento</th>
                    <th className="px-6 py-4">Fecha Emisión</th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">CI / NIT</th>
                    <th className="px-6 py-4">Emitido por</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInvoices.map((inv) => (
                    <tr 
                      key={inv.id_factura} 
                      className="hover:bg-gray-50/35 transition-colors cursor-pointer"
                      onClick={() => setSelectedInvoice(inv)}
                    >
                      <td className="px-6 py-4 font-bold text-gray-900">
                        {inv.numero_documento}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {formatDate(inv.fecha_emision)}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-700">
                        {inv.cliente_nombre}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {inv.cliente_ci}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-[13px]">
                        {inv.nombre_usuario_emision}
                      </td>
                      <td className="px-6 py-4 font-bold text-primary">
                        {formatCurrency(Number(inv.total))}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          inv.estado_documento === 'EMITIDA' 
                            ? 'bg-success/10 text-success' 
                            : 'bg-alert/10 text-alert'
                        }`}>
                          {inv.estado_documento === 'EMITIDA' ? 'Emitida' : 'Anulada'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(inv)}
                            className="rounded-lg bg-gray-100 hover:bg-gray-200 px-3 py-1.5 text-[12px] font-bold text-gray-700 transition-colors"
                          >
                            Detalle
                          </button>
                          {inv.estado_documento === 'EMITIDA' && (
                            <button
                              type="button"
                              onClick={() => handleVoidInvoice(inv.id_factura)}
                              className="rounded-lg bg-alert/10 hover:bg-alert/20 px-3 py-1.5 text-[12px] font-bold text-alert transition-colors"
                            >
                              Anular
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50/20 px-6 py-3 border-t border-gray-100 flex justify-between items-center text-[12px] text-gray-500">
              <span>Mostrando {filteredInvoices.length} de {invoices.length} facturas.</span>
            </div>
          </div>
        )}
      </div>

      {/* Premium Receipt Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl border border-gray-100 flex flex-col my-8">
            
            {/* Invoice Receipt Header */}
            <div className="flex justify-between items-start border-b border-dashed border-gray-200 pb-4 mb-4">
              <div>
                <span className="text-[12px] font-bold text-primary uppercase tracking-wide">Comprobante de Pago</span>
                <h2 className="text-[22px] font-black mt-1 text-gray-800">
                  {selectedInvoice.numero_documento}
                </h2>
                <p className="text-[12px] text-gray-500">{formatDate(selectedInvoice.fecha_emision)}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                selectedInvoice.estado_documento === 'EMITIDA' 
                  ? 'bg-success/10 text-success' 
                  : 'bg-alert/10 text-alert'
              }`}>
                {selectedInvoice.estado_documento === 'EMITIDA' ? 'Emitida' : 'Anulada'}
              </span>
            </div>

            {/* Restaurant Info & Client Details */}
            <div className="space-y-4 text-[13px] text-gray-600">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-2xl">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">DATOS RESTAURANTE</span>
                  <p className="font-bold text-gray-800">Sabor & Gestión</p>
                  <p>Cochabamba - Bolivia</p>
                  <p>NIT: 382716024</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-2xl">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">FACTURADO A:</span>
                  <p className="font-bold text-gray-800">{selectedInvoice.cliente_nombre}</p>
                  <p><b>CI/NIT:</b> {selectedInvoice.cliente_ci}</p>
                  <p><b>Pedido ID:</b> {selectedInvoice.id_pedido}</p>
                </div>
              </div>

              <div>
                <p><b>Emitida por:</b> {selectedInvoice.nombre_usuario_emision} (ID: {selectedInvoice.id_usuario_emision})</p>
                <p><b>Tipo de Documento:</b> {selectedInvoice.tipo_documento}</p>
              </div>
            </div>

            {/* Itemized List */}
            {selectedInvoice.items && selectedInvoice.items.length > 0 && (
              <div className="mt-4 border-t border-dashed border-gray-200 pt-4">
                <span className="text-[10px] font-bold text-gray-400 block uppercase mb-2">DETALLE DEL CONSUMO</span>
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {selectedInvoice.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[13px]">
                      <div className="flex-1 pr-4">
                        <p className="font-semibold text-gray-800">{item.nombre}</p>
                        <p className="text-[11px] text-gray-400">
                          {item.cantidad} x {formatCurrency(item.precio_unitario)}
                        </p>
                      </div>
                      <span className="font-bold text-gray-700">
                        {formatCurrency(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Totals Summary */}
            <div className="mt-4 border-t border-dashed border-gray-200 pt-4 space-y-2 text-[14px]">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>{formatCurrency(Number(selectedInvoice.subtotal))}</span>
              </div>
              {Number(selectedInvoice.descuento) > 0 && (
                <div className="flex justify-between text-alert font-semibold">
                  <span>Descuento</span>
                  <span>-{formatCurrency(Number(selectedInvoice.descuento))}</span>
                </div>
              )}
              {Number(selectedInvoice.impuesto) > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Impuesto (13% IVA inc.)</span>
                  <span>{formatCurrency(Number(selectedInvoice.impuesto))}</span>
                </div>
              )}
              
              <div className="flex justify-between border-t border-gray-100 pt-2 text-[18px] font-black text-primary">
                <span>Total Facturado</span>
                <span>{formatCurrency(Number(selectedInvoice.total))}</span>
              </div>
            </div>

            {/* Observations */}
            {selectedInvoice.observaciones && (
              <div className="mt-4 rounded-2xl bg-gray-50 p-3 text-[12px] text-gray-500 italic">
                <b>Observaciones:</b> {selectedInvoice.observaciones}
              </div>
            )}

            {/* Modal Controls */}
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="flex-1 rounded-2xl bg-gray-100 hover:bg-gray-200 py-3 font-bold text-gray-700 transition-colors"
              >
                Cerrar
              </button>
              
              {selectedInvoice.estado_documento === 'EMITIDA' && (
                <button
                  type="button"
                  onClick={() => handleVoidInvoice(selectedInvoice.id_factura)}
                  className="rounded-2xl bg-alert/15 hover:bg-alert/25 px-5 py-3 font-bold text-alert transition-colors"
                >
                  Anular Factura
                </button>
              )}
              
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="rounded-2xl bg-primary hover:bg-primary/95 px-5 py-3 font-bold text-white transition-colors"
              >
                Imprimir
              </button>
            </div>

          </div>
        </div>
      )}

      <FeedbackModal open={Boolean(feedback)} title={feedback?.title || ''} message={feedback?.message || ''} type={feedback?.type || 'info'} onClose={() => setFeedback(null)} />
    </main>
  );
}
