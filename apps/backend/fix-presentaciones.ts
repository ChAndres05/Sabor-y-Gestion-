import { prisma } from './lib/prisma';

async function main() {
  const productosSinPresentacion = await prisma.productos.findMany({
    where: {
      presentaciones: {
        none: {}
      }
    }
  });

  console.log(`Encontrados ${productosSinPresentacion.length} productos sin presentación.`);

  for (const prod of productosSinPresentacion) {
    await prisma.presentaciones_producto.create({
      data: {
        id_producto: prod.id_producto,
        nombre: 'Normal',
        precio: prod.precio ? Number(prod.precio) : 0,
        tiempo_preparacion_minutos: prod.tiempo_preparacion ? Number(prod.tiempo_preparacion) : 10,
        disponible: prod.disponible,
        activo: prod.activo,
        es_predeterminada: true
      }
    });
    console.log(`Creada presentación para: ${prod.nombre}`);
  }

  console.log('¡Arreglo completado!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
