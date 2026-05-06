import type { 
  TableOrder, 
  TableOrderStatus,
  TableOrderItemIngredient
} from '../../modules/tables/types/table-order.types';

export function mapBackendOrderToWaiterFrontend(backendOrder: any, simulatedStatuses: Record<number, TableOrderStatus> = {}): TableOrder {
  const customer = backendOrder.usuarios_pedidos_id_usuario_clienteTousuarios;
  const originalStatus = backendOrder.estado === 'COCINA' ? 'EN_PREPARACION' : backendOrder.estado;
  
  return {
    id: backendOrder.id_pedido,
    tableId: backendOrder.id_mesa || 0,
    tipoPedido: 'MESA',
    estado: simulatedStatuses[backendOrder.id_pedido] || originalStatus,
    waiterName: backendOrder.usuario_mesero 
      ? `${backendOrder.usuario_mesero.nombre} ${backendOrder.usuario_mesero.apellido || ''}`.trim() 
      : 'Mesero',
    customer: {
      idUsuario: customer ? customer.id_usuario : null,
      nombre: customer ? `${customer.nombre} ${customer.apellido || ''}`.trim() : (backendOrder.cliente_nombre || 'Cliente general'),
      telefono: customer?.telefono || '00000000',
      ci: customer ? String(customer.usuario_ci) : '0',
    },
    items: (backendOrder.detalles_pedido || []).map((detalle: any) => {
      const pres = detalle.presentacion_producto || {};
      const prod = pres.producto || {};
      const cat = prod.categoria || {};
      return {
        id: detalle.id_detalle_pedido,
        productoId: pres.id_presentacion_producto || 0,
        nombreProducto: prod.nombre || 'Producto',
        categoriaId: cat.id_categoria || 0,
        categoriaNombre: cat.nombre || 'Categoría',
        cantidad: detalle.cantidad,
        observacion: detalle.observaciones || '',
        ingredientes: (detalle.ingredientes_detalle || []).map((ing: any) => ({
          nombre: ing.nombre,
          incluido: ing.incluido
        })) as TableOrderItemIngredient[],
        precioUnitario: Number(detalle.precio_unitario || 0),
        tiempoPreparacion: pres.tiempo_preparacion_minutos || 0,
        subtotal: Number(detalle.subtotal || 0),
        imagen: prod.imagen_url || prod.imagen || null,
      };
    }),
    subtotal: Number(backendOrder.subtotal || 0),
    impuesto: 0,
    descuento: 0,
    total: Number(backendOrder.total || backendOrder.subtotal || 0),
    tiempoEstimadoMinutos: backendOrder.tiempo_estimado_minutos || 0,
    observaciones: backendOrder.observaciones || '',
    fechaCreacion: backendOrder.fecha_hora_pedido || new Date().toISOString(),
  };
}
