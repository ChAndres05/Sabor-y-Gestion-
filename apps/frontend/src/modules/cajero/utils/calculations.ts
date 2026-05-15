export const calcularTotalesFactura = (subtotal: number, descuentoMonto: number = 0) => {
  const total = subtotal - descuentoMonto; //
  const impuestoIva = total * 0.13; // 13% IVA informativo para Bolivia
  
  return {
    subtotal: subtotal,
    descuento: descuentoMonto,
    total: total,
    impuesto: impuestoIva
  };
};