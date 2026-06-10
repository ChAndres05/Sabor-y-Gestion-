import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const menu = await prisma.categorias.findMany({
      where: {
        activo: true
      },
      include: {
        productos: {
          where: {
            activo: true,
            disponible: true
          },
          include: {
            presentaciones: {
              where: {
                activo: true,
                disponible: true
              },
              include: {
                recetas_presentaciones: {
                  include: {
                    insumo: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    return NextResponse.json(menu);
  } catch (error) {
    console.error('Error obteniendo menú:', error);
    return NextResponse.json({ error: 'Error interno del servidor al obtener el menú' }, { status: 500 });
  }
}
