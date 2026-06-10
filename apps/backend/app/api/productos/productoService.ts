import { prisma } from "@/lib/prisma";

export const productoService = {
  // Obtener todos los productos activos con sus categorías y presentaciones
  async getAll() {
    return await prisma.productos.findMany({
      where: { activo: true },
      include: {
        categoria: true,
        presentaciones: {
          where: { activo: true }
        }
      }
    });
  },

  // Crear un nuevo producto con su presentación predeterminada
  async create(data: { 
    nombre: string, 
    descripcion?: string, 
    id_categoria: number, 
    precio_base: number 
  }) {
    return await prisma.productos.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        id_categoria: data.id_categoria,
        presentaciones: {
          create: {
            nombre: "Normal",
            precio: data.precio_base,
            es_predeterminada: true
          }
        }
      },
      include: {
        categoria: true,
        presentaciones: true
      }
    });
  }
};