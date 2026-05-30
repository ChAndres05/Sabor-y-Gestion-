export const calcularTotalesFactura = (subtotal: number, descuentoMonto: number = 0) => {
  const total = subtotal - descuentoMonto;
  
  return {
    subtotal: subtotal,
    descuento: descuentoMonto,
    total: total,
    impuesto: 0
  };
};