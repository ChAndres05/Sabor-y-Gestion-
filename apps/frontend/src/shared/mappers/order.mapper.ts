import type {
  TableOrder,
  TableOrderItemIngredient,
  TableOrderStatus,
} from '../../modules/tables/types/table-order.types';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? (value as UnknownRecord) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function mapBackendOrderToWaiterFrontend(
  rawBackendOrder: unknown
): TableOrder {
  const backendOrder = asRecord(rawBackendOrder);
  const customer = asRecord(backendOrder.usuarios_pedidos_id_usuario_clienteTousuarios);
  const waiter = asRecord(backendOrder.usuario_mesero);
  const table = asRecord(backendOrder.mesas ?? backendOrder.mesa);
  const orderId = numberValue(backendOrder.id_pedido ?? backendOrder.id, 0);
  const originalStatus = stringValue(backendOrder.estado, 'REGISTRADO') === 'COCINA'
    ? 'EN_PREPARACION'
    : stringValue(backendOrder.estado, 'REGISTRADO');

  const customerName = customer.nombre
    ? `${stringValue(customer.nombre)} ${stringValue(customer.apellido)}`.trim()
    : stringValue(backendOrder.cliente_nombre, 'Cliente general');

  // 1. Extraemos y mapeamos los items primero
  const mappedItems = asArray(backendOrder.detalles_pedido).map((rawDetail) => {
    const detalle = asRecord(rawDetail);
    const pres = asRecord(detalle.presentacion_producto ?? detalle.presentacionProducto);
    const prod = asRecord(pres.producto ?? detalle.producto);
    const cat = asRecord(prod.categoria ?? prod.categorias);

    return {
      id: numberValue(detalle.id_detalle_pedido ?? detalle.id, 0),
      productoId: numberValue(pres.id_presentacion_producto ?? prod.id_producto ?? detalle.id_presentacion_producto, 0),
      nombreProducto: stringValue(prod.nombre ?? detalle.nombreProducto, 'Producto'),
      categoriaId: numberValue(cat.id_categoria ?? prod.id_categoria, 0),
      categoriaNombre: stringValue(cat.nombre, 'Sin categoría'),
      cantidad: numberValue(detalle.cantidad, 1),
      observacion: stringValue(detalle.observaciones ?? detalle.observacion),
      ingredientes: asArray(detalle.ingredientes_detalle ?? detalle.ingredientes).map((rawIngredient) => {
        const ingredient = asRecord(rawIngredient);
        return {
          nombre: stringValue(ingredient.nombre),
          incluido: Boolean(ingredient.incluido),
        };
      }) as TableOrderItemIngredient[],
      precioUnitario: numberValue(detalle.precio_unitario ?? detalle.precioUnitario, 0),
      tiempoPreparacion: numberValue(pres.tiempo_preparacion_minutos ?? prod.tiempo_preparacion, 0),
      subtotal: numberValue(detalle.subtotal, 0),
      imagen: stringValue(prod.imagen_url ?? prod.imagen, '') || null,
    };
  });

  // 2. MAGIA MATEMÁTICA: Calculamos el tiempo total estimado correcto
  const maxItemTime = mappedItems.reduce((max, item) => {
    const itemTime = item.tiempoPreparacion + (item.cantidad > 2 ? 5 : 0);
    return itemTime > max ? itemTime : max;
  }, 0);
  const tiempoTotalCalculado = maxItemTime + (mappedItems.length > 2 ? 5 : 0);


  return {
    id: orderId,
    tableId: numberValue(backendOrder.id_mesa ?? backendOrder.tableId, 0),
    tableNumber: numberValue(table.numero ?? backendOrder.numero_mesa ?? backendOrder.tableNumber, 0),
    tipoPedido: 'MESA',
    estado: (originalStatus as TableOrderStatus),
    waiterName: waiter.nombre
      ? `${stringValue(waiter.nombre)} ${stringValue(waiter.apellido)}`.trim()
      : 'Mesero',
    customer: (() => {
      const facturasList = asArray(backendOrder.facturas);
      const requestedInvoice = facturasList.find((f) => asRecord(f).estado_documento === 'SOLICITADA');
      let finalCustomerName = customerName;
      let finalCustomerCi = customer.usuario_ci ? String(customer.usuario_ci) : '0';
      let finalCustomerCorreo = stringValue(customer.correo_electronico ?? customer.correo ?? backendOrder.cliente_correo ?? '');

      if (requestedInvoice) {
        const obs = stringValue(asRecord(requestedInvoice).observaciones);
        const nameMatch = obs.match(/Facturado a:\s*(.*?)(?:, CI\/NIT:|$)/);
        const nitMatch = obs.match(/CI\/NIT:\s*([^\s-]*)/);
        const emailMatch = obs.match(/Correo:\s*([^\s-]*)/);

        if (nameMatch) finalCustomerName = nameMatch[1].trim();
        if (nitMatch) finalCustomerCi = nitMatch[1].trim();
        if (emailMatch) finalCustomerCorreo = emailMatch[1].trim();
      }

      return {
        idUsuario: customer.id_usuario ? numberValue(customer.id_usuario) : null,
        nombre: finalCustomerName,
        telefono: stringValue(customer.telefono, '00000000'),
        ci: finalCustomerCi,
        correo: finalCustomerCorreo,
      };
    })(),
    items: mappedItems,
    subtotal: numberValue(backendOrder.subtotal, 0),
    impuesto: 0,
    descuento: 0,
    total: numberValue(backendOrder.total ?? backendOrder.subtotal, 0),
    // 3. Asignamos el tiempo calculado (o el del backend como respaldo)
    tiempoEstimadoMinutos: tiempoTotalCalculado > 0 ? tiempoTotalCalculado : numberValue(backendOrder.tiempo_estimado_minutos ?? backendOrder.tiempoEstimadoMinutos, 0),
    observaciones: stringValue(backendOrder.observaciones),
    fechaCreacion: stringValue(backendOrder.fecha_hora_pedido ?? backendOrder.fechaCreacion, new Date().toISOString()),
  };
}
